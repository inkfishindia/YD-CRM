
import { Lead, ActivityLog, SourceConfig, FieldMapRule, LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate, formatDate } from '../types';
import { safeGetItem, safeSetItem } from './googleAuth';

// --- Constants ---

export const MODULE_IDS = {
  CORE: '1bbzFwbQ3z3lQGZoo6Y3WfvuBRJXlXp8xrf3LuDEGs1A',
  CONFIG: '1Z3MwuV9los8QAcCFQUgoKtpirCh9IPIkSLCfNHj8Jf4',
  ACTIVITY: '1Y0x98DnlK4v3rapo4zoCZj-LoFnMcNMUdkaowYsBC38'
};

export const SHEET_NAME_LEADS = 'Leads'; 
export const SHEET_NAME_LEAD_FLOWS = 'LEAD_FLOWS';
export const SHEET_NAME_LEGEND = 'Legend';
export const SHEET_NAME_ACTIVITY = 'ACTIVITY_LOG';
export const SHEET_NAME_INTAKE_SOURCES = 'Intake_Sources';
export const SHEET_NAME_INTAKE_MAPPINGS = 'Intake_Mappings';

// Added missing sheet names
export const SHEET_NAME_STAGE_RULES = 'Stage_Rules';
export const SHEET_NAME_SLA_RULES = 'SLA_Rules';
export const SHEET_NAME_AUTO_ACTION = 'Auto_Actions';
export const SHEET_NAME_TEMPLATES = 'Message_Templates';
export const SHEET_NAME_IDENTITY = 'Leads'; 
export const SHEET_NAME_DROPSHIP_FLOWS = 'Dropship_Flows';
export const SHEET_NAME_STORES = 'Stores';
export const SHEET_NAME_ACCOUNT_MAP = 'Account_Map';
export const SHEET_NAME_FLOW_HISTORY = 'Flow_History';

// Added missing CSV Headers
export const HEADER_LEAD_CSV = 'lead_id,date,source,employee_name,company_name,contact_person,number,email,city,order_information,estimated_qty,product_type,print_type,priority,category,yds_poc,status,stage,design,contact_status,payment_update,contact_attempts,last_contact_date,next_action,next_action_date,lost_reason,won_date,lost_date,sla_status,days_open,remarks,order_notes,last_attempt_date,assigned_to_history,reassign_reason,stale_date,created_at,updated_at,first_response_time,source_detail,sla_health,whatsapp_message,customer_type,action_overdue,stage_changed_date,platform_type,integration_ready,sample_required,sample_status,activation_date,workflow_type,store_url,account_created,dashboard_link_sent,designs_ready,first_product_created,onboarding_started_date,intent';
export const HEADER_LEGEND_CSV = 'list_name,value,display_order,color,is_default,is_active,probability';
export const HEADER_ACTIVITY_CSV = 'log_id,lead_id,timestamp,activity_type,owner,from_value,to_value,notes';
export const HEADER_STAGE_RULES_CSV = 'from_stage,to_stage,trigger,auto_set_field,auto_set_value,requires_field';
export const HEADER_SLA_RULES_CSV = 'rule_name,stage,channel,condition,threshold_hours,alert_level,alert_action';
export const HEADER_AUTO_ACTION_CSV = 'trigger_stage,trigger_event,default_next_action,default_days,channel';
export const HEADER_TEMPLATES_CSV = 'id,stage,category,name,subject,body,info_level';
export const HEADER_IDENTITY_CSV = 'lead_id,contact_person,number,email,company_name,city,source,category,created_by,tags,identity_status,created_at,lead_score,remarks,source_row_id,info';
export const HEADER_LEAD_FLOW_CSV = 'flow_id,lead_id,original_channel,channel,owner,status,stage,source_flow_tag,created_at,updated_at,start_date,expected_close_date,won_date,lost_date,lost_reason,notes,estimated_qty,product_type,print_type,priority,contact_status,payment_update,next_action,next_action_date,intent,category,customer_type';
export const HEADER_DROPSHIP_FLOW_CSV = 'flow_id,lead_id,platform_type,store_url,integration_ready,onboarding_started_date,account_created,dashboard_link_sent,first_product_created,activation_date';
export const HEADER_STORE_CSV = 'store_id,account_id,store_name,platform,url,status,integration_status,created_at';
export const HEADER_ACCOUNT_MAP_CSV = 'account_id,primary_contact_id,company_name,type,city,total_value,tier,owner';
export const HEADER_FLOW_HISTORY_CSV = 'history_id,flow_id,stage_from,stage_to,timestamp,user,duration_in_stage';

