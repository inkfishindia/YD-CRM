
import { Lead, ActivityLog, SourceConfig, FieldMapRule, LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate } from '../types';
import { safeGetItem } from './googleAuth'; // Assuming googleAuth exports safeGetItem or similar, if not we assume generic access

// --- Constants ---

export const SHEET_NAME_LEADS = 'Leads'; // Identity
export const SHEET_NAME_IDENTITY = 'Leads';
export const SHEET_NAME_LEAD_FLOWS = 'Lead_Flows';
export const SHEET_NAME_LEGEND = 'Legend';
export const SHEET_NAME_ACTIVITY = 'ActivityLog';
export const SHEET_NAME_STAGE_RULES = 'Stage_Rules';
export const SHEET_NAME_SLA_RULES = 'SLA_Rules';
export const SHEET_NAME_AUTO_ACTION = 'Auto_Actions';
export const SHEET_NAME_TEMPLATES = 'Message_Templates';
export const SHEET_NAME_SOURCES = 'Sources';
export const SHEET_NAME_FIELD_MAPS = 'Field_Maps';
export const SHEET_NAME_DROPSHIP_FLOWS = 'Dropship_Flows';
export const SHEET_NAME_STORES = 'Stores';
export const SHEET_NAME_ACCOUNT_MAP = 'Account_Map';
export const SHEET_NAME_FLOW_HISTORY = 'Flow_History';

// Headers
export const HEADER_LEAD_CSV = 'lead_id,name,phone,email,company,city,source_refs,category,created_by,tags,Status,created_at,lead_score,note/description,source_row_id,Info';
export const HEADER_IDENTITY_CSV = HEADER_LEAD_CSV;
export const HEADER_LEAD_FLOW_CSV = 'flow_id,lead_id,original_channel,channel,owner,status,stage,source_flow_tag,created_at,updated_at,start_date,expected_close_date,won_date,lost_date,lost_reason,notes,estimated_qty,product_type,print_type,priority,contact_status,payment_update,next_action_type,next_action_date,intent,category,customer_type';
export const HEADER_LEGEND_CSV = 'list_name,value,display_order,color,is_default,is_active,probability';
export const HEADER_ACTIVITY_CSV = 'log_id,lead_id,flow_id,timestamp,activity_type,owner,from_value,to_value,notes';
export const HEADER_STAGE_RULES_CSV = 'flow_type,from_stage,to_stage,trigger,auto_set_field,auto_set_value,requires_field';
export const HEADER_SLA_RULES_CSV = 'rule_name,stage,channel,condition,threshold_hours,alert_level,alert_action';
export const HEADER_AUTO_ACTION_CSV = 'trigger_stage,trigger_event,default_next_action,default_days,channel';
export const HEADER_TEMPLATES_CSV = 'id,stage,category,name,subject,body,info_level';
export const HEADER_DROPSHIP_FLOW_CSV = 'flow_id,store_url,platform_type,integration_ready,dashboard_link_sent,onboarding_started_date,activation_date,sample_required,sample_status,workflow_type,designs_ready,first_product_created,whatsapp_message';
export const HEADER_STORE_CSV = 'store_id,store_name,platform,url,status,integration_status';
export const HEADER_ACCOUNT_MAP_CSV = 'account_id,company_name,type,city,primary_contact,total_value';
export const HEADER_FLOW_HISTORY_CSV = 'history_id,flow_id,timestamp,stage,owner,notes';

export const SYSTEM_SHEET_NAMES = [
    SHEET_NAME_LEADS, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY,
    SHEET_NAME_STAGE_RULES, SHEET_NAME_SLA_RULES, SHEET_NAME_AUTO_ACTION, SHEET_NAME_TEMPLATES,
    SHEET_NAME_SOURCES, SHEET_NAME_FIELD_MAPS
];

export const SOURCE_CONFIG: Record<string, { id: string, sheetName: string }> = {
    'TKW': { id: '1sImoVXLvVlv3_LONrDZLm-auzZPJsAE1NmAbxgz3MHU', sheetName: 'TKW Lead sheet' },
    'Commerce': { id: '1kJa4O-yMvcmueR2rQEK8Vze12-bf5o0t3ketLReLMx0', sheetName: 'Auto New Lead' }
};

