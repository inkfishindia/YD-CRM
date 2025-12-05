
import React, { useState, useMemo } from 'react';
import { LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate, GoogleUser, Lead, REQUIRED_FIELDS_BY_STAGE, FORBIDDEN_TRANSITIONS } from '../types';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Form';
import { Edit2, Plus, CheckCircle, Trash2, Copy, AlertTriangle, Link, Save, RotateCcw, Cloud, Database, CloudOff, LogIn, Hammer, Loader2, MinusCircle, Table, BookOpen, Info, List, Stethoscope, Wrench, Shield, Zap, LayoutTemplate, Activity, UploadCloud, Tag, GitMerge, ArrowDown, Ban, CheckSquare, Clock, ArrowRight, Users, History, MessageCircle, FileSpreadsheet, Box } from 'lucide-react';
import { initializeSheetStructure, diagnoseSheetStructure, SchemaReport, populateConfigData, SHEET_NAME_LEADS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY, SHEET_NAME_STAGE_RULES, SHEET_NAME_SLA_RULES, SHEET_NAME_AUTO_ACTION, SHEET_NAME_TEMPLATES, HEADER_LEAD_CSV, HEADER_LEGEND_CSV, HEADER_ACTIVITY_CSV, HEADER_STAGE_RULES_CSV, HEADER_SLA_RULES_CSV, HEADER_AUTO_ACTION_CSV, HEADER_TEMPLATES_CSV } from '../services/sheetService';
import { Badge } from './ui/Badge';

interface SettingsViewProps {
  leads?: Lead[];
  legends: LegendItem[];
  onUpdateLegends: (legends: LegendItem[]) => void;
  stageRules: StageRule[];
  onUpdateStageRules: (rules: StageRule[]) => void;
  slaRules: SLARule[];
  onUpdateSLARules: (rules: SLARule[]) => void;
  autoActions: AutoActionRule[];
  onUpdateAutoActions: (rules: AutoActionRule[]) => void;
  templates: MessageTemplate[];
  onUpdateTemplates: (templates: MessageTemplate[]) => void;
  
  // Connection Config
  currentSpreadsheetId: string;
  onUpdateSpreadsheetId: (id: string) => void;
  // Auth State
  user: GoogleUser | null;
  syncStatus: 'success' | 'error';
  onResetLocalData: () => void;
  onInspectLead?: (lead: Lead) => void;
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'sop', label: 'Workflow & Data SOP', icon: GitMerge },
  { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope },
  { id: 'connection', label: 'Connection', icon: Database },
  { id: 'picklists', label: 'Picklists', icon: List },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
] as const;

