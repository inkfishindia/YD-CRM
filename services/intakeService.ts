
import { 
    fetchIntakeConfig, fetchDynamicSheet, updateSourceRow, appendToSheet, 
    fetchAllLeads, getNextLeadNumber, MODULE_IDS
} from './sheetService';
import { 
    IntakeRow, FieldMapRule, Lead, SourceConfig, 
    formatDate, addDaysToDate
} from '../types';

export interface SourceStat {
    name: string;
    type: string;
    count: number;
    status: 'ok' | 'error' | 'empty';
    lastSync: string;
}

// --- TRANSFORMS ---
const transforms = {
    normalizePhone: (val: string) => val ? String(val).replace(/\D/g, '').slice(-10) : '',
    normalizeQty: (val: string) => parseInt(String(val).replace(/\D/g, '')) || 0,
    titleCase: (val: string) => val ? String(val).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '',
    lowerCase: (val: string) => val ? String(val).toLowerCase().trim() : '',
    dateParse: (val: string) => {
        if (!val) return formatDate();
        const cleanVal = String(val).trim();
        const dmyPattern = /^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/;
        const match = cleanVal.match(dmyPattern);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            let year = parseInt(match[3], 10);
            if (year < 100) year += 2000;
            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) return formatDate(d);
        }
        const d = new Date(cleanVal);
        return isNaN(d.getTime()) ? formatDate() : formatDate(d);
    },
    trim: (val: string) => val ? String(val).trim() : '',
    none: (val: string) => val || ''
};

const applyTransform = (value: any, transform: string): any => {
    const fn = transforms[transform as keyof typeof transforms] || transforms.none;
    return fn(String(value || ''));
};

// --- CORE PARSER ---
const parseRow = (rawData: any[], headers: string[], sourceConfig: SourceConfig, rules: FieldMapRule[], metadataIndices: any, rowIndex: number): IntakeRow => {
    const rawObj: Record<string, any> = {};
    headers.forEach((h, i) => {
        if (h) rawObj[h.toLowerCase().trim()] = rawData[i];
    });

    const rowMap: Record<string, any> = {};
    const relevantRules = rules.filter(r => r.sourceLayer === sourceConfig.layer);

    relevantRules.forEach(rule => {
        const headerKey = rule.sourceHeader.toLowerCase().trim();
        const val = rawObj[headerKey];
        if (val !== undefined) {
            rowMap[rule.intakeField] = rule.transform ? applyTransform(val, rule.transform) : String(val).trim();
        }
    });

    // Validations
    const errors: string[] = [];
    if (!rowMap['companyName'] && !rowMap['contactPerson']) errors.push("Identity missing");
    if (!rowMap['number'] && !rowMap['email']) errors.push("Contact info missing");

    return {
        id: `INTAKE-${Date.now()}-${rowIndex}`,
        sourceLayer: sourceConfig.layer,
        sourceSheetId: sourceConfig.sheetId,
        sourceTab: sourceConfig.tab,
        sourceRowIndex: rowIndex,
        
        wbColIndex_Id: metadataIndices.id,
        wbColIndex_Status: metadataIndices.status,
        wbColIndex_ProcessedAt: metadataIndices.at,
        wbColIndex_ProcessedBy: metadataIndices.by,

        // Mapped Fields
        companyName: rowMap['companyName'] || '',
        contactPerson: rowMap['contactPerson'] || '',
        number: rowMap['number'] || '',
        email: rowMap['email'] || '',
        city: rowMap['city'] || '',
        date: rowMap['date'] || formatDate(),
        sourceRowId: rowMap['sourceRowId'] || '',
        estimatedQty: parseInt(rowMap['estimatedQty'] || '0'),
        productType: rowMap['productType'] || '',
        category: rowMap['category'] || '',
        remarks: rowMap['remarks'] || '',
        source: rowMap['source'] || sourceConfig.type,
        
        // Defaults
        channel: '',
        owner: '',
        status: 'New',
        stage: 'New',
        startDate: '',
        expectedCloseDate: '',
        notes: '',
        printType: '',
        priority: '',
        contactStatus: '',
        paymentUpdate: '',
        intent: '',
        customerType: '',
        leadScore: '',
        info: '',
        storeUrl: '',
        platformType: '',
        integrationReady: '',
        nextActionDate: '',
        orderInfo: rowMap['orderInfo'] || '',
        tags: '',

        rawData: rawObj,
        isValid: errors.length === 0,
        errors,
        importStatus: 'Pending'
    };
};