// --- Types ---

export interface SchemaReport {
    missingSheets: string[];
    headerMismatches: Record<string, { expected: string[], found: string[] }>;
}

export interface ColumnMetadata {
    index: number;
    letter: string;
    header: string;
    format: string;
    validation: string;
}

export interface SourceConfigItem {
    key: string;
    name: string;
    id: string;
    sheetName: string;
}

// --- Helpers ---

let cachedSpreadsheetId: string | null = null;

export const getSpreadsheetId = (): string => {
    if (cachedSpreadsheetId) return cachedSpreadsheetId;
    return localStorage.getItem('yds_spreadsheet_id') || '1bbzFwbQ3z3lQGZoo6Y3WfvuBRJXlXp8xrf3LuDEGs1A'; // Module Core ID as default
};

export const setSpreadsheetId = (id: string) => {
    cachedSpreadsheetId = id;
    localStorage.setItem('yds_spreadsheet_id', id);
};

// --- API Wrappers ---

export const loadSheetRange = async (sheetId: string, range: string): Promise<any[][]> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range,
        });
        return response.result.values || [];
    } catch (e) {
        console.error(`Error loading range ${range} from ${sheetId}`, e);
        return [];
    }
};

export const updateSourceRow = async (sheetId: string, tabName: string, rowIndex: number, updates: { colIndex: number, value: any }[]): Promise<boolean> => {
    try {
        // Construct batch update
        const data = updates.map(u => ({
            range: `${tabName}!${getColumnLetter(u.colIndex)}${rowIndex + 1}`, // +1 because row index is 0-based but sheets are 1-based, wait.. usually loadSheetRange returns array 0-based. Sheets API range A1 notation row is 1-based.
            values: [[u.value]]
        }));

        await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource: {
                valueInputOption: 'USER_ENTERED',
                data: data
            }
        });
        return true;
    } catch (e) {
        console.error("Update Row Failed", e);
        return false;
    }
};

const getColumnLetter = (colIndex: number): string => {
    let temp, letter = '';
    while (colIndex >= 0) {
        temp = (colIndex) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = (colIndex - temp - 1) / 26; // Adjust for 0-based
        if (colIndex < 0) break;
    }
    return letter;
};

// --- Intake / Config ---

export const fetchIntakeConfig = async (): Promise<{ success: boolean, sources: SourceConfig[], fieldMaps: FieldMapRule[] }> => {
    const sheetId = getSpreadsheetId();
    try {
        const [sourceRows, mapRows] = await Promise.all([
            loadSheetRange(sheetId, `${SHEET_NAME_SOURCES}!A2:E`),
            loadSheetRange(sheetId, `${SHEET_NAME_FIELD_MAPS}!A2:F`)
        ]);

        const sources: SourceConfig[] = sourceRows.map(r => ({
            layer: r[0],
            sheetId: r[1],
            tab: r[2],
            type: r[3],
            tags: r[4] ? r[4].split(',') : []
        }));

        const fieldMaps: FieldMapRule[] = mapRows.map((r, i) => ({
            id: `MAP-${i}`,
            sourceLayer: r[0],
            sourceHeader: r[1],
            intakeField: r[2],
            transform: r[3],
            isRequired: r[4] === 'TRUE' || r[4] === 'Yes',
            notes: r[5]
        }));

        return { success: true, sources, fieldMaps };
    } catch (e) {
        return { success: false, sources: [], fieldMaps: [] };
    }
};

export const fetchDynamicSheet = async (sheetId: string, tab: string): Promise<{ success: boolean, headers: string[], rows: any[][] }> => {
    try {
        const data = await loadSheetRange(sheetId, `${tab}!A1:ZZ`);
        if (!data || data.length === 0) return { success: false, headers: [], rows: [] };
        return { success: true, headers: data[0], rows: data.slice(1) };
    } catch (e) {
        return { success: false, headers: [], rows: [] };
    }
};

export const fetchRemoteHeaders = async (sheetId: string, tab: string): Promise<{ success: boolean, headers?: string[], error?: string }> => {
    try {
        const rows = await loadSheetRange(sheetId, `${tab}!1:1`);
        if (rows && rows.length > 0) return { success: true, headers: rows[0] };
        return { success: false, error: 'No headers found' };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to fetch headers' };
    }
};

