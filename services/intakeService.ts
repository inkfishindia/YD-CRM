
import { 
    fetchIntakeConfig, fetchDynamicSheet, addLead, updateSourceRow, SOURCE_CONFIG,
    MODULE_IDS, appendToSheet, fetchAllLeads, getNextLeadNumber, HEADER_LEAD_CSV, HEADER_LEAD_FLOW_CSV
} from './sheetService';
import { 
    IntakeRow, FieldMapRule, Lead, SourceConfig, 
    formatDate, addDaysToDate
} from '../types';

// --- TRANSFORM HELPERS ---
const transforms = {
    normalizePhone: (val: string) => val ? String(val).replace(/\D/g, '').slice(-10) : '',
    normalizeQty: (val: string) => parseInt(String(val).replace(/\D/g, '')) || 0,
    mapSource: (val: string) => val ? String(val).trim() : 'Vendor',
    lowerCase: (val: string) => val ? String(val).toLowerCase().trim() : '',
    titleCase: (val: string) => val ? String(val).replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) : '',
    dateParse: (val: string) => {
        if (!val) return formatDate();
        const cleanVal = String(val).trim();
        // Handle common formats
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
    boolify: (val: string) => {
        const v = String(val).toLowerCase();
        return (v === 'yes' || v === 'true' || v === '1') ? 'Yes' : 'No';
    }
};

const applyTransform = (value: any, transform: string): any => {
    const fn = transforms[transform as keyof typeof transforms];
    return fn ? fn(String(value)) : value;
};

// --- CORE: PARSER ---
const parseRow = (rawData: any[], headers: string[], sourceConfig: SourceConfig, rules: FieldMapRule[], metadataIndices: any, rowIndex: number): IntakeRow => {
    
    const rowMap: Record<string, any> = {};
    const rawObj: Record<string, any> = {};
    
    // Create map of Header Name -> Value
    headers.forEach((h, i) => {
        if (h) rawObj[h.toLowerCase().trim()] = rawData[i];
    });
    
    // Apply rules
    const relevantRules = rules.filter(r => r.sourceLayer === sourceConfig.layer);

    relevantRules.forEach(rule => {
        const headerKey = rule.sourceHeader.toLowerCase().trim();
        const val = rawObj[headerKey];
        if (val !== undefined && val !== null) {
            rowMap[rule.intakeField] = rule.transform ? applyTransform(val, rule.transform) : String(val).trim();
        }
    });
    
    // Validate required fields
    const company = rowMap['companyName'] || '';
    const name = rowMap['contactPerson'] || '';
    const errors: string[] = [];
    
    if (!company && !name) {
        errors.push("Identity missing (company or name required)");
    }
    
    return {
        id: `INTAKE-${Math.random().toString(36).substr(2, 9)}`,
        sourceLayer: sourceConfig.layer,
        sourceSheetId: sourceConfig.sheetId,
        sourceTab: sourceConfig.tab,
        sourceRowIndex: rowIndex,
        
        wbColIndex_Id: metadataIndices.id,
        wbColIndex_Status: metadataIndices.status,
        wbColIndex_ProcessedAt: metadataIndices.at,
        wbColIndex_ProcessedBy: metadataIndices.by,
        
        // Mapped Fields
        companyName: company,
        contactPerson: name,
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
        orderInfo: '',
        tags: '',
        
        rawData: rawObj,
        isValid: errors.length === 0,
        errors,
        importStatus: errors.length === 0 ? 'Pending' : 'Error'
    };
};

export interface SourceStat {
    name: string;
    type: string;
    count: number;
    status: 'ok' | 'error' | 'empty';
    lastSync: string;
}

