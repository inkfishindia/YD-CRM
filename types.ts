

export interface Lead {
  _rowIndex: number;
  // Primary
  leadId: string;        // lead_id
  
  // Identity (2.2)
  date: string;          // date
  createdAt: string;     // created_at
  updatedAt: string;     // updated_at
  source: string;        // source
  sourceDetail: string;  // source_detail
  employeeName: string;  // employee_name
  companyName: string;   // company_name
  contactPerson: string; // contact_person
  number: string;        // number
  email: string;         // email
  city: string;          // city
  intent: string;        // intent
  tags: string;          // tags (New)
  
  // Sales & Product Data
  orderInfo: string;     // order_information
  estimatedQty: number;  // estimated_qty
  productType: string;   // product_type
  printType: string;     // print_type
  priority: string;      // priority
  category: string;      // category
  customerType: string;  // customer_type
  ydsPoc: string;        // yds_poc
  expectedCloseDate: string; // expected_close_date (New for Forecasting)
  
  // Status & Stage
  status: string;        // status (Legacy/Pipeline Stage Status)
  stage: string;         // stage
  design: string;        // design
  contactStatus: string; // contact_status
  paymentUpdate: string; // payment_update
  
  // Engagement
  contactAttempts: number; // contact_attempts
  lastContactDate: string; // last_contact_date
  lastAttemptDate: string; // last_attempt_date
  nextAction: string;      // next_action
  nextActionDate: string;  // next_action_date
  
  // Outcomes
  lostReason: string;      // lost_reason
  wonDate: string;         // won_date
  lostDate: string;        // lost_date
  
  // Metrics & System
  slaStatus: string;       // sla_status
  slaHealth: string;       // sla_health
  daysOpen: string;        // days_open
  actionOverdue: string;   // action_overdue
  staleDate: string;       // stale_date
  firstResponseTime: string; // first_response_time
  stageChangedDate: string;  // stage_changed_date
  assignedToHistory: string; // assigned_to_history
  reassignReason: string;    // reassign_reason
  
  // Communications
  whatsappMessage: string;   // whatsapp_message
  remarks: string;           // remarks
  orderNotes?: string;       // order_notes
  
  // Dropshipping / Platform (2.5)
  platformType: string;      // platform_type
  integrationReady: string;  // integration_ready
  storeUrl: string;          // store_url
  accountCreated: string;    // account_created
  dashboardLinkSent: string; // dashboard_link_sent
  onboardingStartedDate: string; // onboarding_started_date
  activationDate: string;    // activation_date
  
  // Sampling (2.4)
  sampleRequired: string;    // sample_required
  sampleStatus: string;      // sample_status
  
  // Workflow
  workflowType: string;      // workflow_type
  designsReady: string;      // designs_ready
  firstProductCreated: string; // first_product_created
  
  // Extra / Legacy
  orderStatus: string;       // order_status
}

export interface ActivityLog {
  logId: string;
  leadId: string;
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
  probability?: number; // 0-100 for Stages
}

export interface StageRule {
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
  condition: string;
  thresholdDays: number;
  alertLevel: string;
  alertAction: string;
}

export interface AutoActionRule {
  triggerStage: string;
  defaultNextAction: string;
  defaultDays: number;
}

export interface MessageTemplate {
  id: string;
  stage: string;
  category: string;
  infoLevel: string;
  name: string; // Using as 'subject' mostly or display name
  subject: string;
  body: string;
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
  intents: string[]; // New
  workflowTypes: string[]; // New
}

// --- CONSTANTS (Defaults / Fallbacks) ---

export type Owner = string;
export type Stage = string;

// Fallback only. Main logic should use AutoActionRule from Sheet.
export const AUTO_NEXT_ACTIONS_DEFAULT: Record<string, { action: string, days: number }> = {
  'New': { action: 'Assign Owner', days: 0 },
  'Assigned': { action: 'First Call Attempt', days: 1 },
  'Contacted': { action: 'Qualify Requirement', days: 2 },
  'Qualified': { action: 'Create Proposal / Plan', days: 1 },
  'Sample/Proposal': { action: 'Follow Up on Quote', days: 3 },
  'Negotiation': { action: 'Finalize Pricing', days: 2 },
  'Ready to Route': { action: 'Push to OMS/Partner DB', days: 0 },
  'Won': { action: 'Confirm Payment', days: 0 },
  'Lost': { action: '', days: 0 }
};

// PRD 4.2 Required Fields Per Stage (Ground Truth)
export const REQUIRED_FIELDS_BY_STAGE: Record<string, string[]> = {
  'Assigned': ['ydsPoc', 'priority'], // Must have owner
  'Contacted': ['contactStatus', 'number'], // Must have tried contacting
  'Qualified': ['intent', 'category', 'customerType'], // Must know what they want
  'Sample/Proposal': ['productType', 'estimatedQty'], // Need details to quote (B2B/POD)
  'Negotiation': ['expectedCloseDate'], // Sales forecast
  'Ready to Route': ['paymentUpdate', 'city'], // Pre-flight check
  'Won': ['wonDate', 'paymentUpdate'], // Closure
  'Lost': ['lostReason']
};

