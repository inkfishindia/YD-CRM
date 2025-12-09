
// ... imports
import { Lead, ActivityLog, SourceConfig, FieldMapRule, LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate } from '../types';
import { safeGetItem } from './googleAuth';

// --- Constants ---

export const MODULE_IDS = {
  CORE: '1bbzFwbQ3z3lQGZoo6Y3WfvuBRJXlXp8xrf3LuDEGs1A',
  FLOWS: '1NWuPxl8WeFTSoYgzHrfgLoPXcMkqfsffvspTFTIJ5hE',
  ACTIVITY: '1Y0x98DnlK4v3rapo4zoCZj-LoFnMcNMUdkaowYsBC38',
  CONFIG: '1Z3MwuV9los8QAcCFQUgoKtpirCh9IPIkSLCfNHj8Jf4'
};

export const SHEET_NAME_LEADS = 'Leads'; 
export const SHEET_NAME_LEAD_FLOWS = 'LEAD_FLOWS';
export const SHEET_NAME_LEGEND = 'Legend';
export const SHEET_NAME_ACTIVITY = 'ACTIVITY_LOG';
export const SHEET_NAME_INTAKE_SOURCES = 'Intake_Sources';
export const SHEET_NAME_INTAKE_MAPPINGS = 'Intake_Mappings';

// Additional Sheets for SettingsView
export const SHEET_NAME_STAGE_RULES = 'Stage_Rules';
export const SHEET_NAME_SLA_RULES = 'SLA_Rules';
export const SHEET_NAME_AUTO_ACTION = 'Auto_Actions';
export const SHEET_NAME_TEMPLATES = 'Message_Templates';
export const SHEET_NAME_IDENTITY = 'Leads';
export const SHEET_NAME_DROPSHIP_FLOWS = 'Dropship_Flows';
export const SHEET_NAME_STORES = 'Stores';
export const SHEET_NAME_ACCOUNT_MAP = 'Account_Map';
export const SHEET_NAME_FLOW_HISTORY = 'Flow_History';

// Headers
export const HEADER_LEAD_CSV = 'lead_id,name,phone,email,company,city,source_refs,category,created_by,tags,Status,created_at,lead_score,note/description,source_row_id,Info';
export const HEADER_LEAD_FLOW_CSV = 'flow_id,lead_id,original_channel,channel,owner,status,stage,source_flow_tag,created_at,updated_at,start_date,expected_close_date,won_date,lost_date,lost_reason,notes,estimated_qty,product_type,print_type,priority,contact_status,payment_update,next_action_type,next_action_date,intent,category,customer_type';

// Additional Headers
export const HEADER_LEGEND_CSV = 'list_name,value,display_order,color,is_default,is_active,probability';
export const HEADER_ACTIVITY_CSV = 'log_id,lead_id,timestamp,activity_type,owner,from_value,to_value,notes';
export const HEADER_STAGE_RULES_CSV = 'from_stage,to_stage,trigger,auto_set_field,auto_set_value,requires_field';
export const HEADER_SLA_RULES_CSV = 'rule_name,stage,condition,threshold_hours,alert_level,alert_action';
export const HEADER_AUTO_ACTION_CSV = 'trigger_stage,trigger_event,default_next_action,default_days';
export const HEADER_TEMPLATES_CSV = 'id,stage,category,name,subject,body,info_level';
export const HEADER_IDENTITY_CSV = HEADER_LEAD_CSV; // Alias
export const HEADER_DROPSHIP_FLOW_CSV = 'flow_id,lead_id,store_url,platform_type,integration_ready,onboarding_date,activation_date';
export const HEADER_STORE_CSV = 'store_id,name,platform,url,status,integration_status';
export const HEADER_ACCOUNT_MAP_CSV = 'account_id,name,type,city,primary_contact,total_value';
export const HEADER_FLOW_HISTORY_CSV = 'history_id,flow_id,stage,timestamp,duration_hours';

export const SYSTEM_SHEET_NAMES = [
    SHEET_NAME_LEADS, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY,
    SHEET_NAME_INTAKE_SOURCES, SHEET_NAME_INTAKE_MAPPINGS,
    SHEET_NAME_STAGE_RULES, SHEET_NAME_SLA_RULES, SHEET_NAME_AUTO_ACTION, SHEET_NAME_TEMPLATES
];