// Ranges
const RANGE_LEADS = 'Leads!A2:P';
const RANGE_FLOWS = 'LEAD_FLOWS!A2:AA';
const RANGE_LEGENDS = 'Legend!A:G';

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

export const getColumnLetter = (colIndex: number): string => {
    let temp, letter = '';
    while (colIndex >= 0) {
        temp = (colIndex) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = (colIndex - temp - 1) / 26; 
        if (colIndex < 0) break;
    }
    return letter;
};

export const loadSheetRange = async (sheetId: string, range: string): Promise<any[][]> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: range
        });
        return response.result.values || [];
    } catch (e) {
        console.error(`Failed to load range ${range} from ${sheetId}`, e);
        return [];
    }
};

// --- Core Data Fetching ---

export const fetchAllLeads = async (): Promise<Lead[]> => {
  try {
    const [identityRows, flowRows] = await Promise.all([
      loadSheetRange(MODULE_IDS.CORE, RANGE_LEADS),
      loadSheetRange(MODULE_IDS.CORE, RANGE_FLOWS)
    ]);

    const identityMap = new Map();
    identityRows.forEach((row, index) => {
      // Identity Schema: A-P (0-15)
      if (row[0]) { // Check lead_id existence
          identityMap.set(row[0], {
            _identityRowIndex: index + 2,
            leadId: row[0], contactPerson: row[1], number: row[2], 
            email: row[3], companyName: row[4], city: row[5],
            source: row[6], category: row[7], createdBy: row[8], tags: row[9],
            identityStatus: row[10], createdAt: row[11],
            leadScore: row[12], remarks: row[13], sourceRowId: row[14], info: row[15]
          });
      }
    });

    const leads: Lead[] = flowRows.map((fRow, idx) => {
      // Flow Schema: A-AA (0-26)
      const leadId = fRow[1];
      const identity = identityMap.get(leadId) || {};
      
      const v = (arr: any[], idx: number) => arr[idx] === undefined ? '' : String(arr[idx]);
      const vn = (arr: any[], idx: number) => {
          const val = Number(arr[idx]);
          return isNaN(val) ? 0 : val;
      };

      return {
        _rowIndex: idx + 2,
        ...identity,
        // Fallbacks if identity missing
        leadId: leadId,
        companyName: identity.companyName || 'Unknown',
        
        flowId: v(fRow, 0), leadId_FK: v(fRow, 1),
        originalChannel: v(fRow, 2), channel: v(fRow, 3), owner: v(fRow, 4),
        ydsPoc: v(fRow, 4), status: v(fRow, 5), stage: v(fRow, 6),
        sourceFlowTag: v(fRow, 7), createdAt: v(fRow, 8), updatedAt: v(fRow, 9),
        startDate: v(fRow, 10), expectedCloseDate: v(fRow, 11),
        wonDate: v(fRow, 12), lostDate: v(fRow, 13), lostReason: v(fRow, 14),
        notes: v(fRow, 15), estimatedQty: vn(fRow, 16),
        productType: v(fRow, 17), printType: v(fRow, 18), priority: v(fRow, 19),
        contactStatus: v(fRow, 20), paymentUpdate: v(fRow, 21),
        nextAction: v(fRow, 22), nextActionDate: v(fRow, 23),
        intent: v(fRow, 24), category: v(fRow, 25) || identity.category || 'General',
        customerType: v(fRow, 26),
        
        // Computed UI Fields
        date: identity.createdAt ? String(identity.createdAt).split('T')[0] : formatDate(),
        orderInfo: v(fRow, 15) || identity.remarks || '',
        contactAttempts: 0,
        lastContactDate: v(fRow, 9),
        lastAttemptDate: '',
        slaStatus: 'Healthy', slaHealth: '🟢', daysOpen: '0', 
        actionOverdue: 'OK', firstResponseTime: '', stageChangedDate: v(fRow, 9),
        platformType: '', integrationReady: '', storeUrl: '', accountCreated: '', 
        dashboardLinkSent: '', onboardingStartedDate: '', activationDate: '',    
        sampleRequired: '', sampleStatus: '', workflowType: '', designsReady: '', 
        firstProductCreated: '', whatsappMessage: ''
      };
    });
    
    return leads;
  } catch (e) {
    console.error("fetchAllLeads failed:", e);
    return [];
  }
};