function buildRow(data: any, mappings: FieldMapRule[], defaults: Record<string, any>) {
  const row: any[] = [];
  // Note: This relies on the order of mappings in the config sheet being correct for the destination table schema
  // We assume the Intake_Mappings sheet is configured with rows in the desired column order.
  mappings.forEach(m => {
    row.push(data[m.intakeField] || defaults[m.intakeField] || '');
  });
  return row;
}

export const IntakeService = {
    getConfig: async () => await fetchIntakeConfig(),

    scanSources: async (): Promise<{ rows: IntakeRow[], sourceStats: SourceStat[], errors: string[], headersMap: Record<string, string[]> }> => {
        const config = await IntakeService.getConfig();
        const allRows: IntakeRow[] = [];
        const stats: SourceStat[] = [];
        const headersMap: Record<string, string[]> = {};
        const systemErrors: string[] = [];

        const activeSources = config.sources.filter(s => s.isActive);

        for (const source of activeSources) {
            try {
                const res = await fetchDynamicSheet(source.sheetId, source.tab);
                if (!res.success) {
                    systemErrors.push(`Failed to access ${source.layer}: ${res.error || 'Unknown error'}`);
                    stats.push({ name: source.layer, type: source.type, count: 0, status: 'error', lastSync: new Date().toLocaleTimeString() });
                    continue;
                }

                const { headers, rows } = res;
                headersMap[source.layer] = headers || [];

                // Metadata Indices
                const findIdx = (names: string[]) => headers.findIndex(h => names.some(n => n.toLowerCase() === h.toLowerCase().trim()));
                const metadataIndices = {
                    id: findIdx(['crm_id', 'yds_lead_id']),
                    status: findIdx(['crm_status', 'import_status', 'status']),
                    at: findIdx(['crm_processed_at']),
                    by: findIdx(['crm_processed_by'])
                };

                const validRows: IntakeRow[] = [];
                rows.forEach((row, idx) => {
                    if (!row || row.length === 0) return;
                    
                    // Check status
                    if (metadataIndices.status !== -1) {
                        const status = String(row[metadataIndices.status] || '').toLowerCase();
                        if (status === 'imported' || status === 'ignored') return;
                    }

                    const parsed = parseRow(row, headers, source, config.fieldMaps, metadataIndices, idx + 2);
                    if (parsed) validRows.push(parsed);
                });

                allRows.push(...validRows);
                stats.push({ 
                    name: source.layer, 
                    type: source.type, 
                    count: validRows.length, 
                    status: validRows.length > 0 ? 'ok' : 'empty', 
                    lastSync: new Date().toLocaleTimeString() 
                });

            } catch (e: any) {
                systemErrors.push(`Error scanning ${source.layer}: ${e.message}`);
                stats.push({ name: source.layer, type: source.type, count: 0, status: 'error', lastSync: new Date().toLocaleTimeString() });
            }
        }

        return { rows: allRows, sourceStats: stats, errors: systemErrors, headersMap };
    },

    pushToCRM: async (rows: IntakeRow[]): Promise<{ successCount: number, failedCount: number, errors: string[], duplicateCount: number }> => {
        let success = 0, failed = 0, duplicates = 0;
        const errors: string[] = [];
        const now = formatDate();
        const isoNow = new Date().toISOString();
        
        // 1. Fetch Config & Existing
        const config = await fetchIntakeConfig();
        const existingLeads = await fetchAllLeads();
        const existingPhones = new Set(existingLeads.map(l => l.number?.replace(/\D/g, '')).filter(Boolean));
        const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase().trim()).filter(Boolean));

        for (const row of rows) {
            // Dedupe
            const phone = row.number?.replace(/\D/g, '');
            const email = row.email?.toLowerCase().trim();
            if ((phone && existingPhones.has(phone)) || (email && existingEmails.has(email))) {
                duplicates++;
                continue;
            }

            try {
                const num = await getNextLeadNumber();
                const leadId = `YDS-${String(num).padStart(4, '0')}`;
                const flowId = `FLOW-${String(num).padStart(4, '0')}`;
                
                // Get mappings for this source
                const mappings = config.fieldMaps.filter(m => m.sourceLayer === row.sourceLayer);
                
                // Build Leads row based on target_table
                const leadsFields = mappings.filter(m => 
                  m.targetTable === 'Leads' || m.targetTable === 'BOTH'
                );
                
                // We use defaults for system generated IDs if not mapped
                const defaults: any = {
                    leadId: leadId,
                    flowId: flowId,
                    createdAt: now,
                    updatedAt: isoNow,
                    startDate: now,
                    expectedCloseDate: addDaysToDate(14),
                    status: 'New',
                    stage: 'New',
                    channel: row.sourceLayer || 'Unknown',
                    owner: 'Unassigned',
                    createdBy: 'System',
                    identityStatus: 'Active'
                };
                
                // Merge row data into a single object accessible by intakeField keys
                // The 'row' object is an IntakeRow which has properties like 'companyName', 'number', etc.
                // We cast to any to access properties dynamically.
                const dataContext = { ...row, ...defaults } as any;

                const leadsRow = buildRow(dataContext, leadsFields, defaults);
                
                // Build LEAD_FLOWS row based on target_table
                const flowFields = mappings.filter(m => 
                  m.targetTable === 'LEAD_FLOWS' || m.targetTable === 'BOTH'
                );
                const flowRow = buildRow(dataContext, flowFields, defaults);

                // If mappings are empty (e.g. not configured), fallback to legacy hardcoded push to avoid data loss
                if (leadsFields.length === 0 || flowFields.length === 0) {
                     const legacyIdentityRow = [
                        leadId, row.contactPerson, row.number, row.email, row.companyName, row.city,
                        row.source, row.category, 'System', '', 'Active', now, '', row.remarks, row.sourceRowId, ''
                    ];
                    const legacyFlowRow = [
                        flowId, leadId, row.sourceLayer, row.sourceLayer, 'Unassigned', 'New', 'New',
                        row.source, isoNow, isoNow, now, addDaysToDate(14), '', '', '', row.remarks,
                        row.estimatedQty, row.productType, '', '', '', '', '', '', row.intent, row.category, ''
                    ];
                    await appendToSheet(MODULE_IDS.CORE, 'Leads', [legacyIdentityRow]);
                    await appendToSheet(MODULE_IDS.CORE, 'LEAD_FLOWS', [legacyFlowRow]);
                } else {
                    await Promise.all([
                        leadsRow.length > 0 ? appendToSheet(MODULE_IDS.CORE, 'Leads', [leadsRow]) : Promise.resolve(true),
                        flowRow.length > 0 ? appendToSheet(MODULE_IDS.CORE, 'LEAD_FLOWS', [flowRow]) : Promise.resolve(true)
                    ]);
                }

                // Writeback
                const updates = [];
                if (row.wbColIndex_Id !== -1) updates.push({ colIndex: row.wbColIndex_Id, value: leadId });
                if (row.wbColIndex_Status !== -1) updates.push({ colIndex: row.wbColIndex_Status, value: 'Imported' });
                if (row.wbColIndex_ProcessedAt !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedAt, value: isoNow });
                
                if (updates.length > 0) {
                    await updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex - 1, updates);
                }

                success++;
                // Update local dedupe cache
                if (phone) existingPhones.add(phone);
                if (email) existingEmails.add(email);

            } catch (e: any) {
                failed++;
                errors.push(`Failed to import ${row.companyName}: ${e.message}`);
            }
        }

        return { successCount: success, failedCount: failed, errors, duplicateCount: duplicates };
    },

    ignoreRow: async (row: IntakeRow): Promise<boolean> => {
        if (row.wbColIndex_Status === -1) return false;
        return updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex - 1, [
            { colIndex: row.wbColIndex_Status, value: 'Ignored' },
            { colIndex: row.wbColIndex_ProcessedAt, value: new Date().toISOString() }
        ]);
    },

    previewSource: async (sourceConfig: SourceConfig, fieldMaps: FieldMapRule[]): Promise<{ success: boolean, results: { raw: any, parsed: IntakeRow }[], error?: string }> => {
        try {
            const res = await fetchDynamicSheet(sourceConfig.sheetId, sourceConfig.tab);
            if (!res.success) return { success: false, results: [], error: 'Failed to load sheet.' };

            const { headers, rows } = res;
            if (rows.length === 0) return { success: false, results: [], error: 'Sheet empty.' };

            const metadataIndices = { id: -1, status: -1, at: -1, by: -1 };
            const results = rows.slice(0, 3).map((row, idx) => ({
                raw: row,
                parsed: parseRow(row, headers, sourceConfig, fieldMaps, metadataIndices, idx + 2)
            }));

            return { success: true, results };
        } catch (e: any) {
            return { success: false, results: [], error: e.message };
        }
    }
};
