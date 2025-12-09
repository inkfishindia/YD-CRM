
import { MODULE_IDS, IntakeRow, FieldMapRule, SourceConfig, formatDate, Lead } from '../types';

export interface SourceStat {
  name: string;
  count: number;
  status: string;
}

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

// 1. Config Fetching
export async function fetchIntakeConfig() {
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

    return { success: true, sources, mappings, settings: Object.fromEntries(settingsRes.result.values || []) };
  } catch (e: any) {
    console.error("Config fetch error", e);
    return { success: false, sources: [], mappings: [], error: e.message };
  }
}

// 2. Scanning
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
      
      // Look for writeback columns if they exist
      const idColIdx = headers.indexOf('crm_id');
      const statusColIdx = headers.indexOf('crm_status');

      const parsed = rows.map((row: any[], idx: number) => {
        // Skip rows already imported if we can detect them
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
          // Defaults
          companyName: '', contactPerson: '', number: '', email: '', city: '',
          estimatedQty: 0, productType: '', orderInfo: '', tags: '', info: '',
          channel: 'Direct', owner: 'Unassigned', status: 'New', stage: 'New', 
          remarks: '', intent: '', category: 'General'
        };

        // Populate raw data for debugging/preview
        headers.forEach((h: string, i: number) => {
            data.rawData[h] = row[i];
        });
        
        // Apply mappings
        sourceMappings.forEach(map => {
          const colIdx = headers.indexOf(map.sourceHeader);
          if (colIdx !== -1 && row[colIdx] !== undefined) {
            const rawVal = String(row[colIdx]);
            const fn = transforms[map.transform as keyof typeof transforms] || transforms.none;
            data[map.intakeField] = fn(rawVal);
          }
        });
        
        // Basic Validation
        const errors = [];
        if (!data.companyName && !data.contactPerson) errors.push('Missing Identity (Company or Name)');
        if (!data.number && !data.email) errors.push('Missing Contact Info');
        
        data.isValid = errors.length === 0;
        data.errors = errors;
        data.isDuplicate = false; // Will be set by caller
        
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

// 3. Duplicate Checking
export async function checkDuplicates(rows: IntakeRow[]) {
  try {
    const existing = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: MODULE_IDS.CORE,
      range: 'Leads!C2:C' // Phone column
    });
    
    // Create a set of normalized phones for O(1) lookup
    const phones = new Set(
      (existing.result.values || []).map((r: any[]) => r[0]?.replace(/\D/g, '').slice(-10)).filter(Boolean)
    );
    
    return rows.map(r => ({ 
      ...r, 
      isDuplicate: r.number ? phones.has(r.number.replace(/\D/g, '').slice(-10)) : false 
    }));
  } catch (e) {
    console.error("Duplicate check failed", e);
    return rows; // Return unchecked on error
  }
}

// 4. Import Logic
export async function importRows(rows: IntakeRow[], currentUser: string = 'System') {
  const valid = rows.filter(r => r.isValid && !r.isDuplicate);
  if (valid.length === 0) return { successCount: 0, duplicateCount: 0, errors: [] };
  
  const timestamp = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  const leadsRows: any[] = [];
  const flowsRows: any[] = [];
  
  valid.forEach(row => {
    const leadId = `YDS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
    const flowId = `FLOW-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
    
    // --- IDENTITY TABLE (Leads) Schema ---
    // 0:leadId, 1:contactPerson, 2:number, 3:email, 4:companyName, 5:city, 6:source, 
    // 7:category, 8:createdBy, 9:tags, 10:status, 11:createdAt, 12:leadScore, 
    // 13:remarks, 14:sourceRowId, 15:info
    leadsRows.push([
      leadId,                           
      row.contactPerson || '',          
      row.number || '',                 
      row.email || '',                  
      row.companyName || '',            
      row.city || '',                   
      row.source || 'Import',           
      row.category || '',               
      currentUser,                      
      row.tags || '',                   
      'Active',                         
      timestamp,                        
      row.leadScore || '',              
      row.remarks || '',                
      row.sourceRowId || '',
      row.info || ''
    ]);
    
    // --- OPERATIONAL TABLE (LEAD_FLOWS) Schema ---
    // 0:flowId, 1:leadId, 2:originalChannel, 3:channel, 4:owner, 5:status, 6:stage, 
    // 7:sourceFlowTag, 8:createdAt, 9:updatedAt, 10:startDate, 11:expectedCloseDate, 
    // 12:wonDate, 13:lostDate, 14:lostReason, 15:notes, 16:estimatedQty, 
    // 17:productType, 18:printType, 19:priority, 20:contactStatus, 21:paymentUpdate, 
    // 22:nextAction, 23:nextActionDate, 24:intent, 25:category, 26:customerType
    flowsRows.push([
      flowId,                           
      leadId,                           
      row.sourceLayer || '',            
      row.channel || 'Direct',                
      row.owner || 'Unassigned',         
      'New', // Status
      'New', // Stage
      '',                               
      now,                              
      now,                              
      row.startDate || '',              
      row.expectedCloseDate || '',      
      '',                               
      '',                               
      '',                               
      row.remarks || '',                
      row.estimatedQty || 0,            
      row.productType || '',            
      '', // printType            
      row.priority || '',               
      row.contactStatus || '',          
      row.paymentUpdate || '',          
      '', // nextAction                               
      '', // nextActionDate                               
      row.intent || '',                 
      row.category || '',               
      row.customerType || ''            
    ]);
  });
  
  try {
      // Dual-write to CRM
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

      // Optional: Write back to source sheet if columns exist
      // We group updates by sheetId to minimize calls
      // (Simplified: In a real app we'd batch update each source sheet to set "Imported")

      return { 
        successCount: valid.length, 
        duplicateCount: rows.filter(r => r.isDuplicate).length,
        errors: []
      };
  } catch (e: any) {
      return { successCount: 0, duplicateCount: 0, errors: [e.message] };
  }
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

        // Validation
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
    scanAllSources,
    checkDuplicates,
    importRows,
    fetchIntakeConfig,
    previewSource
};
