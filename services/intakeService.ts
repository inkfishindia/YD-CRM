
import { 
    fetchIntakeConfig, fetchDynamicSheet, addLead, addActivityLog, updateSourceRow, SOURCE_CONFIG,
    writeToLeadsSheet, writeToLeadFlowsSheet, writeBackToSourceSheet, getNextLeadNumber, HARDCODED_FIELD_MAPS, MODULE_IDS
} from './sheetService';
import { 
    IntakeRow, FieldMapRule, Lead, SourceConfig, 
    formatDate, addDaysToDate
} from '../types';

// --- TRANSFORM HELPERS ---
const transforms = {
    normalizePhone: (val: string) => val ? String(val).replace(/\D/g, '') : '',
    normalizeQty: (val: string) => parseInt(String(val).replace(/\D/g, '')) || 0,
    mapSource: (val: string) => val ? String(val).trim() : 'Vendor',
    lowerCase: (val: string) => val ? String(val).toLowerCase().trim() : '',
    titleCase: (val: string) => val ? String(val).replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) : '',
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
    boolify: (val: string) => {
        const v = String(val).toLowerCase();
        return (v === 'yes' || v === 'true' || v === '1') ? 'Yes' : 'No';
    }
};

// --- CORE: PARSER ---
const parseRow = (
    rawData: any[], 
    headers: string[], 
    sourceConfig: SourceConfig, 
    rules: FieldMapRule[],
    metadataIndices: { id: number, status: number, at: number, by: number },
    rowIndex: number
): IntakeRow | null => {
    
    if (metadataIndices.status !== -1) {
        const status = String(rawData[metadataIndices.status] || '').trim().toLowerCase();
        if (status === 'imported' || status === 'ignored') {
            return null; 
        }
    }

    if (metadataIndices.id !== -1) {
        const existingId = rawData[metadataIndices.id];
        if (existingId && (String(existingId).includes('YDS-') || String(existingId).includes('LEAD-'))) {
            return null; 
        }
    }

    const layerRules = rules.filter(r => r.sourceLayer === sourceConfig.layer);
    const prioritizedRules = [...layerRules].reverse();

    const rowMap: Record<string, any> = {};
    const errors: string[] = [];
    const rawObj: Record<string, any> = {};
    const normalizedRawObj: Record<string, any> = {};

    headers.forEach((h, i) => {
        if (h) {
            rawObj[h] = rawData[i];
            normalizedRawObj[h.toLowerCase().trim()] = rawData[i];
        }
    });

    prioritizedRules.forEach(rule => {
        let val = rawObj[rule.sourceHeader];
        if (val === undefined && rule.sourceHeader) {
            val = normalizedRawObj[rule.sourceHeader.toLowerCase().trim()];
        }

        let transformedVal: string | number = '';
        if (val) {
            if (rule.transform && transforms[rule.transform as keyof typeof transforms]) {
                transformedVal = transforms[rule.transform as keyof typeof transforms](String(val));
            } else {
                transformedVal = String(val).trim();
            }
        }

        if (!rowMap[rule.intakeField] && transformedVal) {
             rowMap[rule.intakeField] = transformedVal;
        } else if (!rowMap[rule.intakeField]) {
             rowMap[rule.intakeField] = '';
        }
    });
    
    const requiredRules = layerRules.filter(r => r.isRequired);
    const requiredFields = new Set(requiredRules.map(r => r.intakeField));
    
    requiredFields.forEach(field => {
        if (!rowMap[field] || rowMap[field] === '' || rowMap[field] === 0) {
             errors.push(`${field} is required`);
        }
    });

    const findVal = (keys: string[]) => {
        for (const k of keys) {
            const val = normalizedRawObj[k.toLowerCase()];
            if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
        }
        return '';
    };

    const company = rowMap['companyName'] || findVal([
        'company_name',     // TKW
        'business name',    // Commerce
        'company / brand'   // Dropship
    ]);

    let contact = rowMap['contactPerson'] || findVal([
        'contact person',   // TKW
        'first name',       // Commerce
        'lead name'         // Dropship
    ]);

    const lastName = findVal(['last name']);
    if (contact && lastName) {
        contact = `${contact} ${lastName}`;
    }
    rowMap['contactPerson'] = contact;
    
    if (!company && !contact) errors.push("Identity missing (Company or Name required)");
    
    const stableId = `${sourceConfig.sheetId}-${sourceConfig.tab}-${rowIndex}`;

    return {
        id: stableId, 
        sourceLayer: sourceConfig.layer,
        sourceSheetId: sourceConfig.sheetId,
        sourceTab: sourceConfig.tab,
        sourceRowIndex: rowIndex,
        
        wbColIndex_Id: metadataIndices.id === -1 ? headers.length : metadataIndices.id, 
        wbColIndex_Status: metadataIndices.status,
        wbColIndex_ProcessedAt: metadataIndices.at,
        wbColIndex_ProcessedBy: metadataIndices.by,
        
        companyName: company,
        contactPerson: contact,
        number: rowMap['phone'] || rowMap['number'] || findVal(['phone', 'mobile', 'whatsapp', 'phone / whatsapp']),
        email: rowMap['email'] || findVal(['email']),
        city: rowMap['city'] || findVal(['city', 'location']),
        source: rowMap['source_refs'] || rowMap['source'] || sourceConfig.type,
        date: rowMap['created_at'] || rowMap['date'] || formatDate(),
        tags: rowMap['tags'] || '',
        leadScore: rowMap['lead_score'] || rowMap['leadScore'] || '',
        remarks: rowMap['note/description'] || rowMap['remarks'] || rowMap['comments'] || rowMap['yds comments'] || '',
        info: rowMap['Info'] || rowMap['info'] || '',
        sourceRowId: rowMap['sourceRowId'] || findVal(['lead_id', 'source_lead_id']) || '', 

        channel: rowMap['channel'] || '',
        owner: rowMap['owner'] || rowMap['created_by'] || findVal(['allocated to', 'yds - poc']) || '',
        status: rowMap['status'] || 'New',
        stage: rowMap['stage'] || 'New',
        startDate: rowMap['start_date'] || '',
        expectedCloseDate: rowMap['expected_close_date'] || '',
        notes: rowMap['notes'] || '',
        estimatedQty: parseInt(rowMap['estimated_qty'] || rowMap['estimatedQty'] || findVal(['est qty']) || '0') || 0,
        productType: rowMap['product_type'] || rowMap['productType'] || '',
        orderInfo: rowMap['order_information'] || rowMap['orderInfo'] || findVal(['requirement (verbatim)', 'order information']) || '', 
        printType: rowMap['print_type'] || rowMap['printType'] || '',
        priority: rowMap['priority'] || '',
        contactStatus: rowMap['contact_status'] || rowMap['contactStatus'] || '',
        paymentUpdate: rowMap['payment_update'] || rowMap['paymentUpdate'] || '',
        intent: rowMap['intent'] || '', 
        category: rowMap['category'] || rowMap['Category'] || findVal(['lead category', 'category']) || '', 
        customerType: rowMap['customer_type'] || rowMap['customerType'] || '',
        
        storeUrl: rowMap['store_url'] || findVal(['website/social url']) || '',
        platformType: rowMap['platform_type'] || findVal(['currently using']) || '',
        integrationReady: rowMap['integration_ready'] || '',
        nextActionDate: rowMap['nextActionDate'] || findVal(['next follow up', 'next_action_date']) || '',

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
        const res = await fetchIntakeConfig();
        if (res.success) {
            let sources = res.sources;
            if (sources.length === 0) {
                sources = Object.entries(SOURCE_CONFIG).map(([key, cfg]) => ({
                    layer: key, 
                    sheetId: cfg.id,
                    tab: cfg.sheetName || 'Sheet1',
                    type: key === 'TKW' ? 'Vendor' : 'Commerce', 
                    tags: []
                }));
            }
            return { sources, fieldMaps: res.fieldMaps.length > 0 ? res.fieldMaps : HARDCODED_FIELD_MAPS };
        }
        const sources = Object.entries(SOURCE_CONFIG).map(([key, cfg]) => ({
            layer: key,
            sheetId: cfg.id,
            tab: cfg.sheetName || 'Sheet1',
            type: 'Manual',
            tags: []
        }));
        return { sources, fieldMaps: HARDCODED_FIELD_MAPS };
    },

    previewSource: async (sourceConfig: SourceConfig, fieldMaps: FieldMapRule[]): Promise<{ success: boolean, results: { raw: any, parsed: IntakeRow }[], error?: string }> => {
        try {
            const res = await fetchDynamicSheet(sourceConfig.sheetId, sourceConfig.tab);
            if (!res.success) return { success: false, results: [], error: 'Failed to load sheet data. Check ID and Tab name.' };

            const { headers, rows } = res;
            if (rows.length === 0) return { success: false, results: [], error: 'Sheet is empty.' };

            // Take top 3 non-empty rows for preview
            const sampleRows = rows.slice(0, 3);
            
            // Mock metadata indices (-1 to force parse without skipping)
            const metadataIndices = { id: -1, status: -1, at: -1, by: -1 };

            const results = sampleRows.map((row, idx) => {
                const actualRowIndex = idx + 2;
                const parsed = parseRow(row, headers, sourceConfig, fieldMaps, metadataIndices, actualRowIndex);
                
                // Reconstruct Raw Data Map for UI display
                const raw: Record<string, any> = {};
                headers.forEach((h, i) => {
                    if(h) raw[h] = row[i];
                });

                return { raw, parsed };
            }).filter(item => item.parsed !== null) as { raw: any, parsed: IntakeRow }[];

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

        const results = await Promise.all(config.sources.map(async (source) => {
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
            
            const findIdx = (names: string[]) => headers.findIndex(h => names.some(n => n.toLowerCase() === h.toLowerCase().trim()));
            
            const metadataIndices = {
                id: findIdx([
                    'yds_lead_id', 'yds lead id', 'YDS LEAD ID', 'crm_id', 'crm_row_id'
                ]),
                status: findIdx([
                    'YDC - Status', 'Lead Status', 'crm_status', 'import_status', 'status'
                ]),
                at: findIdx([
                    'crm_processed_at', 'processed_at', 'import_date'
                ]),
                by: findIdx([
                    'crm_processed_by', 'processed_by', 'imported_by'
                ])
            };

            rows.forEach((row, idx) => {
                if (row.length === 0 || !row[0]) return;
                const actualRowIndex = idx + 2; 
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

    pushToCRM: async (rows: IntakeRow[]): Promise<{ successCount: number, failedCount: number, errors: string[] }> => {
        let success = 0;
        let failed = 0;
        const errors: string[] = [];
        const now = new Date().toLocaleString();
        const isoDate = new Date().toISOString();
        const user = 'ActiveUser'; 

        for (const row of rows) {
            try {
                // 1. Generate Lead ID
                const nextNum = await getNextLeadNumber();
                const leadId = `YDS-${String(nextNum).padStart(4, '0')}`;
                const flowId = `FLOW-${String(nextNum).padStart(4, '0')}`;
                
                // 2. Build Lead Object
                const leadData: Lead = {
                    _rowIndex: -1, 
                    leadId,
                    flowId,
                    
                    // Identity
                    companyName: row.companyName || '',
                    contactPerson: row.contactPerson || '',
                    number: row.number || '',
                    email: row.email || '',
                    city: row.city || '',
                    source: row.source || row.sourceLayer,
                    category: row.category || (row.sourceLayer.includes('Commerce') || row.sourceLayer.includes('DS') ? 'Dropshipping' : 'Customisation'),
                    createdBy: user,
                    tags: row.tags,
                    identityStatus: 'Active',
                    createdAt: isoDate,
                    date: row.date || formatDate(),
                    leadScore: row.leadScore || '',
                    remarks: row.remarks || '',
                    sourceRowId: row.sourceRowId || `${row.sourceLayer}.Row${row.sourceRowIndex}`,
                    info: row.info || '',

                    // Flow
                    originalChannel: row.channel || '',
                    channel: row.channel || (row.sourceLayer.includes('TKW') ? 'B2B' : row.sourceLayer.includes('Commerce') || row.sourceLayer.includes('DS') ? 'Dropshipping' : 'B2B'),
                    owner: row.owner || row.owner || 'Unassigned',
                    ydsPoc: row.owner || row.owner || 'Unassigned',
                    status: row.status || 'New',
                    stage: row.stage || 'New',
                    sourceFlowTag: row.sourceLayer,
                    updatedAt: isoDate,
                    startDate: row.startDate || isoDate,
                    expectedCloseDate: row.expectedCloseDate || '',
                    wonDate: '',
                    lostDate: '',
                    lostReason: '',
                    notes: row.notes || row.orderInfo || '',
                    estimatedQty: row.estimatedQty || 0,
                    productType: row.productType || '',
                    printType: row.printType || '',
                    priority: row.priority || '🟢 Low',
                    contactStatus: row.contactStatus || 'Pending',
                    paymentUpdate: row.paymentUpdate || '',
                    nextAction: 'Initial Contact',
                    nextActionDate: row.nextActionDate || addDaysToDate(1),
                    intent: row.intent || 'Unknown',
                    customerType: row.customerType || 'New',
                    
                    // Computed/UI
                    orderInfo: row.orderInfo || '',
                    contactAttempts: 0,
                    lastContactDate: '',
                    lastAttemptDate: '',
                    slaStatus: 'Pending',
                    slaHealth: '🟢',
                    daysOpen: '0d',
                    actionOverdue: 'OK',
                    firstResponseTime: '',
                    stageChangedDate: isoDate,
                    
                    // DS
                    platformType: row.platformType || '',
                    integrationReady: row.integrationReady || '',
                    storeUrl: row.storeUrl || '',
                    accountCreated: '',
                    dashboardLinkSent: '',
                    onboardingStartedDate: '',
                    activationDate: '',
                    sampleRequired: '',
                    sampleStatus: '',
                    workflowType: '',
                    designsReady: '',
                    firstProductCreated: '',
                    whatsappMessage: ''
                };

                const ok = await addLead(leadData);

                if (ok) {
                    success++;
                    
                    // 3. Write back to source sheet
                    const updates = [];
                    if (row.wbColIndex_Id !== -1) updates.push({ colIndex: row.wbColIndex_Id, value: leadId });
                    if (row.wbColIndex_Status !== -1) updates.push({ colIndex: row.wbColIndex_Status, value: 'Imported' });
                    if (row.wbColIndex_ProcessedAt !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedAt, value: now });
                    if (row.wbColIndex_ProcessedBy !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedBy, value: user });

                    await updateSourceRow(
                        row.sourceSheetId,
                        row.sourceTab,
                        row.sourceRowIndex - 1, 
                        updates
                    );

                    await addActivityLog({
                        logId: `LOG-${Date.now()}`,
                        leadId,
                        activityType: 'Import',
                        timestamp: now,
                        owner: 'System', 
                        notes: `Imported from ${row.sourceLayer}. Source Row: ${row.sourceRowIndex}`,
                        fromValue: '',
                        toValue: 'New'
                    });
                } else {
                    failed++;
                    errors.push(`Failed to write lead ${row.companyName}`);
                }
            } catch (e: any) {
                failed++;
                errors.push(`Error importing ${row.companyName}: ${e.message}`);
                console.error('Import error:', e);
            }
        }

        return { successCount: success, failedCount: failed, errors };
    }
};
