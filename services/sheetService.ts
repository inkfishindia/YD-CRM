
import { Lead, LegendItem, ActivityLog, StageRule, SLARule, AutoActionRule, MessageTemplate, calculatePriority, fromSheetDate, toSheetDate, SHEET_IDS, formatDate } from '../types';

// Mock Data Imports
import { 
  MOCK_LEADS, 
  MOCK_LEGENDS, 
  MOCK_STAGE_RULES, 
  MOCK_SLA_RULES, 
  MOCK_AUTO_ACTIONS, 
  MOCK_TEMPLATES, 
  MOCK_ACTIVITY 
} from '../data/mock/mockData';

// Configuration
const DEFAULT_SPREADSHEET_ID = SHEET_IDS.MAIN;
const STORAGE_KEY_SHEET_ID = 'yds_sheet_id';
const STORAGE_KEY_HEADER_MAP = 'yds_header_map';

export const getSpreadsheetId = () => {
  return localStorage.getItem(STORAGE_KEY_SHEET_ID) || DEFAULT_SPREADSHEET_ID;
};

export const setSpreadsheetId = (id: string) => {
  // Extract ID if full URL is pasted
  let cleanId = id;
  if (id.includes('/spreadsheets/d/')) {
      const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) cleanId = match[1];
  }
  localStorage.setItem(STORAGE_KEY_SHEET_ID, cleanId);
  localStorage.removeItem(CACHE_KEY); // Invalidate cache
};

// Section 2 - Table Definitions
export const SHEET_NAME_LEADS = 'TKW LEAD SHEET';
export const SHEET_NAME_LEGEND = 'Legend';
export const SHEET_NAME_ACTIVITY = 'ActivityLog'; // Updated from Activity Log
export const SHEET_NAME_STAGE_RULES = 'Stage Rules';
export const SHEET_NAME_SLA_RULES = 'SLA Rules';
export const SHEET_NAME_AUTO_ACTION = 'Auto Next Action';
export const SHEET_NAME_TEMPLATES = 'Message Templates';

// New Architecture Tabs
export const SHEET_NAME_IDENTITY = 'YDS_LEAD_IDENTITY';
export const SHEET_NAME_FLOW_B2B = 'FLOW_B2B';
export const SHEET_NAME_FLOW_DROPSHIP = 'FLOW_DROPSHIP';
export const SHEET_NAME_FLOW_D2C = 'FLOW_D2C';
export const SHEET_NAME_FLOW_HISTORY = 'FLOW_STAGE_HISTORY';


// Cache Configuration
const CACHE_KEY = 'yds_system_data_v18'; 
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

// Local DB Key for Offline Writes
const LOCAL_DB_KEY = 'yds_local_database_v7'; 

interface CachedData {
  timestamp: number;
  data: SystemData;
}

// Type for Header Map
type HeaderMap = Record<string, number>;

// SECTION 2 - CSV Defaults for Initialization
// 2.1 TKW LEAD SHEET (Primary) - Added expected_close_date at end
export const HEADER_LEAD_CSV = `lead_id,date,source,employee_name,company_name,contact_person,number,email,city,order_information,estimated_qty,product_type,print_type,priority,category,yds_poc,status,stage,design,contact_status,payment_update,contact_attempts,last_contact_date,next_action,next_action_date,lost_reason,won_date,lost_date,sla_status,days_open,remarks,order_notes,last_attempt_date,assigned_to_history,reassign_reason,stale_date,created_at,updated_at,first_response_time,source_detail,sla_health,whatsapp_message,customer_type,action_overdue,stage_changed_date,platform_type,integration_ready,sample_required,sample_status,activation_date,workflow_type,store_url,account_created,dashboard_link_sent,designs_ready,first_product_created,onboarding_started_date,intent,tags,order_status,expected_close_date`;

// 2.6 Activity Log - Updated Schema
export const HEADER_ACTIVITY_CSV = `log_id,flow_id,yds_lead_id,flow_type,activity_type,old_value,new_value,field_changed,notes,created_by,created_at,source,sla_status_at_event,intent_at_event,stage_at_event,owner_at_event,attachment_url,route_event,sample_event,system_rule_fired,rule_name,rule_parameters,ip_address,user_agent,session_id,checksum`;

// 2.7 Legend - Added probability
export const HEADER_LEGEND_CSV = `list_name,value,display_order,color,is_default,is_active,probability`;

// 2.8 Stage Rules
export const HEADER_STAGE_RULES_CSV = `flow_type,from_stage,to_stage,trigger,auto_set_field,auto_set_value,requires_field,template_category,next_action_type,next_action_due_days,notes,is_active`;

// 2.10 SLA Rules
export const HEADER_SLA_RULES_CSV = `flow_type,stage,condition_key,condition_value,sla_hours,warning_hours,overdue_label,warning_label,ok_label,is_active`;

// 2.11 Auto Next Action
export const HEADER_AUTO_ACTION_CSV = `flow_type,stage,condition_key,condition_value,next_action_type,template_category,days_offset,is_active`;

// 2.12 Message Templates
export const HEADER_TEMPLATES_CSV = `template_id,flow_type,stage,template_category,title,body,variables,is_active`;

// NEW LAYERS - CSV DEFAULTS - Updated Schemas
export const HEADER_IDENTITY_CSV = `lead_id,name,email,phone,company_name,city,source,source_detail,created_at`;

export const HEADER_FLOW_B2B_CSV = `flow_id,yds_lead_id,source_id,ydsPoc,status,stage,estimated_qty,product_type,print_type,priority,contact_status,payment_update,next_action,next_action_date,expected_close_date,won_date,lost_date,lost_reason,created_at,created_by,stage_changed_date,stage_changed_by,last_contact_date,last_contact_type,remarks,intent,category,customer_type,sla_status,response_time_mins,time_in_stage_days,total_interactions,attachment_urls,checksum`;

export const HEADER_FLOW_DROPSHIP_CSV = `flow_id,yds_lead_id,source_id,ydsPoc,status,stage,estimated_qty,product_type,print_type,priority,contact_status,payment_update,next_action,next_action_date,won_date,lost_date,lost_reason,created_at,created_by,stage_changed_date,stage_changed_by,last_contact_date,last_contact_type,remarks,platform_type,store_url,integration_ready,dashboard_link_sent,onboarding_started_date,account_created,first_product_created,activation_date,intent,sla_status,response_time_mins,time_in_stage_days,total_interactions,attachment_urls,checksum`;

export const HEADER_FLOW_HISTORY_CSV = `history_id,flow_id,from_stage,to_stage,changed_by,timestamp,reason,notes`;