// PRD 4.1 Allowed & Forbidden Stage Transitions (Strict Pipeline)
// Prevents skipping critical steps like Qualification
export const FORBIDDEN_TRANSITIONS: Record<string, string[]> = {
  'New': ['Qualified', 'Sample/Proposal', 'Negotiation', 'Won', 'Ready to Route'],
  'Assigned': ['Won', 'Ready to Route', 'Negotiation'],
  'Contacted': ['Won', 'Ready to Route'],
  'Qualified': ['New'], // Can't go back to start
  'Sample/Proposal': ['New', 'Assigned'],
  'Ready to Route': ['New', 'Assigned', 'Contacted'],
  'Won': ['New', 'Assigned', 'Contacted', 'Qualified', 'Sample/Proposal', 'Negotiation', 'Lost'], // Locked
  'Lost': ['New', 'Assigned', 'Contacted', 'Qualified', 'Sample/Proposal', 'Negotiation', 'Won', 'Ready to Route'] // Locked
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
  if (s === 'ready to route') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (s === 'negotiation') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (s === 'qualified') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

// --- DATE HELPERS ---
// App Format: DD/MM/YY
// Sheet Format: MM/DD/YYYY
// HTML Input Format: YYYY-MM-DD

export const formatDate = (date: Date = new Date()): string => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`; // DD/MM/YY
};

export const addDaysToDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    
    // Check for ISO format YYYY-MM-DD (Mock Data or internal safety)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    // Assume DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY (App Format)
    // parts[0] is Day, parts[1] is Month, parts[2] is Year
    const cleanStr = dateStr.replace(/-/g, '/');
    const parts = cleanStr.split('/');
    if (parts.length !== 3) return null;

    let year = parseInt(parts[2]);
    if (year < 100) year += 2000; // Handle YY

    return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
};

// CONVERT: App (DD/MM/YY) -> Sheet (MM/DD/YYYY)
export const toSheetDate = (appDate: string): string => {
    if (!appDate) return '';
    const date = parseDate(appDate);
    if (!date) return appDate; // Return as is if parse fails
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
};

// CONVERT: Sheet (MM/DD/YYYY) -> App (DD/MM/YY)
export const fromSheetDate = (sheetDate: string): string => {
    if (!sheetDate) return '';
    
    // Handle YYYY-MM-DD (ISO) fallback
    if (sheetDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        return formatDate(new Date(sheetDate));
    }

    const parts = sheetDate.split(/[-/]/);
    if (parts.length < 3) return sheetDate;

    // Sheet is Month / Day / Year
    const m = parseInt(parts[0]);
    const d = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    
    if (isNaN(m) || isNaN(d) || isNaN(y)) return sheetDate;

    // Construct valid date object
    const date = new Date(y, m - 1, d);
    return formatDate(date); // Returns DD/MM/YY
};

// CONVERT: App (DD/MM/YY) -> Input (YYYY-MM-DD)
export const toInputDate = (appDate: string | undefined): string => {
    if (!appDate) return '';
    const date = parseDate(appDate);
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// CONVERT: Input (YYYY-MM-DD) -> App (DD/MM/YY)
export const fromInputDate = (inputDate: string): string => {
    if (!inputDate) return '';
    const parts = inputDate.split('-');
    if (parts.length !== 3) return '';
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return formatDate(date);
};

// Centralized SLA Logic (Used by Hook and App Update)
export const determineLeadHealth = (lead: Lead, rules: SLARule[] = []) => {
    // 1. Won/Lost = Healthy
    if (lead.status === 'Won' || lead.status === 'Lost') {
        return { status: 'Healthy', label: lead.status === 'Won' ? 'Won' : 'Closed', urgency: 'okay', color: 'gray', isOverdue: false };
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 2. Next Action Check (Immediate Trigger)
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

    // 3. Stage Duration Check (SLA Rule)
    let stageStatus = 'Healthy';
    let ruleBreach = false;
    
    const rule = rules.find(r => r.stage.toLowerCase() === (lead.status || '').toLowerCase());
    if (rule) {
        const stageDate = parseDate(lead.stageChangedDate) || parseDate(lead.date) || today;
        const diffTime = Math.abs(today.getTime() - stageDate.getTime());
        const daysInStage = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysInStage > rule.thresholdDays) {
            stageStatus = 'Violated';
            ruleBreach = true;
        } else if (daysInStage > rule.thresholdDays * 0.8) {
             stageStatus = 'Warning';
        }
    }

    // 4. Merge Logic (Worst Case Wins)
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

    // 5. Default Healthy (or Scheduled)
    if (lead.nextActionDate && !isActionOverdue) {
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