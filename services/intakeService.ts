
import { MODULE_IDS, IntakeRow, FieldMapRule, SourceConfig, formatDate, Lead } from '../types';
import { appendRow, updateSourceRow, loadSheetRange, addLead, SHEET_NAME_INTAKE_SOURCES, SHEET_NAME_INTAKE_MAPPINGS, SHEET_NAME_LEADS, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_ACTIVITY } from './sheetService';

export interface SourceStat {
  name: string;
  count: number;
  status: string;
}

// Runtime Cache
let configCache: { sources: SourceConfig[], mappings: FieldMapRule[], settings: any } | null = null;

// Transform Helper Functions
const transforms = {
  normalizePhone: (v: string) => v?.replace(/\D/g, '').slice(-10) || '',
  titleCase: (v: string) => v?.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '',
  lowerCase: (v: string) => v?.toLowerCase().trim() || '',
  upperCase: (v: string) => v?.toUpperCase().trim() || '',
  dateParse: (v: string) => {
    if (!v) return formatDate();
    const parts = v.split(/[-\/]/);
    if (parts.length !== 3) return v;
    const [d, m, y] = parts;
    return `${d}/${m}/${y}`; // Return standard format
  },
  parseInt: (v: string) => parseInt(v?.replace(/\D/g, '')) || 0,
  none: (v: string) => v || ''
};

// 1. Config Management (CRUD)

export async function fetchIntakeConfig(forceRefresh = false) {
  if (configCache && !forceRefresh) {
      return { success: true, ...configCache };
  }

  try {
    const [sourcesRes, mappingsRes, settingsRes] = await Promise.all([
      window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: MODULE_IDS.CONFIG,
        range: 'Intake_Sources!A2:F'
      }),
      window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: MODULE_IDS.CONFIG,
        range: 'Intake_Mappings!A2:I'
      }),
      window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: MODULE_IDS.CONFIG,
        range: 'APP_SETTINGS!A2:B'
      }).catch(() => ({ result: { values: [] } }))
    ]);
    
    const sources = (sourcesRes.result.values || []).map((r: any[], i: number) => ({
      layer: r[0] || '', 
      sheetId: r[1] || '', 
      tab: r[2] || '', 
      type: r[3] || 'Manual', 
      tags: r[4] ? r[4].split(',') : [], 
      isActive: r[5] === 'TRUE', 
      _rowIndex: i + 2
    })) as SourceConfig[];

    const mappings = (mappingsRes.result.values || []).map((r: any[]) => ({
      id: r[0], 
      sourceLayer: r[1], 
      sourceHeader: r[2], 
      intakeField: r[3],
      transform: r[4] || 'none', 
      isRequired: r[5] === 'TRUE',
      fallbackGroup: r[6] || '', 
      targetTable: r[7] || 'Leads', 
      notes: r[8] || ''
    })) as FieldMapRule[];

    const settings = Object.fromEntries(settingsRes.result.values || []);
    
    configCache = { sources, mappings, settings };
    return { success: true, sources, mappings, settings };
  } catch (e: any) {
    console.error("Config fetch error", e);
    return { success: false, sources: [], mappings: [], error: e.message };
  }
}

export const addSourceConfig = async (config: SourceConfig): Promise<boolean> => {
    const sheetId = MODULE_IDS.CONFIG;
    const row = [config.layer, config.sheetId, config.tab, config.type, config.tags.join(','), 'TRUE'];
    const success = await appendRow(sheetId, SHEET_NAME_INTAKE_SOURCES, row);
    if (success) configCache = null; // Invalidate cache
    return success;
};

export const updateSourceStatus = async (rowIndex: number, isActive: boolean): Promise<boolean> => {
    const success = await updateSourceRow(MODULE_IDS.CONFIG, SHEET_NAME_INTAKE_SOURCES, rowIndex - 1, [{ colIndex: 5, value: isActive ? 'TRUE' : 'FALSE' }]);
    if (success) configCache = null; // Invalidate cache
    return success;
};

export const deleteSourceConfig = async (rowIndex: number): Promise<boolean> => {
    const sheetId = MODULE_IDS.CONFIG;
    const range = `${SHEET_NAME_INTAKE_SOURCES}!A${rowIndex}:F${rowIndex}`;
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: sheetId,
            range: range
        });
        configCache = null; // Invalidate cache
        return true;
    } catch(e) { 
        console.error("Failed to delete source", e);
        return false; 
    }
};

