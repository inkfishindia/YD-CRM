
import { 
    fetchIntakeConfig, fetchDynamicSheet, addLead, addActivityLog, updateSourceRow, SOURCE_CONFIG
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
    metadataIndices: { id: number, status: number, at: number, by: number }
): IntakeRow | null => {
    
    // Check Status Column first (if mapped)
    if (metadataIndices.status !== -1) {
        const status = String(rawData[metadataIndices.status] || '').trim().toLowerCase();
        if (status === 'imported' || status === 'ignored') {
            return null; // Skip handled rows
        }
    }

    // Fallback: Check Write-Back ID Column
    // Crucial: Only skip if a CRM ID is present (indicating import).
    // Do NOT skip if it's just the source's own lead_id (which usually maps to sourceRowId).
    if (metadataIndices.id !== -1) {
        const existingId = rawData[metadataIndices.id];
        // If this column is populated, it implies the system wrote back an ID.
        // We ensure `metadataIndices.id` ONLY points to specific CRM/Write-back headers in `scanSources`.
        if (existingId && String(existingId).trim().length > 0) {
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
    
    return {
        id: `INTAKE-${Math.random().toString(36).substr(2, 9)}`,
        sourceLayer: sourceConfig.layer,
        sourceSheetId: sourceConfig.sheetId,
        sourceTab: sourceConfig.tab,
        sourceRowIndex: -1, // Set later
        
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
        intent: rowMap['intent'] || rowMap['Category'] || rowMap['category'] || findVal(['lead category']) || '',
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
        throw new Error("Failed to load intake config.");
    },

    scanSources: async (): Promise<{ rows: IntakeRow[], sourceStats: SourceStat[], errors: string[], headersMap: Record<string, string[]> }> => {
        const config = await IntakeService.getConfig();
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
                id: findIdx(['yds_lead_id', 'yds lead id', 'crm_id', 'crm_row_id', 'YDS LEAD ID']), // Matches TKW, Commerce, Dropship writeback headers
                status: findIdx(['crm_status', 'status', 'import_status', 'yds_lead_status', 'YDC - Status']), // Matches YDC - Status
                at: findIdx(['crm_processed_at', 'processed_at', 'import_date']),
                by: findIdx(['crm_processed_by', 'processed_by', 'imported_by'])
            };

            rows.forEach((row, idx) => {
                if (row.length === 0 || !row[0]) return;
                const parsed = parseRow(row, headers, res.source, config.fieldMaps, metadataIndices);
                if (parsed) {
                    parsed.sourceRowIndex = idx + 1; // 0-based array index (API handles the +1 for sheet row)
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
        
        await updateSourceRow(row.sourceSheetId, row.sourceTab, row.sourceRowIndex, updates);
        return true;
    },

    pushToCRM: async (rows: IntakeRow[]): Promise<{ successCount: number, failedCount: number }> => {
        let success = 0;
        let failed = 0;
        const now = new Date().toLocaleString();
        const user = 'ActiveUser';

        for (const row of rows) {
            if (!row.isValid) {
                failed++;
                continue;
            }

            const leadId = `LEAD-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            const baseLead: Partial<Lead> = {
                leadId,
                // Identity
                companyName: row.companyName,
                contactPerson: row.contactPerson,
                number: row.number,
                email: row.email,
                city: row.city,
                source: row.source,
                sourceRowId: row.sourceRowId || String(row.sourceRowIndex), 
                date: row.date,
                tags: row.tags,
                info: row.info,
                remarks: row.remarks,
                leadScore: row.leadScore,
                
                // Flow
                estimatedQty: row.estimatedQty,
                productType: row.productType,
                printType: row.printType,
                orderInfo: row.orderInfo || row.notes,
                notes: row.notes,
                channel: row.channel,
                owner: row.owner,
                status: row.status || 'New',
                stage: row.stage || 'New',
                startDate: row.startDate,
                expectedCloseDate: row.expectedCloseDate,
                priority: row.priority || '🟢 Low',
                contactStatus: row.contactStatus,
                paymentUpdate: row.paymentUpdate,
                intent: row.intent,
                customerType: row.customerType,
                
                // Dropship / Specifics
                storeUrl: row.storeUrl,
                platformType: row.platformType,
                integrationReady: row.integrationReady,
                nextActionDate: row.nextActionDate, // Map Next Follow Up
                
                // System
                createdAt: formatDate(),
                updatedAt: formatDate(),
                contactAttempts: 0,
                daysOpen: '0d'
            };

            if (!baseLead.channel) {
                baseLead.channel = (row.sourceLayer.includes('TKW') ? 'B2B' : 
                                   row.sourceLayer.includes('Commerce') || row.sourceLayer.includes('DS') ? 'Dropshipping' : 'B2B');
            }
            if (!baseLead.category) {
                baseLead.category = baseLead.channel === 'Dropshipping' ? 'Dropshipping' : 'Customisation';
            }

            const ok = await addLead(baseLead);
            
            if (ok) {
                success++;
                
                const updates = [
                    { colIndex: row.wbColIndex_Id, value: leadId }
                ];
                
                if (row.wbColIndex_Status !== -1) updates.push({ colIndex: row.wbColIndex_Status, value: 'Imported' });
                if (row.wbColIndex_ProcessedAt !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedAt, value: now });
                if (row.wbColIndex_ProcessedBy !== -1) updates.push({ colIndex: row.wbColIndex_ProcessedBy, value: user });

                await updateSourceRow(
                    row.sourceSheetId,
                    row.sourceTab,
                    row.sourceRowIndex,
                    updates
                );

                await addActivityLog({
                    logId: `LOG-${Date.now()}`,
                    leadId,
                    activityType: 'Import',
                    timestamp: now,
                    owner: 'System (Intake)',
                    notes: `Imported from ${row.sourceLayer}. Source Row: ${row.sourceRowIndex}`,
                    fromValue: '',
                    toValue: 'New'
                });
            } else {
                failed++;
            }
        }

        return { successCount: success, failedCount: failed };
    }
};
