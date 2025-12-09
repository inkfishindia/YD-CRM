
import { Lead, ActivityLog, SourceConfig, FieldMapRule, LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate } from '../types';
import { safeGetItem } from './googleAuth';

// --- Constants ---

// Default Mock IDs (Fallbacks)
export const MODULE_IDS = {
  CORE: '1bbzFwbQ3z3lQGZoo6Y3WfvuBRJXlXp8xrf3LuDEGs1A',
  FLOWS: '1NWuPxl8WeFTSoYgzHrfgLoPXcMkqfsffvspTFTIJ5hE',
  ACTIVITY: '1Y0x98DnlK4v3rapo4zoCZj-LoFnMcNMUdkaowYsBC38',
  CONFIG: '1Z3MwuV9los8QAcCFQUgoKtpirCh9IPIkSLCfNHj8Jf4'
};

export const SHEET_NAME_LEADS = 'Leads'; 
export const SHEET_NAME_IDENTITY = 'Leads';
export const SHEET_NAME_LEAD_FLOWS = 'LEAD_FLOWS';
export const SHEET_NAME_LEGEND = 'Legend';
export const SHEET_NAME_ACTIVITY = 'ACTIVITY_LOG';
export const SHEET_NAME_STAGE_RULES = 'Stage_Rules';
export const SHEET_NAME_SLA_RULES = 'SLA_Rules';
export const SHEET_NAME_AUTO_ACTION = 'Auto_Actions';
export const SHEET_NAME_TEMPLATES = 'Message_Templates';
export const SHEET_NAME_SOURCES = 'Sources';
export const SHEET_NAME_FIELD_MAPS = 'SOURCES_FIELD_MAP';
export const SHEET_NAME_DROPSHIP_FLOWS = 'Dropship_Flows';
export const SHEET_NAME_STORES = 'Stores';
export const SHEET_NAME_ACCOUNT_MAP = 'Account_Map';
export const SHEET_NAME_FLOW_HISTORY = 'Flow_History';

// Headers
export const HEADER_LEAD_CSV = 'lead_id,name,phone,email,company,city,source_refs,category,created_by,tags,Status,created_at,lead_score,note/description,source_row_id,Info';
export const HEADER_IDENTITY_CSV = HEADER_LEAD_CSV;
export const HEADER_LEAD_FLOW_CSV = 'flow_id,lead_id,original_channel,channel,owner,status,stage,source_flow_tag,created_at,updated_at,start_date,expected_close_date,won_date,lost_date,lost_reason,notes,estimated_qty,product_type,print_type,priority,contact_status,payment_update,next_action_type,next_action_date,intent,category,customer_type';
export const HEADER_LEGEND_CSV = 'list_name,value,display_order,color,is_default,is_active,probability';
export const HEADER_ACTIVITY_CSV = 'log_id,timestamp,lead_id,activity_type,owner,field,from_value,to_value,notes';
export const HEADER_STAGE_RULES_CSV = 'flow_type,from_stage,to_stage,trigger,auto_set_field,auto_set_value,requires_field';
export const HEADER_SLA_RULES_CSV = 'rule_name,stage,channel,condition,threshold_hours,alert_level,alert_action';
export const HEADER_AUTO_ACTION_CSV = 'trigger_stage,trigger_event,default_next_action,default_days,channel';
export const HEADER_TEMPLATES_CSV = 'id,stage,category,name,subject,body,info_level';
export const HEADER_DROPSHIP_FLOW_CSV = 'flow_id,platform_type,store_url,integration_ready,dashboard_link_sent,onboarding_started_date,activation_date,sample_required,sample_status,workflow_type,designs_ready,first_product_created';
export const HEADER_STORE_CSV = 'store_id,store_name,platform,url,status,integration_status,owner_id,created_at';
export const HEADER_ACCOUNT_MAP_CSV = 'account_id,lead_id,flow_id,role,relationship_type';
export const HEADER_FLOW_HISTORY_CSV = 'history_id,flow_id,stage,timestamp,duration_days,actor';

