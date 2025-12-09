
import { MODULE_IDS } from '../types';
import { INTAKE_SOURCES } from '../config/intakeSources';

// Transform functions
const transforms = {
  normalizePhone: (v: string) => v?.replace(/\D/g, '').slice(-10) || '',
  titleCase: (v: string) => v?.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '',
  lowerCase: (v: string) => v?.toLowerCase().trim() || '',
  parseInt: (v: string) => parseInt(v?.replace(/\D/g, '')) || 0,
  none: (v: string) => v || ''
};

// Helper for column letter
const getColumnLetter = (colIndex: number): string => {
    let temp, letter = '';
    while (colIndex >= 0) {
        temp = (colIndex) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = (colIndex - temp - 1) / 26; 
        if (colIndex < 0) break;
    }
    return letter;
};

export interface ScanResult {
  rows: any[];
  stats: { total: number; ready: number; invalid: number };
  error?: string;
  meta?: {
    sheetId: string;
    tabName: string;
    missingHeaders?: string[];
  };
}

export async function scanSource(sourceKey: 'commerce' | 'dropship' | 'tkw'): Promise<ScanResult> {
  const source = INTAKE_SOURCES[sourceKey];
  
  if (!window.gapi?.client?.sheets) {
      return {
          rows: [],
          stats: { total: 0, ready: 0, invalid: 0 },
          error: "Google API not initialized. Please refresh.",
          meta: { sheetId: source.sheetId, tabName: source.tab }
      };
  }

  try {
    // 1. Fetch Headers First (Validation Step)
    const headerResponse = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: source.sheetId,
      range: `${source.tab}!1:1`
    });

    const headers = headerResponse.result.values?.[0] || [];
    
    // 2. Validate Headers against Config
    const requiredConfigHeaders = Object.keys(source.mappings).filter(k => source.mappings[k].required);
    const missingHeaders = requiredConfigHeaders.filter(req => !headers.includes(req));

    if (missingHeaders.length > 0) {
      return { 
        rows: [], 
        stats: { total: 0, ready: 0, invalid: 0 },
        error: `Schema Mismatch: Missing required columns in '${source.tab}'`,
        meta: { sheetId: source.sheetId, tabName: source.tab, missingHeaders }
      };
    }

    // 3. Fetch Data
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: source.sheetId,
      range: `${source.tab}!A2:ZZ`
    });
    
    const rows = response.result.values || [];
    
    // Find writeback column indices for filtering already imported rows
    const statusColIdx = headers.indexOf('crm_status');
    
    const results = rows.map((row: any[], idx: number) => {
      // Skip already imported
      if (statusColIdx !== -1 && row[statusColIdx] === 'Imported') return null;
      
      const intakeRow: any = {
        id: `${sourceKey}-${idx}`,
        sourceKey,
        sourceName: source.name,
        sourceRowIndex: idx + 2, // 1-based index, +1 for header
        rawData: {},
        errors: []
      };
      
      // Apply mappings
      Object.entries(source.mappings).forEach(([header, config]) => {
        const colIdx = headers.indexOf(header);
        if (colIdx === -1) return;
        
        const value = row[colIdx];
        const transform = transforms[config.transform as keyof typeof transforms] || transforms.none;
        intakeRow[config.field] = transform(value);
        intakeRow.rawData[header] = value;
        
        // Check required fields (internal validation)
        if (config.required && !intakeRow[config.field]) {
          intakeRow.errors.push(`Empty ${header}`);
        }
      });
      
      // Validate Logic
      const hasIdentity = intakeRow.companyName || intakeRow.contactPerson;
      const hasContact = intakeRow.number || intakeRow.email;
      intakeRow.isValid = hasIdentity && hasContact && intakeRow.errors.length === 0;
      
      return intakeRow;
    }).filter(Boolean);
    
    const stats = {
      total: results.length,
      ready: results.filter((r: any) => r.isValid).length,
      invalid: results.filter((r: any) => !r.isValid).length
    };
    
    return { rows: results, stats, meta: { sheetId: source.sheetId, tabName: source.tab } };

  } catch (e: any) {
    console.error("Scan Source Error:", e);
    
    let errorMsg = "Connection Failed";
    // Enhance error detail based on status
    if (e.status === 403) errorMsg = "Permission Denied: User cannot access this sheet.";
    if (e.status === 404) errorMsg = "Sheet Not Found: The Spreadsheet ID is incorrect.";
    if (e.status === 400) errorMsg = "Bad Request: Check if Tab Name exists.";
    if (e.result?.error?.message) errorMsg = e.result.error.message;

    return { 
      rows: [], 
      stats: { total: 0, ready: 0, invalid: 0 },
      error: errorMsg,
      meta: { sheetId: source.sheetId, tabName: source.tab }
    };
  }
}