// --- SOURCE CONFIGURATION (EXTERNAL SHEETS) ---
export const SOURCE_CONFIG = {
    TKW: {
        id: SHEET_IDS.TKW,
        name: 'TKW Leads',
        sheetName: 'Sheet1',
        headers: [
            'lead_id', 'DATE', 'Source', 'EMPLOYEE NAME', 'company_name',
            'Contact person', 'NUMBER', 'email', 'city', 'ORDER INFORMATION',
            'Est Qty', 'product_type', 'print_type', 'REMARKS', 'ORDER STATUS', 'YDC - Status'
        ]
    },
    COMMERCE: {
        id: SHEET_IDS.ODC, // Commerce / ODC
        name: 'Commerce Leads',
        sheetName: 'Sheet1',
        headers: [
            'Date', 'Time', 'Business Name', 'First Name', 'Last Name', 'Phone', 'Email',
            'Address Line1', 'Address Line2', 'Country', 'Pincode', 'City', 'State',
            'YDS Call Status', 'Already Selling', '**BLANK**', 'Where', 'Currently using',
            'Website/Social URL', 'GST Registered', 'New/Experienced', 'Next Follow Up',
            'YDS Lead Status', 'YDS Comments', 'COMMM Call Status', 'Lead Status',
            'COMMM Comments', 'source_id', 'Full name', 'yds_lead_id'
        ]
    },
    DS: {
        id: SHEET_IDS.SLK, // DS / SLK
        name: 'Dropship Leads',
        sheetName: 'Sheet1',
        headers: [
            'Source_Lead_id', 'Lead Name', 'Source', 'Date', 'Company / brand',
            'Phone / WhatsApp', 'Email', 'Requirement (verbatim)', 'Sent By',
            'YDC - Status', 'Lead category', 'Brand', 'Comments', 'Last attempt type',
            'Last attempt date', 'Allocated to', 'yds_lead_id'
        ]
    },
    PARTNERS: {
        id: SHEET_IDS.PARTNERS,
        name: 'YDS Partners',
        sheetName: 'Active partners',
        headers: [
            'Date', 'Name', 'Brand Name', 'GSTIN', 'Mobile Number', 'Email Address', 
            'Address Line 1', 'Address Line 2', 'City', 'State', 'Country', 'Pincode', 
            'status', 'Published', 'Create YDS partner page', 'Show on YDS partners list', 
            'Login Required To Purchase', 'Shipping Preference', 'Skip Partner Invoice', 
            'Allow Zero Commission'
        ]
    }
};

