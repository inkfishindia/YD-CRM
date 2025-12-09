
import React, { useState, useMemo, useEffect } from 'react';
import { LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate, GoogleUser, Lead, REQUIRED_FIELDS_BY_STAGE, FORBIDDEN_TRANSITIONS, SHEET_IDS, SourceConfig, FieldMapRule } from '../types';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Form';
import { Edit2, Plus, CheckCircle, Trash2, Copy, AlertTriangle, Link, Save, RotateCcw, Cloud, Database, CloudOff, LogIn, Hammer, Loader2, MinusCircle, Table, BookOpen, Info, List, Stethoscope, Wrench, Shield, Zap, LayoutTemplate, Activity, UploadCloud, Tag, GitMerge, ArrowDown, Ban, CheckSquare, Clock, ArrowRight, Users, History, MessageCircle, FileSpreadsheet, Box, Network, ExternalLink, RefreshCw, Import, FileText, Columns, Compass, CheckCircle2, XCircle, Layout, Sun, FileSearch, RefreshCcw, Check, Square, Play, Terminal, Layers } from 'lucide-react';
import { initializeSheetStructure, diagnoseSheetStructure, SchemaReport, populateConfigData, fetchRemoteHeaders, SHEET_NAME_LEADS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY, SHEET_NAME_STAGE_RULES, SHEET_NAME_SLA_RULES, SHEET_NAME_AUTO_ACTION, SHEET_NAME_TEMPLATES, HEADER_LEAD_CSV, HEADER_LEGEND_CSV, HEADER_ACTIVITY_CSV, HEADER_STAGE_RULES_CSV, HEADER_SLA_RULES_CSV, HEADER_AUTO_ACTION_CSV, HEADER_TEMPLATES_CSV, SOURCE_CONFIG, SHEET_NAME_IDENTITY, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_DROPSHIP_FLOWS, SHEET_NAME_STORES, SHEET_NAME_ACCOUNT_MAP, SHEET_NAME_FLOW_HISTORY, HEADER_IDENTITY_CSV, HEADER_LEAD_FLOW_CSV, HEADER_DROPSHIP_FLOW_CSV, HEADER_STORE_CSV, HEADER_ACCOUNT_MAP_CSV, HEADER_FLOW_HISTORY_CSV, analyzeSheetColumns, ColumnMetadata, fetchRemoteSheetNames, SYSTEM_SHEET_NAMES, getSpreadsheetId, SHEET_NAME_INTAKE_SOURCES, SHEET_NAME_INTAKE_MAPPINGS } from '../services/sheetService';
import { IntakeService } from '../services/intakeService';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';

// --- SUB-COMPONENTS ---

const DashboardSettings: React.FC<{ user: GoogleUser | null, syncStatus: 'success' | 'error', leads: Lead[], rulesCount: number }> = ({ user, syncStatus, leads, rulesCount }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">System Status</h3>
            <div className="flex items-center gap-2">
                {syncStatus === 'success' ? <CheckCircle className="text-green-500" size={24}/> : <AlertTriangle className="text-red-500" size={24}/>}
                <span className="text-2xl font-bold text-gray-800">{syncStatus === 'success' ? 'Operational' : 'Sync Error'}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Connected to Google Sheets</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Total Leads</h3>
            <div className="flex items-center gap-2">
                <Users className="text-blue-500" size={24}/>
                <span className="text-2xl font-bold text-gray-800">{leads.length}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">In local cache (Joined)</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Active Rules</h3>
            <div className="flex items-center gap-2">
                <Zap className="text-orange-500" size={24}/>
                <span className="text-2xl font-bold text-gray-800">{rulesCount}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">Automation & Logic</p>
        </div>
    </div>
);

const AppGuide: React.FC = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-8 prose max-w-none animate-fade-in">
        <h3>App Guide</h3>
        <p>This CRM is built on top of Google Sheets using a split-schema architecture.</p>
        <ul>
            <li><strong>Leads (Identity):</strong> Stores core contact info (Name, Phone, Company).</li>
            <li><strong>LEAD_FLOWS (Operational):</strong> Stores transaction info (Stage, Amount, Owner).</li>
        </ul>
        <p>The application joins these tables using <code>lead_id</code> as the primary key.</p>
    </div>
);

