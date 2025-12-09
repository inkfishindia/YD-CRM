
import { Lead, ActivityLog, LegendItem, formatDate, ColumnMap, MODULE_IDS } from '../types';
import { safeGetItem } from './googleAuth';

// --- CONFIGURATION ---
// Re-export MODULE_IDS for backward compatibility in imports
export { MODULE_IDS } from '../types';

export const SHEET_NAMES = {
    LEADS: 'Leads',
    FLOWS: 'LEAD_FLOWS',
    LEGEND: 'Legend',
    TEMPLATES: 'Message_Templates',
    STAGE_RULES: 'Stage_Rules',
    SLA_RULES: 'SLA_Rules',
    AUTO_ACTIONS: 'Auto_Actions',
    ACTIVITY: 'Activity_Logs',
    INTAKE_SOURCES: 'Intake_Sources',
    INTAKE_MAPPINGS: 'Intake_Mappings'
};

// Expected Headers (for Validation & Mapping keys)
export const HEADER_KEYS = {
    IDENTITY: ["lead_id", "name", "phone", "email", "company", "city", "source_refs", "Category", "created_by", "tags", "Status", "created_at", "lead_score", "note/description", "source_row_id", "Info"],
    FLOW: ["flow_id", "lead_id", "original_channel", "channel", "owner", "status", "stage", "source_flow_tag", "created_at", "updated_at", "start_date", "expected_close_date", "won_date", "lost_date", "lost_reason", "notes", "estimated_qty", "product_type", "print_type", "priority", "contact_status", "payment_update", "next_action_type", "next_action_date", "intent", "category", "customer_type"]
};

// Exported CSV Strings for Settings View
export const HEADER_IDENTITY_CSV = HEADER_KEYS.IDENTITY.join(',');
export const HEADER_LEAD_FLOW_CSV = HEADER_KEYS.FLOW.join(',');
// ...other exports for compatibility...
export const SHEET_NAME_LEADS = SHEET_NAMES.LEADS;
export const SHEET_NAME_LEAD_FLOWS = SHEET_NAMES.FLOWS;
export const SHEET_NAME_LEGEND = SHEET_NAMES.LEGEND;
export const SHEET_NAME_ACTIVITY = SHEET_NAMES.ACTIVITY;
export const SHEET_NAME_STAGE_RULES = SHEET_NAMES.STAGE_RULES;
export const SHEET_NAME_SLA_RULES = SHEET_NAMES.SLA_RULES;
export const SHEET_NAME_AUTO_ACTION = SHEET_NAMES.AUTO_ACTIONS;
export const SHEET_NAME_TEMPLATES = SHEET_NAMES.TEMPLATES;
export const SHEET_NAME_INTAKE_SOURCES = SHEET_NAMES.INTAKE_SOURCES;
export const SHEET_NAME_INTAKE_MAPPINGS = SHEET_NAMES.INTAKE_MAPPINGS;
export const HEADER_LEAD_CSV = "";
export const HEADER_LEGEND_CSV = "list_name,value,display_order,color,is_default,is_active";
export const HEADER_ACTIVITY_CSV = "logId,timestamp,leadId,activityType,owner,notes";
export const HEADER_STAGE_RULES_CSV = "fromStage,toStage,requiresField";
export const HEADER_SLA_RULES_CSV = "stage,thresholdHours,alertLevel";
export const HEADER_AUTO_ACTION_CSV = "triggerStage,defaultNextAction,defaultDays,triggerEvent";
export const HEADER_TEMPLATES_CSV = "id,name,body,stage,category";
export const SOURCE_CONFIG: Record<string, any> = { 'Manual Upload': { sheetId: MODULE_IDS.CORE, tab: 'Uploads', type: 'Manual' } };

// Added missing exports
export const SHEET_NAME_IDENTITY = SHEET_NAMES.LEADS;
export const SHEET_NAME_DROPSHIP_FLOWS = 'Dropship_Flows';
export const SHEET_NAME_STORES = 'Stores';
export const SHEET_NAME_ACCOUNT_MAP = 'Account_Map';
export const SHEET_NAME_FLOW_HISTORY = 'Flow_History';

export const HEADER_DROPSHIP_FLOW_CSV = "flow_id,lead_id,store_id,product_id,status,tracking_number";
export const HEADER_STORE_CSV = "store_id,store_name,platform,url,api_key";
export const HEADER_ACCOUNT_MAP_CSV = "account_id,lead_id,role,notes";
export const HEADER_FLOW_HISTORY_CSV = "history_id,flow_id,stage_from,stage_to,timestamp,actor";

// --- HELPERS ---

export const getSpreadsheetId = (): string => localStorage.getItem('yds_spreadsheet_id') || MODULE_IDS.CORE;
export const setSpreadsheetId = (id: string) => localStorage.setItem('yds_spreadsheet_id', id);

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

// --- READ OPERATIONS ---