export const IntakeService = {
    getConfig: async () => {
        // Use the new specific function
        return await fetchIntakeConfig();
    },

    previewSource: async (sourceConfig: SourceConfig, fieldMaps: FieldMapRule[]): Promise<{ success: boolean, results: { raw: any, parsed: IntakeRow }[], error?: string }> => {
        try {
            const res = await fetchDynamicSheet(sourceConfig.sheetId, sourceConfig.tab);
            if (!res.success) return { success: false, results: [], error: 'Failed to load sheet data. Check ID and Tab name.' };

            const { headers, rows } = res;
            if (rows.length === 0) return { success: false, results: [], error: 'Sheet is empty.' };

            const sampleRows = rows.slice(0, 3);
            const metadataIndices = { id: -1, status: -1, at: -1, by: -1 };

            const results = sampleRows.map((row, idx) => {
                const parsed = parseRow(row, headers, sourceConfig, fieldMaps, metadataIndices, idx + 2);
                const raw: Record<string, any> = {};
                headers.forEach((h, i) => { if(h) raw[h] = row[i]; });
                return { raw, parsed };
            });

            return { success: true, results };
        } catch (e: any) {
            return { success: false, results: [], error: e.message };
        }
    },

    scanSources: async (): Promise<{ rows: IntakeRow[], sourceStats: SourceStat[], errors: string[], headersMap: Record<string, string[]> }> => {
        let config;
        try {
            config = await IntakeService.getConfig();
        } catch (e) {
            return { rows: [], sourceStats: [], errors: ["Failed to load configuration."], headersMap: {} };
        }

        const allRows: IntakeRow[] = [];
        const systemErrors: string[] = [];
        const stats: SourceStat[] = [];
        const headersMap: Record<string, string[]> = {};

        // Only scan active sources
        const activeSources = config.sources.filter(s => s.isActive);

        const results = await Promise.all(activeSources.map(async (source) => {
            const data = await fetchDynamicSheet(source.sheetId, source.tab);
            return { source, data };
        }));

        results.forEach(res => {
            if (!res.data.success) {
                systemErrors.push(`Failed to access sheet: ${res.source.layer} (${res.source.tab})`);
                stats.push({ name: res.source.layer, type: res.source.type, count: 0, status: 'error', lastSync: new Date().toLocaleTimeString() });
                return;
            }

            const { headers, rows } = res.data;
            headersMap[res.source.layer] = headers || [];
            
            const validRows: IntakeRow[] = [];
            
            // Helper to find column indices
            const findIdx = (names: string[]) => headers.findIndex(h => names.some(n => n.toLowerCase() === h.toLowerCase().trim()));
            
            const metadataIndices = {
                id: findIdx(['yds_lead_id', 'yds lead id', 'YDS LEAD ID', 'crm_id']),
                status: findIdx(['YDC - Status', 'Lead Status', 'crm_status', 'import_status', 'status']),
                at: findIdx(['crm_processed_at', 'processed_at']),
                by: findIdx(['crm_processed_by', 'processed_by'])
            };

            rows.forEach((row, idx) => {
                if (row.length === 0 || !row[0]) return;
                const actualRowIndex = idx + 2; 
                
                // Skip if already imported
                if (metadataIndices.status !== -1) {
                    const status = String(row[metadataIndices.status] || '').trim().toLowerCase();
                    if (status === 'imported' || status === 'ignored') return;
                }

                // Skip if ID exists
                if (metadataIndices.id !== -1) {
                    const existingId = row[metadataIndices.id];
                    if (existingId && (String(existingId).includes('YDS-') || String(existingId).includes('LEAD-'))) return;
                }

                const parsed = parseRow(row, headers, res.source, config.fieldMaps, metadataIndices, actualRowIndex);
                if (parsed) {
                    validRows.push(parsed);
                }
            });

            allRows.push(...validRows);
            stats.push({ 
                name: res.source.layer, 
                type: res.source.type, 
                count: validRows.length, 
                status: validRows.length > 0 ? 'ok' : 'empty', 
                lastSync: new Date().toLocaleTimeString() 
            });
        });

        return { rows: allRows, sourceStats: stats, errors: systemErrors, headersMap };
    },

    ignoreRow: async (row: IntakeRow): Promise<boolean> => {
        if (row.wbColIndex_Status === -1) return false; 
        
        const now = new Date().toLocaleString();
        const updates = [
            { colIndex: row.wbColIndex_Status, value: 'Ignored' },
            { colIndex: row.wbColIndex_ProcessedAt, value: now },
            { colIndex: row.wbColIndex_ProcessedBy, value: 'Manual' }
        ].filter(u => u.colIndex !== -1);
        
        await updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex - 1, updates);
        return true;
    },

    pushToCRM: async (rows: IntakeRow[]): Promise<{ successCount: number, failedCount: number, errors: string[], duplicateCount: number }> => {
        let success = 0, failed = 0, duplicates = 0;
        const errors: string[] = [];
        const now = formatDate();
        
        // 1. Fetch Existing to check duplicates
        const existingLeads = await fetchAllLeads();
        
        const isDuplicate = (row: IntakeRow, db: Lead[]) => {
            const inPhone = row.number ? String(row.number).replace(/\D/g, '') : '';
            const inEmail = row.email ? String(row.email).toLowerCase().trim() : '';
            return db.some(l => {
                const dbPhone = l.number ? String(l.number).replace(/\D/g, '') : '';
                const dbEmail = l.email ? String(l.email).toLowerCase().trim() : '';
                return (inPhone.length > 6 && dbPhone.includes(inPhone)) || (inEmail.length > 4 && dbEmail === inEmail);
            });
        };

        for (const row of rows) {
            try {
                if (isDuplicate(row, existingLeads)) {
                    duplicates++;
                    continue; // Skip dupes
                }

                const nextNum = await getNextLeadNumber();
                const leadId = `YDS-${String(nextNum).padStart(4, '0')}`;
                const flowId = `FLOW-${String(nextNum).padStart(4, '0')}`;
                
                // Construct Rows
                const leadsRow = [
                    leadId,
                    row.contactPerson || row.companyName,
                    row.number,
                    row.email,
                    row.companyName,
                    row.city,
                    row.source,
                    row.category,
                    'System',
                    '',
                    'New',
                    now,
                    '',
                    row.remarks,
                    row.sourceRowId,
                    ''
                ];
                
                const closeDate = addDaysToDate(14);
                const flowsRow = [
                    flowId, leadId,
                    row.sourceLayer.includes('Commerce') ? 'Dropshipping' : 'B2B',
                    row.sourceLayer.includes('Commerce') ? 'Dropshipping' : 'B2B',
                    'Unassigned', 'Active', 'New', row.source,
                    now, now, now, closeDate,
                    '', '', '', `Imported from ${row.sourceLayer}`,
                    row.estimatedQty, row.productType, '', '', '', '', '', '', '', row.category, ''
                ];
                
                const ok1 = await appendToSheet(MODULE_IDS.CORE, 'Leads', [leadsRow]);
                const ok2 = await appendToSheet(MODULE_IDS.CORE, 'LEAD_FLOWS', [flowsRow]);
                
                if (ok1 && ok2) {
                    success++;
                    
                    // Update in-memory duplication check for subsequent rows in this batch
                    existingLeads.push({ 
                        leadId, number: row.number, email: row.email 
                    } as Lead);

                    // Write Back
                    const updates = [];
                    if (row.wbColIndex_Id !== -1) updates.push({ colIndex: row.wbColIndex_Id, value: leadId });
                    if (row.wbColIndex_Status !== -1) updates.push({ colIndex: row.wbColIndex_Status, value: 'Imported' });
                    if (row.wbColIndex_ProcessedAt !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedAt, value: now });
                    if (row.wbColIndex_ProcessedBy !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedBy, value: 'System' });

                    if (updates.length > 0) {
                        // row index in sheet is 0-based, data often starts at 1 (header), row index from scan logic is usually exact line number or adjusted.
                        // Our parser sets sourceRowIndex as actual row number (1-based). API uses 0-based index. So -1.
                        await updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex - 1, updates);
                    }
                } else {
                    failed++;
                    errors.push(`Failed to append rows for ${row.companyName}`);
                }
            } catch (e: any) {
                console.error('Import error:', e);
                failed++;
                errors.push(`Error importing ${row.companyName}: ${e.message}`);
            }
        }
        
        return { successCount: success, failedCount: failed, errors, duplicateCount: duplicates };
    }
};