// --- HELPER: Data Source Banner ---
const DataSourceBanner: React.FC<{ sheetName: string, user: GoogleUser | null, syncStatus: 'success' | 'error' }> = ({ sheetName, user, syncStatus }) => {
    const isCloud = !!user;
    const isSynced = syncStatus === 'success';

    return (
        <div className={`px-4 py-2 text-xs font-medium border-b flex justify-between items-center ${isCloud ? (isSynced ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800') : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
            <div className="flex items-center gap-2">
                <Table size={12} className="opacity-50" />
                <span className="uppercase tracking-wider opacity-70 text-[10px]">Config Source:</span>
                <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-black/5 shadow-sm">{sheetName}</span>
            </div>
            <div className="flex items-center gap-1.5">
                {isCloud ? (
                    isSynced ? (
                        <>
                            <Cloud size={12} />
                            <span>Cloud Synced</span>
                        </>
                    ) : (
                        <>
                            <AlertTriangle size={12} />
                            <span>Sync Error</span>
                        </>
                    )
                ) : (
                    <>
                        <Database size={12} />
                        <span>Using Mock/Local Data</span>
                    </>
                )}
            </div>
        </div>
    );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  leads = [],
  legends, onUpdateLegends,
  stageRules, onUpdateStageRules,
  slaRules, onUpdateSLARules,
  autoActions, onUpdateAutoActions,
  templates, onUpdateTemplates,
  currentSpreadsheetId, onUpdateSpreadsheetId,
  user, syncStatus, onResetLocalData, onInspectLead
}) => {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('dashboard');

  return (
    <div className="flex h-full bg-[#f5f5f5]">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
         <div className="p-4 border-b border-gray-100">
             <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                 <Wrench size={16} className="text-gray-500"/> Admin Panel
             </h2>
         </div>
         <nav className="flex-1 p-2 space-y-1">
             {TABS.map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                        activeTab === tab.id 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                 >
                     <tab.icon size={16} className={activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'} />
                     {tab.label}
                 </button>
             ))}
         </nav>
         <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
             YDS Leads v1.6
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
         <div className="max-w-5xl mx-auto">
             {activeTab === 'dashboard' && (
                 <DashboardSettings 
                    user={user} 
                    syncStatus={syncStatus} 
                    leads={leads}
                    rulesCount={stageRules.length + slaRules.length + autoActions.length}
                 />
             )}
             {activeTab === 'sop' && (
                 <SopVisualizer 
                    legends={legends}
                    stageRules={stageRules}
                    slaRules={slaRules}
                    autoActions={autoActions}
                 />
             )}
             {activeTab === 'diagnostics' && (
                 <DiagnosticsPanel leads={leads} onInspect={onInspectLead} />
             )}
             {activeTab === 'connection' && (
                 <ConnectionSettings 
                    currentId={currentSpreadsheetId} 
                    onUpdate={onUpdateSpreadsheetId}
                    user={user}
                    syncStatus={syncStatus}
                    onResetLocal={onResetLocalData}
                 />
             )}
             {activeTab === 'picklists' && (
                 <PicklistsSettings 
                    legends={legends} 
                    onUpdate={onUpdateLegends} 
                    user={user} 
                    syncStatus={syncStatus} 
                 />
             )}
             {activeTab === 'automation' && (
                 <AutomationSettings
                    stageRules={stageRules}
                    onUpdateStageRules={onUpdateStageRules}
                    slaRules={slaRules}
                    onUpdateSLARules={onUpdateSLARules}
                    autoActions={autoActions}
                    onUpdateAutoActions={onUpdateAutoActions}
                    user={user}
                    syncStatus={syncStatus}
                 />
             )}
             {activeTab === 'templates' && (
                 <TemplatesSettings 
                    templates={templates} 
                    onUpdate={onUpdateTemplates} 
                    user={user} 
                    syncStatus={syncStatus} 
                    legends={legends}
                    onUpdateLegends={onUpdateLegends}
                 />
             )}
         </div>
      </div>
    </div>
  );
};

// --- 1. DASHBOARD ---
const DashboardSettings: React.FC<{ user: GoogleUser | null, syncStatus: 'success' | 'error', leads: Lead[], rulesCount: number }> = ({ user, syncStatus, leads, rulesCount }) => {
    const isHealthy = user && syncStatus === 'success';
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900">System Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Health Card */}
                <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm ${isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {isHealthy ? <CheckCircle size={48} className="text-green-500 mb-4" /> : <AlertTriangle size={48} className="text-red-500 mb-4" />}
                    <h3 className={`text-lg font-bold ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>
                        {isHealthy ? 'System Healthy' : 'Action Required'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                        {isHealthy ? 'Connected to Google Sheets. Sync active.' : 'Connection to data source is broken or offline.'}
                    </p>
                </div>

                {/* Data Stats */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <Database size={20} className="text-blue-500"/>
                        <span className="font-bold text-gray-700">Data Volume</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{leads.length}</div>
                    <div className="text-xs text-gray-500">Active Leads Loaded</div>
                </div>

                {/* Rules Stats */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap size={20} className="text-purple-500"/>
                        <span className="font-bold text-gray-700">Automation Logic</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{rulesCount}</div>
                    <div className="text-xs text-gray-500">Active Rules Configured</div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Info size={18} /> Admin Tips
                </h3>
                <ul className="list-disc pl-5 text-sm text-blue-800 space-y-2">
                    <li>Use the <strong>Workflow SOP</strong> tab to visualize the pipeline flow or inspect the data schema.</li>
                    <li>Check <strong>Connection</strong> tab to validate that your Google Sheet has all required columns.</li>
                    <li>Manage all business logic (SLA, Auto-Assign) in the <strong>Automation</strong> tab.</li>
                </ul>
            </div>
        </div>
    )
}

// --- 2. SOP VISUALIZER (ENHANCED) ---

const SchemaCard: React.FC<{ title: string, description: string, headers: string, color: string, icon: React.ReactNode }> = ({ title, description, headers, color, icon }) => {
    const fields = headers.split(',').map(s => s.trim());

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between ${color} bg-opacity-10`}>
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${color} text-white`}>{icon}</div>
                    <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
                </div>
                <Badge variant="neutral" className="text-[10px]">{fields.length} Fields</Badge>
            </div>
            <div className="p-4">
                <p className="text-xs text-gray-500 mb-3 italic">{description}</p>
                <div className="flex flex-wrap gap-1.5">
                    {fields.map(f => (
                        <span key={f} className="text-[10px] font-mono bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded border border-gray-100">
                            {f}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SopVisualizer: React.FC<{ 
    legends: LegendItem[], 
    stageRules: StageRule[], 
    slaRules: SLARule[], 
    autoActions: AutoActionRule[] 
}> = ({ legends, stageRules, slaRules, autoActions }) => {
    const [viewMode, setViewMode] = useState<'pipeline' | 'schema'>('pipeline');

    const stages = useMemo(() => {
        return legends
            .filter(l => l.listName === 'stage' && l.isActive)
            .sort((a,b) => a.displayOrder - b.displayOrder)
            .map(l => l.value);
    }, [legends]);

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
             <div className="flex justify-between items-center mb-4">
                 <div>
                    <h2 className="text-xl font-bold text-gray-900">System Architecture</h2>
                    <p className="text-sm text-gray-500">Visualize workflow logic and underlying data structures.</p>
                 </div>
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                     <button 
                        onClick={() => setViewMode('pipeline')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'pipeline' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                         <GitMerge size={14} /> Workflow View
                     </button>
                     <button 
                        onClick={() => setViewMode('schema')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'schema' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                     >
                         <Database size={14} /> Data Schema View
                     </button>
                 </div>
             </div>

             {viewMode === 'schema' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                     <div className="col-span-full mb-2">
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                            <Info size={16} className="text-blue-500 mt-0.5" />
                            <div className="text-xs text-blue-800">
                                <p className="font-bold mb-1">About Data Architecture</p>
                                <p>The application reads and writes to these specific Google Sheets. The <strong>Field Tags</strong> below represent the exact column headers expected in each sheet.</p>
                            </div>
                        </div>
                     </div>

                     <SchemaCard 
                        title={SHEET_NAME_LEADS} 
                        description="Primary database for Lead Identity, Sales Info, and Status tracking."
                        headers={HEADER_LEAD_CSV}
                        color="bg-blue-600"
                        icon={<Users size={16} />}
                     />
                     <SchemaCard 
                        title={SHEET_NAME_ACTIVITY} 
                        description="Immutable audit trail for compliance and history tracking."
                        headers={HEADER_ACTIVITY_CSV}
                        color="bg-gray-600"
                        icon={<History size={16} />}
                     />
                     <SchemaCard 
                        title={SHEET_NAME_LEGEND} 
                        description="Configuration source for all dropdowns (Stages, Owners, Products)."
                        headers={HEADER_LEGEND_CSV}
                        color="bg-purple-600"
                        icon={<List size={16} />}
                     />
                     <SchemaCard 
                        title={SHEET_NAME_STAGE_RULES} 
                        description="Logic engine for stage transitions and automation triggers."
                        headers={HEADER_STAGE_RULES_CSV}
                        color="bg-indigo-600"
                        icon={<GitMerge size={16} />}
                     />
                     <SchemaCard 
                        title={SHEET_NAME_SLA_RULES} 
                        description="Time-based rules for health monitoring."
                        headers={HEADER_SLA_RULES_CSV}
                        color="bg-orange-600"
                        icon={<Clock size={16} />}
                     />
                     <SchemaCard 
                        title={SHEET_NAME_AUTO_ACTION} 
                        description="Default next actions triggered by stage entry."
                        headers={HEADER_AUTO_ACTION_CSV}
                        color="bg-yellow-500"
                        icon={<Zap size={16} />}
                     />
                     <SchemaCard 
                        title={SHEET_NAME_TEMPLATES} 
                        description="Communication templates for WhatsApp/Email."
                        headers={HEADER_TEMPLATES_CSV}
                        color="bg-green-600"
                        icon={<MessageCircle size={16} />}
                     />
                 </div>
             )}

             {viewMode === 'pipeline' && (
                 <div className="relative space-y-8 pl-8 border-l-2 border-gray-200 ml-4 animate-fade-in">
                     {stages.map((stage, idx) => {
                         const isFirst = idx === 0;
                         const isLast = idx === stages.length - 1;
                         
                         // 1. Hard Requirements (Code-based SOP)
                         const requiredFields = REQUIRED_FIELDS_BY_STAGE[stage] || [];
                         
                         // 2. Forbidden Transitions (Code-based SOP)
                         const forbidden = FORBIDDEN_TRANSITIONS[stage] || [];
                         
                         // 3. Configurable Logic (Sheet-based)
                         const sla = slaRules.find(r => r.stage.toLowerCase() === stage.toLowerCase());
                         const autoAction = autoActions.find(r => r.triggerStage.toLowerCase() === stage.toLowerCase());
                         
                         // 4. Custom Transitions Rules (Sheet-based)
                         const transitionRules = stageRules.filter(r => r.fromStage.toLowerCase() === stage.toLowerCase());

                         return (
                             <div key={stage} className="relative">
                                 {/* Connector Node */}
                                 <div className="absolute -left-[41px] top-6 w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-sm z-10"></div>
                                 
                                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                     {/* Header */}
                                     <div className="flex justify-between items-start mb-4">
                                         <div className="flex items-center gap-3">
                                             <h3 className="text-lg font-bold text-gray-900">{stage}</h3>
                                             {isFirst && <Badge variant="neutral">Entry Point</Badge>}
                                             {isLast && <Badge variant="neutral">Terminal</Badge>}
                                         </div>
                                         {sla && (
                                             <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100" title={`Configured in ${SHEET_NAME_SLA_RULES}`}>
                                                 <Clock size={12} />
                                                 <span>SLA: {sla.thresholdDays} Days</span>
                                                 <span className="ml-2 pl-2 border-l border-orange-200 text-[9px] uppercase tracking-wider opacity-70 flex items-center gap-1">
                                                     <Table size={8} /> {SHEET_NAME_SLA_RULES}
                                                 </span>
                                             </div>
                                         )}
                                     </div>

                                     {/* Grid Layout for Logic */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         
                                         {/* Left Col: Requirements & Gates */}
                                         <div className="space-y-4">
                                             {/* A. Entry/Exit Criteria (Required Fields) */}
                                             <div>
                                                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                     <CheckSquare size={14} className="text-green-600"/> Data Requirements
                                                 </h4>
                                                 {requiredFields.length > 0 ? (
                                                     <div className="flex flex-wrap gap-1.5">
                                                         {requiredFields.map(field => (
                                                             <span key={field} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200 font-mono">
                                                                 {field}
                                                             </span>
                                                         ))}
                                                     </div>
                                                 ) : (
                                                     <p className="text-xs text-gray-400 italic">No hard data requirements.</p>
                                                 )}
                                             </div>

                                             {/* B. Forbidden Jumps */}
                                             {forbidden.length > 0 && (
                                                 <div>
                                                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                         <Ban size={14} className="text-red-500"/> Forbidden Moves
                                                     </h4>
                                                     <div className="flex flex-wrap gap-1.5">
                                                         {forbidden.map(target => (
                                                             <span key={target} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 line-through">
                                                                 {target}
                                                             </span>
                                                         ))}
                                                     </div>
                                                 </div>
                                             )}
                                         </div>

                                         {/* Right Col: Automation & Actions */}
                                         <div className="space-y-4">
                                             {/* C. Auto-Actions */}
                                             <div>
                                                 <div className="flex justify-between items-center mb-2">
                                                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                         <Zap size={14} className="text-purple-500"/> System Automation
                                                     </h4>
                                                     {autoAction && (
                                                         <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                                                             <Table size={10} /> {SHEET_NAME_AUTO_ACTION}
                                                         </span>
                                                     )}
                                                 </div>
                                                 
                                                 {autoAction ? (
                                                     <div className="text-xs bg-purple-50 text-purple-800 p-2 rounded border border-purple-100">
                                                         <strong>Auto-Set Task:</strong> "{autoAction.defaultNextAction}" <br/>
                                                         <span className="opacity-75">Due in {autoAction.defaultDays} days</span>
                                                     </div>
                                                 ) : (
                                                     <p className="text-xs text-gray-400 italic">No auto-actions configured.</p>
                                                 )}
                                             </div>

                                             {/* D. Custom Transitions */}
                                             {transitionRules.length > 0 && (
                                                 <div>
                                                      <div className="flex justify-between items-center mb-2">
                                                         <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                             <GitMerge size={14} className="text-blue-500"/> Transition Rules
                                                         </h4>
                                                         <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                                                             <Table size={10} /> {SHEET_NAME_STAGE_RULES}
                                                         </span>
                                                      </div>
                                                     <div className="space-y-1">
                                                         {transitionRules.map((rule, ri) => (
                                                             <div key={ri} className="text-xs flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                                                 <ArrowRight size={10} /> To <strong>{rule.toStage}</strong>: {rule.trigger}
                                                             </div>
                                                         ))}
                                                     </div>
                                                 </div>
                                             )}
                                         </div>

                                     </div>
                                 </div>

                                 {/* Down Arrow for Flow */}
                                 {!isLast && (
                                     <div className="flex justify-center py-2 -ml-8">
                                         <ArrowDown size={20} className="text-gray-300" />
                                     </div>
                                 )}
                             </div>
                         );
                     })}
                 </div>
             )}
        </div>
    );
}

// --- 3. DIAGNOSTICS PANEL (New Feature) ---
const DiagnosticsPanel: React.FC<{ leads: Lead[], onInspect?: (lead: Lead) => void }> = ({ leads, onInspect }) => {
    const issues = useMemo(() => {
        const list: { lead: Lead, type: 'error' | 'warning', msg: string }[] = [];
        
        leads.forEach(l => {
            if (l.status === 'Won' || l.status === 'Lost') return;

            // 1. Check Required Fields for Current Stage
            const required = REQUIRED_FIELDS_BY_STAGE[l.status] || [];
            const missing = required.filter(f => !l[f as keyof Lead] || l[f as keyof Lead] === 'Unassigned');
            
            if (missing.length > 0) {
                list.push({
                    lead: l,
                    type: 'error',
                    msg: `Missing required fields for ${l.status}: ${missing.join(', ')}`
                });
            }

            // 2. Check for Missing Owner
            if (!l.ydsPoc || l.ydsPoc === 'Unassigned') {
                list.push({
                    lead: l,
                    type: 'warning',
                    msg: 'No owner assigned'
                });
            }

            // 3. Check for Invalid Dates
            if (l.nextActionDate && isNaN(Date.parse(l.nextActionDate.split('/').reverse().join('-')))) {
                 // Simple check assuming DD/MM/YYYY format is standard
            }
        });

        return list;
    }, [leads]);

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Data Diagnostics</h2>
                <Badge variant={issues.length > 0 ? 'danger' : 'success'}>
                    {issues.length} Issues Found
                </Badge>
            </div>
            
            {issues.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
                    <h3 className="text-green-800 font-bold text-lg">All Systems Go!</h3>
                    <p className="text-green-700">No data integrity issues found in active leads.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="px-4 py-3">Severity</th>
                                <th className="px-4 py-3">Lead</th>
                                <th className="px-4 py-3">Stage</th>
                                <th className="px-4 py-3">Issue</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {issues.map((issue, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        {issue.type === 'error' ? (
                                            <span className="flex items-center gap-1 text-red-600 font-bold text-xs"><AlertTriangle size={14}/> Critical</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-yellow-600 font-bold text-xs"><Info size={14}/> Warning</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium">{issue.lead.companyName}</td>
                                    <td className="px-4 py-3 text-gray-500">{issue.lead.status}</td>
                                    <td className="px-4 py-3 text-gray-700">{issue.msg}</td>
                                    <td className="px-4 py-3 text-right">
                                        {onInspect && (
                                            <Button size="sm" variant="secondary" onClick={() => onInspect(issue.lead)}>Fix</Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// --- 4. AUTOMATION SETTINGS (Consolidated) ---
const AutomationSettings: React.FC<any> = (props) => {
    const [subTab, setSubTab] = useState<'flow' | 'sla' | 'actions'>('flow');

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900">Automation Studio</h2>
            
            <div className="flex gap-2 mb-4">
                <button 
                    onClick={() => setSubTab('flow')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${subTab === 'flow' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >Stage Rules</button>
                <button 
                    onClick={() => setSubTab('sla')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${subTab === 'sla' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >SLA Timers</button>
                <button 
                    onClick={() => setSubTab('actions')} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${subTab === 'actions' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
                >Auto Actions</button>
            </div>

            {subTab === 'flow' && <RulesSettings stageRules={props.stageRules} onUpdate={props.onUpdateStageRules} user={props.user} syncStatus={props.syncStatus} />}
            {subTab === 'sla' && <SlaSettings slaRules={props.slaRules} onUpdate={props.onUpdateSLARules} user={props.user} syncStatus={props.syncStatus} />}
            {subTab === 'actions' && <ActionsSettings autoActions={props.autoActions} onUpdate={props.onUpdateAutoActions} user={props.user} syncStatus={props.syncStatus} />}
        </div>
    )
}

// --- CONNECTION SETTINGS ---
const ConnectionSettings: React.FC<{ 
    currentId: string, 
    onUpdate: (id: string) => void,
    user: GoogleUser | null,
    syncStatus: 'success' | 'error',
    onResetLocal: () => void
}> = ({ currentId, onUpdate, user, syncStatus, onResetLocal }) => {
    const [id, setId] = useState(currentId);
    const [initStatus, setInitStatus] = useState<{loading: boolean, msg: string | null}>({ loading: false, msg: null });
    const [reports, setReports] = useState<SchemaReport[] | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [populating, setPopulating] = useState(false);
    
    const runDiagnostics = async () => {
        setIsChecking(true);
        try {
            const results = await diagnoseSheetStructure();
            setReports(results);
        } catch (e: any) {
            alert(e.message);
        }
        setIsChecking(false);
    };

    const handleInitialize = async () => {
        if (!confirm("This will create any missing tabs (Leads, Legend, Rules) in your connected Google Sheet. Continue?")) return;
        
        setInitStatus({ loading: true, msg: "Checking sheet structure..." });
        const res = await initializeSheetStructure();
        setInitStatus({ loading: false, msg: res.message });
        
        if (res.success) {
            alert("Initialization Complete: " + res.message + "\nPlease reload the app to fetch new data.");
            window.location.reload();
        } else {
            alert("Error: " + res.message);
        }
    };

    const handlePopulateDefaults = async () => {
         if(!confirm("⚠️ This will OVERWRITE existing Dropdowns, Rules, and Templates in your Google Sheet with the app defaults. Your lead data will remain safe.\n\nContinue?")) return;
         
         setPopulating(true);
         const res = await populateConfigData();
         setPopulating(false);
         
         if (res.success) {
             alert(res.message + "\nReloading app to sync...");
             window.location.reload();
         } else {
             alert("Error: " + res.message);
         }
    };

    return (
        <div className="space-y-6 animate-fade-in">
             {/* Status Card */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <div className="flex justify-between items-start mb-6">
                     <div className="flex items-start gap-4">
                         <div className={`p-3 rounded-lg ${user ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                             {user ? <Cloud size={24} /> : <CloudOff size={24} />}
                         </div>
                         <div>
                             <h3 className="text-lg font-bold text-gray-900">
                                 {user ? `Connected as ${user.name}` : 'Offline / Guest Mode'}
                             </h3>
                             <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                 {user ? (
                                     <>
                                         <span className={`w-2 h-2 rounded-full ${syncStatus === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                         {syncStatus === 'success' ? 'Synced with Google Sheets' : 'Sync Error'}
                                     </>
                                 ) : (
                                     <>
                                         <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                         Using Local Storage
                                     </>
                                 )}
                             </p>
                         </div>
                     </div>
                 </div>

                 {/* Sheet ID Input */}
                 <div className="space-y-4 max-w-2xl">
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                             {user ? "Active Spreadsheet ID" : "Target Spreadsheet ID"}
                         </label>
                         <div className="flex gap-2">
                             <Input 
                                value={id} 
                                onChange={(e) => setId(e.target.value)} 
                                placeholder="1abc..."
                                className="font-mono text-sm"
                             />
                         </div>
                     </div>
                     
                     <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2 justify-between items-center">
                         {!user ? (
                             <Button onClick={onResetLocal} variant="danger" size="sm" icon={<RotateCcw size={14} />}>
                                 Reset Local Data
                             </Button>
                         ) : (
                            <div className="flex items-center gap-2">
                                <Button 
                                    onClick={handleInitialize} 
                                    isLoading={initStatus.loading}
                                    variant="outline"
                                    size="sm"
                                    icon={<Hammer size={14}/>}
                                >
                                    Repair Structure
                                </Button>
                                <Button 
                                    onClick={handlePopulateDefaults}
                                    isLoading={populating}
                                    variant="outline"
                                    size="sm"
                                    icon={<UploadCloud size={14}/>}
                                    title="Write default Dropdowns, Rules and Templates to Sheet"
                                >
                                    Populate Defaults
                                </Button>
                            </div>
                         )}

                         <Button onClick={() => onUpdate(id)} icon={<Save size={16} />}>
                             {user ? "Update Connection" : "Save Config"}
                         </Button>
                     </div>
                 </div>
             </div>

             {/* Schema Validator */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-gray-900 flex items-center gap-2"><Table size={18} /> Schema Validator</h3>
                     <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={runDiagnostics} 
                        isLoading={isChecking}
                        disabled={!user}
                     >
                        Run Full Diagnostic
                     </Button>
                 </div>
                 <p className="text-sm text-gray-500 mb-4">
                     Checks all required sheets (Leads, Legend, Rules) against the latest app version to ensure all columns exist.
                 </p>
                 
                 {!user && <p className="text-xs text-red-500 bg-red-50 p-2 rounded">Sign in to run diagnostics.</p>}

                 {reports && (
                     <div className="space-y-2 mt-4">
                         {reports.map((r) => (
                             <div key={r.sheetName} className={`p-3 rounded-lg border text-sm flex flex-col gap-1 ${
                                 r.status === 'ok' 
                                 ? 'bg-green-50 border-green-200 text-green-800' 
                                 : 'bg-red-50 border-red-200 text-red-800'
                             }`}>
                                 <div className="flex justify-between items-center">
                                     <span className="font-bold flex items-center gap-2">
                                         {r.status === 'ok' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                                         {r.sheetName}
                                     </span>
                                     <span className="text-xs uppercase font-bold px-2 py-0.5 bg-white/50 rounded">{r.status.replace('_', ' ')}</span>
                                 </div>
                                 
                                 {r.missingColumns.length > 0 && (
                                     <div className="mt-1 pl-6">
                                         <span className="text-xs font-bold opacity-75">Missing Columns:</span>
                                         <div className="flex flex-wrap gap-1 mt-1">
                                             {r.missingColumns.map(c => (
                                                 <span key={c} className="bg-white px-1.5 py-0.5 rounded border border-red-200 text-xs font-mono">{c}</span>
                                             ))}
                                         </div>
                                     </div>
                                 )}
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        </div>
    );
};

// --- PICKLISTS EDITOR ---

const PicklistsSettings: React.FC<{ legends: LegendItem[], onUpdate: (l: LegendItem[]) => void, user: GoogleUser | null, syncStatus: 'success' | 'error' }> = ({ legends, onUpdate, user, syncStatus }) => {
    // Exclude 'catalog_link' from generic picklist editor as it has special handling in Templates tab
    const LIST_TYPES: string[] = Array.from(new Set(legends.filter(l => l.listName !== 'catalog_link').map(l => l.listName)));
    const [selectedList, setSelectedList] = useState(LIST_TYPES[0] || 'source');
    const [newItemValue, setNewItemValue] = useState('');
    const [newItemProb, setNewItemProb] = useState<number>(0);
    
    // Filter items for current list
    const currentItems = legends
        .filter(l => l.listName === selectedList)
        .sort((a,b) => a.displayOrder - b.displayOrder);

    const isStageList = selectedList === 'stage';

    const handleToggleActive = (index: number) => {
        const globalIndex = legends.findIndex(l => l === currentItems[index]);
        if (globalIndex === -1) return;
        
        const newLegends = [...legends];
        newLegends[globalIndex] = { 
            ...newLegends[globalIndex], 
            isActive: !newLegends[globalIndex].isActive 
        };
        onUpdate(newLegends);
    };

    const handleToggleDefault = (index: number) => {
        const globalIndex = legends.findIndex(l => l === currentItems[index]);
        if (globalIndex === -1) return;

        // Reset others in list to false
        const newLegends = legends.map(l => {
             if (l.listName === selectedList) {
                 return { ...l, isDefault: false };
             }
             return l;
        });

        // Set new default
        newLegends[globalIndex] = { ...newLegends[globalIndex], isDefault: true };
        onUpdate(newLegends);
    };

    const handleProbChange = (index: number, val: number) => {
        const globalIndex = legends.findIndex(l => l === currentItems[index]);
        if (globalIndex === -1) return;

        const newLegends = [...legends];
        newLegends[globalIndex] = { ...newLegends[globalIndex], probability: val };
        onUpdate(newLegends);
    }

    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === currentItems.length - 1) return;

        // Swap order in global list
        const item = currentItems[index];
        const swapItem = currentItems[direction === 'up' ? index - 1 : index + 1];
        
        const globalIdx1 = legends.findIndex(l => l === item);
        const globalIdx2 = legends.findIndex(l => l === swapItem);
        
        const newLegends = [...legends];
        // Swap displayOrder values
        const tempOrder = newLegends[globalIdx1].displayOrder;
        newLegends[globalIdx1].displayOrder = newLegends[globalIdx2].displayOrder;
        newLegends[globalIdx2].displayOrder = tempOrder;

        onUpdate(newLegends);
    };

    const handleAddItem = () => {
        if (!newItemValue.trim()) return;
        const maxOrder = currentItems.reduce((max, item) => Math.max(max, item.displayOrder), 0);
        
        const newItem: LegendItem = {
            listName: selectedList,
            value: newItemValue.trim(),
            displayOrder: maxOrder + 1,
            color: '',
            isDefault: false,
            isActive: true,
            probability: isStageList ? newItemProb : 0
        };
        
        onUpdate([...legends, newItem]);
        setNewItemValue('');
        setNewItemProb(0);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
             <DataSourceBanner sheetName={SHEET_NAME_LEGEND} user={user} syncStatus={syncStatus} />
             <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-4">
                 <div className="flex items-center gap-3">
                     <label className="text-xs font-bold text-gray-500 uppercase">Edit List:</label>
                     <select 
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                        value={selectedList}
                        onChange={(e) => setSelectedList(e.target.value)}
                     >
                         {LIST_TYPES.map(type => (
                             <option key={type} value={type}>{type.toUpperCase()}</option>
                         ))}
                     </select>
                 </div>
                 <div className="flex gap-2">
                     <input 
                        value={newItemValue}
                        onChange={e => setNewItemValue(e.target.value)}
                        placeholder="New value..."
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900"
                     />
                     {isStageList && (
                         <input 
                            type="number"
                            value={newItemProb}
                            onChange={e => setNewItemProb(parseInt(e.target.value))}
                            placeholder="Prob %"
                            className="w-20 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 bg-white text-gray-900"
                            min={0} max={100}
                         />
                     )}
                     <Button size="sm" onClick={handleAddItem} icon={<Plus size={14} />}>Add</Button>
                 </div>
             </div>
             
             <table className="w-full text-sm text-left">
                 <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                     <tr>
                         <th className="px-4 py-3 w-10"></th>
                         <th className="px-4 py-3">Value</th>
                         {isStageList && <th className="px-4 py-3 text-center">Prob %</th>}
                         <th className="px-4 py-3 text-center">Default</th>
                         <th className="px-4 py-3 text-center">Active</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                     {currentItems.map((item, idx) => (
                         <tr key={`${item.listName}-${item.value}`} className={`group hover:bg-gray-50 ${!item.isActive ? 'opacity-50' : ''}`}>
                             <td className="px-4 py-2 text-gray-400 cursor-move">
                                 <div className="flex flex-col gap-0.5">
                                    <button onClick={() => handleMove(idx, 'up')} className="hover:text-gray-600 disabled:opacity-30">▲</button>
                                    <button onClick={() => handleMove(idx, 'down')} className="hover:text-gray-600 disabled:opacity-30">▼</button>
                                 </div>
                             </td>
                             <td className="px-4 py-2 font-medium">{item.value}</td>
                             {isStageList && (
                                 <td className="px-4 py-2 text-center">
                                     <input 
                                        type="number"
                                        className="w-16 text-center border-gray-200 rounded text-xs bg-gray-50 focus:bg-white"
                                        value={item.probability || 0}
                                        onChange={(e) => handleProbChange(idx, parseInt(e.target.value))}
                                     />
                                 </td>
                             )}
                             <td className="px-4 py-2 text-center">
                                 <button onClick={() => handleToggleDefault(idx)} className="text-gray-300 hover:text-green-500">
                                     {item.isDefault ? <CheckCircle size={18} className="text-green-500 mx-auto" /> : <div className="w-4 h-4 border border-gray-300 rounded-full mx-auto" />}
                                 </button>
                             </td>
                             <td className="px-4 py-2 text-center">
                                 <input 
                                    type="checkbox" 
                                    checked={item.isActive} 
                                    onChange={() => handleToggleActive(idx)}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                 />
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
        </div>
    );
};

// --- RULES SETTINGS ---

const RulesSettings: React.FC<{ stageRules: StageRule[], onUpdate: (rules: StageRule[]) => void, user: GoogleUser | null, syncStatus: 'success' | 'error' }> = ({ stageRules, onUpdate, user, syncStatus }) => {
    const [newRule, setNewRule] = useState<Partial<StageRule>>({ fromStage: '', toStage: '', trigger: 'manual', autoSetField: '', autoSetValue: '', requiresField: [] });

    const handleAdd = () => {
        if (!newRule.fromStage || !newRule.toStage) return;
        onUpdate([...stageRules, newRule as StageRule]);
        setNewRule({ fromStage: '', toStage: '', trigger: 'manual', autoSetField: '', autoSetValue: '', requiresField: [] });
    };

    const handleDelete = (index: number) => {
        const updated = [...stageRules];
        updated.splice(index, 1);
        onUpdate(updated);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
            <DataSourceBanner sheetName={SHEET_NAME_STAGE_RULES} user={user} syncStatus={syncStatus} />
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800">Stage Transition Logic</h3>
            </div>
            
            <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-6 gap-2 items-end">
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">From</label>
                    <Input value={newRule.fromStage} onChange={e => setNewRule({...newRule, fromStage: e.target.value})} placeholder="Any/Stage" />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">To</label>
                    <Input value={newRule.toStage} onChange={e => setNewRule({...newRule, toStage: e.target.value})} placeholder="Stage" />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">Trigger</label>
                    <Input value={newRule.trigger} onChange={e => setNewRule({...newRule, trigger: e.target.value})} />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">Set Field</label>
                    <Input value={newRule.autoSetField} onChange={e => setNewRule({...newRule, autoSetField: e.target.value})} placeholder="Optional" />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">Set Value</label>
                    <Input value={newRule.autoSetValue} onChange={e => setNewRule({...newRule, autoSetValue: e.target.value})} placeholder="Optional" />
                </div>
                <div className="col-span-1">
                    <Button onClick={handleAdd} disabled={!newRule.fromStage || !newRule.toStage} size="sm" className="w-full">Add Rule</Button>
                </div>
            </div>

            <table className="w-full text-sm">
                <thead className="bg-white text-xs text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                        <th className="px-4 py-2 text-left">Transition</th>
                        <th className="px-4 py-2 text-left">Trigger</th>
                        <th className="px-4 py-2 text-left">Auto-Action</th>
                        <th className="px-4 py-2 text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {stageRules.map((rule, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{rule.fromStage}</span>
                                <span className="mx-2 text-gray-400">→</span>
                                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{rule.toStage}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{rule.trigger}</td>
                            <td className="px-4 py-3 text-gray-700">
                                {rule.autoSetField ? <span className="font-mono text-xs">{rule.autoSetField} = {rule.autoSetValue}</span> : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => handleDelete(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- SLA SETTINGS ---

const SlaSettings: React.FC<{ slaRules: SLARule[], onUpdate: (rules: SLARule[]) => void, user: GoogleUser | null, syncStatus: 'success' | 'error' }> = ({ slaRules, onUpdate, user, syncStatus }) => {
    const [newRule, setNewRule] = useState<Partial<SLARule>>({ ruleName: '', stage: '', condition: 'no_activity', thresholdDays: 3, alertLevel: 'warning', alertAction: '' });

    const handleAdd = () => {
        if (!newRule.ruleName) return;
        onUpdate([...slaRules, newRule as SLARule]);
        setNewRule({ ruleName: '', stage: '', condition: 'no_activity', thresholdDays: 3, alertLevel: 'warning', alertAction: '' });
    };

    const handleDelete = (index: number) => {
        const updated = [...slaRules];
        updated.splice(index, 1);
        onUpdate(updated);
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
            <DataSourceBanner sheetName={SHEET_NAME_SLA_RULES} user={user} syncStatus={syncStatus} />
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-800">SLA Timers (Age Limits)</h3>
            </div>
            
             <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-6 gap-2 items-end">
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">Name</label>
                    <Input value={newRule.ruleName} onChange={e => setNewRule({...newRule, ruleName: e.target.value})} placeholder="Rule Name" />
                </div>
                 <div className="col-span-1">
                    <label className="text-xs text-gray-500">Stage</label>
                    <Input value={newRule.stage} onChange={e => setNewRule({...newRule, stage: e.target.value})} placeholder="Stage/Any" />
                </div>
                 <div className="col-span-1">
                    <label className="text-xs text-gray-500">Days</label>
                    <Input type="number" value={newRule.thresholdDays} onChange={e => setNewRule({...newRule, thresholdDays: parseInt(e.target.value)})} />
                </div>
                 <div className="col-span-1">
                    <label className="text-xs text-gray-500">Alert</label>
                    <Select value={newRule.alertLevel} onChange={e => setNewRule({...newRule, alertLevel: e.target.value})} options={['warning', 'critical']} />
                </div>
                 <div className="col-span-1">
                    <label className="text-xs text-gray-500">Action Msg</label>
                    <Input value={newRule.alertAction} onChange={e => setNewRule({...newRule, alertAction: e.target.value})} placeholder="Display Msg" />
                </div>
                <div className="col-span-1">
                    <Button onClick={handleAdd} disabled={!newRule.ruleName} size="sm" className="w-full">Add</Button>
                </div>
            </div>

            <table className="w-full text-sm">
                <thead className="bg-white text-xs text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Stage</th>
                        <th className="px-4 py-2 text-left">Threshold</th>
                        <th className="px-4 py-2 text-left">Alert</th>
                        <th className="px-4 py-2 text-right"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {slaRules.map((rule, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{rule.ruleName}</td>
                            <td className="px-4 py-3 text-gray-500">{rule.stage}</td>
                            <td className="px-4 py-3">{rule.thresholdDays} days</td>
                            <td className="px-4 py-3">
                                {rule.alertLevel === 'critical' ? '🔴 ' : '🟡 '}
                                {rule.alertAction}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => handleDelete(i)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- AUTO ACTIONS SETTINGS ---

const ActionsSettings: React.FC<{ autoActions: AutoActionRule[], onUpdate: (rules: AutoActionRule[]) => void, user: GoogleUser | null, syncStatus: 'success' | 'error' }> = ({ autoActions, onUpdate, user, syncStatus }) => {
     const [newRule, setNewRule] = useState<Partial<AutoActionRule>>({ triggerStage: '', defaultNextAction: '', defaultDays: 2 });

     const handleAdd = () => {
        if (!newRule.triggerStage) return;
        onUpdate([...autoActions, newRule as AutoActionRule]);
        setNewRule({ triggerStage: '', defaultNextAction: '', defaultDays: 2 });
     };

     const handleDelete = (index: number) => {
        const updated = [...autoActions];
        updated.splice(index, 1);
        onUpdate(updated);
     };

     return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
            <DataSourceBanner sheetName={SHEET_NAME_AUTO_ACTION} user={user} syncStatus={syncStatus} />
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-800">Auto Next Actions</h3>
            </div>
            
            <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-4 gap-2 items-end">
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">Trigger Stage</label>
                    <Input value={newRule.triggerStage} onChange={e => setNewRule({...newRule, triggerStage: e.target.value})} placeholder="Stage Name" />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">Set Action</label>
                    <Input value={newRule.defaultNextAction} onChange={e => setNewRule({...newRule, defaultNextAction: e.target.value})} placeholder="Next Step" />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-gray-500">Due In (Days)</label>
                    <Input type="number" value={newRule.defaultDays} onChange={e => setNewRule({...newRule, defaultDays: parseInt(e.target.value)})} />
                </div>
                <div className="col-span-1">
                    <Button onClick={handleAdd} disabled={!newRule.triggerStage} size="sm" className="w-full">Add</Button>
                </div>
            </div>

            <table className="w-full text-sm">
                <thead className="bg-white text-xs text-gray-500 uppercase border-b border-gray-100">
                    <tr>
                        <th className="px-4 py-2 text-left">Trigger Stage</th>
                        <th className="px-4 py-2 text-left">Set Next Action To</th>
                        <th className="px-4 py-2 text-left">Due In (Days)</th>
                        <th className="px-4 py-2"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {autoActions.map((action, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-blue-600">{action.triggerStage}</td>
                            <td className="px-4 py-3 font-medium">{action.defaultNextAction}</td>
                            <td className="px-4 py-3 text-gray-600">{action.defaultDays} days</td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => handleDelete(i)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
     );
};

// --- TEMPLATES SETTINGS ---

const TemplatesSettings: React.FC<{ 
    templates: MessageTemplate[], 
    onUpdate: (t: MessageTemplate[]) => void, 
    user: GoogleUser | null, 
    syncStatus: 'success' | 'error',
    legends: LegendItem[],
    onUpdateLegends: (l: LegendItem[]) => void
}> = ({ templates, onUpdate, user, syncStatus, legends, onUpdateLegends }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<MessageTemplate>>({});
    
    // Catalog Management State
    const [newCatalogName, setNewCatalogName] = useState('');
    const [newCatalogUrl, setNewCatalogUrl] = useState('');

    // Dynamic Options from Legends
    const stageOptions = useMemo(() => legends.filter(l => l.listName === 'stage' && l.isActive).map(l => l.value), [legends]);
    const categoryOptions = useMemo(() => legends.filter(l => l.listName === 'category' && l.isActive).map(l => l.value), [legends]);
    // Filter out generic picklists, keep specific catalog links
    const catalogLinks = useMemo(() => legends.filter(l => l.listName === 'catalog_link'), [legends]);

    const INFO_LEVELS = ['Basic', 'Detailed', 'Any', 'Intro', 'Follow-up'];

    const VARIABLES = [
        { label: 'Name', val: '{{contact_person}}' },
        { label: 'Company', val: '{{company_name}}' },
        { label: 'Owner', val: '{{yds_poc}}' },
        { label: 'Qty', val: '{{estimated_qty}}' },
        { label: 'Product', val: '{{product_type}}' },
        { label: 'Phone', val: '{{phone}}' },
        { label: 'Category', val: '{{category}}' },
    ];

    const handleEdit = (tpl: MessageTemplate) => {
        setEditingId(tpl.id);
        setEditForm(tpl);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = () => {
        if (!editForm.name || !editForm.body) return;
        
        let newTemplates = [...templates];
        if (editingId === 'new') {
            const newTpl = { ...editForm, id: `tpl_${Date.now()}` } as MessageTemplate;
            newTemplates.push(newTpl);
        } else {
            newTemplates = newTemplates.map(t => t.id === editingId ? { ...t, ...editForm } as MessageTemplate : t);
        }
        
        onUpdate(newTemplates);
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id: string) => {
        if (confirm("Delete this template?")) {
            onUpdate(templates.filter(t => t.id !== id));
        }
    };

    const insertVariable = (val: string) => {
        setEditForm(prev => ({
            ...prev,
            body: (prev.body || '') + val
        }));
    };

    const insertLink = (linkUrl: string) => {
        setEditForm(prev => ({
            ...prev,
            body: (prev.body || '') + ' ' + linkUrl
        }));
    };

    // --- Catalog Management Handlers ---
    const handleAddCatalog = () => {
        if (!newCatalogName || !newCatalogUrl) return;
        const newItem: LegendItem = {
            listName: 'catalog_link',
            value: newCatalogName,
            color: newCatalogUrl, // Storing URL in color field
            displayOrder: catalogLinks.length + 1,
            isDefault: false,
            isActive: true,
            probability: 0
        };
        onUpdateLegends([...legends, newItem]);
        setNewCatalogName('');
        setNewCatalogUrl('');
    };

    const handleDeleteCatalog = (value: string) => {
        if(confirm("Delete this link?")) {
            onUpdateLegends(legends.filter(l => !(l.listName === 'catalog_link' && l.value === value)));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Catalog Manager Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                    <BookOpen size={16} className="text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-800">Manage Catalogs & Links</h3>
                </div>
                <div className="p-4">
                    <div className="flex gap-2 mb-4">
                        <Input 
                            placeholder="Display Name (e.g. 2025 Catalog)" 
                            value={newCatalogName} 
                            onChange={e => setNewCatalogName(e.target.value)} 
                            className="flex-1"
                        />
                        <Input 
                            placeholder="URL (e.g. https://bit.ly/...)" 
                            value={newCatalogUrl} 
                            onChange={e => setNewCatalogUrl(e.target.value)} 
                            className="flex-1"
                        />
                        <Button onClick={handleAddCatalog} disabled={!newCatalogName || !newCatalogUrl} size="sm" icon={<Plus size={14}/>}>Add Link</Button>
                    </div>
                    
                    {catalogLinks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {catalogLinks.map(cat => (
                                <div key={cat.value} className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200 text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Link size={14} className="text-blue-500 shrink-0" />
                                        <span className="font-bold text-gray-700 truncate">{cat.value}</span>
                                        <span className="text-gray-400 text-xs truncate max-w-[150px]">{cat.color}</span>
                                    </div>
                                    <button onClick={() => handleDeleteCatalog(cat.value)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">No global links defined. Add catalogs or pricing sheets here to use them in templates.</p>
                    )}
                </div>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            <DataSourceBanner sheetName={SHEET_NAME_TEMPLATES} user={user} syncStatus={syncStatus} />
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Message Templates</h3>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditingId('new'); setEditForm({ stage: 'Any', category: 'General', infoLevel: 'Any' }); }}>New Template</Button>
            </div>
            
            {editingId && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3 animate-fade-in">
                    <h4 className="font-bold text-blue-800 text-sm">{editingId === 'new' ? 'Create Template' : 'Edit Template'}</h4>
                    <div className="grid grid-cols-2 gap-3">
                         <Input label="Name (Internal)" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                         <Input label="Subject (if Email)" value={editForm.subject || ''} onChange={e => setEditForm({...editForm, subject: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                         <Select 
                            label="Stage" 
                            value={editForm.stage || ''} 
                            onChange={e => setEditForm({...editForm, stage: e.target.value})} 
                            options={['Any', ...stageOptions]}
                         />
                         <Select 
                            label="Category" 
                            value={editForm.category || ''} 
                            onChange={e => setEditForm({...editForm, category: e.target.value})} 
                            options={['Any', ...categoryOptions]}
                         />
                         <Select 
                            label="Info Level" 
                            value={editForm.infoLevel || ''} 
                            onChange={e => setEditForm({...editForm, infoLevel: e.target.value})} 
                            options={INFO_LEVELS}
                         />
                    </div>
                    
                    {/* Variable Toolbar */}
                    <div className="mb-2">
                         <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Message Body</label>
                         
                         <div className="flex flex-wrap gap-2 mb-2 items-center">
                             {/* Vars */}
                             <div className="flex flex-wrap gap-1 border-r border-blue-200 pr-2 mr-2">
                                 <span className="text-[10px] text-gray-400 font-bold self-center mr-1">VARS:</span>
                                 {VARIABLES.map(v => (
                                     <button 
                                        key={v.val} 
                                        onClick={() => insertVariable(v.val)} 
                                        className="text-[10px] bg-white hover:bg-blue-100 border border-gray-200 hover:border-blue-300 rounded px-2 py-0.5 font-mono text-gray-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                                     >
                                         <Tag size={10} className="opacity-50"/> {v.label}
                                     </button>
                                 ))}
                             </div>

                             {/* Links */}
                             <div className="flex flex-wrap gap-1">
                                 <span className="text-[10px] text-gray-400 font-bold self-center mr-1">LINKS:</span>
                                 {catalogLinks.length > 0 ? catalogLinks.map(cat => (
                                     <button 
                                        key={cat.value} 
                                        onClick={() => insertLink(cat.color)} 
                                        className="text-[10px] bg-white hover:bg-green-100 border border-gray-200 hover:border-green-300 rounded px-2 py-0.5 font-bold text-gray-600 hover:text-green-700 transition-colors flex items-center gap-1"
                                        title={cat.color}
                                     >
                                         <Link size={10} className="opacity-50"/> {cat.value}
                                     </button>
                                 )) : (
                                     <span className="text-[10px] text-gray-400 italic">No links defined</span>
                                 )}
                             </div>
                         </div>

                         <Textarea 
                            label="" 
                            value={editForm.body || ''} 
                            onChange={e => setEditForm({...editForm, body: e.target.value})} 
                            rows={4} 
                            className="font-mono text-xs"
                         />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleCancel} size="sm">Cancel</Button>
                        <Button onClick={handleSave} size="sm">Save Template</Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(tpl => (
                    <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-gray-900">{tpl.name}</h4>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{tpl.stage}</span>
                                    <span className="text-xs bg-gray-50 text-gray-700 px-2 py-0.5 rounded-full border border-gray-100">{tpl.category}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(tpl)} className="p-1.5 hover:bg-gray-100 rounded text-blue-600"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(tpl.id)} className="p-1.5 hover:bg-gray-100 rounded text-red-500"><Trash2 size={14} /></button>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2 font-medium">Subject: {tpl.subject}</div>
                        <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 font-mono whitespace-pre-wrap border border-gray-100 line-clamp-3">
                            {tpl.body}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};