export const fetchRemoteSheetNames = async (sheetId: string): Promise<{ success: boolean, sheetNames?: string[] }> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheets = response.result.sheets;
        return { success: true, sheetNames: sheets?.map((s: any) => s.properties.title) || [] };
    } catch (e) {
        return { success: false };
    }
};

export const fetchLeadsFromSource = async (sourceKey: string): Promise<{ success: boolean, leads: Lead[], message: string }> => {
    // This function bridges the IntakeService logic with the UI component's expectation
    // In a real scenario, this would invoke IntakeService.scanSources filtered by key
    // For now, we return a mock or empty to satisfy type checker if not fully implemented in this file
    // Note: The UI calls this, but logic sits better in IntakeService. 
    // We will assume IntakeService uses `fetchDynamicSheet` which is here.
    // The component `SourceIntegrations` expects this function.
    
    // We'll leave it simple:
    return { success: true, leads: [], message: "Use Scan Sources in Intake Inbox" };
};

// --- Lead Management ---

export const addLead = async (lead: Lead): Promise<boolean> => {
    const success1 = await writeToLeadsSheet(lead);
    const success2 = await writeToLeadFlowsSheet(lead);
    return success1 && success2;
};

export const updateLead = async (lead: Lead, userEmail: string = 'System'): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    try {
        // Fetch current data to find row
        // Flow ID is col A (index 0). Status/Stage is col G (index 6).
        const range = `${SHEET_NAME_LEAD_FLOWS}!A:AA`;
        const rows = await loadSheetRange(sheetId, range);
        
        const rowIndex = rows.findIndex(r => r[0] === lead.flowId);
        if (rowIndex === -1) {
            console.error(`Flow ID ${lead.flowId} not found`);
            return false;
        }

        const currentRow = rows[rowIndex];
        const oldStage = currentRow[6]; 
        const now = new Date().toISOString();

        // Map updates
        const updates = [
            { colIndex: 3, value: lead.channel || '' },
            { colIndex: 4, value: lead.ydsPoc || 'Unassigned' },
            { colIndex: 5, value: lead.status || 'New' },
            { colIndex: 6, value: lead.stage || lead.status || 'New' },
            { colIndex: 9, value: now }, // updated_at
            { colIndex: 11, value: lead.expectedCloseDate || '' },
            { colIndex: 12, value: lead.wonDate || '' },
            { colIndex: 13, value: lead.lostDate || '' },
            { colIndex: 14, value: lead.lostReason || '' },
            { colIndex: 15, value: lead.notes || lead.orderInfo || '' },
            { colIndex: 16, value: lead.estimatedQty || 0 },
            { colIndex: 17, value: lead.productType || '' },
            { colIndex: 18, value: lead.printType || '' },
            { colIndex: 19, value: lead.priority || '' },
            { colIndex: 20, value: lead.contactStatus || '' },
            { colIndex: 21, value: lead.paymentUpdate || '' },
            { colIndex: 22, value: lead.nextAction || '' },
            { colIndex: 23, value: lead.nextActionDate || '' },
            { colIndex: 24, value: lead.intent || '' },
            { colIndex: 25, value: lead.category || '' },
            { colIndex: 26, value: lead.customerType || '' }
        ];

        const success = await updateSourceRow(sheetId, SHEET_NAME_LEAD_FLOWS, rowIndex, updates);

        if (success && oldStage !== (lead.status || lead.stage)) {
             await logStageChange(
                 lead.flowId,
                 lead.leadId,
                 oldStage,
                 lead.status || lead.stage,
                 userEmail,
                 `Stage updated to ${lead.status}`
             );
        }

        return success;
    } catch (e) {
        console.error("Update Lead Failed", e);
        return false;
    }
};

export const addActivityLog = async (log: ActivityLog): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    const row = [
        log.logId,
        log.leadId,
        log.flowId || '',
        log.timestamp,
        log.activityType,
        log.owner,
        log.fromValue,
        log.toValue,
        log.notes
    ];
    return appendRow(sheetId, SHEET_NAME_ACTIVITY, row);
};