export const fetchAllLeads = async (): Promise<Lead[]> => {
  try {
    const [identityRows, flowRows] = await Promise.all([
      loadSheetRange(MODULE_IDS.CORE, 'Leads!A2:P'),
      loadSheetRange(MODULE_IDS.CORE, 'LEAD_FLOWS!A2:AA')
    ]);

    if (!identityRows || !flowRows) return [];

    const identityMap = new Map();
    identityRows.forEach(row => {
      // Map Identity Columns by Index
      identityMap.set(row[0], {
        leadId: row[0], 
        contactPerson: row[1], 
        number: row[2], 
        email: row[3], 
        companyName: row[4], 
        city: row[5],
        source: row[6], 
        categoryIdentity: row[7], // 'Category' column in Leads
        createdBy: row[8], 
        tags: row[9], 
        identityStatus: row[10], 
        createdAt: row[11],
        leadScore: row[12], 
        remarks: row[13], 
        sourceRowId: row[14], 
        info: row[15]
      });
    });

    return flowRows.map((fRow, idx) => {
      const identity = identityMap.get(fRow[1]) || {};
      return {
        _rowIndex: idx + 2, // 1-based + 1 for header
        ...identity,
        
        // Flow Columns by Index
        flowId: fRow[0], 
        leadId: fRow[1],
        originalChannel: fRow[2], 
        channel: fRow[3], 
        owner: fRow[4], 
        ydsPoc: fRow[4], // Map owner to ydsPoc for UI consistency
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
        estimatedQty: parseInt(fRow[16]) || 0,
        productType: fRow[17], 
        printType: fRow[18], 
        priority: fRow[19], 
        contactStatus: fRow[20], 
        paymentUpdate: fRow[21], 
        nextAction: fRow[22], 
        nextActionDate: fRow[23], 
        intent: fRow[24], 
        category: fRow[25] || identity.categoryIdentity || 'General',
        customerType: fRow[26],
        
        // Computed/Fallback
        date: identity.createdAt || fRow[8] || formatDate()
      };
    });
  } catch (e) {
    console.error("fetchAllLeads error:", e);
    return [];
  }
};

// --- WRITE OPERATIONS ---

// Helper to construct row array based on Schema Constant order
const buildRow = (schema: string[], dataObj: Record<string, any>) => {
    return schema.map(key => {
        // Map schema keys to Lead object keys
        switch(key) {
            // Identity
            case 'lead_id': return dataObj.leadId;
            case 'name': return dataObj.contactPerson;
            case 'phone': return dataObj.number;
            case 'email': return dataObj.email;
            case 'company': return dataObj.companyName;
            case 'city': return dataObj.city;
            case 'source_refs': return dataObj.source;
            case 'Category': return dataObj.categoryIdentity || dataObj.category;
            case 'created_by': return dataObj.createdBy;
            case 'tags': return dataObj.tags;
            case 'Status': return dataObj.identityStatus;
            case 'created_at': return dataObj.createdAt;
            case 'lead_score': return dataObj.leadScore;
            case 'note/description': return dataObj.remarks;
            case 'source_row_id': return dataObj.sourceRowId;
            case 'Info': return dataObj.info;
            
            // Flow
            case 'flow_id': return dataObj.flowId;
            case 'original_channel': return dataObj.originalChannel;
            case 'channel': return dataObj.channel;
            case 'owner': return dataObj.ydsPoc;
            case 'status': return dataObj.status;
            case 'stage': return dataObj.stage || dataObj.status;
            case 'source_flow_tag': return dataObj.sourceFlowTag;
            case 'updated_at': return dataObj.updatedAt;
            case 'start_date': return dataObj.startDate;
            case 'expected_close_date': return dataObj.expectedCloseDate;
            case 'won_date': return dataObj.wonDate;
            case 'lost_date': return dataObj.lostDate;
            case 'lost_reason': return dataObj.lostReason;
            case 'notes': return dataObj.orderInfo;
            case 'estimated_qty': return dataObj.estimatedQty;
            case 'product_type': return dataObj.productType;
            case 'print_type': return dataObj.printType;
            case 'priority': return dataObj.priority;
            case 'contact_status': return dataObj.contactStatus;
            case 'payment_update': return dataObj.paymentUpdate;
            case 'next_action_type': return dataObj.nextAction;
            case 'next_action_date': return dataObj.nextActionDate;
            case 'intent': return dataObj.intent;
            case 'category': return dataObj.category;
            case 'customer_type': return dataObj.customerType;
            default: return '';
        }
    });
};

export const addLead = async (lead: Lead): Promise<boolean> => {
    try {
        const sheetId = getSpreadsheetId();
        
        // Prepare Rows using defined Schema order
        const identityRow = buildRow(HEADER_KEYS.IDENTITY, lead);
        const flowRow = buildRow(HEADER_KEYS.FLOW, {
            ...lead,
            flowId: lead.flowId || `FLOW-${lead.leadId}`,
            updatedAt: formatDate(),
            createdAt: formatDate()
        });

        await Promise.all([
            window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: SHEET_NAMES.LEADS,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [identityRow] }
            }),
            window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: SHEET_NAMES.FLOWS,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [flowRow] }
            })
        ]);
        return true;
    } catch (e) {
        console.error("addLead error:", e);
        return false;
    }
};

