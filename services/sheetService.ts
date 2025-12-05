
import { Lead, LegendItem, ActivityLog, StageRule, SLARule, AutoActionRule, MessageTemplate, calculatePriority, fromSheetDate, toSheetDate } from '../types';

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
const DEFAULT_SPREADSHEET_ID = '1xfGsXrTU2RfYt56MqXeuXCqiHqAPp3Rh1LNKFryj_c4';
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
const HEADER_LEAD_CSV = `lead_id,date,source,employee_name,company_name,contact_person,number,email,city,order_information,estimated_qty,product_type,print_type,priority,category,yds_poc,status,stage,design,contact_status,payment_update,contact_attempts,last_contact_date,next_action,next_action_date,lost_reason,won_date,lost_date,sla_status,days_open,remarks,order_notes,last_attempt_date,assigned_to_history,reassign_reason,stale_date,created_at,updated_at,first_response_time,source_detail,sla_health,whatsapp_message,customer_type,action_overdue,stage_changed_date,platform_type,integration_ready,sample_required,sample_status,activation_date,workflow_type,store_url,account_created,dashboard_link_sent,designs_ready,first_product_created,onboarding_started_date,intent,tags,order_status,expected_close_date`;

// 2.6 Activity Log
const HEADER_ACTIVITY_CSV = `log_id,lead_id,flow_type,activity_type,old_value,new_value,field_changed,notes,created_by,created_at,source,sla_status_at_event,intent_at_event,stage_at_event,owner_at_event,attachment_url,route_event,sample_event,system_rule_fired,checksum`;

// 2.7 Legend - Added probability
const HEADER_LEGEND_CSV = `list_name,value,display_order,color,is_default,is_active,probability`;

// 2.8 Stage Rules
const HEADER_STAGE_RULES_CSV = `flow_type,from_stage,to_stage,trigger,auto_set_field,auto_set_value,requires_field,template_category,next_action_type,next_action_due_days,notes,is_active`;

// 2.10 SLA Rules
const HEADER_SLA_RULES_CSV = `flow_type,stage,condition_key,condition_value,sla_hours,warning_hours,overdue_label,warning_label,ok_label,is_active`;

// 2.11 Auto Next Action
const HEADER_AUTO_ACTION_CSV = `flow_type,stage,condition_key,condition_value,next_action_type,template_category,days_offset,is_active`;

// 2.12 Message Templates
const HEADER_TEMPLATES_CSV = `template_id,flow_type,stage,template_category,title,body,variables,is_active`;


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

// 3.3 Normalize Header Function (Mandatory Regex)
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

// Diagnostics Helper Interface
export interface SchemaReport {
    sheetName: string;
    status: 'ok' | 'missing_sheet' | 'missing_headers';
    missingColumns: string[];
}

// Full Diagnostic Tool
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
        // 1. Check Sheet Existence via Metadata
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

        // 2. Check Headers (Batch Get Row 1)
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

// Deprecated simple check (kept for fallback)
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

// --- Helper: Convert Lead Object to Sheet Row Array ---
const leadToRowArray = (lead: Lead, map: HeaderMap): string[] => {
  const maxIndex = Math.max(...Object.values(map));
  const row: string[] = Array(maxIndex + 1).fill("");

  const set = (key: string, value: any) => {
    const normalizedKey = normalizeHeader(key); 
    const idx = map[normalizedKey];
    if (idx !== undefined) row[idx] = value ?? "";
  };

  // Mappings - Using strict normalized keys from Section 2.1
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

// --- CSV Parsing Helper ---
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

// --- Row Parsers ---
// 3.2 Dynamic Row Parsing - NO FALLBACKS
const parseLeadRow = (row: any[], index: number, map: HeaderMap): Lead => {
  const rowIndex = index + 2;
  
  // Safe Getter
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

  // Convert Sheet Dates (MM/DD/YYYY) to App Dates (DD/MM/YY)
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
    leadId: getCol(row, 1),
    timestamp: getCol(row, 9), // Matches 2.6 created_at position
    activityType: getCol(row, 3),
    owner: getCol(row, 8), // created_by
    fromValue: getCol(row, 4),
    toValue: getCol(row, 5),
    notes: getCol(row, 7)
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
  thresholdDays: parseInt(getCol(row, 4)) || 2, // sla_hours approx
  alertLevel: 'warning',
  alertAction: getCol(row, 6) // overdue_label
});