// --- DATA MAPPING UTILITY ---
export const mapExternalRowToLead = (row: Record<string, string>, sourceType: 'TKW' | 'COMMERCE' | 'DS' | 'PARTNERS'): Partial<Lead> => {
    const data: Partial<Lead> = {};

    if (sourceType === 'TKW') {
        data.leadId = row['lead_id'];
        data.date = fromSheetDate(row['DATE']);
        data.source = row['Source'];
        data.employeeName = row['EMPLOYEE NAME'];
        data.companyName = row['company_name'];
        data.contactPerson = row['Contact person'];
        data.number = row['NUMBER'];
        data.email = row['email'];
        data.city = row['city'];
        data.orderInfo = row['ORDER INFORMATION'];
        data.estimatedQty = parseInt(row['Est Qty']) || 0;
        data.productType = row['product_type'];
        data.printType = row['print_type'];
        data.remarks = row['REMARKS'];
        data.orderStatus = row['ORDER STATUS'];
        data.status = row['YDC - Status'];
    } 
    else if (sourceType === 'COMMERCE') {
        data.leadId = row['yds_lead_id'] || row['source_id'];
        data.date = fromSheetDate(row['Date']);
        data.companyName = row['Business Name'];
        data.contactPerson = `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim() || row['Full name'];
        data.number = row['Phone'];
        data.email = row['Email'];
        data.city = row['City'];
        data.storeUrl = row['Website/Social URL'];
        data.status = row['YDS Lead Status'];
        data.remarks = row['YDS Comments'];
    }
    else if (sourceType === 'DS') {
        data.leadId = row['yds_lead_id'] || row['Source_Lead_id'];
        data.contactPerson = row['Lead Name'];
        data.source = row['Source'];
        data.date = fromSheetDate(row['Date']);
        data.companyName = row['Company / brand'] || row['Brand'];
        data.number = row['Phone / WhatsApp'];
        data.email = row['Email'];
        data.orderInfo = row['Requirement (verbatim)'];
        data.employeeName = row['Sent By'];
        data.status = row['YDC - Status'];
        data.category = row['Lead category'];
        data.remarks = row['Comments'];
        data.ydsPoc = row['Allocated to'];
    }
    else if (sourceType === 'PARTNERS') {
         data.leadId = `PTR-${row['GSTIN'] || Math.floor(Math.random() * 10000)}`;
         data.date = fromSheetDate(row['Date']);
         data.companyName = row['Brand Name'];
         data.contactPerson = row['Name'];
         data.number = row['Mobile Number'];
         data.email = row['Email Address'];
         data.city = row['City'];
         data.status = row['status'];
         data.source = 'YDS Partners';
         data.category = 'Partner';
         data.sourceDetail = `GST: ${row['GSTIN'] || 'N/A'}`;
    }

    return data;
};

// --- MOCK SOURCE DATA FOR PREVIEW ---
const getMockSourceData = (key: keyof typeof SOURCE_CONFIG) => {
    const today = formatDate();
    if (key === 'TKW') {
        return [
            ['lead_id', 'DATE', 'Source', 'EMPLOYEE NAME', 'company_name', 'Contact person', 'NUMBER', 'email', 'city', 'ORDER INFORMATION', 'Est Qty', 'product_type', 'print_type', 'REMARKS', 'ORDER STATUS', 'YDC - Status'],
            [`TKW-${Date.now()}-1`, today, 'Vendor', 'MockUser', 'Alpha Designs', 'Rahul S', '9876543210', 'rahul@alpha.com', 'Mumbai', '50 T-shirts needed', '50', 'T-Shirt', 'DTF', 'Urgent', 'Open', 'New'],
            [`TKW-${Date.now()}-2`, today, 'Walk-in', 'MockUser', 'Beta Corp', 'Simran K', '9123456780', 'sim@beta.com', 'Delhi', 'Hoodies for team', '20', 'Hoodie', 'Puff', '', 'Pending', 'Qualified']
        ];
    }
    if (key === 'COMMERCE') {
        return [
            ['Date', 'Time', 'Business Name', 'First Name', 'Last Name', 'Phone', 'Email', 'Address Line1', 'Address Line2', 'Country', 'Pincode', 'City', 'State', 'YDS Call Status', 'Already Selling', '**BLANK**', 'Where', 'Currently using', 'Website/Social URL', 'GST Registered', 'New/Experienced', 'Next Follow Up', 'YDS Lead Status', 'YDS Comments', 'COMMM Call Status', 'Lead Status', 'COMMM Comments', 'source_id', 'Full name', 'yds_lead_id'],
            [today, '10:00', 'Gamer Gear', 'Vikram', 'Rathore', '9988776655', 'vikram@gg.com', 'Flat 101', 'Street 2', 'India', '560001', 'Bangalore', 'KA', 'Connected', 'Yes', '', 'Shopify', 'Printrove', 'gamergear.in', 'Yes', 'Experienced', '', 'New', 'Wants better margins', '', '', '', 'COMM-101', 'Vikram Rathore', `COM-${Date.now()}-1`]
        ];
    }
    if (key === 'DS') {
        return [
            ['Source_Lead_id', 'Lead Name', 'Source', 'Date', 'Company / brand', 'Phone / WhatsApp', 'Email', 'Requirement (verbatim)', 'Sent By', 'YDC - Status', 'Lead category', 'Brand', 'Comments', 'Last attempt type', 'Last attempt date', 'Allocated to', 'yds_lead_id'],
            ['DS-SOURCE-1', 'Anjali P', 'Instagram', today, 'Style My Way', '8899776655', 'anjali@style.com', 'Looking for POD supplier', 'Ads', 'New', 'Dropshipping', 'Style My Way', 'Has 10k followers', '', '', 'Unassigned', `DS-${Date.now()}-1`]
        ];
    }
    return [];
};

// ... (Rest of auth and config code unchanged until fetchSystemData) ...

// Auth State
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (window.gapi?.client) {
      window.gapi.client.setToken(token ? { access_token: token } : null);
  }
};

const getCol = (row: any[], idx: number) => (row[idx] !== undefined && row[idx] !== null) ? String(row[idx]).trim() : '';

// --- DYNAMIC HEADER MAPPING HELPERS (SECTION 3) ---
const normalizeHeader = (header: string) => {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
};

export const buildHeaderIndexMap = (headerRow: string[]): HeaderMap => {
  const map: HeaderMap = {};
  headerRow.forEach((header, index) => {
    if (!header) return;
    const key = normalizeHeader(header);
    map[key] = index;
  });
  return map;
};

const getHeaderMap = (): HeaderMap | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HEADER_MAP);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to load header map", e);
  }
  return null;
};

const saveHeaderMap = (map: HeaderMap) => {
  try {
    localStorage.setItem(STORAGE_KEY_HEADER_MAP, JSON.stringify(map));
  } catch (e) {
    console.warn("Failed to save header map", e);
  }
};

export interface SchemaReport {
    sheetName: string;
    status: 'ok' | 'missing_sheet' | 'missing_headers';
    missingColumns: string[];
}

export const diagnoseSheetStructure = async (): Promise<SchemaReport[]> => {
    if (!accessToken || !window.gapi?.client?.sheets) {
        throw new Error("Must be logged in to run diagnostics.");
    }
    const sheetId = getSpreadsheetId();
    const definitions = [
        { name: SHEET_NAME_LEADS, expected: HEADER_LEAD_CSV },
        { name: SHEET_NAME_LEGEND, expected: HEADER_LEGEND_CSV },
        { name: SHEET_NAME_ACTIVITY, expected: HEADER_ACTIVITY_CSV },
        { name: SHEET_NAME_STAGE_RULES, expected: HEADER_STAGE_RULES_CSV },
        { name: SHEET_NAME_SLA_RULES, expected: HEADER_SLA_RULES_CSV },
        { name: SHEET_NAME_AUTO_ACTION, expected: HEADER_AUTO_ACTION_CSV },
        { name: SHEET_NAME_TEMPLATES, expected: HEADER_TEMPLATES_CSV },
    ];
    const reports: SchemaReport[] = [];
    try {
        const meta = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const existingTitles = (meta.result.sheets || []).map((s: any) => s.properties.title);
        const rangesToFetch: string[] = [];
        const validSheets: typeof definitions = [];
        definitions.forEach(def => {
            if (!existingTitles.includes(def.name)) {
                reports.push({
                    sheetName: def.name,
                    status: 'missing_sheet',
                    missingColumns: []
                });
            } else {
                rangesToFetch.push(`${def.name}!A1:Z1`);
                validSheets.push(def);
            }
        });
        if (rangesToFetch.length > 0) {
            const resp = await window.gapi.client.sheets.spreadsheets.values.batchGet({
                spreadsheetId: sheetId,
                ranges: rangesToFetch,
                majorDimension: 'ROWS',
                valueRenderOption: 'UNFORMATTED_VALUE',
            });
            const valueRanges = resp.result.valueRanges || [];
            validSheets.forEach((def, idx) => {
                const range = valueRanges[idx];
                const actualHeaders = (range?.values?.[0] || []).map((h: string) => normalizeHeader(String(h)));
                const expectedHeaders = def.expected.split(',').map(h => normalizeHeader(h));
                const missing = expectedHeaders.filter(req => !actualHeaders.includes(req));
                if (missing.length > 0) {
                    reports.push({
                        sheetName: def.name,
                        status: 'missing_headers',
                        missingColumns: missing
                    });
                } else {
                    reports.push({
                        sheetName: def.name,
                        status: 'ok',
                        missingColumns: []
                    });
                }
            });
        }
        return reports;
    } catch (e: any) {
        console.error("Diagnostic Error", e);
        throw new Error(e.message || "Failed to run diagnostics");
    }
};

export const validateSheetSchema = (): { valid: boolean, missing: string[] } => {
    const map = getHeaderMap();
    if (!map) return { valid: false, missing: ['No header map found (Sync required)'] };
    const required = HEADER_LEAD_CSV.split(',');
    const missing: string[] = [];
    required.forEach(req => {
        if (map[normalizeHeader(req)] === undefined) missing.push(req);
    });
    return { valid: missing.length === 0, missing };
};

const leadToRowArray = (lead: Lead, map: HeaderMap): string[] => {
  const maxIndex = Math.max(...Object.values(map));
  const row: string[] = Array(maxIndex + 1).fill("");
  const set = (key: string, value: any) => {
    const normalizedKey = normalizeHeader(key); 
    const idx = map[normalizedKey];
    if (idx !== undefined) row[idx] = value ?? "";
  };
  set("lead_id", lead.leadId);
  set("date", toSheetDate(lead.date));
  set("source", lead.source);
  set("employee_name", lead.employeeName);
  set("company_name", lead.companyName);
  set("contact_person", lead.contactPerson);
  set("number", lead.number);
  set("email", lead.email);
  set("city", lead.city);
  set("order_information", lead.orderInfo);
  set("estimated_qty", lead.estimatedQty);
  set("product_type", lead.productType);
  set("print_type", lead.printType);
  set("priority", lead.priority);
  set("category", lead.category);
  set("yds_poc", lead.ydsPoc);
  set("status", lead.status);
  set("stage", lead.stage);
  set("design", lead.design);
  set("contact_status", lead.contactStatus);
  set("payment_update", lead.paymentUpdate);
  set("contact_attempts", lead.contactAttempts);
  set("last_contact_date", toSheetDate(lead.lastContactDate));
  set("next_action", lead.nextAction);
  set("next_action_date", toSheetDate(lead.nextActionDate));
  set("lost_reason", lead.lostReason);
  set("won_date", toSheetDate(lead.wonDate));
  set("lost_date", toSheetDate(lead.lostDate));
  set("sla_status", lead.slaStatus);
  set("days_open", lead.daysOpen);
  set("remarks", lead.remarks);
  set("order_notes", lead.orderNotes);
  set("last_attempt_date", toSheetDate(lead.lastAttemptDate));
  set("assigned_to_history", lead.assignedToHistory);
  set("reassign_reason", lead.reassignReason);
  set("stale_date", toSheetDate(lead.staleDate));
  set("created_at", lead.createdAt);
  set("updated_at", lead.updatedAt);
  set("first_response_time", lead.firstResponseTime);
  set("source_detail", lead.sourceDetail);
  set("sla_health", lead.slaHealth);
  set("whatsapp_message", lead.whatsappMessage);
  set("customer_type", lead.customerType);
  set("action_overdue", lead.actionOverdue);
  set("stage_changed_date", toSheetDate(lead.stageChangedDate));
  set("platform_type", lead.platformType);
  set("integration_ready", lead.integrationReady);
  set("sample_required", lead.sampleRequired);
  set("sample_status", lead.sampleStatus);
  set("activation_date", toSheetDate(lead.activationDate));
  set("workflow_type", lead.workflowType);
  set("store_url", lead.storeUrl);
  set("account_created", lead.accountCreated);
  set("dashboard_link_sent", lead.dashboardLinkSent);
  set("designs_ready", lead.designsReady);
  set("first_product_created", lead.firstProductCreated);
  set("onboarding_started_date", toSheetDate(lead.onboardingStartedDate));
  set("intent", lead.intent);
  set("tags", lead.tags);
  set("order_status", lead.orderStatus);
  set("expected_close_date", toSheetDate(lead.expectedCloseDate));
  return row;
};

const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (insideQuote) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++; 
      } else if (char === '"') {
        insideQuote = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        currentRow.push(currentVal);
        currentVal = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
        if (char === '\r') i++;
      } else if (char === '\r') {
         currentRow.push(currentVal);
         rows.push(currentRow);
         currentRow = [];
         currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }
  if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal);
      rows.push(currentRow);
  }
  return rows;
};

const parseLeadRow = (row: any[], index: number, map: HeaderMap): Lead => {
  const rowIndex = index + 2;
  const get = (key: string) => {
      const normalizedKey = normalizeHeader(key);
      const idx = map[normalizedKey];
      if (idx === undefined || row[idx] === undefined || row[idx] === null) return '';
      return String(row[idx]).trim();
  };
  const parsedQty = parseInt(get('estimated_qty').replace(/,/g, '') || '0', 10);
  const estimatedQty = isNaN(parsedQty) ? 0 : parsedQty;
  const rawPriority = get('priority');
  const priority = (rawPriority === '' || rawPriority.includes('Unset')) 
    ? calculatePriority(estimatedQty) 
    : rawPriority;
  return {
    _rowIndex: rowIndex,
    leadId: get('lead_id'),
    date: fromSheetDate(get('date')),
    source: get('source'),
    employeeName: get('employee_name'),
    companyName: get('company_name'),
    contactPerson: get('contact_person'),
    number: get('number'),
    email: get('email'),
    city: get('city'),
    orderInfo: get('order_information'),
    estimatedQty: estimatedQty,
    productType: get('product_type'),
    printType: get('print_type'),
    priority: priority,
    category: get('category'),
    ydsPoc: get('yds_poc'),
    status: get('status') || 'New',
    stage: get('stage'),
    design: get('design'),
    contactStatus: get('contact_status'),
    paymentUpdate: get('payment_update'),
    contactAttempts: parseInt(get('contact_attempts')) || 0,
    lastContactDate: fromSheetDate(get('last_contact_date')),
    nextAction: get('next_action'),
    nextActionDate: fromSheetDate(get('next_action_date')),
    lostReason: get('lost_reason'),
    wonDate: fromSheetDate(get('won_date')),
    lostDate: fromSheetDate(get('lost_date')),
    slaStatus: get('sla_status'),
    daysOpen: get('days_open'),
    remarks: get('remarks'),
    orderNotes: get('order_notes'),
    orderStatus: get('order_status'), 
    lastAttemptDate: fromSheetDate(get('last_attempt_date')),
    assignedToHistory: get('assigned_to_history'),
    reassignReason: get('reassign_reason'),
    staleDate: fromSheetDate(get('stale_date')),
    createdAt: get('created_at'),
    updatedAt: get('updated_at'),
    firstResponseTime: get('first_response_time'),
    sourceDetail: get('source_detail'),
    slaHealth: get('sla_health'),
    whatsappMessage: get('whatsapp_message'),
    customerType: get('customer_type'),
    actionOverdue: get('action_overdue'),
    stageChangedDate: fromSheetDate(get('stage_changed_date')),
    platformType: get('platform_type'),
    integrationReady: get('integration_ready'),
    sampleRequired: get('sample_required'),
    sampleStatus: get('sample_status'),
    activationDate: fromSheetDate(get('activation_date')),
    workflowType: get('workflow_type'),
    storeUrl: get('store_url'),
    accountCreated: get('account_created'),
    dashboardLinkSent: get('dashboard_link_sent'),
    designsReady: get('designs_ready'),
    firstProductCreated: get('first_product_created'),
    onboardingStartedDate: fromSheetDate(get('onboarding_started_date')),
    intent: get('intent'),
    tags: get('tags'),
    expectedCloseDate: fromSheetDate(get('expected_close_date'))
  };
};

const parseLegendRow = (row: any[]): LegendItem => ({
  listName: getCol(row, 0),
  value: getCol(row, 1),
  displayOrder: parseInt(getCol(row, 2)) || 0,
  color: getCol(row, 3),
  isDefault: getCol(row, 4).toUpperCase() === 'TRUE',
  isActive: getCol(row, 5).toUpperCase() === 'TRUE',
  probability: parseInt(getCol(row, 6)) || 0
});

const parseActivityLog = (row: any[]): ActivityLog => ({
    logId: getCol(row, 0),
    leadId: getCol(row, 2), 
    activityType: getCol(row, 4),
    fromValue: getCol(row, 5), 
    toValue: getCol(row, 6),   
    notes: getCol(row, 8),
    owner: getCol(row, 9),     
    timestamp: getCol(row, 10), 
});

const parseStageRule = (row: any[]): StageRule => ({
  fromStage: getCol(row, 1),
  toStage: getCol(row, 2),
  trigger: getCol(row, 3),
  autoSetField: getCol(row, 4),
  autoSetValue: getCol(row, 5),
  requiresField: getCol(row, 6) ? getCol(row, 6).split('|').map(s => s.trim()).filter(s => s) : []
});

const parseSLARule = (row: any[]): SLARule => ({
  ruleName: `${getCol(row, 1)} SLA`,
  stage: getCol(row, 1),
  condition: getCol(row, 2),
  thresholdDays: parseInt(getCol(row, 4)) || 2, 
  alertLevel: 'warning',
  alertAction: getCol(row, 6) 
});

const parseAutoAction = (row: any[]): AutoActionRule => ({
  triggerStage: getCol(row, 1),
  defaultNextAction: getCol(row, 4), 
  defaultDays: parseInt(getCol(row, 6)) || 0
});

const parseTemplate = (row: any[]): MessageTemplate => ({
  id: getCol(row, 0),
  stage: getCol(row, 2),
  category: getCol(row, 3),
  infoLevel: 'Basic',
  name: getCol(row, 4),
  body: getCol(row, 5),
  subject: getCol(row, 4)
});

export interface SystemData {
  leads: Lead[];
  legends: LegendItem[];
  activityLogs: ActivityLog[];
  stageRules: StageRule[];
  slaRules: SLARule[];
  autoActions: AutoActionRule[];
  templates: MessageTemplate[];
  success: boolean;
  fromCache?: boolean;
  dataSource: 'cloud' | 'local' | 'cache';
  readOnly?: boolean;
  error?: string;
}

export const initializeSheetStructure = async (): Promise<{success: boolean, message: string}> => {
  if (!accessToken || !window.gapi?.client?.sheets) return { success: false, message: 'Not authenticated' };
  const sheetId = getSpreadsheetId();
  const requiredSheets = [
      { title: SHEET_NAME_LEADS, defaultCsv: HEADER_LEAD_CSV },
      { title: SHEET_NAME_LEGEND, defaultCsv: HEADER_LEGEND_CSV },
      { title: SHEET_NAME_ACTIVITY, defaultCsv: HEADER_ACTIVITY_CSV },
      { title: SHEET_NAME_STAGE_RULES, defaultCsv: HEADER_STAGE_RULES_CSV },
      { title: SHEET_NAME_SLA_RULES, defaultCsv: HEADER_SLA_RULES_CSV },
      { title: SHEET_NAME_AUTO_ACTION, defaultCsv: HEADER_AUTO_ACTION_CSV },
      { title: SHEET_NAME_TEMPLATES, defaultCsv: HEADER_TEMPLATES_CSV },
      { title: SHEET_NAME_IDENTITY, defaultCsv: HEADER_IDENTITY_CSV },
      { title: SHEET_NAME_FLOW_B2B, defaultCsv: HEADER_FLOW_B2B_CSV },
      { title: SHEET_NAME_FLOW_DROPSHIP, defaultCsv: HEADER_FLOW_DROPSHIP_CSV },
      { title: SHEET_NAME_FLOW_HISTORY, defaultCsv: HEADER_FLOW_HISTORY_CSV },
  ];
  try {
      const meta = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId: sheetId });
      const existingTitles = (meta.result.sheets || []).map((s: any) => s.properties.title);
      const requests: any[] = [];
      const dataToPopulate: { range: string, values: any[][] }[] = [];
      requiredSheets.forEach(req => {
          if (!existingTitles.includes(req.title)) {
              requests.push({ addSheet: { properties: { title: req.title } } });
              const rows = parseCSV(req.defaultCsv);
              dataToPopulate.push({ range: `${req.title}!A1`, values: rows });
          }
      });
      if (requests.length > 0) {
          await window.gapi.client.sheets.spreadsheets.batchUpdate({
              spreadsheetId: sheetId,
              resource: { requests }
          });
      }
      if (dataToPopulate.length > 0) {
          await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
              spreadsheetId: sheetId,
              resource: {
                  valueInputOption: 'USER_ENTERED',
                  data: dataToPopulate
              }
          });
          return { success: true, message: `Created ${requests.length} missing sheets.` };
      }
      return { success: true, message: 'Structure Verified. No changes needed.' };
  } catch (e: any) {
      console.error("Init Error", e);
      return { success: false, message: e.message || "Initialization failed" };
  }
};

const getLocalDB = (): SystemData => {
    try {
        const stored = localStorage.getItem(LOCAL_DB_KEY);
        if (stored) {
            return JSON.parse(stored) as SystemData;
        }
    } catch (e) {
        console.warn("Failed to read local DB", e);
    }
    console.log("Initializing DB from Mock JSONs...");
    const leads = (MOCK_LEADS as any[]).map((m: any, idx: number) => ({
        _rowIndex: idx + 2,
        leadId: m.lead_id,
        date: fromSheetDate(m.date),
        source: m.source,
        employeeName: m.employee_name,
        companyName: m.company_name,
        contactPerson: m.contact_person,
        number: m.number,
        email: m.email,
        city: m.city,
        orderInfo: m.order_information,
        estimatedQty: parseInt(m.estimated_qty) || 0,
        productType: m.product_type,
        printType: m.print_type,
        priority: m.priority === 'P1' ? '🔴 High' : m.priority === 'P2' ? '🟡 Med' : '🟢 Low',
        category: m.category,
        ydsPoc: m.yds_poc,
        status: m.stage, 
        stage: m.stage,
        design: m.design,
        contactStatus: m.contact_status,
        paymentUpdate: m.payment_update,
        contactAttempts: m.contact_attempts,
        lastContactDate: fromSheetDate(m.last_contact_date),
        nextAction: m.next_action,
        nextActionDate: fromSheetDate(m.next_action_date),
        lostReason: m.lost_reason,
        wonDate: fromSheetDate(m.won_date),
        lostDate: fromSheetDate(m.lost_date),
        slaStatus: m.sla_status === 'On Track' ? 'Healthy' : 'Violated',
        daysOpen: String(m.days_open) + 'd',
        remarks: m.remarks,
        orderNotes: m.order_notes,
        lastAttemptDate: fromSheetDate(m.last_attempt_date),
        assignedToHistory: m.assigned_to_history,
        reassignReason: m.reassign_reason,
        staleDate: fromSheetDate(m.stale_date),
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        firstResponseTime: m.first_response_time,
        sourceDetail: m.source_detail,
        slaHealth: m.sla_health === 'Good' ? '🟢' : '🔴',
        whatsappMessage: m.whatsapp_message,
        customerType: m.customer_type,
        actionOverdue: m.action_overdue,
        stageChangedDate: fromSheetDate(m.stage_changed_date),
        platformType: m.platform_type,
        integrationReady: m.integration_ready,
        sampleRequired: m.sample_required,
        sampleStatus: m.sample_status,
        activationDate: fromSheetDate(m.activation_date),
        workflowType: m.workflow_type,
        storeUrl: m.store_url,
        accountCreated: m.account_created,
        dashboardLinkSent: m.dashboard_link_sent,
        designsReady: m.designs_ready,
        firstProductCreated: m.first_product_created,
        onboardingStartedDate: fromSheetDate(m.onboarding_started_date),
        intent: m.intent,
        tags: '',
        orderStatus: '',
        expectedCloseDate: ''
    })) as unknown as Lead[];
    const legends: LegendItem[] = [];
    const extendedMocks = {
        ...MOCK_LEGENDS,
        customer_type_list: (MOCK_LEGENDS as any).customer_type_list || ["New", "Returning", "VIP", "Reseller"],
        platform_type_list: (MOCK_LEGENDS as any).platform_type_list || ["Shopify", "WooCommerce", "Wix", "Manual"],
        sample_status_list: (MOCK_LEGENDS as any).sample_status_list || ["Requested", "Sent", "Feedback Received", "Approved", "Rejected"],
        design_status_list: (MOCK_LEGENDS as any).design_status_list || ["Pending", "Received", "Approved", "Modification Needed"]
    };
    const stageProbabilities: Record<string, number> = {
        'New': 10,
        'Assigned': 15,
        'Contacted': 20,
        'Qualified': 40,
        'Sample/Proposal': 60,
        'Negotiation': 80,
        'Ready to Route': 90,
        'Won': 100,
        'Lost': 0
    };
    Object.entries(extendedMocks).forEach(([key, values]) => {
        let listName = key.replace('_list', '');
        if (listName === 'status') listName = 'status_legacy'; 
        if (listName === 'stage') listName = 'stage'; 
        if (listName === 'contact_status') listName = 'contact_status';
        if (listName === 'payment_update') listName = 'payment_update'; 
        (values as string[]).forEach((val, idx) => {
            const prob = listName === 'stage' ? (stageProbabilities[val] || 0) : 0;
            legends.push({
                listName,
                value: val,
                displayOrder: idx + 1,
                color: '',
                isDefault: idx === 0,
                isActive: true,
                probability: prob
            });
        });
    });
    const defaultCatalogs = [
        { name: "2025 Product Catalog", url: "https://example.com/catalog-2025" },
        { name: "Price List v3", url: "https://example.com/prices-v3.pdf" }
    ];
    defaultCatalogs.forEach((cat, idx) => {
        legends.push({
            listName: 'catalog_link',
            value: cat.name,
            displayOrder: idx + 1,
            color: cat.url, 
            isDefault: false,
            isActive: true,
            probability: 0
        });
    });
    const stageRules: StageRule[] = [];
    (MOCK_STAGE_RULES as any[]).forEach((rule: any) => {
        const nextStages = rule.next_allowed_stages || [];
        nextStages.forEach((target: string) => {
            stageRules.push({
                fromStage: rule.stage,
                toStage: target,
                trigger: 'manual',
                autoSetField: rule.auto_assign_to ? 'ydsPoc' : '',
                autoSetValue: rule.auto_assign_to || '',
                requiresField: (rule.required_fields || []).map((f: string) => 
                    f.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) 
                )
            });
        });
    });
    const slaRules: SLARule[] = (MOCK_SLA_RULES as any[]).map((rule: any) => ({
        ruleName: `${rule.stage} SLA`,
        stage: rule.stage,
        condition: 'no_activity',
        thresholdDays: Math.ceil((rule.sla_hours || 24) / 24),
        alertLevel: (rule.escalation_level || 'Low').toLowerCase() === 'high' ? 'critical' : 'warning',
        alertAction: 'Check Lead'
    }));
    const autoActions: AutoActionRule[] = (MOCK_AUTO_ACTIONS as any[]).map((rule: any) => ({
        triggerStage: rule.stage,
        defaultNextAction: rule.next_action,
        defaultDays: rule.days_to_followup
    }));
    const templates: MessageTemplate[] = (MOCK_TEMPLATES as any[]).map((t: any) => ({
        id: t.id || `tpl_${Math.random()}`,
        name: t.name || t.action,
        stage: t.stage,
        category: t.category || 'General',
        infoLevel: t.infoLevel || 'Basic',
        subject: t.subject || t.action,
        body: t.body || t.template_text
    }));
    const activityLogs: ActivityLog[] = (MOCK_ACTIVITY as any[]).map((l: any) => ({
        logId: l.log_id || `log_${Math.random()}`,
        leadId: l.lead_id,
        timestamp: l.timestamp,
        activityType: l.activity_type || l.field,
        owner: l.changed_by,
        fromValue: l.old_value,
        toValue: l.new_value,
        notes: l.notes
    }));
    const initialData: SystemData = {
        leads, 
        legends, 
        stageRules, 
        slaRules, 
        autoActions, 
        templates,
        activityLogs, 
        success: true,
        dataSource: 'local',
        readOnly: true 
    };
    try {
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(initialData));
    } catch(e) { console.warn("Failed to init local DB", e); }
    return initialData;
};

export const populateConfigData = async (): Promise<{success: boolean, message: string}> => {
    if (!accessToken || !window.gapi?.client?.sheets) return { success: false, message: 'Not authenticated' };
    const defaults = getLocalDB();
    const sheetId = getSpreadsheetId();
    const dataToPopulate: { range: string, values: any[][] }[] = [];
    const legendRows = defaults.legends.map(l => [
        l.listName, l.value, l.displayOrder, l.color, l.isDefault, l.isActive, l.probability
    ]);
    if (legendRows.length > 0) {
        dataToPopulate.push({ range: `${SHEET_NAME_LEGEND}!A2`, values: legendRows });
    }
    const ruleRows = defaults.stageRules.map(r => [
        'General', r.fromStage, r.toStage, r.trigger, r.autoSetField, r.autoSetValue, r.requiresField.join('|'), '', '', '', '', 'TRUE'
    ]);
    if (ruleRows.length > 0) {
        dataToPopulate.push({ range: `${SHEET_NAME_STAGE_RULES}!A2`, values: ruleRows });
    }
    const slaRows = defaults.slaRules.map(r => [
        'General', r.stage, r.condition, '', r.thresholdDays * 24, '', r.alertAction, '', '', 'TRUE'
    ]);
    if (slaRows.length > 0) {
         dataToPopulate.push({ range: `${SHEET_NAME_SLA_RULES}!A2`, values: slaRows });
    }
    const actionRows = defaults.autoActions.map(r => [
        'General', r.triggerStage, '', '', r.defaultNextAction, '', r.defaultDays, 'TRUE'
    ]);
    if (actionRows.length > 0) {
         dataToPopulate.push({ range: `${SHEET_NAME_AUTO_ACTION}!A2`, values: actionRows });
    }
    const templateRows = defaults.templates.map(t => [
        t.id, 'General', t.stage, t.category, t.name, t.body, '', 'TRUE'
    ]);
    if (templateRows.length > 0) {
         dataToPopulate.push({ range: `${SHEET_NAME_TEMPLATES}!A2`, values: templateRows });
    }
    try {
        if (dataToPopulate.length > 0) {
             for (const item of dataToPopulate) {
                 const sheetName = item.range.split('!')[0];
                 await window.gapi.client.sheets.spreadsheets.values.clear({
                     spreadsheetId: sheetId,
                     range: `${sheetName}!A2:Z1000`
                 });
             }
             await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
                  spreadsheetId: sheetId,
                  resource: {
                      valueInputOption: 'USER_ENTERED',
                      data: dataToPopulate
                  }
             });
        }
        return { success: true, message: "Configuration Defaults Populated Successfully" };
    } catch (e: any) {
        console.error("Populate Failed", e);
        return { success: false, message: e.message || "Failed to populate defaults" };
    }
};

const saveLocalDB = (data: SystemData) => {
    try {
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_KEY, JSON.stringify({
             timestamp: Date.now(),
             data: data
        }));
    } catch(e) {
        console.error("Local DB Save Failed", e);
    }
};

export const resetLocalData = () => {
    localStorage.removeItem(LOCAL_DB_KEY);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(STORAGE_KEY_HEADER_MAP);
    window.location.reload();
};

export const fetchSystemData = async (forceRefresh = false): Promise<SystemData> => {
  let cloudError = null;
  const sheetId = getSpreadsheetId();
  const ranges = [
      SHEET_NAME_LEADS,
      SHEET_NAME_LEGEND,
      SHEET_NAME_ACTIVITY,
      SHEET_NAME_STAGE_RULES,
      SHEET_NAME_SLA_RULES,
      SHEET_NAME_AUTO_ACTION,
      SHEET_NAME_TEMPLATES
  ];
  const processValueRanges = (valueRanges: any[]) => {
        const leadSheet = valueRanges[0].values || [];
        const leadHeaderRow = leadSheet[0] || [];
        const headerMap = buildHeaderIndexMap(leadHeaderRow);
        saveHeaderMap(headerMap);
        const leads = leadSheet.slice(1).map((r: any[], i: number) => parseLeadRow(r, i, headerMap)).filter((l: Lead) => l.leadId);
        const rawLegends = (valueRanges[1]?.values || []).slice(1);
        let legends = rawLegends.map(parseLegendRow);
        if (legends.length === 0) {
             legends = [
                 { listName: 'stage', value: 'New', displayOrder: 1, color: '', isDefault: true, isActive: true, probability: 10 },
                 { listName: 'stage', value: 'Assigned', displayOrder: 2, color: '', isDefault: false, isActive: true, probability: 15 },
                 { listName: 'stage', value: 'Contacted', displayOrder: 3, color: '', isDefault: false, isActive: true, probability: 20 },
                 { listName: 'stage', value: 'Qualified', displayOrder: 4, color: '', isDefault: false, isActive: true, probability: 40 },
                 { listName: 'stage', value: 'Sample/Proposal', displayOrder: 5, color: '', isDefault: false, isActive: true, probability: 60 },
                 { listName: 'stage', value: 'Negotiation', displayOrder: 6, color: '', isDefault: false, isActive: true, probability: 80 },
                 { listName: 'stage', value: 'Ready to Route', displayOrder: 7, color: '', isDefault: false, isActive: true, probability: 90 },
                 { listName: 'stage', value: 'Won', displayOrder: 8, color: '', isDefault: false, isActive: true, probability: 100 },
                 { listName: 'stage', value: 'Lost', displayOrder: 9, color: '', isDefault: false, isActive: true, probability: 0 },
                 { listName: 'owner', value: 'Admin', displayOrder: 1, color: '', isDefault: true, isActive: true, probability: 0 }
             ];
        }
        const activityLogs = (valueRanges[2]?.values || []).slice(1).map(parseActivityLog);
        const stageRules = (valueRanges[3]?.values || []).slice(1).map(parseStageRule);
        const slaRules = (valueRanges[4]?.values || []).slice(1).map(parseSLARule);
        const autoActions = (valueRanges[5]?.values || []).slice(1).map(parseAutoAction);
        const templates = (valueRanges[6]?.values || []).slice(1).map(parseTemplate);
        return {
            leads: leads.reverse(),
            legends,
            activityLogs: activityLogs.reverse(),
            stageRules,
            slaRules,
            autoActions,
            templates
        };
  };
  if (!forceRefresh) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
          try {
              const { timestamp, data } = JSON.parse(cached) as CachedData;
              if (Date.now() - timestamp < CACHE_TTL) {
                  return { ...data, success: true, fromCache: true, dataSource: 'cache' };
              }
          } catch (e) {
              localStorage.removeItem(CACHE_KEY);
          }
      }
  }
  if (accessToken && window.gapi?.client?.sheets) {
      try {
        const resp = await window.gapi.client.sheets.spreadsheets.values.batchGet({
          spreadsheetId: sheetId,
          ranges: ranges,
          majorDimension: 'ROWS',
          valueRenderOption: 'UNFORMATTED_VALUE',
        });
        const data = processValueRanges(resp.result.valueRanges);
        const systemData: SystemData = {
            ...data,
            success: true,
            dataSource: 'cloud',
            readOnly: false
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: systemData }));
        return systemData;
      } catch (err: any) {
        console.error("Cloud Auth Fetch Error", err);
        cloudError = err.result?.error?.message || err.message;
      }
  }
  if (process.env.API_KEY) {
      try {
          const rangeParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?key=${process.env.API_KEY}&${rangeParams}&valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`;
          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`Public API Error: ${response.status} ${response.statusText}`);
          }
          const result = await response.json();
          const data = processValueRanges(result.valueRanges);
          const systemData: SystemData = {
             ...data,
             success: true,
             dataSource: 'cloud',
             readOnly: true 
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: systemData }));
          return systemData;
      } catch (err: any) {
           console.warn("Public Read Failed", err);
      }
  }
  console.log("Using Fallback Mock Data");
  return { ...getLocalDB(), error: cloudError, dataSource: 'local', readOnly: true };
};