export const SYSTEM_SHEET_NAMES = [
    SHEET_NAME_LEADS, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY,
    SHEET_NAME_STAGE_RULES, SHEET_NAME_SLA_RULES, SHEET_NAME_AUTO_ACTION, SHEET_NAME_TEMPLATES,
    SHEET_NAME_SOURCES
];

export const SHEET_IDS = MODULE_IDS;

export const SOURCE_CONFIG: Record<string, { id: string, sheetName: string }> = {
    'TKW': { id: '1sImoVXLvVlv3_LONrDZLm-auzZPJsAE1NmAbxgz3MHU', sheetName: 'TKW Lead sheet' },
    'Commerce': { id: '1UVP93fwaqxjX3TW3P6i0Uax4XeSUr2I1YZQgsJFBzm0', sheetName: 'Auto New Lead' },
    'Dropship': { id: '1kJa4O-yMvcmueR2rQEK8Vze12-bf5o0t3ketLReLMx0', sheetName: 'DS_leads.csv' }
};

export const HARDCODED_FIELD_MAPS: FieldMapRule[] = [
    // TKW new leads
    { id: 't1', sourceLayer: 'TKW new leads', sourceHeader: 'DATE', intakeField: 'date', transform: 'dateParse', isRequired: false, notes: '' },
    { id: 't2', sourceLayer: 'TKW new leads', sourceHeader: 'company_name', intakeField: 'companyName', transform: 'trim', isRequired: true, notes: '' },
    { id: 't3', sourceLayer: 'TKW new leads', sourceHeader: 'Contact person', intakeField: 'contactPerson', transform: 'trim', isRequired: false, notes: '' },
    { id: 't4', sourceLayer: 'TKW new leads', sourceHeader: 'NUMBER', intakeField: 'number', transform: 'normalizePhone', isRequired: false, notes: '' },
    { id: 't5', sourceLayer: 'TKW new leads', sourceHeader: 'EMAIL', intakeField: 'email', transform: 'lowerCase', isRequired: false, notes: '' },
    { id: 't6', sourceLayer: 'TKW new leads', sourceHeader: 'CITY', intakeField: 'city', transform: 'trim', isRequired: false, notes: '' },
    { id: 't7', sourceLayer: 'TKW new leads', sourceHeader: 'Requirement (verbatim)', intakeField: 'orderInfo', transform: 'trim', isRequired: false, notes: '' },
    { id: 't8', sourceLayer: 'TKW new leads', sourceHeader: 'Est Qty', intakeField: 'estimatedQty', transform: 'normalizeQty', isRequired: false, notes: '' },
    { id: 't9', sourceLayer: 'TKW new leads', sourceHeader: 'Product', intakeField: 'productType', transform: 'trim', isRequired: false, notes: '' },
    { id: 't10', sourceLayer: 'TKW new leads', sourceHeader: 'YDS - POC', intakeField: 'owner', transform: 'trim', isRequired: false, notes: '' },
    
    // Commerce Leads
    { id: 'c1', sourceLayer: 'Commerce Leads', sourceHeader: 'Date', intakeField: 'date', transform: 'dateParse', isRequired: false, notes: '' },
    { id: 'c2', sourceLayer: 'Commerce Leads', sourceHeader: 'Business Name', intakeField: 'companyName', transform: 'trim', isRequired: true, notes: '' },
    { id: 'c3', sourceLayer: 'Commerce Leads', sourceHeader: 'First Name', intakeField: 'contactPerson', transform: 'trim', isRequired: false, notes: '' },
    { id: 'c4', sourceLayer: 'Commerce Leads', sourceHeader: 'Phone', intakeField: 'number', transform: 'normalizePhone', isRequired: false, notes: '' },
    { id: 'c5', sourceLayer: 'Commerce Leads', sourceHeader: 'Email', intakeField: 'email', transform: 'lowerCase', isRequired: false, notes: '' },
    
    // Dropship Leads
    { id: 'd1', sourceLayer: 'Dropship Leads', sourceHeader: 'Date', intakeField: 'date', transform: 'dateParse', isRequired: false, notes: '' },
    { id: 'd2', sourceLayer: 'Dropship Leads', sourceHeader: 'Company / brand', intakeField: 'companyName', transform: 'trim', isRequired: true, notes: '' },
    { id: 'd3', sourceLayer: 'Dropship Leads', sourceHeader: 'Lead Name', intakeField: 'contactPerson', transform: 'trim', isRequired: false, notes: '' },
    { id: 'd4', sourceLayer: 'Dropship Leads', sourceHeader: 'Phone / Whatsapp', intakeField: 'number', transform: 'normalizePhone', isRequired: false, notes: '' }
];

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
        // Skip header, get ID column
        const ids = rows.slice(1).map((r: any[]) => r[0]).filter(Boolean);
        
        // Parse "YDS-XXXX"
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
        // Read Sources from the main configured sheet
        const sourcesData = await loadSheetRange(getSpreadsheetId(), 'Sources!A2:E');
        
        const sources: SourceConfig[] = sourcesData.map(row => ({
            layer: row[0],      // Name (e.g. "Commerce Leads")
            sheetId: row[1],    
            tab: row[2],        // Tab Name
            type: row[3],       
            tags: row[4] ? row[4].split(',').map((t: string) => t.trim()) : []
        }));

        // Return hardcoded maps as per P0 requirement
        return { success: true, sources, fieldMaps: HARDCODED_FIELD_MAPS };
    } catch (e) {
        console.error("Failed to load intake config", e);
        return { success: false, sources: [], fieldMaps: HARDCODED_FIELD_MAPS };
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
    try {
        const config = SOURCE_CONFIG[sourceKey];
        if (!config) return { success: false, leads: [], message: "Source not found" };
        
        const res = await fetchDynamicSheet(config.id, config.sheetName);
        if (!res.success) return { success: false, leads: [], message: "Failed to load sheet" };

        const { headers, rows } = res;
        const leads: Lead[] = [];
        
        // Simple heuristic map based on HARDCODED_FIELD_MAPS
        const maps = HARDCODED_FIELD_MAPS.filter(m => m.sourceLayer === sourceKey);
        
        rows.forEach((row, i) => {
            const lead: any = { leadId: `TMP-${i}`, source: sourceKey, date: new Date().toISOString() };
            maps.forEach(m => {
                const idx = headers.indexOf(m.sourceHeader);
                if (idx !== -1) {
                    lead[m.intakeField] = row[idx];
                }
            });
            if (lead.companyName) leads.push(lead);
        });

        return { success: true, leads, message: `Fetched ${leads.length} leads` };
    } catch (e: any) {
        return { success: false, leads: [], message: e.message };
    }
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
        // Skip header
        identityRes.rows.forEach((row, index) => {
            const leadId = row[0];
            if(leadId) identityMap.set(leadId, { row, index: index + 2 }); // +2 for 1-based index and header skip
        });

        const leads: Lead[] = [];
        
        flowRes.rows.forEach((fRow, fIndex) => {
            const leadId = fRow[1];
            const identity = identityMap.get(leadId);
            
            if (identity) {
                const iRow = identity.row;
                // Map fields based on types.ts interfaces
                const lead: Lead = {
                    _rowIndex: fIndex + 2, // Flow row index for updates
                    // Identity
                    leadId: iRow[0],
                    contactPerson: iRow[1],
                    number: iRow[2],
                    email: iRow[3],
                    companyName: iRow[4],
                    city: iRow[5],
                    source: iRow[6],
                    createdBy: iRow[8],
                    tags: iRow[9],
                    identityStatus: iRow[10],
                    createdAt: iRow[11],
                    leadScore: iRow[12],
                    remarks: iRow[13],
                    sourceRowId: iRow[14],
                    info: iRow[15],

                    // Flow
                    flowId: fRow[0],
                    originalChannel: fRow[2],
                    channel: fRow[3],
                    owner: fRow[4],
                    ydsPoc: fRow[4], // Alias
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
                    category: fRow[25],
                    customerType: fRow[26],
                    
                    // Computed / Default
                    date: iRow[11] ? iRow[11].split('T')[0] : '', // Simple date extract
                    orderInfo: fRow[15] || iRow[15] || '', // Notes or Info
                    contactAttempts: 0,
                    lastContactDate: fRow[9],
                    lastAttemptDate: '',
                    
                    slaStatus: 'Healthy',
                    slaHealth: '🟢',
                    daysOpen: '0',
                    actionOverdue: 'OK',
                    firstResponseTime: '',
                    stageChangedDate: fRow[9],
                    
                    // DS specific
                    platformType: '',      
                    integrationReady: '',  
                    storeUrl: '',          
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
    
    // 1. Identity Row (Leads Sheet) - 16 Cols
    const identityRow = [
        lead.leadId,
        lead.contactPerson,
        lead.number,
        lead.email,
        lead.companyName,
        lead.city,
        lead.source,
        lead.category,
        lead.createdBy || 'System',
        lead.tags || '',
        lead.identityStatus || 'Active',
        lead.createdAt || now,
        lead.leadScore || '',
        lead.remarks || '',
        lead.sourceRowId || '',
        lead.info || ''
    ];

    // 2. Flow Row (Lead_Flows Sheet) - 27 Cols
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 14);
    
    const flowRow = [
        lead.flowId || `FLOW-${lead.leadId.split('-')[1] || Date.now()}`,
        lead.leadId,
        lead.originalChannel || lead.channel || '',
        lead.channel || '',
        lead.ydsPoc || 'Unassigned',
        lead.status || 'New',
        lead.stage || 'New',
        lead.sourceFlowTag || '',
        lead.createdAt || now, 
        now, // updated_at
        lead.startDate || now,
        lead.expectedCloseDate || closeDate.toISOString().split('T')[0],
        lead.wonDate || '',
        lead.lostDate || '',
        lead.lostReason || '',
        lead.notes || lead.orderInfo || '',
        lead.estimatedQty || 0,
        lead.productType || '',
        lead.printType || '',
        lead.priority || '',
        lead.contactStatus || '',
        lead.paymentUpdate || '',
        lead.nextAction || '',
        lead.nextActionDate || '',
        lead.intent || '',
        lead.category || '',
        lead.customerType || ''
    ];

    const s1 = await appendRow(sheetId, SHEET_NAME_LEADS, identityRow);
    const s2 = await appendRow(sheetId, SHEET_NAME_LEAD_FLOWS, flowRow);
    
    return s1 && s2;
};

export const updateLead = async (lead: Lead, userEmail: string = 'System'): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    try {
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

export const addActivityLog = async (log: {
    logId: string;
    leadId: string;
    activityType: string;
    timestamp: string;
    owner: string;
    notes: string;
    fromValue: string;
    toValue: string;
    flowId?: string;
}): Promise<boolean> => {
    // Schema: log_id, timestamp, lead_id, activity_type, owner, field, from_value, to_value, notes
    const row = [
        log.logId,
        log.timestamp,
        log.leadId,
        log.activityType,
        log.owner,
        '', // field (optional)
        log.fromValue,
        log.toValue,
        log.notes
    ];
    return appendRow(getSpreadsheetId(), SHEET_NAME_ACTIVITY, row);
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

export const writeToLeadsSheet = async (lead: Lead): Promise<boolean> => addLead(lead); 
export const writeToLeadFlowsSheet = async (lead: Lead): Promise<boolean> => addLead(lead);
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
    // Mock for now, since we use HARDCODED_FIELD_MAPS
    return true;
};

// --- Admin / Diagnostics ---

export const initializeSheetStructure = async (): Promise<boolean> => {
    return true;
};

export const diagnoseSheetStructure = async (): Promise<SchemaReport> => {
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
    return true;
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
