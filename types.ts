

export interface Lead {
  _rowIndex: number;
  // --- TABLE 1: LEADS (Identity) ---
  leadId: string;        // lead_id (Col 0)
  contactPerson: string; // name (Col 1)
  number: string;        // phone (Col 2)
  email: string;         // email (Col 3)
  companyName: string;   // company (Col 4)
  city: string;          // city (Col 5)
  source: string;        // source_refs (Col 6)
  // category (Col 7) - Shared with Flow, usually Identity is high-level, Flow is operational
  createdBy: string;     // created_by (Col 8)
  tags: string;          // tags (Col 9)
  identityStatus: string; // Status (Col 10) - Renamed to avoid conflict with Flow status
  createdAt: string;     // created_at (Col 11)
  leadScore: string;     // lead_score (Col 12)
  remarks: string;       // note/description (Col 13)
  sourceRowId: string;   // source_row_id (Col 14)
  info: string;          // Info (Col 15)

  // --- TABLE 2: LEAD_FLOWS (Operational) ---
  flowId: string;        // flow_id (Col 0)
  // lead_id (Col 1) - Join Key
  originalChannel: string; // original_channel (Col 2)
  channel: string;       // channel (Col 3)
  owner: string;         // owner (Col 4)
  ydsPoc: string;        // Alias for owner
  status: string;        // status (Col 5)
  stage: string;         // stage (Col 6)
  sourceFlowTag: string; // source_flow_tag (Col 7)
  // created_at (Col 8) - Flow specific
  updatedAt: string;     // updated_at (Col 9)
  startDate: string;     // start_date (Col 10)
  expectedCloseDate: string; // expected_close_date (Col 11)
  wonDate: string;       // won_date (Col 12)
  lostDate: string;      // lost_date (Col 13)
  lostReason: string;    // lost_reason (Col 14)
  notes: string;         // notes (Col 15)
  estimatedQty: number;  // estimated_qty (Col 16)
  productType: string;   // product_type (Col 17)
  printType: string;     // print_type (Col 18)
  priority: string;      // priority (Col 19)
  contactStatus: string; // contact_status (Col 20)
  paymentUpdate: string; // payment_update (Col 21)
  nextAction: string;    // next_action_type (Col 22)
  nextActionDate: string;// next_action_date (Col 23)
  intent: string;        // intent (Col 24)
  category: string;      // category (Col 25) - This drives the UI
  customerType: string;  // customer_type (Col 26)

  // --- UI / Computed Helpers (Not in Schema directly but mapped) ---
  date: string;          // Mapped from createdAt for UI display
  orderInfo: string;     // Often mapped to 'notes' or 'Info'
  contactAttempts: number; // UI only or mapped to notes parsing
  lastContactDate: string; // UI only or mapped to updatedAt
  lastAttemptDate: string; 
  
  // Metrics
  slaStatus: string;       
  slaHealth: string;       
  daysOpen: string;        
  actionOverdue: string;   
  firstResponseTime: string; 
  stageChangedDate: string;  
  
  // Dropshipping Specifics (UI Fields, likely mapped to 'notes' or 'Info' in strict schema)
  platformType: string;      
  integrationReady: string;  
  storeUrl: string;          
  accountCreated: string;    
  dashboardLinkSent: string; 
  onboardingStartedDate: string; 
  activationDate: string;    
  
  // Workflow Specifics
  sampleRequired: string;    
  sampleStatus: string;      
  workflowType: string;      
  designsReady: string;      
  firstProductCreated: string; 
  whatsappMessage: string;
}

export interface ActivityLog {
  logId: string;
  leadId: string;
  flowId?: string;
  timestamp: string;
  activityType: string;
  owner: string;
  fromValue: string;
  toValue: string;
  notes: string;
}

export interface LegendItem {
  listName: string;
  value: string;
  displayOrder: number;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  probability?: number;
}

export interface StageRule {
  flowType?: string; 
  fromStage: string;
  toStage: string;
  trigger: string;
  autoSetField: string;
  autoSetValue: string;
  requiresField: string[];
}

export interface SLARule {
  ruleName: string;
  stage: string;
  channel?: string; 
  condition: string;
  thresholdHours: number;
  alertLevel: string;
  alertAction: string;
}

export interface AutoActionRule {
  triggerStage: string;
  triggerEvent: 'on_enter' | 'on_no_response';
  defaultNextAction: string;
  defaultDays: number;
  channel?: string;
}

export interface MessageTemplate {
  id: string;
  stage: string;
  category: string;
  name: string; 
  subject: string;
  body: string;
  infoLevel: string;
}