export const addLead = async (lead: Partial<Lead>): Promise<boolean> => {
  if (accessToken && window.gapi?.client?.sheets) {
    try {
        const sheetId = getSpreadsheetId();
        const headerMap = getHeaderMap();
        if (!headerMap) throw new Error("Header Map missing");
        const row = leadToRowArray(lead as Lead, headerMap);
        await window.gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: SHEET_NAME_LEADS,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [row] }
        });
        return true;
    } catch (e) {
        console.error("Add Lead Failed", e);
        return false;
    }
  } else {
      const db = getLocalDB();
      const newLead = { ...lead, _rowIndex: db.leads.length + 2 } as Lead;
      db.leads.unshift(newLead);
      saveLocalDB(db);
      return true;
  }
};

export const updateLead = async (lead: Lead): Promise<boolean> => {
    if (accessToken && window.gapi?.client?.sheets) {
        try {
            const sheetId = getSpreadsheetId();
            const headerMap = getHeaderMap();
            if (!headerMap) throw new Error("Header Map missing");
            const row = leadToRowArray(lead, headerMap);
            const range = `${SHEET_NAME_LEADS}!A${lead._rowIndex}`; 
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [row] }
            });
            return true;
        } catch (e) {
            console.error("Update Lead Failed", e);
            return false;
        }
    } else {
        const db = getLocalDB();
        const idx = db.leads.findIndex(l => l.leadId === lead.leadId);
        if (idx !== -1) {
            db.leads[idx] = lead;
            saveLocalDB(db);
            return true;
        }
        return false;
    }
};

