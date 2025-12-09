
export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export type Owner = string;

// --- DYNAMIC MAPPING TYPES ---
// Allows the app to adapt to column reordering in Sheets
export interface ColumnMap {
  [key: string]: number;
}

export interface Lead {
  // Internal Metadata
  _identityRowIndex?: number;
  _flowRowIndex?: number;
  
  // --- IDENTITY (Leads Sheet) ---
  leadId: string;
  contactPerson: string;
  number: string;
  email: string;
  companyName: string;
  city: string;
  source: string;
  categoryIdentity?: string;
  createdBy?: string;
  tags: string;
  identityStatus: string;
  createdAt?: string;
  leadScore?: string | number;
  remarks: string;
  sourceRowId?: string;
  info?: string;

  // --- FLOW (Lead_Flows Sheet) ---
  flowId?: string;
  originalChannel?: string;
  channel?: string;
  ydsPoc: string; // Owner
  status: string; // Stage
  stage: string;  // Redundant with status, keeping for schema compat
  sourceFlowTag?: string;
  updatedAt?: string;
  startDate?: string;
  expectedCloseDate?: string;
  wonDate?: string;
  lostDate?: string;
  lostReason?: string;
  orderInfo: string;
  estimatedQty: number;
  productType: string;
  printType: string;
  priority: string;
  contactStatus: string;
  paymentUpdate: string;
  nextAction: string;
  nextActionDate: string;
  intent?: string;
  category: string; // Primary
  customerType?: string;

  // --- UI / COMPUTED FIELDS ---
  date: string; // Display Date
  owner?: string; // UI Alias
  daysOpen?: string;
  slaStatus?: string;
  slaHealth?: string;
  actionOverdue?: string;
  stageChangedDate?: string;
  
  // Context Fields (Dropship / B2B)
  platformType?: string;
  storeUrl?: string;
  integrationReady?: string;
  sampleRequired?: string;
  sampleStatus?: string;
  workflowType?: string;
  onboardingStartedDate?: string;
  dashboardLinkSent?: string;
  accountCreated?: string;
  firstProductCreated?: string;
  activationDate?: string;
  
  // Operational
  lastContactDate?: string;
  contactAttempts?: number;
  lastAttemptDate?: string;
  firstResponseTime?: string;
  
  [key: string]: any; // Allow loose access for dynamic mappers
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
  lostReasons: string[];
  customerTypes: string[];
  platformTypes: string[];
  sampleStatus: string[];
  intents: string[];
  workflowTypes: string[];
  nextActionTypes: string[];
  orderStatus: string[];
  designStatus: string[];
}

export interface StageRule { fromStage: string; toStage: string; requiresField: string[]; }
export interface SLARule { stage: string; thresholdHours: number; alertLevel: string; }
export interface AutoActionRule { triggerStage: string; defaultNextAction: string; defaultDays: number; triggerEvent?: string; }
export interface MessageTemplate { id: string; name: string; body: string; stage?: string; category?: string; }
export interface LegendItem { listName: string; value: string; color: string; isActive: boolean; displayOrder: number; probability?: number; }

// --- CONSTANTS ---

export const MODULE_IDS = {
  CORE: '1bbzFwbQ3z3lQGZoo6Y3WfvuBRJXlXp8xrf3LuDEGs1A',
  CONFIG: '1Z3MwuV9los8QAcCFQUgoKtpirCh9IPIkSLCfNHj8Jf4',
  ACTIVITY: '1Y0x98DnlK4v3rapo4zoCZj-LoFnMcNMUdkaowYsBC38'
};

export const SHEET_IDS = {
  DEFAULT: MODULE_IDS.CORE, 
};

// --- HELPERS ---

export const calculatePriority = (qty: number): string => {
  if (qty >= 100) return '🔴 High';
  if (qty >= 50) return '🟡 Med';
  if (qty > 0) return '🟢 Low';
  return '⚪';
};