export async function checkDuplicates(rows: any[], existingLeads: any[]) {
  const phones = new Set(
    existingLeads.map(l => l.number?.replace(/\D/g, '').slice(-10)).filter(Boolean)
  );
  
  return rows.map((r: any) => ({
    ...r,
    isDuplicate: r.number ? phones.has(r.number.replace(/\D/g, '').slice(-10)) : false
  }));
}

export async function importRows(rows: any[], currentUser: string = 'System') {
  const valid = rows.filter((r: any) => r.isValid && !r.isDuplicate);
  if (valid.length === 0) return { successCount: 0, errors: [] };
  
  const timestamp = new Date().toISOString().split('T')[0];
  const leadsRows: any[] = [];
  const flowsRows: any[] = [];
  const rowIdMap = new Map();
  
  valid.forEach(row => {
    const leadId = `YDS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
    const flowId = `FLOW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
    
    rowIdMap.set(row.id, leadId);

    // Leads row (A-P, 16 cols)
    leadsRows.push([
      leadId,
      row.contactPerson || '',
      row.number || '',
      row.email || '',
      row.companyName || '',
      row.city || '',
      row.sourceName || '',
      row.category || '',
      currentUser,
      row.tags || '',
      'Active',
      timestamp,
      '',
      row.remarks || '',
      row.sourceRowId || '',
      ''
    ]);
    
    // LEAD_FLOWS row (A-AA, 27 cols)
    flowsRows.push([
      flowId,
      leadId,
      row.sourceName || '',
      row.channel || 'Direct',
      row.owner || 'Unassigned',
      'New',
      row.stage || 'New',
      '',
      timestamp,
      timestamp,
      '',
      '',
      '',
      '',
      '',
      row.notes || '',
      row.estimatedQty || 0,
      row.productType || '',
      row.printType || '',
      row.priority || '',
      row.contactStatus || '',
      row.paymentUpdate || '',
      '',
      '',
      row.intent || '',
      row.category || '',
      ''
    ]);
  });
  
  // Write to sheets
  try {
    await Promise.all([
        window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: MODULE_IDS.CORE,
        range: 'Leads!A:P',
        valueInputOption: 'USER_ENTERED',
        resource: { values: leadsRows }
        }),
        window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: MODULE_IDS.CORE,
        range: 'LEAD_FLOWS!A:AA',
        valueInputOption: 'USER_ENTERED',
        resource: { values: flowsRows }
        })
    ]);
    
    // Writeback to sources
    for (const row of valid) {
        const source = INTAKE_SOURCES[row.sourceKey as keyof typeof INTAKE_SOURCES];
        const leadId = rowIdMap.get(row.id);

        const headerRes = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: source.sheetId,
            range: `${source.tab}!1:1`
        });
        const headers = headerRes.result.values?.[0] || [];
        const statusIdx = headers.indexOf('crm_status');
        const leadIdIdx = headers.indexOf('yds_lead_id');
        const processedAtIdx = headers.indexOf('crm_processed_at');
        const processedByIdx = headers.indexOf('crm_processed_by');

        const updates = [];
        if (statusIdx !== -1) updates.push({ col: statusIdx, val: 'Imported' });
        if (leadIdIdx !== -1) updates.push({ col: leadIdIdx, val: leadId });
        if (processedAtIdx !== -1) updates.push({ col: processedAtIdx, val: timestamp });
        if (processedByIdx !== -1) updates.push({ col: processedByIdx, val: currentUser });

        if (updates.length > 0) {
             const data = updates.map(u => ({
                 range: `${source.tab}!${getColumnLetter(u.col)}${row.sourceRowIndex}`,
                 values: [[u.val]]
             }));
             
             await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
                 spreadsheetId: source.sheetId,
                 resource: { valueInputOption: 'USER_ENTERED', data }
             });
        }
    }
  } catch (e: any) {
      console.error(e);
      return { successCount: 0, errors: [e.message] };
  }
  
  return { successCount: valid.length, errors: [] };
}

// Deprecated stubs to prevent crashes in old components if still loaded
export const IntakeService = {
    scanSource,
    checkDuplicates,
    importRows,
    fetchIntakeConfig: async () => ({ success: true, sources: [], mappings: [] }),
    addSourceConfig: async () => false,
    updateSourceStatus: async () => false,
    deleteSourceConfig: async () => false,
    saveFieldMappings: async () => false,
    scanAllSources: async () => ({ rows: [], stats: [] }),
    previewSource: async () => ({ success: false })
};
