
import { 
    fetchIntakeConfig, fetchDynamicSheet, addLead, addActivityLog, updateSourceRow, SOURCE_CONFIG,
    writeToLeadsSheet, writeToLeadFlowsSheet, writeBackToSourceSheet
} from './sheetService';
import { 
    IntakeRow, FieldMapRule, Lead, SourceConfig, 
    formatDate 
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
    
    // Check Status Column first (if mapped)
    if (metadataIndices.status !== -1) {
        const status = String(rawData[metadataIndices.status] || '').trim().toLowerCase();
        if (status === 'imported' || status === 'ignored') {
            return null; // Skip handled rows
        }
    }

    // Fallback: Check Write-Back ID Column
    if (metadataIndices.id !== -1) {
        const existingId = rawData[metadataIndices.id];
        // Only skip if the ID looks like a CRM ID (e.g., YDS- or LEAD-)
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

    const company = rowMap['company'] || rowMap['companyName'] || findVal(['company', 'company_name', 'business name', 'company / brand']);
    const contact = rowMap['full_name'] || rowMap['contactPerson'] || findVal(['contact', 'contact person', 'name', 'lead name', 'first name']);
    
    if (!company && !contact) errors.push("Identity missing (Company or Name required)");
    
    // Stable ID generation
    const stableId = `${sourceConfig.sheetId}-${sourceConfig.tab}-${rowIndex}`;

    return {
        id: stableId, // Use stable ID
        sourceLayer: sourceConfig.layer,
        sourceSheetId: sourceConfig.sheetId,
        sourceTab: sourceConfig.tab,
        sourceRowIndex: rowIndex,
        
        wbColIndex_Id: metadataIndices.id === -1 ? headers.length : metadataIndices.id, 
        wbColIndex_Status: metadataIndices.status,
        wbColIndex_ProcessedAt: metadataIndices.at,
        wbColIndex_ProcessedBy: metadataIndices.by,
        
        // Identity
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

        // Flow
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
        
        // Dropship / Specifics
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

const generateLeadId = () => {
    return `YDS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
};

export const IntakeService = {
    getConfig: async () => {
        const res = await fetchIntakeConfig();
        if (res.success) {
            let sources = res.sources;
            // Fallback for empty sources from sheet, use Hardcoded SOURCE_CONFIG
            if (sources.length === 0) {
                sources = Object.entries(SOURCE_CONFIG).map(([key, cfg]) => ({
                    layer: key, // Use Key (e.g., 'Commerce') not cfg.name ('Commerce Leads')
                    sheetId: cfg.id,
                    tab: cfg.sheetName || 'Sheet1',
                    type: key === 'TKW' ? 'Vendor' : 'Commerce', 
                    tags: []
                }));
            }
            return { sources, fieldMaps: res.fieldMaps };
        }
        // If config fails, try basic fallback
        const sources = Object.entries(SOURCE_CONFIG).map(([key, cfg]) => ({
            layer: key,
            sheetId: cfg.id,
            tab: cfg.sheetName || 'Sheet1',
            type: 'Manual',
            tags: []
        }));
        return { sources, fieldMaps: [] };
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
            
            // Helper to find column index case-insensitively
            const findIdx = (names: string[]) => headers.findIndex(h => names.some(n => n.toLowerCase() === h.toLowerCase().trim()));
            
            // CRITICAL: Identify WRITE-BACK Columns. 
            const metadataIndices = {
                id: findIdx(['yds_lead_id', 'yds lead id', 'crm_id', 'crm_row_id', 'YDS LEAD ID']), 
                status: findIdx(['crm_status', 'status', 'import_status', 'yds_lead_status', 'YDC - Status']), 
                at: findIdx(['crm_processed_at', 'processed_at', 'import_date']),
                by: findIdx(['crm_processed_by', 'processed_by', 'imported_by'])
            };

            rows.forEach((row, idx) => {
                if (row.length === 0 || !row[0]) return;
                // Sheets are 1-based, and headers are row 1. Data starts at row 2. 
                // idx is 0-based index of the *rows* array (which excludes header).
                // So actual sheet row index = idx + 2 (1 for header + 1 for 0-base adjustment)
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
        
        // Ensure index is adjusted if fetch uses 0-based vs 1-based logic
        // updateSourceRow expects 0-based index of data rows usually? No, it's wrapper around batchUpdate.
        // Let's pass the index stored in IntakeRow which is 1-based sheet row index.
        // Wait, updateSourceRow takes rowIndex.
        // Let's check sheetService implementation. It uses `range: ...${rowIndex + 1}`.
        // If we passed actual sheet row index (e.g. 5), then updateSourceRow adds 1 making it 6. 
        // We should pass 0-based index relative to the sheet. 
        // parseRow stores actualRowIndex (e.g. 2, 3, 4...). 
        // If sheetService.updateSourceRow adds 1, we should pass row.sourceRowIndex - 1.
        
        await updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex - 1, updates);
        return true;
    },

    pushToCRM: async (rows: IntakeRow[]): Promise<{ successCount: number, failedCount: number, errors: string[] }> => {
        let success = 0;
        let failed = 0;
        const errors: string[] = [];
        const now = new Date().toLocaleString();
        const isoDate = new Date().toISOString();
        const user = 'ActiveUser'; // In real app, pass actual user

        for (const row of rows) {
            if (!row.isValid) {
                failed++;
                continue;
            }

            try {
                const leadId = generateLeadId();
                const flowId = `FLOW-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                
                const leadData: Lead = {
                    _rowIndex: -1, // New row
                    leadId,
                    flowId,
                    
                    // Identity
                    companyName: row.companyName,
                    contactPerson: row.contactPerson,
                    number: row.number,
                    email: row.email,
                    city: row.city,
                    source: row.source,
                    category: row.category || row.intent || 'Customisation', 
                    createdBy: user,
                    tags: row.tags,
                    identityStatus: 'Active',
                    createdAt: isoDate,
                    date: row.date || formatDate(), 
                    leadScore: row.leadScore,
                    remarks: row.remarks,
                    sourceRowId: row.sourceRowId || String(row.sourceRowIndex),
                    info: row.info,

                    // Flow
                    originalChannel: row.channel || '',
                    channel: row.channel || (row.sourceLayer.includes('Dropship') ? 'Dropshipping' : 'B2B'),
                    owner: row.owner || 'Unassigned',
                    ydsPoc: row.owner || 'Unassigned',
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
                    contactStatus: row.contactStatus || 'Not Contacted',
                    paymentUpdate: row.paymentUpdate || 'Pending',
                    nextAction: 'Assign Owner',
                    nextActionDate: row.nextActionDate || '',
                    intent: row.intent || '',
                    customerType: row.customerType || 'New',
                    
                    // UI Computed
                    orderInfo: row.orderInfo,
                    contactAttempts: 0,
                    lastContactDate: '',
                    lastAttemptDate: '',
                    slaStatus: 'Healthy',
                    slaHealth: '🟢',
                    daysOpen: '0',
                    actionOverdue: 'OK',
                    firstResponseTime: '',
                    stageChangedDate: isoDate,
                    
                    // DS
                    platformType: row.platformType,
                    integrationReady: row.integrationReady,
                    storeUrl: row.storeUrl,
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

                // Write to Sheets using new helpers
                const identitySuccess = await writeToLeadsSheet(leadData);
                const flowSuccess = await writeToLeadFlowsSheet(leadData);

                if (identitySuccess && flowSuccess) {
                    success++;
                    
                    // Write back to source sheet
                    const updates = [
                        { colIndex: row.wbColIndex_Id, value: leadId }
                    ];
                    
                    if (row.wbColIndex_Status !== -1) updates.push({ colIndex: row.wbColIndex_Status, value: 'Imported' });
                    if (row.wbColIndex_ProcessedAt !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedAt, value: now });
                    if (row.wbColIndex_ProcessedBy !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedBy, value: user });

                    await writeBackToSourceSheet(
                        row.sourceSheetId,
                        row.sourceTab,
                        row.sourceRowIndex - 1, // Adjust for 0-based
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
            }
        }

        return { successCount: success, failedCount: failed, errors };
    }
};