export const addActivityLog = async (log: ActivityLog): Promise<boolean> => {
    const row = [
        log.logId, '', log.leadId, 'General', log.activityType, log.fromValue, log.toValue, '', log.notes, log.owner, log.timestamp, 'App', '', '', '', log.owner,
    ];
    if (accessToken && window.gapi?.client?.sheets) {
        try {
            await window.gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: getSpreadsheetId(),
                range: SHEET_NAME_ACTIVITY,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [row] }
            });
            return true;
        } catch(e) { return false; }
    } else {
        const db = getLocalDB();
        db.activityLogs.unshift(log);
        saveLocalDB(db);
        return true;
    }
};

const saveConfigSheet = async (sheetName: string, values: any[][]) => {
    if (accessToken && window.gapi?.client?.sheets) {
         try {
            const sheetId = getSpreadsheetId();
            await window.gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: sheetId,
                range: `${sheetName}!A2:Z1000`
            });
            if (values.length > 0) {
                await window.gapi.client.sheets.spreadsheets.values.append({
                    spreadsheetId: sheetId,
                    range: `${sheetName}!A2`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: values }
                });
            }
            return true;
         } catch (e) { console.error(e); return false; }
    } else {
        return true;
    }
};

export const saveLegends = async (legends: LegendItem[]) => {
    if (accessToken) {
        const rows = legends.map(l => [l.listName, l.value, l.displayOrder, l.color, l.isDefault, l.isActive, l.probability]);
        await saveConfigSheet(SHEET_NAME_LEGEND, rows);
    } else {
        const db = getLocalDB();
        db.legends = legends;
        saveLocalDB(db);
    }
};