const parseAutoAction = (row: any[]): AutoActionRule => ({
  triggerStage: getCol(row, 1),
  defaultNextAction: getCol(row, 4), // next_action_type
  defaultDays: parseInt(getCol(row, 6)) || 0
});

const parseTemplate = (row: any[]): MessageTemplate => ({
  id: getCol(row, 0),
  stage: getCol(row, 2),
  category: getCol(row, 3),
  infoLevel: 'Basic',
  name: getCol(row, 4), // title
  body: getCol(row, 5),
  subject: getCol(row, 4)
});

// --- API Calls ---

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

// --- INITIALIZATION ---
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


// --- LOCAL STORAGE DATABASE MANAGER ---

const getLocalDB = (): SystemData => {
    try {
        const stored = localStorage.getItem(LOCAL_DB_KEY);
        if (stored) {
            return JSON.parse(stored) as SystemData;
        }
    } catch (e) {
        console.warn("Failed to read local DB", e);
    }

    // Initialize from MOCK JSONs if no DB exists (State 3: Mock Data)
    console.log("Initializing DB from Mock JSONs...");

    // 1. Leads
    const leads = (MOCK_LEADS as any[]).map((m: any, idx: number) => ({
        _rowIndex: idx + 2,
        leadId: m.lead_id,
        date: fromSheetDate(m.date), // Convert Mock ISO/Sheet date to App Date
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
        status: m.stage, // Mapping mock 'stage' to app 'status' (Pipeline Stage)
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

    // 2. Legends
    const legends: LegendItem[] = [];
    
    // Ensure missing mocks exist so dropdowns are populated
    const extendedMocks = {
        ...MOCK_LEGENDS,
        // Populate defaults if missing from mock data
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
        // Mapping corrections
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

    // 3. Stage Rules
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
                    f.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) // snake to camel
                )
            });
        });
    });

    // 4. SLA Rules
    const slaRules: SLARule[] = (MOCK_SLA_RULES as any[]).map((rule: any) => ({
        ruleName: `${rule.stage} SLA`,
        stage: rule.stage,
        condition: 'no_activity',
        thresholdDays: Math.ceil((rule.sla_hours || 24) / 24),
        alertLevel: (rule.escalation_level || 'Low').toLowerCase() === 'high' ? 'critical' : 'warning',
        alertAction: 'Check Lead'
    }));

    // 5. Auto Actions
    const autoActions: AutoActionRule[] = (MOCK_AUTO_ACTIONS as any[]).map((rule: any) => ({
        triggerStage: rule.stage,
        defaultNextAction: rule.next_action,
        defaultDays: rule.days_to_followup
    }));

    // 6. Templates
    const templates: MessageTemplate[] = (MOCK_TEMPLATES as any[]).map((t: any) => ({
        id: t.id || `tpl_${Math.random()}`,
        name: t.name || t.action,
        stage: t.stage,
        category: t.category || 'General',
        infoLevel: t.infoLevel || 'Basic',
        subject: t.subject || t.action,
        body: t.body || t.template_text
    }));

    // 7. Activity Log
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
        readOnly: true // Default to read-only for mock/local data until session starts
    };

    try {
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(initialData));
    } catch(e) { console.warn("Failed to init local DB", e); }

    return initialData;
};