const SchemaTable = ({ title, csv, mapping }: { title: string, csv: string, mapping: Record<number, string> }) => {
    const headers = csv.split(',');
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Database size={16} className="text-blue-600"/> {title}
                </h3>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-mono">{headers.length} Columns</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-500 font-bold border-b border-gray-200 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3 w-16 text-center">#</th>
                            <th className="px-6 py-3">Sheet Header</th>
                            <th className="px-6 py-3">System Field</th>
                            <th className="px-6 py-3">Type/Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {headers.map((h, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-2 text-center font-mono text-gray-400 text-xs">{i}</td>
                                <td className="px-6 py-2 font-bold text-gray-800">{h}</td>
                                <td className="px-6 py-2 font-mono text-blue-600 text-xs">{mapping[i] || '-'}</td>
                                <td className="px-6 py-2 text-xs text-gray-500 italic">
                                    {i === 0 ? 'Primary Key' : ''}
                                    {h.includes('date') || h.includes('at') ? 'Date (ISO)' : ''}
                                    {h.includes('id') && i !== 0 ? 'Foreign Key' : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const SchemaSettings: React.FC = () => {
    // Aligned with HEADER_IDENTITY_CSV
    const identityMapping: Record<number, string> = {
        0: 'leadId', 1: 'contactPerson', 2: 'number', 3: 'email', 4: 'companyName',
        5: 'city', 6: 'source', 7: 'category (identity)', 8: 'createdBy', 9: 'tags',
        10: 'identityStatus', 11: 'createdAt', 12: 'leadScore', 13: 'remarks', 14: 'sourceRowId', 15: 'info'
    };

    // Aligned with HEADER_LEAD_FLOW_CSV
    const flowMapping: Record<number, string> = {
        0: 'flowId', 1: 'leadId (FK)', 2: 'originalChannel', 3: 'channel', 4: 'ydsPoc (owner)',
        5: 'status (flow)', 6: 'stage', 7: 'sourceFlowTag', 8: 'createdAt', 9: 'updatedAt',
        10: 'startDate', 11: 'expectedCloseDate', 12: 'wonDate', 13: 'lostDate', 14: 'lostReason',
        15: 'orderInfo (notes)', 16: 'estimatedQty', 17: 'productType', 18: 'printType', 19: 'priority',
        20: 'contactStatus', 21: 'paymentUpdate', 22: 'nextAction', 23: 'nextActionDate',
        24: 'intent', 25: 'category (primary)', 26: 'customerType'
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
                <Info size={20} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold">System Schema Confirmation</p>
                    <p className="mt-1">The application is configured to use the following structure. Please ensure your Google Sheet columns match this order exactly.</p>
                </div>
            </div>
            
            <SchemaTable 
                title="Identity Schema (Leads Sheet)" 
                csv={HEADER_IDENTITY_CSV} 
                mapping={identityMapping} 
            />
            
            <SchemaTable 
                title="Operational Schema (LEAD_FLOWS Sheet)" 
                csv={HEADER_LEAD_FLOW_CSV} 
                mapping={flowMapping} 
            />
        </div>
    );
};

const SheetInspector: React.FC<{ currentId: string }> = ({ currentId }) => {
    const [sheetName, setSheetName] = useState('Leads');
    const [analysis, setAnalysis] = useState<{success: boolean, columns: ColumnMetadata[], error?: string} | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        const res = await analyzeSheetColumns(currentId, sheetName);
        setAnalysis(res);
        setLoading(false);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex gap-4 items-end">
                <Input label="Sheet Name" value={sheetName} onChange={e => setSheetName(e.target.value)} />
                <Button onClick={handleAnalyze} isLoading={loading}>Analyze</Button>
            </div>
            {analysis && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {analysis.error ? (
                        <div className="p-4 text-red-600">{analysis.error}</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                                <tr>
                                    <th className="px-4 py-2">Index</th>
                                    <th className="px-4 py-2">Letter</th>
                                    <th className="px-4 py-2">Header</th>
                                    <th className="px-4 py-2">Format</th>
                                    <th className="px-4 py-2">Validation</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.columns.map(col => (
                                    <tr key={col.index} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-2">{col.index}</td>
                                        <td className="px-4 py-2 font-mono">{col.letter}</td>
                                        <td className="px-4 py-2 font-bold">{col.header}</td>
                                        <td className="px-4 py-2">{col.format}</td>
                                        <td className="px-4 py-2">{col.validation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

const SopVisualizer: React.FC<{ legends: LegendItem[], stageRules: StageRule[], slaRules: SLARule[], autoActions: AutoActionRule[] }> = ({ legends, stageRules, slaRules, autoActions }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800">Workflow Rules</h3>
            <div className="grid gap-4">
                {stageRules.map((rule, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge variant="neutral">{rule.fromStage}</Badge>
                            <ArrowRight size={14} className="text-gray-400"/>
                            <Badge variant="info">{rule.toStage}</Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                            Required: {rule.requiresField.join(', ') || 'None'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DiagnosticsPanel: React.FC<{ leads: Lead[], onInspect?: (lead: Lead) => void }> = ({ leads, onInspect }) => {
    const issues = leads.filter(l => !l.leadId || !l.companyName || !l.status);
    return (
        <div className="animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Data Health</h3>
            {issues.length === 0 ? (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center gap-2">
                    <CheckCircle size={20}/> All leads appear healthy.
                </div>
            ) : (
                <div className="space-y-2">
                    {issues.map(l => (
                        <div key={l.leadId || Math.random()} className="p-3 bg-red-50 border border-red-100 rounded text-red-700 flex justify-between items-center">
                            <span>Issue with lead: {l.companyName || 'Unknown'} (ID: {l.leadId})</span>
                            <Button size="sm" variant="ghost" onClick={() => onInspect?.(l)}>Inspect</Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ConnectionSettings: React.FC<{ currentId: string, onUpdate: (id: string) => void, user: GoogleUser | null, syncStatus: string, onResetLocal: () => void }> = ({ currentId, onUpdate, user, syncStatus, onResetLocal }) => {
    const [id, setId] = useState(currentId);
    return (
        <div className="space-y-6 max-w-xl animate-fade-in">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">Google Sheets Connection</h3>
                <Input label="Spreadsheet ID" value={id} onChange={e => setId(e.target.value)} />
                <div className="mt-4 flex gap-2">
                    <Button onClick={() => onUpdate(id)}>Update Connection</Button>
                    <Button variant="outline" onClick={onResetLocal}>Clear Local Cache</Button>
                </div>
            </div>
        </div>
    );
};

const PicklistsSettings: React.FC<{ legends: LegendItem[], onUpdate: (legends: LegendItem[]) => void, user: any, syncStatus: any }> = ({ legends }) => (
    <div className="animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Picklists (Read Only)</h3>
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-4 text-sm">
            Picklists are managed in the <strong>Legend</strong> tab of your Google Sheet.
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-2 text-left">List Name</th>
                        <th className="px-4 py-2 text-left">Value</th>
                        <th className="px-4 py-2 text-left">Color</th>
                    </tr>
                </thead>
                <tbody>
                    {legends.map((l, i) => (
                        <tr key={i} className="border-b last:border-0">
                            <td className="px-4 py-2 font-bold text-gray-700">{l.listName}</td>
                            <td className="px-4 py-2">{l.value}</td>
                            <td className="px-4 py-2 text-xs font-mono">{l.color}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const AutomationSettings: React.FC<{ stageRules: StageRule[], onUpdateStageRules: any, slaRules: SLARule[], onUpdateSLARules: any, autoActions: AutoActionRule[], onUpdateAutoActions: any, user: any, syncStatus: any }> = ({ stageRules, slaRules, autoActions }) => (
    <div className="space-y-8 animate-fade-in">
        <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Stage Rules</h3>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-4">Manage these in the <strong>Stage_Rules</strong> sheet.</p>
                <div className="space-y-2">
                    {stageRules.map((r, i) => (
                        <div key={i} className="text-xs border-b border-gray-100 pb-2 last:border-0">
                            {r.fromStage} &rarr; {r.toStage} (Requires: {r.requiresField.join(', ')})
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">SLA Rules</h3>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-4">Manage these in the <strong>SLA_Rules</strong> sheet.</p>
                <div className="space-y-2">
                    {slaRules.map((r, i) => (
                        <div key={i} className="text-xs border-b border-gray-100 pb-2 last:border-0">
                            {r.stage}: {r.thresholdHours}h limit ({r.alertLevel})
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const TemplatesSettings: React.FC<{ templates: MessageTemplate[], onUpdate: any, user: any, syncStatus: any, legends: any, onUpdateLegends: any }> = ({ templates }) => (
    <div className="animate-fade-in">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Message Templates</h3>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-4">Manage these in the <strong>Message_Templates</strong> sheet.</p>
            <div className="grid gap-4 md:grid-cols-2">
                {templates.map(t => (
                    <div key={t.id} className="border border-gray-100 rounded p-3 hover:shadow-sm transition-shadow">
                        <div className="font-bold text-sm text-gray-800">{t.name}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{t.body}</div>
                        <div className="mt-2 flex gap-2">
                            <Badge variant="neutral">{t.stage || 'All'}</Badge>
                            <Badge variant="info">{t.category || 'General'}</Badge>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

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
  onRefreshData?: () => void;
  
  // Staging
  onSetImportedLeads: (leads: Lead[]) => void;
  onViewImports: () => void;
  
  // PM Mode
  onEnterPMMode: () => void;
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'guide', label: 'App Guide', icon: Compass },
  { id: 'schema', label: 'Schema & Mappings', icon: FileText },
  { id: 'inspector', label: 'Sheet Inspector', icon: FileSearch },
  // Removed Data Sources as they are hardcoded
  { id: 'sop', label: 'Workflow & Data SOP', icon: GitMerge },
  { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope },
  { id: 'connection', label: 'Connection', icon: Database },
  { id: 'picklists', label: 'Picklists', icon: List },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
] as const;

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  leads = [],
  legends, onUpdateLegends,
  stageRules, onUpdateStageRules,
  slaRules, onUpdateSLARules,
  autoActions, onUpdateAutoActions,
  templates, onUpdateTemplates,
  currentSpreadsheetId, onUpdateSpreadsheetId,
  user, syncStatus, onResetLocalData, onInspectLead,
  onRefreshData,
  onSetImportedLeads, onViewImports,
  onEnterPMMode
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
         <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
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
         
         <div className="p-2 border-t border-gray-100">
            <button 
                onClick={onEnterPMMode}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-3 text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200"
            >
                <Terminal size={16} className="text-slate-500" />
                Control Room
            </button>
         </div>

         <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
             YDS Leads v1.9
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
             {activeTab === 'guide' && (
                 <AppGuide />
             )}
             {activeTab === 'schema' && (
                 <SchemaSettings />
             )}
             {activeTab === 'inspector' && (
                 <SheetInspector currentId={currentSpreadsheetId} />
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