export const saveStageRules = async (rules: StageRule[]) => {
    if (accessToken) {
        const rows = rules.map(r => ['General', r.fromStage, r.toStage, r.trigger, r.autoSetField, r.autoSetValue, r.requiresField.join('|')]);
        await saveConfigSheet(SHEET_NAME_STAGE_RULES, rows);
    } else {
        const db = getLocalDB();
        db.stageRules = rules;
        saveLocalDB(db);
    }
};

export const saveSLARules = async (rules: SLARule[]) => {
    if (accessToken) {
        const rows = rules.map(r => ['General', r.stage, r.condition, '', r.thresholdDays, '', r.alertAction, '', '', 'TRUE']);
        await saveConfigSheet(SHEET_NAME_SLA_RULES, rows);
    } else {
        const db = getLocalDB();
        db.slaRules = rules;
        saveLocalDB(db);
    }
};

export const saveAutoActions = async (rules: AutoActionRule[]) => {
    if (accessToken) {
        const rows = rules.map(r => ['General', r.triggerStage, '', '', r.defaultNextAction, '', r.defaultDays, 'TRUE']);
        await saveConfigSheet(SHEET_NAME_AUTO_ACTION, rows);
    } else {
        const db = getLocalDB();
        db.autoActions = rules;
        saveLocalDB(db);
    }
};