export const saveFieldMappings = async (layerName: string, mappings: Partial<FieldMapRule>[]): Promise<boolean> => {
    const sheetId = MODULE_IDS.CONFIG;
    try {
        const range = `${SHEET_NAME_INTAKE_MAPPINGS}!A2:I`;
        const existingData = await loadSheetRange(sheetId, range);
        const keptRows = (existingData || []).filter(row => row[1] !== layerName);
        
        const newRows = mappings.map(m => [
            `fm-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            layerName, m.sourceHeader || '', m.intakeField || '', m.transform || '',
            m.isRequired ? 'TRUE' : 'FALSE', m.fallbackGroup || '', m.targetTable || 'Leads', m.notes || ''
        ]);
        
        await window.gapi.client.sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range });
        
        const finalRows = [...keptRows, ...newRows];
        if (finalRows.length > 0) {
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${SHEET_NAME_INTAKE_MAPPINGS}!A2`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: finalRows }
            });
        }
        configCache = null; // Invalidate cache
        return true;
    } catch (e) {
        console.error("Failed to save field mappings", e);
        return false;
    }
};

// 2. Scanning & Logic

export async function scanAllSources() {
  const config = await fetchIntakeConfig();
  if (!config.success) return { rows: [], stats: [], error: config.error };

  const allRows: IntakeRow[] = [];
  const stats: SourceStat[] = [];
  const activeSources = config.sources.filter(s => s.isActive);

  for (const source of activeSources) {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: source.sheetId,
        range: `${source.tab}!A1:ZZ`
      });
      
      const [headers, ...rows] = response.result.values || [];
      
      if (!headers || rows.length === 0) {
        stats.push({ name: source.layer, count: 0, status: 'empty' });
        continue;
      }
      
      const sourceMappings = config.mappings.filter(m => m.sourceLayer === source.layer);
      
      const idColIdx = headers.indexOf('crm_id');
      const statusColIdx = headers.indexOf('crm_status');

      const parsed = rows.map((row: any[], idx: number) => {
        // Skip already imported rows
        if (statusColIdx !== -1 && row[statusColIdx] === 'Imported') return null;

        const data: any = {
          id: `${source.layer}-${idx}-${Date.now()}`,
          sourceLayer: source.layer,
          sourceSheetId: source.sheetId,
          sourceTab: source.tab,
          sourceRowIndex: idx + 2, // 1-based index, +1 for header
          wbColIndex_Id: idColIdx,
          wbColIndex_Status: statusColIdx,
          rawData: {},
          date: formatDate(),
          source: source.type,
          companyName: '', contactPerson: '', number: '', email: '', city: '',
          estimatedQty: 0, productType: '', orderInfo: '', tags: '', info: '',
          channel: 'Direct', owner: 'Unassigned', status: 'New', stage: 'New', 
          remarks: '', intent: '', category: 'General'
        };

        headers.forEach((h: string, i: number) => {
            data.rawData[h] = row[i];
        });
        
        sourceMappings.forEach(map => {
          const colIdx = headers.indexOf(map.sourceHeader);
          if (colIdx !== -1 && row[colIdx] !== undefined) {
            const rawVal = String(row[colIdx]);
            const fn = transforms[map.transform as keyof typeof transforms] || transforms.none;
            data[map.intakeField] = fn(rawVal);
          }
        });
        
        const errors = [];
        if (!data.companyName && !data.contactPerson) errors.push('Missing Identity (Company or Name)');
        if (!data.number && !data.email) errors.push('Missing Contact Info');
        
        data.isValid = errors.length === 0;
        data.errors = errors;
        data.isDuplicate = false; 
        
        return data as IntakeRow;
      }).filter(Boolean) as IntakeRow[];
      
      allRows.push(...parsed);
      stats.push({ name: source.layer, count: parsed.length, status: 'ok' });
    } catch (e: any) {
      console.error(`Error scanning ${source.layer}:`, e);
      stats.push({ name: source.layer, count: 0, status: 'error' });
    }
  }
  
  return { rows: allRows, stats };
}

export async function checkDuplicates(rows: IntakeRow[]) {
  try {
    const existing = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: MODULE_IDS.CORE,
      range: 'Leads!C2:C' 
    });
    
    const phones = new Set(
      (existing.result.values || []).map((r: any[]) => r[0]?.replace(/\D/g, '').slice(-10)).filter(Boolean)
    );
    
    return rows.map(r => ({ 
      ...r, 
      isDuplicate: r.number ? phones.has(r.number.replace(/\D/g, '').slice(-10)) : false 
    }));
  } catch (e) {
    console.error("Duplicate check failed", e);
    return rows;
  }
}