export const SHEET_IDS = MODULE_IDS;

export const SOURCE_CONFIG: Record<string, { id: string, sheetName: string }> = {
    'TKW': { id: '1sImoVXLvVlv3_LONrDZLm-auzZPJsAE1NmAbxgz3MHU', sheetName: 'TKW Lead sheet' },
    'Commerce': { id: '1UVP93fwaqxjX3TW3P6i0Uax4XeSUr2I1YZQgsJFBzm0', sheetName: 'Auto New Lead' },
    'Dropship': { id: '1kJa4O-yMvcmueR2rQEK8Vze12-bf5o0t3ketLReLMx0', sheetName: 'DS_leads.csv' }
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

// --- Helpers ---

let cachedSpreadsheetId: string | null = null;

export const getSpreadsheetId = (): string => {
    if (cachedSpreadsheetId) return cachedSpreadsheetId;
    return localStorage.getItem('yds_spreadsheet_id') || SHEET_IDS.CORE; 
};

export const setSpreadsheetId = (id: string) => {
    cachedSpreadsheetId = id;
    localStorage.setItem('yds_spreadsheet_id', id);
};

export const getNextLeadNumber = async (): Promise<number> => {
    const sheetId = getSpreadsheetId();
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${SHEET_NAME_LEADS}!A:A`
        });
        const rows = response.result.values || [];
        const ids = rows.slice(1).map((r: any[]) => r[0]).filter(Boolean);
        const numbers = ids.map((id: string) => {
             const parts = id.split('-');
             const num = parseInt(parts[1]); 
             return isNaN(num) ? 0 : num;
        });
        return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    } catch (e) {
        console.error('Error fetching lead numbers', e);
        return 1;
    }
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
        const data = updates.map(u => ({
            range: `${tabName}!${getColumnLetter(u.colIndex)}${rowIndex + 1}`,
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
        colIndex = (colIndex - temp - 1) / 26; 
        if (colIndex < 0) break;
    }
    return letter;
};

// --- Intake / Config ---

export const fetchIntakeConfig = async (): Promise<{ success: boolean, sources: SourceConfig[], fieldMaps: FieldMapRule[] }> => {
    try {
        const configSheetId = MODULE_IDS.CONFIG;
        
        const [sourcesRes, mapsRes] = await Promise.all([
            window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: configSheetId, range: `${SHEET_NAME_INTAKE_SOURCES}!A2:F` }),
            window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: configSheetId, range: `${SHEET_NAME_INTAKE_MAPPINGS}!A2:I` })
        ]);
        
        const sourcesData = sourcesRes.result.values || [];
        const fieldMapsData = mapsRes.result.values || [];
        
        const sources: SourceConfig[] = sourcesData.map((row: any[], index: number) => ({
            layer: row[0] || '',
            sheetId: row[1] || '',
            tab: row[2] || '',
            type: row[3] || 'Manual',
            tags: row[4] ? row[4].split(',') : [],
            isActive: row[5] === 'TRUE',
            _rowIndex: index + 2
        }));

        const fieldMaps: FieldMapRule[] = fieldMapsData.map((row: any[]) => ({
            id: row[0] || '',
            sourceLayer: row[1] || '',
            sourceHeader: row[2] || '',
            intakeField: row[3] || '',
            transform: row[4] || '',
            isRequired: row[5] === 'TRUE',
            fallbackGroup: row[6] || '',
            targetTable: row[7] || 'Leads',
            notes: row[8] || ''
        }));

        return { success: true, sources, fieldMaps };
    } catch (e) {
        console.error("Failed to load intake config", e);
        return { success: false, sources: [], fieldMaps: [] };
    }
};

export const updateSourceStatus = async (rowIndex: number, isActive: boolean): Promise<boolean> => {
    return updateSourceRow(MODULE_IDS.CONFIG, SHEET_NAME_INTAKE_SOURCES, rowIndex - 1, [{ colIndex: 5, value: isActive ? 'TRUE' : 'FALSE' }]);
};

export const deleteSourceConfig = async (rowIndex: number): Promise<boolean> => {
    const sheetId = MODULE_IDS.CONFIG;
    const range = `${SHEET_NAME_INTAKE_SOURCES}!A${rowIndex}:F${rowIndex}`;
    try {
        await window.gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: sheetId,
            range: range
        });
        return true;
    } catch(e) { 
        console.error("Failed to delete source", e);
        return false; 
    }
};

export const fetchDynamicSheet = async (sheetId: string, tab: string): Promise<{ success: boolean, headers: string[], rows: any[][], error?: string }> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${tab}!A1:ZZ`
        });
        const values = response.result.values || [];
        if (values.length === 0) return { success: false, headers: [], rows: [] };
        
        return { success: true, headers: values[0], rows: values.slice(1) };
    } catch (e: any) {
        return { success: false, headers: [], rows: [], error: e.message };
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

// Legacy method wrapper - consider deprecating in favor of IntakeService
export const fetchLeadsFromSource = async (sourceKey: string): Promise<{ success: boolean, leads: Lead[], message: string }> => {
    console.warn("Using legacy fetchLeadsFromSource. Use IntakeService.scanSources instead.");
    return { success: false, leads: [], message: "Use IntakeService" };
};

// --- Lead Management ---

export const fetchAllLeads = async (): Promise<Lead[]> => {
    try {
        const sheetId = getSpreadsheetId();
        const [identityRes, flowRes] = await Promise.all([
            fetchDynamicSheet(sheetId, SHEET_NAME_LEADS),
            fetchDynamicSheet(sheetId, SHEET_NAME_LEAD_FLOWS)
        ]);

        if (!identityRes.success || !flowRes.success) return [];

        const identityMap = new Map<string, any>();
        identityRes.rows.forEach((row, index) => {
            const leadId = row[0];
            if(leadId) identityMap.set(leadId, { row, index: index + 2 });
        });

        const leads: Lead[] = [];
        
        flowRes.rows.forEach((fRow, fIndex) => {
            const leadId = fRow[1];
            const identity = identityMap.get(leadId);
            
            if (identity) {
                const iRow = identity.row;
                const lead: Lead = {
                    _rowIndex: fIndex + 2,
                    leadId: iRow[0],
                    contactPerson: iRow[1],
                    number: iRow[2],
                    email: iRow[3],
                    companyName: iRow[4],
                    city: iRow[5],
                    source: iRow[6],
                    category: fRow[25] || iRow[7], // Priority to flow category
                    createdBy: iRow[8],
                    tags: iRow[9],
                    identityStatus: iRow[10],
                    createdAt: iRow[11],
                    leadScore: iRow[12],
                    remarks: iRow[13],
                    sourceRowId: iRow[14],
                    info: iRow[15],

                    flowId: fRow[0],
                    originalChannel: fRow[2],
                    channel: fRow[3],
                    owner: fRow[4],
                    ydsPoc: fRow[4],
                    status: fRow[5],
                    stage: fRow[6],
                    sourceFlowTag: fRow[7],
                    updatedAt: fRow[9],
                    startDate: fRow[10],
                    expectedCloseDate: fRow[11],
                    wonDate: fRow[12],
                    lostDate: fRow[13],
                    lostReason: fRow[14],
                    notes: fRow[15],
                    estimatedQty: parseInt(fRow[16] || '0'),
                    productType: fRow[17],
                    printType: fRow[18],
                    priority: fRow[19],
                    contactStatus: fRow[20],
                    paymentUpdate: fRow[21],
                    nextAction: fRow[22],
                    nextActionDate: fRow[23],
                    intent: fRow[24],
                    customerType: fRow[26],
                    
                    date: iRow[11] ? iRow[11].split('T')[0] : '',
                    orderInfo: fRow[15] || iRow[15] || '',
                    contactAttempts: 0,
                    lastContactDate: fRow[9],
                    lastAttemptDate: '',
                    
                    slaStatus: 'Healthy',
                    slaHealth: '🟢',
                    daysOpen: '0',
                    actionOverdue: 'OK',
                    firstResponseTime: '',
                    stageChangedDate: fRow[9],
                    
                    platformType: '', integrationReady: '', storeUrl: '', accountCreated: '', 
                    dashboardLinkSent: '', onboardingStartedDate: '', activationDate: '',    
                    sampleRequired: '', sampleStatus: '', workflowType: '', designsReady: '', 
                    firstProductCreated: '', whatsappMessage: ''
                };
                leads.push(lead);
            }
        });
        
        return leads;
    } catch (e) {
        console.error("Fetch Leads Error", e);
        return [];
    }
};

export const addLead = async (lead: Lead): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    const now = new Date().toISOString();
    
    const identityRow = [
        lead.leadId, lead.contactPerson, lead.number, lead.email, lead.companyName,
        lead.city, lead.source, lead.category, lead.createdBy || 'System', lead.tags || '',
        'Active', now, lead.leadScore || '', lead.remarks || '', lead.sourceRowId || '', lead.info || ''
    ];

    const flowRow = [
        lead.flowId || `FLOW-${lead.leadId.split('-')[1]}`,
        lead.leadId, lead.channel || '', lead.channel || '', lead.ydsPoc || 'Unassigned',
        'New', 'New', '', now, now, now, '', '', '', '', lead.notes || '',
        lead.estimatedQty || 0, lead.productType || '', lead.printType || '', lead.priority || '',
        '', '', '', '', lead.intent || '', lead.category || '', lead.customerType || ''
    ];

    const s1 = await appendRow(sheetId, SHEET_NAME_LEADS, identityRow);
    const s2 = await appendRow(sheetId, SHEET_NAME_LEAD_FLOWS, flowRow);
    return s1 && s2;
};