export const saveTemplates = async (tpls: MessageTemplate[]) => {
    if (accessToken) {
        const rows = tpls.map(t => [t.id, 'General', t.stage, t.category, t.name, t.body, '', 'TRUE']);
        await saveConfigSheet(SHEET_NAME_TEMPLATES, rows);
    } else {
        const db = getLocalDB();
        db.templates = tpls;
        saveLocalDB(db);
    }
};

export const fetchRemoteHeaders = async (spreadsheetId: string, sheetName: string = 'Sheet1'): Promise<{ headers: string[], error?: string }> => {
    if (!accessToken || !window.gapi?.client?.sheets) {
        return { headers: [], error: 'Not authenticated' };
    }
    try {
        const resp = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A1:Z1`,
            majorDimension: 'ROWS',
            valueRenderOption: 'UNFORMATTED_VALUE',
        });
        const headers = resp.result.values?.[0] || [];
        return { headers: headers.map(String) };
    } catch (e: any) {
        console.error("Fetch Remote Headers Error", e);
        return { headers: [], error: e.message || "Failed to fetch headers" };
    }
};

// RENAMED & REFACTORED: Only Fetches Data, No Write
export const fetchLeadsFromSource = async (sourceKey: keyof typeof SOURCE_CONFIG): Promise<{ leads: Lead[], skipped: number, message: string, success: boolean }> => {
    const config = SOURCE_CONFIG[sourceKey];
    if (!config) return { leads: [], skipped: 0, message: "Invalid source configuration", success: false };

    let rows: any[][] = [];
    let headers: string[] = [];

    // TRY FETCHING FROM GOOGLE SHEETS
    if (accessToken && window.gapi?.client?.sheets) {
        try {
            const response = await window.gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: config.id,
                range: `${config.sheetName}!A1:Z10000`, 
                valueRenderOption: 'UNFORMATTED_VALUE',
            });
            const values = response.result.values;
            if (values && values.length > 1) {
                headers = values[0].map(String);
                rows = values.slice(1);
            }
        } catch (e: any) {
            console.warn("Fetch Error (using fallback):", e);
        }
    }

    // FALLBACK TO MOCK DATA IF FETCH FAILED OR NO AUTH
    if (rows.length === 0) {
        console.log(`Fetching mock data for ${sourceKey}...`);
        const mockData = getMockSourceData(sourceKey);
        if (mockData.length > 1) {
            headers = mockData[0];
            rows = mockData.slice(1);
        } else {
             return { leads: [], skipped: 0, message: "No data found (Live or Mock)", success: false };
        }
    }

    // Process Data
    const currentData = await fetchSystemData();
    const existingIds = new Set(currentData.leads.map(l => l.leadId));

    const newLeads: Lead[] = [];
    let skipped = 0;

    rows.forEach((row: any[]) => {
            const rowObj: Record<string, string> = {};
            headers.forEach((h, idx) => {
                rowObj[h] = (row[idx] !== undefined && row[idx] !== null) ? String(row[idx]) : '';
            });

            const partialLead = mapExternalRowToLead(rowObj, sourceKey);
            
            if (partialLead.leadId && !existingIds.has(partialLead.leadId)) {
                const fullLead: Lead = {
                    _rowIndex: -1,
                    leadId: partialLead.leadId,
                    date: partialLead.date || formatDate(),
                    source: partialLead.source || config.name,
                    companyName: partialLead.companyName || 'Unknown',
                    status: partialLead.status || 'New',
                    stage: 'New', 
                    estimatedQty: 0,
                    priority: '🟢 Low',
                    ...partialLead
                } as Lead; 
                
                if (!fullLead.priority) fullLead.priority = calculatePriority(fullLead.estimatedQty || 0);
                if (!fullLead.createdAt) fullLead.createdAt = new Date().toISOString();

                newLeads.push(fullLead);
                existingIds.add(fullLead.leadId); 
            } else {
                skipped++;
            }
    });

    return { 
        leads: newLeads, 
        skipped, 
        message: `Fetched ${newLeads.length} new leads from ${config.name}. (${skipped} skipped)`, 
        success: true 
    };
};