// --- NEW FUNCTION: POPULATE CONFIG DEFAULTS ---
export const populateConfigData = async (): Promise<{success: boolean, message: string}> => {
    if (!accessToken || !window.gapi?.client?.sheets) return { success: false, message: 'Not authenticated' };
    
    // 1. Get Default Data (reusing local DB logic which loads from Mocks)
    const defaults = getLocalDB();
    const sheetId = getSpreadsheetId();

    const dataToPopulate: { range: string, values: any[][] }[] = [];

    // 2. Prepare Data Arrays (matching columns in HEADER_..._CSV)
    
    // Legends
    // list_name,value,display_order,color,is_default,is_active,probability
    const legendRows = defaults.legends.map(l => [
        l.listName, l.value, l.displayOrder, l.color, l.isDefault, l.isActive, l.probability
    ]);
    if (legendRows.length > 0) {
        dataToPopulate.push({ range: `${SHEET_NAME_LEGEND}!A2`, values: legendRows });
    }

    // Stage Rules
    // flow_type,from_stage,to_stage,trigger,auto_set_field,auto_set_value,requires_field...
    const ruleRows = defaults.stageRules.map(r => [
        'General', r.fromStage, r.toStage, r.trigger, r.autoSetField, r.autoSetValue, r.requiresField.join('|'), '', '', '', '', 'TRUE'
    ]);
    if (ruleRows.length > 0) {
        dataToPopulate.push({ range: `${SHEET_NAME_STAGE_RULES}!A2`, values: ruleRows });
    }

    // SLA Rules
    // flow_type,stage,condition_key,condition_value,sla_hours,warning_hours...
    const slaRows = defaults.slaRules.map(r => [
        'General', r.stage, r.condition, '', r.thresholdDays * 24, '', r.alertAction, '', '', 'TRUE'
    ]);
    if (slaRows.length > 0) {
         dataToPopulate.push({ range: `${SHEET_NAME_SLA_RULES}!A2`, values: slaRows });
    }

    // Auto Actions
    // flow_type,stage,condition_key,condition_value,next_action_type...
    const actionRows = defaults.autoActions.map(r => [
        'General', r.triggerStage, '', '', r.defaultNextAction, '', r.defaultDays, 'TRUE'
    ]);
    if (actionRows.length > 0) {
         dataToPopulate.push({ range: `${SHEET_NAME_AUTO_ACTION}!A2`, values: actionRows });
    }

    // Templates
    // template_id,flow_type,stage,template_category,title,body...
    const templateRows = defaults.templates.map(t => [
        t.id, 'General', t.stage, t.category, t.name, t.body, '', 'TRUE'
    ]);
    if (templateRows.length > 0) {
         dataToPopulate.push({ range: `${SHEET_NAME_TEMPLATES}!A2`, values: templateRows });
    }

    // 3. Execute Write
    try {
        if (dataToPopulate.length > 0) {
             // Optional: Clear existing config first? Maybe safer to append or overwrite from A2
             // We are using A2, so it overwrites from top. Ideally we clear range first.
             
             // Quick Clear loop
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

  // Helper to process value ranges
  const processValueRanges = (valueRanges: any[]) => {
        const leadSheet = valueRanges[0].values || [];
        const leadHeaderRow = leadSheet[0] || [];
        const headerMap = buildHeaderIndexMap(leadHeaderRow);
        
        // Save dynamically map for write operations
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

  // 1. Check Cache
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

  // 2. STATE 1: OAuth (Authenticated)
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
        // Don't return, fall through to try public
      }
  }

  // 3. STATE 2: Public API Key (Read Only)
  // Check if API_KEY is present
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
             readOnly: true // Public access is always read-only via key
          };
          
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: systemData }));
          return systemData;

      } catch (err: any) {
           console.warn("Public Read Failed", err);
           // Fall through to State 3
      }
  }

  // 4. STATE 3: Mock/Local Fallback
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
      // Local Mode (In-memory update for session)
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
        // Local Mode
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
    // Note: Activity log follows 2.6 schema
    // log_id,lead_id,flow_type,activity_type,old_value,new_value,field_changed,notes,created_by,created_at...
    // Simplified for now based on available data
    const row = [log.logId, log.leadId, 'General', log.activityType, log.fromValue, log.toValue, '', log.notes, log.owner, log.timestamp];
    
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
        // Updated to include probability column
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
        // Mapping to 2.8 format: flow_type, from, to...
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
        // Mapping to 2.10 format
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
        // Mapping to 2.11 format
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
        // Mapping to 2.12 format
        const rows = tpls.map(t => [t.id, 'General', t.stage, t.category, t.name, t.body, '', 'TRUE']);
        await saveConfigSheet(SHEET_NAME_TEMPLATES, rows);
    } else {
        const db = getLocalDB();
        db.templates = tpls;
        saveLocalDB(db);
    }
};