export interface ConfigStore {
  legends: Record<string, LegendItem[]>;
  stageRules: StageRule[];
  slaRules: SLARule[];
  autoActions: AutoActionRule[];
  templates: MessageTemplate[];
}

// --- INTAKE ENGINE TYPES ---

export interface SourceConfig {
  layer: string;        // Col 0: Layer
  sheetId: string;      // Col 1: Sheet ID
  tab: string;          // Col 2: Tab
  type: string;         // Col 3: Type
  tags: string[];       // Col 4: Tags
}

export interface FieldMapRule {
  id: string;
  sourceLayer: string;  // Col 1: source_layer
  sourceHeader: string; // Col 2: source_header
  intakeField: string;  // Col 3: intake_field
  transform: string;    // Col 4: transform
  isRequired: boolean;  // Col 5: is_required
  notes: string;
  fallbackGroup?: string;
}

export interface IntakeRow {
  id: string; 
  sourceLayer: string;
  sourceSheetId: string;
  sourceTab: string; 
  sourceRowIndex: number;
  
  // Write-back metadata indices (to write "Imported" status back to source)
  wbColIndex_Id: number;
  wbColIndex_Status: number;
  wbColIndex_ProcessedAt: number;
  wbColIndex_ProcessedBy: number;
  
  // Mapped CRM Fields (Result of transformation)
  companyName: string;
  contactPerson: string;
  number: string;
  email: string;
  city: string;
  estimatedQty: number;
  productType: string;
  orderInfo: string;
  source: string;
  sourceRowId?: string; 
  date: string;
  tags: string; 
  info: string; 
  
  // Flow Fields
  channel: string;
  owner: string;
  status: string; 
  stage: string;
  startDate: string;
  expectedCloseDate: string;
  notes: string; 
  printType: string;
  priority: string;
  contactStatus: string; 
  paymentUpdate: string;
  intent: string;
  category: string;
  customerType: string;
  leadScore: string;
  remarks: string; 
  
  // Dropshipping / Platform
  storeUrl: string;
  platformType: string;
  integrationReady: string;
  nextActionDate: string;
  
  // Raw Source Data (for reference)
  rawData: Record<string, any>;
  