export const updateLead = async (lead: Lead, userEmail: string = 'System'): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    try {
        const rowIndex = lead._rowIndex - 1; // 0-based
        const now = new Date().toISOString();

        const updates = [
            { colIndex: 4, value: lead.ydsPoc },
            { colIndex: 5, value: lead.status },
            { colIndex: 6, value: lead.status }, // Stage = Status for now
            { colIndex: 9, value: now },
            { colIndex: 16, value: lead.estimatedQty },
            { colIndex: 22, value: lead.nextAction },
            { colIndex: 23, value: lead.nextActionDate }
        ];

        return await updateSourceRow(sheetId, SHEET_NAME_LEAD_FLOWS, rowIndex, updates);
    } catch (e) {
        return false;
    }
};

// --- Config Management ---

export const addSourceConfig = async (config: SourceConfig): Promise<boolean> => {
    const sheetId = MODULE_IDS.CONFIG;
    const row = [config.layer, config.sheetId, config.tab, config.type, config.tags.join(','), 'TRUE'];
    return appendRow(sheetId, SHEET_NAME_INTAKE_SOURCES, row);
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
        return true;
    } catch (e) {
        console.error("Failed to save field mappings", e);
        return false;
    }
};

// --- Utils ---

export const appendRow = async (spreadsheetId: string, range: string, values: any[]): Promise<boolean> => {
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId, range, valueInputOption: 'USER_ENTERED', resource: { values: [values] }
        });
        return true;
    } catch (e) {
        return false;
    }
};

export const appendToSheet = (spreadsheetId: string, range: string, values: any[]): Promise<boolean> => {
    if (Array.isArray(values[0])) return appendRow(spreadsheetId, range, values[0]);
    return appendRow(spreadsheetId, range, values);
};

// ... existing unused exports kept for compatibility
export const addActivityLog = async (log: any) => true; 
export const initializeSheetStructure = async () => true;
export const diagnoseSheetStructure = async () => ({ missingSheets: [], headerMismatches: {} });
export const analyzeSheetColumns = async (sheetId: string, sheetName: string) => ({ success: false, columns: [] });
export const populateConfigData = async () => true;
export const fetchProjectManagerData = async (): Promise<{ success: boolean, registry: any[], sections: any[], roles: any[], slas: any[], dictionary: any[], changelog: any[], error?: string }> => ({ success: true, registry: [], sections: [], roles: [], slas: [], dictionary: [], changelog: [] });