export const fetchCoreDataBatch = async (): Promise<{ 
    leads: Lead[], 
    legends: LegendItem[], 
    success: boolean, 
    error?: string 
}> => {
    try {
        const [leads, legendRes] = await Promise.all([
            fetchAllLeads(),
            loadSheetRange(getSpreadsheetId(), RANGE_LEGENDS)
        ]);

        const legends = legendRes.slice(1).map((r: any[]) => ({
            listName: r[0], value: r[1], displayOrder: r[2], color: r[3], 
            isDefault: r[4] === true || r[4] === 'TRUE', 
            isActive: r[5] === true || r[5] === 'TRUE',
            probability: r[6]
        })).filter((l: any) => l.listName) as LegendItem[];

        return { success: true, leads, legends };
    } catch (e: any) {
        return { success: false, leads: [], legends: [], error: e.message };
    }
};

// --- Updates (Write Operations) ---

// Identity fields (Leads Sheet)
const IDENTITY_COL_MAP: Record<string, number> = {
  leadId: 0, contactPerson: 1, number: 2, email: 3, companyName: 4,
  city: 5, source: 6, category: 7, createdBy: 8, tags: 9, identityStatus: 10,
  createdAt: 11, leadScore: 12, remarks: 13, sourceRowId: 14, info: 15
};

// Flow fields (LEAD_FLOWS Sheet)
const FLOW_COL_MAP: Record<string, number> = {
  flowId: 0, leadId: 1, originalChannel: 2, channel: 3, owner: 4, ydsPoc: 4,
  status: 5, stage: 6, sourceFlowTag: 7, createdAt: 8, updatedAt: 9, startDate: 10,
  expectedCloseDate: 11, wonDate: 12, lostDate: 13, lostReason: 14, notes: 15,
  estimatedQty: 16, productType: 17, printType: 18, priority: 19,
  contactStatus: 20, paymentUpdate: 21, nextAction: 22, nextActionDate: 23,
  intent: 24, category: 25, customerType: 26
};

export const updateSourceRow = async (sheetId: string, tabName: string, rowIndex: number, updates: { colIndex: number, value: any }[]): Promise<boolean> => {
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
    } catch (e) {
        console.error("Update Row Failed", e);
        return false;
    }
};

export const appendRow = async (spreadsheetId: string, range: string, values: any[]): Promise<boolean> => {
    try {
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId, range, valueInputOption: 'USER_ENTERED', resource: { values: [values] }
        });
        return true;
    } catch (e) {
        console.error("Append Failed", e);
        return false;
    }
};

export const addLead = async (lead: Lead): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    const timestamp = formatDate();
    
    // Generate IDs if missing
    const leadId = lead.leadId || `LEAD-${Date.now()}`;
    const flowId = lead.flowId || `FLOW-${Date.now()}`;

    // Prepare Rows
    const identityRow = [
        leadId, lead.contactPerson || '', lead.number || '', lead.email || '', 
        lead.companyName || '', lead.city || '', lead.source || '', lead.category || '', 
        lead.createdBy || 'System', lead.tags || '', 'Active', timestamp, 
        lead.leadScore || '', lead.remarks || '', lead.sourceRowId || '', lead.info || ''
    ];

    const flowRow = [
        flowId, leadId, lead.originalChannel || '', lead.channel || '', 
        lead.ydsPoc || 'Unassigned', lead.status || 'New', lead.stage || 'New', 
        lead.sourceFlowTag || '', timestamp, timestamp, lead.startDate || timestamp, 
        lead.expectedCloseDate || '', lead.wonDate || '', lead.lostDate || '', 
        lead.lostReason || '', lead.notes || '', lead.estimatedQty || 0, 
        lead.productType || '', lead.printType || '', lead.priority || '',
        lead.contactStatus || '', lead.paymentUpdate || '', lead.nextAction || '', 
        lead.nextActionDate || '', lead.intent || '', lead.category || '', lead.customerType || ''
    ];

    try {
        await Promise.all([
            appendRow(sheetId, SHEET_NAME_LEADS, identityRow),
            appendRow(sheetId, SHEET_NAME_LEAD_FLOWS, flowRow)
        ]);
        return true;
    } catch (e) {
        console.error("Add Lead Failed", e);
        return false;
    }
};

