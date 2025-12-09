
import { MODULE_IDS, IntakeRow, FieldMapRule, SourceConfig, formatDate, addDaysToDate } from '../types';
import { getNextLeadNumber, updateSourceRow, fetchDynamicSheet, appendToSheet } from './sheetService';

export interface SourceStat {
  name: string;
  count: number;
  status: 'ok' | 'error';
}

const transforms = {
  normalizePhone: (v: string) => v?.replace(/\D/g, '').slice(-10) || '',
  titleCase: (v: string) => v?.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ') || '',
  lowerCase: (v: string) => v?.toLowerCase().trim() || '',
  dateParse: (v: string) => {
    if (!v) return formatDate(); 
    // Handle various date formats if needed, basic ISO return
    const [d, m, y] = v.split(/[-\/]/);
    if(d && m && y && y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return v;
  },
  parseInt: (v: string) => parseInt(v) || 0,
  none: (v: string) => v || ''
};

// Helper to map sheet row to FieldMapRule
const mapToRule = (r: any[]): FieldMapRule => ({
    id: r[0],
    sourceLayer: r[1],
    sourceHeader: r[2],
    intakeField: r[3],
    transform: r[4] || 'none',
    isRequired: r[5] === 'TRUE',
    fallbackGroup: r[6] || '',
    targetTable: (r[7] as any) || 'Leads',
    notes: r[8] || ''
});

export const IntakeService = {
    getConfig: async () => {
        try {
            const [sourcesRes, mapsRes, settingsRes] = await Promise.all([
                window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: MODULE_IDS.CONFIG, range: 'Intake_Sources!A2:F' }),
                window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: MODULE_IDS.CONFIG, range: 'Intake_Mappings!A2:I' }),
                window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: MODULE_IDS.CONFIG, range: 'APP_SETTINGS!A2:B' })
            ]);

            const sources: SourceConfig[] = (sourcesRes.result.values || []).map((r: any[], i: number) => ({
                layer: r[0], sheetId: r[1], tab: r[2], type: r[3], tags: r[4] ? r[4].split(',') : [], isActive: r[5] === 'TRUE', _rowIndex: i + 2
            }));

            const fieldMaps: FieldMapRule[] = (mapsRes.result.values || []).map(mapToRule);
            const settings = Object.fromEntries(settingsRes.result.values || []);

            return { success: true, sources, fieldMaps, settings };
        } catch (e) {
            console.error("Config Fetch Error", e);
            return { success: false, sources: [], fieldMaps: [], settings: {} };
        }
    },

    scanSources: async () => {
        const config = await IntakeService.getConfig();
        const activeSources = config.sources.filter(s => s.isActive);
        const allRows: IntakeRow[] = [];
        const stats: SourceStat[] = [];
        const errors: string[] = [];
        const headersMap: Record<string, string[]> = {};

        for (const source of activeSources) {
            try {
                const res = await fetchDynamicSheet(source.sheetId, source.tab);
                if (!res.success) {
                    errors.push(`${source.layer}: ${res.error || 'Failed to load'}`);
                    stats.push({ name: source.layer, count: 0, status: 'error' });
                    continue;
                }

                const { headers, rows } = res;
                headersMap[source.layer] = headers || [];
                const mappings = config.fieldMaps.filter(m => m.sourceLayer === source.layer);

                // Find metadata columns
                const statusIdx = headers.findIndex(h => ['crm_status', 'import_status', 'status'].includes(h.toLowerCase()));
                const idIdx = headers.findIndex(h => ['crm_id', 'yds_lead_id'].includes(h.toLowerCase()));
                
                const validRows: IntakeRow[] = [];

                rows.forEach((row, idx) => {
                    // Skip processed
                    if (statusIdx !== -1 && (row[statusIdx] === 'Imported' || row[statusIdx] === 'Ignored')) return;

                    const data: any = {
                        id: `INTAKE-${Date.now()}-${idx}-${source.layer}`,
                        sourceLayer: source.layer,
                        sourceSheetId: source.sheetId,
                        sourceTab: source.tab,
                        sourceRowIndex: idx + 2,
                        wbColIndex_Status: statusIdx,
                        wbColIndex_Id: idIdx,
                        rawData: {},
                        isValid: true,
                        errors: [],
                        // Defaults
                        date: formatDate(),
                        source: source.type
                    };

                    // Populate raw
                    headers.forEach((h, i) => data.rawData[h] = row[i]);

                    // Apply Mappings
                    mappings.forEach(map => {
                        const colIdx = headers.indexOf(map.sourceHeader);
                        if (colIdx !== -1) {
                            const fn = transforms[map.transform as keyof typeof transforms] || transforms.none;
                            data[map.intakeField] = fn(row[colIdx]);
                        }
                    });

                    // Basic Validation
                    const missing = [];
                    if (!data.companyName && !data.contactPerson) missing.push('Identity');
                    if (!data.number && !data.email) missing.push('Contact');
                    if (missing.length > 0) {
                        data.isValid = false;
                        data.errors = missing.map(m => `${m} missing`);
                    }

                    validRows.push(data as IntakeRow);
                });

                allRows.push(...validRows);
                stats.push({ name: source.layer, count: validRows.length, status: 'ok' });
            } catch (e: any) {
                errors.push(`${source.layer}: ${e.message}`);
                stats.push({ name: source.layer, count: 0, status: 'error' });
            }
        }

        return { rows: allRows, sourceStats: stats, errors, headersMap };
    },

    pushToCRM: async (rows: IntakeRow[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        const now = formatDate();
        const iso = new Date().toISOString();

        for (const row of rows) {
            try {
                const num = await getNextLeadNumber();
                const leadId = `YDS-${String(num).padStart(4, '0')}`;
                const flowId = `FLOW-${String(num).padStart(4, '0')}`;
                
                const r = row as any;
                
                // Mapped Schema Construction
                // We use standard schema order for appending.
                
                const identityRow = [
                    leadId, r.contactPerson, r.number, r.email, r.companyName, r.city, 
                    r.source, r.category, 'System', r.tags, 'Active', now, r.leadScore, r.remarks, r.sourceRowId, r.info
                ];

                const flowRow = [
                    flowId, leadId, row.sourceLayer, row.sourceLayer, r.owner || 'Unassigned', 'New', 'New',
                    r.source, iso, iso, now, addDaysToDate(14), '', '', '', r.remarks,
                    r.estimatedQty, r.productType, r.printType, r.priority, r.contactStatus, r.paymentUpdate, 
                    r.nextAction, r.nextActionDate, r.intent, r.category, r.customerType
                ];

                // Append Logic
                // We could use config.targetTable to split, but for safety in this version we push to both linked tables 
                // to maintain referential integrity of the app schema.
                
                await Promise.all([
                    appendToSheet(MODULE_IDS.CORE, 'Leads', [identityRow]),
                    appendToSheet(MODULE_IDS.CORE, 'LEAD_FLOWS', [flowRow])
                ]);

                // Writeback
                if (row.wbColIndex_Status !== undefined && row.wbColIndex_Status > -1) {
                    await updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex - 1, [
                        { colIndex: row.wbColIndex_Status, value: 'Imported' },
                        { colIndex: row.wbColIndex_Id, value: leadId }
                    ]);
                }

                success++;
            } catch (e: any) {
                failed++;
                errors.push(e.message);
            }
        }
        return { successCount: success, failedCount: failed, errors, duplicateCount: 0 };
    },

    ignoreRow: async (row: IntakeRow) => {
        if (row.wbColIndex_Status !== undefined && row.wbColIndex_Status > -1) {
             return await updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex - 1, [
                { colIndex: row.wbColIndex_Status, value: 'Ignored' }
            ]);
        }
        return false;
    },

    previewSource: async (sourceConfig: SourceConfig, fieldMaps: FieldMapRule[]) => {
        try {
            const res = await fetchDynamicSheet(sourceConfig.sheetId, sourceConfig.tab);
            if (!res.success) return { success: false, results: [], error: res.error };
            
            const { headers, rows } = res;
            const results = rows.slice(0, 3).map((row, idx) => {
                 const data: any = { rawData: {} };
                 headers.forEach((h, i) => data.rawData[h] = row[i]);
                 
                 fieldMaps.forEach(map => {
                     const colIdx = headers.indexOf(map.sourceHeader);
                     if (colIdx !== -1) {
                         const fn = transforms[map.transform as keyof typeof transforms] || transforms.none;
                         data[map.intakeField] = fn(row[colIdx]);
                     }
                 });
                 
                 // Basic validity check for preview
                 const isValid = !!(data.companyName || data.contactPerson);
                 
                 return { raw: data.rawData, parsed: { ...data, isValid, errors: isValid ? [] : ['Missing Identity'] } as IntakeRow };
            });
            return { success: true, results };
        } catch (e: any) {
            return { success: false, results: [], error: e.message };
        }
    }
};