export const getStageColor = (stage: string) => {
  const s = (stage || '').toLowerCase();
  if (s === 'won') return 'bg-green-50 text-green-700 border-green-200';
  if (s === 'lost') return 'bg-red-50 text-red-700 border-red-200';
  if (s.includes('new') || s.includes('assigned')) return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

export const getPriorityColor = (priority: string) => {
  if (priority?.includes('High')) return 'bg-red-100 text-red-800 border-red-200';
  if (priority?.includes('Med')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (priority?.includes('Low')) return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export const formatDate = (date: Date = new Date()): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const addDaysToDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    // Handle both YYYY-MM-DD and DD/MM/YYYY
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

export const toInputDate = (dateStr: string | undefined): string => dateStr || '';
export const fromInputDate = (inputDate: string): string => inputDate;

// --- DEFAULTS ---

export const AUTO_NEXT_ACTIONS_DEFAULT: Record<string, { action: string, days: number }> = {
  'New': { action: 'Assign Owner', days: 0 },
  'Assigned': { action: 'First Call Attempt', days: 1 },
  'Contacted': { action: 'Qualify Requirement', days: 2 },
  'Qualified': { action: 'Send Proposal', days: 1 },
  'Won': { action: 'Confirm Payment', days: 0 }
};

export const REQUIRED_FIELDS_BY_STAGE: Record<string, string[]> = {
  'Assigned': ['ydsPoc', 'priority'],
  'Qualified': ['category', 'intent'],
  'Won': ['paymentUpdate']
};

export const FORBIDDEN_TRANSITIONS: Record<string, string[]> = {};

// --- SLA LOGIC ---

export const determineLeadHealth = (lead: Lead, rules: SLARule[] = []) => {
    if (lead.status === 'Won' || lead.status === 'Lost') {
        return { status: 'Healthy', label: 'Closed', urgency: 'okay', color: 'gray', isOverdue: false };
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    
    // 1. Check Explicit Due Date
    if (lead.nextActionDate) {
        const nextDate = parseDate(lead.nextActionDate);
        if (nextDate && nextDate < today) {
            return { status: 'Violated', label: 'Overdue', urgency: 'critical', color: 'red', isOverdue: true };
        }
        if (nextDate && nextDate.getTime() === today.getTime()) {
             return { status: 'Warning', label: 'Due Today', urgency: 'warning', color: 'yellow', isOverdue: false };
        }
    }

    // 2. Check Stage Stagnation (Optional Rule Based)
    if (rules.length > 0) {
        const rule = rules.find(r => r.stage === lead.status);
        if (rule) {
            const lastChange = parseDate(lead.stageChangedDate) || parseDate(lead.date);
            if (lastChange) {
                const hoursInStage = (new Date().getTime() - lastChange.getTime()) / (1000 * 60 * 60);
                if (hoursInStage > rule.thresholdHours) {
                     return { status: 'Violated', label: 'Stagnant', urgency: 'critical', color: 'red', isOverdue: true };
                }
            }
        }
    }

    return { status: 'Healthy', label: 'OK', urgency: 'okay', color: 'green', isOverdue: false };
};

// Legacy Interface Stubs for compatibility
export interface ActivityLog { logId: string; leadId: string; timestamp: string; activityType: string; owner: string; notes: string; fromValue?: string; toValue?: string; }
export interface SourceConfig { layer: string; sheetId: string; tab: string; type: string; tags: string[]; isActive: boolean; _rowIndex?: number; headers?: string[]; name?: string; }
export interface FieldMapRule { id?: string; sourceLayer: string; sourceHeader: string; intakeField: string; transform: string; isRequired: boolean; fallbackGroup?: string; targetTable?: string; notes?: string; }
export interface IntakeRow { id: string; sourceLayer: string; sourceSheetId: string; sourceTab: string; sourceRowIndex: number; wbColIndex_Id?: number; wbColIndex_Status?: number; rawData: Record<string, any>; isValid: boolean; isDuplicate: boolean; errors: string[]; [key: string]: any; }

export interface ConfigStore {
  appOptions: AppOptions;
  stageRules: StageRule[];
  slaRules: SLARule[];
  autoActions: AutoActionRule[];
  templates: MessageTemplate[];
}