export const updateLead = async (lead: Lead, userEmail: string = 'System'): Promise<boolean> => {
    const sheetId = getSpreadsheetId();
    try {
        const flowRowIndex = lead._rowIndex - 1;
        const identityRowIndex = lead._identityRowIndex - 1;
        const now = new Date().toISOString();

        const identityUpdates: { colIndex: number, value: any }[] = [];
        Object.entries(IDENTITY_COL_MAP).forEach(([field, colIdx]) => {
            const val = lead[field as keyof Lead];
            if (val !== undefined) identityUpdates.push({ colIndex: colIdx, value: val });
        });

        const flowUpdates: { colIndex: number, value: any }[] = [];
        Object.entries(FLOW_COL_MAP).forEach(([field, colIdx]) => {
            const val = lead[field as keyof Lead];
            if (val !== undefined) flowUpdates.push({ colIndex: colIdx, value: val });
        });
        // Always update timestamp in Flow
        flowUpdates.push({ colIndex: FLOW_COL_MAP['updatedAt'], value: now });

        // Parallel Execution
        const promises = [];
        if (identityRowIndex >= 0) {
            promises.push(updateSourceRow(sheetId, SHEET_NAME_LEADS, identityRowIndex, identityUpdates));
        }
        if (flowRowIndex >= 0) {
            promises.push(updateSourceRow(sheetId, SHEET_NAME_LEAD_FLOWS, flowRowIndex, flowUpdates));
        }

        const results = await Promise.all(promises);
        return results.every(r => r);
    } catch (e) {
        console.error("Update Lead Failed", e);
        return false;
    }
};

export const addActivityLog = async (log: any) => {
    const sheetId = MODULE_IDS.ACTIVITY;
    const row = [log.logId, log.leadId, log.timestamp, log.activityType, log.owner, log.fromValue || '', log.toValue || '', log.notes || ''];
    return appendRow(sheetId, SHEET_NAME_ACTIVITY, row);
};

export const fetchActivityLogsForLead = async (leadId: string): Promise<ActivityLog[]> => {
    try {
        const response = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: MODULE_IDS.ACTIVITY,
            range: `${SHEET_NAME_ACTIVITY}!A:H`, 
        });
        const rows = response.result.values || [];
        return rows
            .slice(1)
            .filter((r: any[]) => r[1] === leadId)
            .map((r: any[]) => ({
                logId: r[0], leadId: r[1], timestamp: r[2], activityType: r[3],
                owner: r[4], fromValue: r[5], toValue: r[6], notes: r[7]
            }))
            .reverse();
    } catch (e) {
        console.error("Activity Fetch Error", e);
        return [];
    }
};

// ... Types for exports
export interface SchemaReport {
  missingSheets: string[];
  headerMismatches: Record<string, string[]>;
}

export interface ColumnMetadata {
  index: number;
  letter: string;
  header: string;
  format: string;
  validation: string;
}

// ... unused exports kept for compatibility
export const initializeSheetStructure = async () => true;
export const diagnoseSheetStructure = async (): Promise<SchemaReport> => ({ missingSheets: [], headerMismatches: {} });
export const analyzeSheetColumns = async (sheetId: string, sheetName: string): Promise<{ success: boolean, columns: ColumnMetadata[], error?: string }> => ({ success: false, columns: [] });
export const populateConfigData = async () => true;
export const fetchRemoteHeaders = async (sheetId: string, tab: string): Promise<{ success: boolean, headers: string[], error?: string }> => {
    try {
        const res = await loadSheetRange(sheetId, `${tab}!1:1`);
        return { success: true, headers: res[0] || [] };
    } catch(e: any) {
        return { success: false, headers: [], error: e.message };
    }
};
export const fetchDynamicSheet = async (sheetId: string, tabName: string): Promise<{ success: boolean, headers: string[], rows: any[][], error?: string }> => {
    try {
        const data = await loadSheetRange(sheetId, `${tabName}!A1:ZZ100`);
        if (!data || data.length === 0) {
            return { success: true, headers: [], rows: [] };
        }
        const [headers, ...rows] = data;
        return { success: true, headers: headers || [], rows: rows || [] };
    } catch (e: any) {
        return { success: false, headers: [], rows: [], error: e.message };
    }
};
export const fetchRemoteSheetNames = async (sheetId: string) => ({ success: true, sheetNames: [] });
export const fetchProjectManagerData = async (): Promise<any> => ({ success: true });
export const SOURCE_CONFIG: Record<string, { id: string, sheetName: string }> = {
    'TKW': { id: '1sImoVXLvVlv3_LONrDZLm-auzZPJsAE1NmAbxgz3MHU', sheetName: 'TKW Lead sheet' },
    'Commerce': { id: '1UVP93fwaqxjX3TW3P6i0Uax4XeSUr2I1YZQgsJFBzm0', sheetName: 'Auto New Lead' },
    'Dropship': { id: '1kJa4O-yMvcmueR2rQEK8Vze12-bf5o0t3ketLReLMx0', sheetName: 'DS_leads.csv' }
};
export const SYSTEM_SHEET_NAMES = [SHEET_NAME_LEADS, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY];
export const SHEET_IDS = MODULE_IDS;