  // Validation
  isValid: boolean;
  errors: string[];
  importStatus: 'Pending' | 'Imported' | 'Error';
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export interface AppOptions {
  owners: string[];
  stages: string[];
  sources: string[];
  categories: string[];
  priorities: string[];
  productTypes: string[];
  printTypes: string[];
  contactStatus: string[];
  paymentStatus: string[];
  designStatus: string[];
  lostReasons: string[];
  customerTypes: string[];
  platformTypes: string[];
  sampleStatus: string[];
  orderStatus: string[];
  nextActionTypes: string[];
  intents: string[]; 
  workflowTypes: string[]; 
}

// --- CONSTANTS ---

export const MODULE_IDS = {
  CORE: '1bbzFwbQ3z3lQGZoo6Y3WfvuBRJXlXp8xrf3LuDEGs1A',
  FLOWS: '1NWuPxl8WeFTSoYgzHrfgLoPXcMkqfsffvspTFTIJ5hE',
  ACTIVITY: '1Y0x98DnlK4v3rapo4zoCZj-LoFnMcNMUdkaowYsBC38',
  CONFIG: '1Z3MwuV9los8QAcCFQUgoKtpirCh9IPIkSLCfNHj8Jf4'
};

export const SHEET_IDS = {
  MAIN: MODULE_IDS.CORE, 
  TKW: '1sImoVXLvVlv3_LONrDZLm-auzZPJsAE1NmAbxgz3MHU',
  DS: '1kJa4O-yMvcmueR2rQEK8Vze12-bf5o0t3ketLReLMx0',
  AUTO: '1UVP93fwaqxjX3TW3P6i0Uax4XeSUr2I1YZQgsJFBzm0',
  PARTNERS: '1U7R6KHyHoreKNdtzWHJFDyL6dRMZkbj-gyjL71LGJL8'
};

export type Owner = string;
export type Stage = string;

export const AUTO_NEXT_ACTIONS_DEFAULT: Record<string, { action: string, days: number }> = {
  'New': { action: 'Assign Owner', days: 0 },
  'Assigned': { action: 'First Call Attempt', days: 1 },
  'Won': { action: 'Confirm Payment', days: 0 }
};

export const REQUIRED_FIELDS_BY_STAGE: Record<string, string[]> = {
  'Assigned': ['ydsPoc', 'priority'],
  'Qualified': ['intent', 'category'],
  'Won': ['paymentUpdate']
};

export const FORBIDDEN_TRANSITIONS: Record<string, string[]> = {
  'New': ['Won'],
  'Won': ['New']
};

// --- HELPERS ---

export const calculatePriority = (qty: number): string => {
  if (qty >= 100) return '🔴 High';
  if (qty >= 50) return '🟡 Med';
  if (qty > 0) return '🟢 Low';
  return '⚪';
};

export const getPriorityColor = (priority: string) => {
  if (priority?.includes('High')) return 'bg-red-100 text-red-800 border-red-200';
  if (priority?.includes('Med')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (priority?.includes('Low')) return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export const getStageColor = (stage: string) => {
  const s = stage?.toLowerCase() || '';
  if (s === 'won') return 'bg-green-50 text-green-700 border-green-200';
  if (s === 'lost') return 'bg-red-50 text-red-700 border-red-200';
  if (s.includes('ready')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (s === 'negotiation') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (s === 'qualified') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

// DATE HELPERS
export const formatDate = (date: Date = new Date()): string => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`; 
};

export const addDaysToDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    const cleanStr = dateStr.replace(/-/g, '/');
    const parts = cleanStr.split('/');
    if (parts.length !== 3) return null;
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
};

export const toSheetDate = (appDate: string): string => {
    if (!appDate) return '';
    const date = parseDate(appDate);
    if (!date) return appDate;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
};

export const fromSheetDate = (sheetDate: string): string => {
    if (!sheetDate) return '';
    if (sheetDate.match(/^\d{4}-\d{2}-\d{2}/)) return formatDate(new Date(sheetDate));
    const parts = sheetDate.split(/[-/]/);
    if (parts.length < 3) return sheetDate;
    const m = parseInt(parts[0]);
    const d = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    if (isNaN(m) || isNaN(d) || isNaN(y)) return sheetDate;
    const date = new Date(y, m - 1, d);
    return formatDate(date); 
};

export const toInputDate = (appDate: string | undefined): string => {
    if (!appDate) return '';
    const date = parseDate(appDate);
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const fromInputDate = (inputDate: string): string => {
    if (!inputDate) return '';
    const parts = inputDate.split('-');
    if (parts.length !== 3) return '';
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return formatDate(date);
};

// --- SLA LOGIC ---
export const determineLeadHealth = (lead: Lead, rules: SLARule[] = []) => {
    if (lead.status === 'Won' || lead.status === 'Lost') {
        return { status: 'Healthy', label: lead.status === 'Won' ? 'Won' : 'Closed', urgency: 'okay', color: 'gray', isOverdue: false };
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    
    let actionStatus = 'Healthy';
    let isActionOverdue = false;
    
    if (lead.nextActionDate) {
        const nextDate = parseDate(lead.nextActionDate);
        if (nextDate) {
            if (nextDate < today) {
                actionStatus = 'Violated';
                isActionOverdue = true;
            } else if (nextDate.getTime() === today.getTime() || nextDate.getTime() === tomorrow.getTime()) {
                actionStatus = 'Warning';
            }
        }
    }

    let stageStatus = 'Healthy';
    let ruleBreach = false;
    
    const rule = rules.find(r => r.stage.toLowerCase() === (lead.status || '').toLowerCase());
    
    if (rule) {
        const stageDate = parseDate(lead.stageChangedDate) || parseDate(lead.date) || today;
        const diffTime = Math.abs(today.getTime() - stageDate.getTime());
        const hoursInStage = diffTime / (1000 * 60 * 60);
        
        if (hoursInStage > rule.thresholdHours) {
            stageStatus = 'Violated';
            ruleBreach = true;
        } else if (hoursInStage > rule.thresholdHours * 0.8) {
             stageStatus = 'Warning';
        }
    }

    if (actionStatus === 'Violated' || stageStatus === 'Violated') {
        return { 
            status: 'Violated', 
            label: isActionOverdue ? 'Overdue' : 'SLA Breach', 
            urgency: 'critical', 
            color: 'red',
            isOverdue: isActionOverdue || ruleBreach
        };
    }
    
    if (actionStatus === 'Warning' || stageStatus === 'Warning') {
         return { 
            status: 'Warning', 
            label: actionStatus === 'Warning' ? 'Due Soon' : 'Aging', 
            urgency: 'warning', 
            color: 'yellow',
            isOverdue: false
        };
    }

    if (lead.nextAction && !isActionOverdue) {
        return { status: 'Healthy', label: 'Scheduled', urgency: 'scheduled', color: 'blue', isOverdue: false };
    }

    return { status: 'Healthy', label: 'OK', urgency: 'okay', color: 'green', isOverdue: false };
};

export const calcSLAHealth = (lead: Lead, rules: SLARule[] = []): string => {
    const health = determineLeadHealth(lead, rules);
    if (health.status === 'Violated') return '🔴';
    if (health.status === 'Warning') return '🟡';
    return '🟢';
};