export const updateLead = async (lead: Lead): Promise<boolean> => {
    try {
        const sheetId = getSpreadsheetId();
        const promises = [];

        // 1. Identity Update
        if (lead._identityRowIndex && lead._identityRowIndex > 0) {
            const identityRow = buildRow(HEADER_KEYS.IDENTITY, lead);
            promises.push(window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${SHEET_NAMES.LEADS}!A${lead._identityRowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [identityRow] }
            }));
        }

        // 2. Flow Update
        if (lead._flowRowIndex && lead._flowRowIndex > 0) {
            const flowRow = buildRow(HEADER_KEYS.FLOW, { ...lead, updatedAt: formatDate() });
            promises.push(window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `${SHEET_NAMES.FLOWS}!A${lead._flowRowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [flowRow] }
            }));
        } else if (lead._identityRowIndex && (!lead._flowRowIndex || lead._flowRowIndex === -1)) {
            // Heal missing flow record
            const flowRow = buildRow(HEADER_KEYS.FLOW, {
                ...lead,
                flowId: `FLOW-${lead.leadId}`,
                updatedAt: formatDate()
            });
            promises.push(window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: SHEET_NAMES.FLOWS,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [flowRow] }
            }));
        }

        await Promise.all(promises);
        return true;
    } catch (e) {
        console.error("updateLead error:", e);
        return false;
    }
};

// --- UTILITIES ---

export const loadSheetRange = async (sheetId: string, range: string): Promise<any[][]> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
        return response.result.values || [];
    } catch (e) {
        console.error(`Failed to load ${range}`, e);
        return [];
    }
};

export const appendRow = async (sheetId: string, range: string, row: any[]): Promise<boolean> => {
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [row] }
        });
        return true;
    } catch (e) { return false; }
};

export const updateSourceRow = async (sheetId: string, tabName: string, rowIndex: number, updates: {colIndex: number, value: any}[]): Promise<boolean> => {
    try {
        const data = updates.map(u => ({
            range: `${tabName}!${getColumnLetter(u.colIndex)}${rowIndex + 1}`, 
            values: [[u.value]]
        }));
        await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            resource: { valueInputOption: 'USER_ENTERED', data: data }
        });
        return true;
    } catch(e) { return false; }
};

export const fetchRemoteHeaders = async (sheetId: string, tabName: string = 'Sheet1'): Promise<{ success: boolean, headers?: string[], error?: string }> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${tabName}!1:1` });
        return { success: true, headers: response.result.values?.[0] || [] };
    } catch (e: any) { return { success: false, error: e.message }; }
};

export const fetchRemoteSheetNames = async (sheetId: string): Promise<{ success: boolean, sheetNames?: string[], error?: string }> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheetNames = response.result.sheets.map((s: any) => s.properties.title);
        return { success: true, sheetNames };
    } catch (e: any) { return { success: false, error: e.message }; }
};

export const fetchActivityLogsForLead = async (leadId: string): Promise<ActivityLog[]> => [];

// --- DIAGNOSTICS & SYSTEM CHECKS ---

export interface ColumnMetadata { index: number; letter: string; header: string; format: string; validation: string; }

export const analyzeSheetColumns = async (sheetId: string, sheetName: string): Promise<{ success: boolean, columns: ColumnMetadata[], error?: string }> => {
    try {
        const res = await fetchRemoteHeaders(sheetId, sheetName);
        if(!res.success || !res.headers) throw new Error(res.error || "No headers");
        
        const columns = res.headers.map((h, i) => ({
            index: i,
            letter: getColumnLetter(i),
            header: h,
            format: 'General', 
            validation: 'None'
        }));
        return { success: true, columns };
    } catch (e: any) { return { success: false, columns: [], error: e.message }; }
};

export const fetchDynamicSheet = async (sheetId: string, tabName: string): Promise<{ success: boolean, headers: string[], rows: any[][] }> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${tabName}!A1:ZZ100` });
        const [headers, ...rows] = response.result.values || [];
        return { success: true, headers: headers || [], rows: rows || [] };
    } catch (e) { return { success: false, headers: [], rows: [] }; }
};

export const fetchProjectManagerData = async () => ({ success: true, registry: [], sections: [], roles: [], slas: [], dictionary: [], changelog: [], error: undefined });
export const initializeSheetStructure = async () => true;
export const diagnoseSheetStructure = async () => ({ missingSheets: [], headerMismatches: {} });
export interface SchemaReport { missingSheets: string[], headerMismatches: any };
export const populateConfigData = async () => true;
export const SYSTEM_SHEET_NAMES = Object.values(SHEET_NAMES);