export async function importRows(rows: IntakeRow[], currentUser: string = 'System') {
  const valid = rows.filter(r => r.isValid && !r.isDuplicate);
  if (valid.length === 0) return { successCount: 0, duplicateCount: 0, errors: [] };
  
  const timestamp = new Date().toISOString().split('T')[0];
  let successCount = 0;
  const errors: string[] = [];

  for (const row of valid) {
      // 1. Map IntakeRow to Lead object
      const leadId = `LEAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const leadPayload: Lead = {
          _rowIndex: -1, // New Row
          _identityRowIndex: -1, // New Row
          
          leadId: leadId,
          contactPerson: row.contactPerson || '',
          number: row.number || '',
          email: row.email || '',
          companyName: row.companyName || '',
          city: row.city || '',
          source: row.source || 'Import',
          category: row.category || 'General',
          createdBy: currentUser,
          tags: row.tags || '',
          identityStatus: 'Active',
          createdAt: new Date().toISOString(),
          leadScore: row.leadScore || '',
          remarks: row.remarks || '',
          sourceRowId: row.sourceRowId || '',
          info: row.info || '',
          
          flowId: `FLOW-${leadId}`,
          originalChannel: row.sourceLayer,
          channel: row.channel || 'Direct',
          owner: row.owner || 'Unassigned',
          ydsPoc: row.owner || 'Unassigned',
          status: 'New',
          stage: 'New',
          sourceFlowTag: '',
          updatedAt: new Date().toISOString(),
          startDate: row.startDate || timestamp,
          expectedCloseDate: row.expectedCloseDate || '',
          wonDate: '',
          lostDate: '',
          lostReason: '',
          notes: row.remarks || '',
          estimatedQty: row.estimatedQty || 0,
          productType: row.productType || '',
          printType: '',
          priority: row.priority || '',
          contactStatus: row.contactStatus || '',
          paymentUpdate: row.paymentUpdate || '',
          nextAction: 'Assign Owner', // Default action
          nextActionDate: '',
          intent: row.intent || '',
          customerType: row.customerType || '',
          
          // Defaults
          date: timestamp,
          orderInfo: row.orderInfo || '',
          contactAttempts: 0,
          lastContactDate: '',
          lastAttemptDate: '',
          slaStatus: 'Healthy',
          slaHealth: '🟢',
          daysOpen: '0',
          actionOverdue: 'OK',
          firstResponseTime: '',
          stageChangedDate: timestamp,
          platformType: '', integrationReady: '', storeUrl: '', accountCreated: '',
          dashboardLinkSent: '', onboardingStartedDate: '', activationDate: '',
          sampleRequired: '', sampleStatus: '', workflowType: '', designsReady: '',
          firstProductCreated: '', whatsappMessage: ''
      };

      // 2. Add to CORE Sheets
      const added = await addLead(leadPayload);
      
      if (added) {
          successCount++;
          
          // 3. Write-Back to Source (Mark as Imported)
          if (row.wbColIndex_Status !== undefined && row.wbColIndex_Status !== -1) {
              await updateSourceRow(
                  row.sourceSheetId, 
                  row.sourceTab, 
                  row.sourceRowIndex - 1, // 0-based index for API
                  [{ colIndex: row.wbColIndex_Status, value: 'Imported' }]
              ).catch(err => console.warn(`Write-back failed for ${row.id}`, err));
          }
      } else {
          errors.push(`Failed to write lead: ${row.companyName}`);
      }
  }
  
  return { 
    successCount, 
    duplicateCount: rows.filter(r => r.isDuplicate).length,
    errors
  };
}

export async function previewSource(source: SourceConfig, mappings: FieldMapRule[]) {
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: source.sheetId,
        range: `${source.tab}!A1:ZZ4`
    });
    
    const [headers, ...rows] = response.result.values || [];
    if (!headers || rows.length === 0) return { success: false, error: "No data found." };

    const results = rows.map((row: any[], idx: number) => {
        const rawData: Record<string, any> = {};
        headers.forEach((h: string, i: number) => { rawData[h] = row[i]; });

        const parsed: any = {
            id: `preview-${idx}`,
            rawData,
            isValid: false,
            errors: []
        };

        mappings.forEach(map => {
            const colIdx = headers.indexOf(map.sourceHeader);
            if (colIdx !== -1) {
                const val = String(row[colIdx] || '');
                const fn = transforms[map.transform as keyof typeof transforms] || transforms.none;
                parsed[map.intakeField] = fn(val);
            }
        });

        const errors = [];
        if (!parsed.companyName && !parsed.contactPerson) errors.push('Missing Identity');
        if (!parsed.number && !parsed.email) errors.push('Missing Contact');
        parsed.isValid = errors.length === 0;
        parsed.errors = errors;

        return { raw: rawData, parsed: parsed as IntakeRow };
    });

    return { success: true, results };
  } catch (e: any) {
      return { success: false, error: e.message };
  }
}

export const IntakeService = {
    fetchIntakeConfig,
    addSourceConfig,
    updateSourceStatus,
    deleteSourceConfig,
    saveFieldMappings,
    scanAllSources,
    checkDuplicates,
    importRows,
    previewSource
};