export const logStageChange = async (flowId: string, leadId: string, from: string, to: string, owner: string, notes: string) => {
    await addActivityLog({
        logId: `LOG-${Date.now()}`,
        leadId,
        flowId,
        timestamp: new Date().toLocaleString(),
        activityType: 'Stage Change',
        owner,
        fromValue: from,
        toValue: to,
        notes
    });
};

export const writeToLeadsSheet = async (lead: Lead): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    const row = [
        lead.leadId,
        lead.contactPerson,
        lead.number,
        lead.email,
        lead.companyName,
        lead.city,
        lead.source,
        lead.category,
        lead.createdBy,
        lead.tags,
        lead.identityStatus,
        lead.createdAt,
        lead.leadScore,
        lead.remarks,
        lead.sourceRowId,
        lead.info
    ];
    return appendRow(sheetId, SHEET_NAME_LEADS, row);
};

export const writeToLeadFlowsSheet = async (lead: Lead): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    const row = [
        lead.flowId,
        lead.leadId,
        lead.originalChannel,
        lead.channel,
        lead.ydsPoc,
        lead.status,
        lead.stage,
        lead.sourceFlowTag,
        lead.createdAt, // flow created at
        lead.updatedAt,
        lead.startDate,
        lead.expectedCloseDate,
        lead.wonDate,
        lead.lostDate,
        lead.lostReason,
        lead.notes,
        lead.estimatedQty,
        lead.productType,
        lead.printType,
        lead.priority,
        lead.contactStatus,
        lead.paymentUpdate,
        lead.nextAction,
        lead.nextActionDate,
        lead.intent,
        lead.category,
        lead.customerType
    ];
    return appendRow(sheetId, SHEET_NAME_LEAD_FLOWS, row);
};

export const writeBackToSourceSheet = async (sheetId: string, tabName: string, rowIndex: number, updates: { colIndex: number, value: any }[]): Promise<boolean> => {
    return updateSourceRow(sheetId, tabName, rowIndex, updates);
};

// --- Config Management ---

export const addSourceConfig = async (config: SourceConfig): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    const row = [config.layer, config.sheetId, config.tab, config.type, config.tags.join(',')];
    return appendRow(sheetId, SHEET_NAME_SOURCES, row);
};

export const saveFieldMappings = async (layerName: string, mappings: Partial<FieldMapRule>[]): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    // In a real app, we might check for existing mappings and update them or clear old ones.
    // Here we just append for simplicity or assume we are building a config sheet.
    // Ideally, we delete old rows for this layer first.
    
    // For now, append
    let success = true;
    for (const m of mappings) {
        const row = [
            layerName,
            m.sourceHeader,
            m.intakeField,
            m.transform || '',
            m.isRequired ? 'TRUE' : 'FALSE',
            m.notes || ''
        ];
        if (!(await appendRow(sheetId, SHEET_NAME_FIELD_MAPS, row))) success = false;
    }
    return success;
};

// --- Admin / Diagnostics ---

export const initializeSheetStructure = async (): Promise<boolean> => {
    // Mock
    return true;
};

export const diagnoseSheetStructure = async (): Promise<SchemaReport> => {
    // Mock
    return { missingSheets: [], headerMismatches: {} };
};

export const analyzeSheetColumns = async (sheetId: string, sheetName: string): Promise<{ success: boolean, columns: ColumnMetadata[], error?: string }> => {
    try {
        const res = await fetchRemoteHeaders(sheetId, sheetName);
        if (res.success && res.headers) {
            const columns = res.headers.map((h, i) => ({
                index: i,
                letter: getColumnLetter(i),
                header: h,
                format: 'Text',
                validation: 'None'
            }));
            return { success: true, columns };
        }
        return { success: false, columns: [], error: res.error };
    } catch (e: any) {
        return { success: false, columns: [], error: e.message };
    }
};

export const populateConfigData = async (): Promise<boolean> => {
    return true; // Mock
};

export const fetchProjectManagerData = async (): Promise<any> => {
    return { success: true, registry: [], sections: [], roles: [], slas: [], dictionary: [], changelog: [] };
};

// --- Private Utilities ---

const appendRow = async (spreadsheetId: string, range: string, values: any[]): Promise<boolean> => {
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [values] }
        });
        return true;
    } catch (e) {
        console.error(`Append failed to ${range}`, e);
        return false;
    }
};
