
import React, { useState, useMemo, useEffect } from 'react';
import { LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate, GoogleUser, Lead, REQUIRED_FIELDS_BY_STAGE, FORBIDDEN_TRANSITIONS, SHEET_IDS } from '../types';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Form';
import { Edit2, Plus, CheckCircle, Trash2, Copy, AlertTriangle, Link, Save, RotateCcw, Cloud, Database, CloudOff, LogIn, Hammer, Loader2, MinusCircle, Table, BookOpen, Info, List, Stethoscope, Wrench, Shield, Zap, LayoutTemplate, Activity, UploadCloud, Tag, GitMerge, ArrowDown, Ban, CheckSquare, Clock, ArrowRight, Users, History, MessageCircle, FileSpreadsheet, Box, Network, ExternalLink, RefreshCw, Import } from 'lucide-react';
import { initializeSheetStructure, diagnoseSheetStructure, SchemaReport, populateConfigData, fetchRemoteHeaders, SHEET_NAME_LEADS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY, SHEET_NAME_STAGE_RULES, SHEET_NAME_SLA_RULES, SHEET_NAME_AUTO_ACTION, SHEET_NAME_TEMPLATES, HEADER_LEAD_CSV, HEADER_LEGEND_CSV, HEADER_ACTIVITY_CSV, HEADER_STAGE_RULES_CSV, HEADER_SLA_RULES_CSV, HEADER_AUTO_ACTION_CSV, HEADER_TEMPLATES_CSV, SOURCE_CONFIG, SHEET_NAME_IDENTITY, SHEET_NAME_FLOW_B2B, SHEET_NAME_FLOW_DROPSHIP, SHEET_NAME_FLOW_HISTORY, fetchLeadsFromSource } from '../services/sheetService';
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
  onRefreshData?: () => void;
  
  // Staging
  onSetImportedLeads: (leads: Lead[]) => void;
  onViewImports: () => void;
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'sources', label: 'Data Sources', icon: Network },
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
  onSetImportedLeads, onViewImports
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
             YDS Leads v1.8
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
             {activeTab === 'sources' && (
                 <SourceIntegrations user={user} onSetImportedLeads={onSetImportedLeads} onViewImports={onViewImports} />
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

const DashboardSettings: React.FC<{ user: GoogleUser | null, syncStatus: 'success' | 'error', leads: Lead[], rulesCount: number }> = ({ user, syncStatus, leads, rulesCount }) => {
    const isHealthy = user && syncStatus === 'success';
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm ${isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {isHealthy ? <CheckCircle size={48} className="text-green-500 mb-4" /> : <AlertTriangle size={48} className="text-red-500 mb-4" />}
                    <h3 className={`text-lg font-bold ${isHealthy ? 'text-green-800' : 'text-red-800'}`}>{isHealthy ? 'System Healthy' : 'Action Required'}</h3>
                    <p className="text-sm text-gray-600 mt-2">{isHealthy ? 'Connected to Google Sheets. Sync active.' : 'Connection to data source is broken or offline.'}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2"><Database size={20} className="text-blue-500"/><span className="font-bold text-gray-700">Data Volume</span></div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{leads.length}</div>
                    <div className="text-xs text-gray-500">Active Leads Loaded</div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2"><Zap size={20} className="text-purple-500"/><span className="font-bold text-gray-700">Automation Logic</span></div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{rulesCount}</div>
                    <div className="text-xs text-gray-500">Active Rules Configured</div>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Info size={18} /> Admin Tips
                </h3>
                <ul className="list-disc pl-5 text-sm text-blue-800 space-y-2">
                    <li>Use the <strong>Data Sources</strong> tab to configure connections to external sheets (TKW, ODC, SLK).</li>
                    <li>Check <strong>Connection</strong> tab to validate that your Google Sheet has all required columns.</li>
                    <li>Manage all business logic (SLA, Auto-Assign) in the <strong>Automation</strong> tab.</li>
                </ul>
            </div>
        </div>
    )
}

const SourceIntegrations: React.FC<{ user: GoogleUser | null, onSetImportedLeads: (leads: Lead[]) => void, onViewImports: () => void }> = ({ user, onSetImportedLeads, onViewImports }) => {
    const sources = Object.entries(SOURCE_CONFIG).map(([key, config]) => ({ key, ...config }));

    const [inspectedHeaders, setInspectedHeaders] = useState<{name: string, headers: string[], error?: string, expected: string[]} | null>(null);
    const [loadingState, setLoadingState] = useState<{action: string, key: string} | null>(null);
    const [importResult, setImportResult] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const handleInspect = async (sourceKey: string, source: any) => {
        setLoadingState({ action: 'inspect', key: sourceKey });
        const sheetName = source.sheetName || 'Sheet1';
        const res = await fetchRemoteHeaders(source.id, sheetName); 
        setLoadingState(null);
        setInspectedHeaders({
            name: source.name,
            headers: res.headers,
            error: res.error,
            expected: source.headers || []
        });
        setImportResult(null);
    };

    const handleImport = async (sourceKey: string) => {
        setLoadingState({ action: 'import', key: sourceKey });
        setImportResult(null);
        
        const res = await fetchLeadsFromSource(sourceKey as any);
        
        setLoadingState(null);
        
        if (res.success && res.leads.length > 0) {
            onSetImportedLeads(res.leads);
            onViewImports(); // Navigate to Imports View
        } else {
            setImportResult({
                message: res.message,
                type: res.success ? 'success' : 'error'
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">External Data Sources</h2>
                    <p className="text-sm text-gray-500">Fetch data from external raw sheets into staging.</p>
                </div>
                {!user && (
                    <div className="bg-yellow-50 text-yellow-800 px-3 py-1 rounded text-xs font-bold border border-yellow-200 flex items-center gap-2">
                        <AlertTriangle size={14} /> Login Required
                    </div>
                )}
            </div>

            {importResult && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${importResult.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {importResult.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                    <div className="font-medium text-sm">{importResult.message}</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sources.map(src => (
                    <div key={src.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <FileSpreadsheet size={16} className="text-green-600"/> {src.name}
                            </h3>
                            <a href={`https://docs.google.com/spreadsheets/d/${src.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Open Sheet">
                                <ExternalLink size={14} />
                            </a>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 font-mono bg-gray-50 p-1.5 rounded truncate" title={src.id}>{src.id}</p>
                        
                        <div className="mt-auto space-y-2">
                             <Button 
                                variant="primary" 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleImport(src.key)}
                                disabled={!user || !!loadingState}
                                isLoading={loadingState?.key === src.key && loadingState?.action === 'import'}
                                icon={<Import size={14}/>}
                            >
                                Fetch Leads
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="w-full"
                                onClick={() => handleInspect(src.key, src)}
                                disabled={!user || !!loadingState}
                                isLoading={loadingState?.key === src.key && loadingState?.action === 'inspect'}
                            >
                                Inspect
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {inspectedHeaders && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 animate-slide-in-right">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Stethoscope size={18} /> Header Inspection: {inspectedHeaders.name}
                    </h3>
                    
                    {inspectedHeaders.error ? (
                        <div className="text-red-600 bg-red-50 p-3 rounded text-sm">{inspectedHeaders.error}</div>
                    ) : (
                        <div className="space-y-3">
                             <p className="text-xs text-gray-500">Columns found in remote sheet:</p>
                             <div className="flex gap-2 flex-wrap">
                                 {inspectedHeaders.headers.map(h => {
                                     const isExpected = inspectedHeaders.expected.map(e => e.toLowerCase()).includes(h.toLowerCase());
                                     return (
                                         <span key={h} className={`text-xs px-2 py-1 rounded border ${isExpected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                             {h}
                                         </span>
                                     )
                                 })}
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const SopVisualizer: React.FC<{ legends: LegendItem[], stageRules: StageRule[], slaRules: SLARule[], autoActions: AutoActionRule[] }> = ({ legends, stageRules, slaRules, autoActions }) => {
    const stages = legends.filter(l => l.listName === 'stage').sort((a,b) => a.displayOrder - b.displayOrder);

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900">Workflow SOP</h2>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Pipeline Stages & Requirements</h3>
                <div className="space-y-4">
                    {stages.map((stage, idx) => {
                        const nextStage = stages[idx + 1]?.value;
                        const forbidden = FORBIDDEN_TRANSITIONS[stage.value] || [];
                        const reqs = REQUIRED_FIELDS_BY_STAGE[stage.value] || [];
                        const sla = slaRules.find(r => r.stage === stage.value);
                        const auto = autoActions.find(r => r.triggerStage === stage.value);

                        return (
                            <div key={stage.value} className="relative pl-8 border-l-2 border-blue-100 pb-6 last:pb-0 last:border-0">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900">{stage.value}</span>
                                        {sla && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1"><Clock size={10}/> SLA: {sla.thresholdDays * 24}h</span>}
                                        {auto && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100 flex items-center gap-1"><Zap size={10}/> Auto: {auto.defaultNextAction}</span>}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Entry Requirements</p>
                                            {reqs.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {reqs.map(r => <span key={r} className="text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-700">{r}</span>)}
                                                </div>
                                            ) : <span className="text-xs text-gray-400">None</span>}
                                        </div>
                                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                            <p className="text-xs font-bold text-red-400 uppercase mb-1">Forbidden Transitions</p>
                                            {forbidden.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {forbidden.map(f => <span key={f} className="text-xs bg-white border border-red-100 px-1.5 py-0.5 rounded text-red-700 decoration-line-through decoration-red-500">→ {f}</span>)}
                                                </div>
                                            ) : <span className="text-xs text-gray-400">None</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const DiagnosticsPanel: React.FC<{ leads: Lead[], onInspect?: (lead: Lead) => void }> = ({ leads, onInspect }) => {
    const [report, setReport] = useState<SchemaReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [fixLoading, setFixLoading] = useState(false);

    const runDiagnostics = async () => {
        setLoading(true);
        try {
            const res = await diagnoseSheetStructure();
            setReport(res);
        } catch (e) {
            alert("Failed to run diagnostics. Check console.");
        }
        setLoading(false);
    };

    const runFix = async () => {
        setFixLoading(true);
        await initializeSheetStructure();
        await populateConfigData();
        setFixLoading(false);
        runDiagnostics();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">System Diagnostics</h2>
                <div className="flex gap-2">
                     <Button onClick={runFix} variant="secondary" isLoading={fixLoading} icon={<Hammer size={16}/>}>Attempt Auto-Fix</Button>
                     <Button onClick={runDiagnostics} variant="primary" isLoading={loading} icon={<RefreshCw size={16}/>}>Run Scan</Button>
                </div>
            </div>

            <div className="grid gap-4">
                {report.map((r, i) => (
                    <div key={i} className={`p-4 rounded-xl border flex items-center justify-between ${r.status === 'ok' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-center gap-3">
                            {r.status === 'ok' ? <CheckCircle className="text-green-600"/> : <AlertTriangle className="text-red-600"/>}
                            <div>
                                <h4 className={`font-bold ${r.status === 'ok' ? 'text-green-800' : 'text-red-800'}`}>{r.sheetName}</h4>
                                <p className="text-xs opacity-80">{r.status === 'ok' ? 'Sheet structure is valid.' : r.status === 'missing_sheet' ? 'Sheet is missing.' : `Missing columns: ${r.missingColumns.join(', ')}`}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {report.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                        Click "Run Scan" to check Google Sheet integrity.
                    </div>
                )}
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4">Raw Data Inspector (Last 3 Leads)</h3>
                <div className="space-y-2">
                    {leads.slice(0,3).map(l => (
                         <div key={l.leadId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                             <span className="font-mono text-xs">{l.leadId} - {l.companyName}</span>
                             <Button size="sm" variant="secondary" onClick={() => onInspect?.(l)}>View JSON</Button>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ConnectionSettings: React.FC<{ currentId: string, onUpdate: (id: string) => void, user: GoogleUser | null, syncStatus: string, onResetLocal: () => void }> = ({ currentId, onUpdate, user, syncStatus, onResetLocal }) => {
    const [val, setVal] = useState(currentId);

    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-xl font-bold text-gray-900">Connection Settings</h2>
             
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
                 <div className="flex items-center gap-4 mb-6">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center ${syncStatus === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                         {syncStatus === 'success' ? <Cloud size={24}/> : <CloudOff size={24}/>}
                     </div>
                     <div>
                         <h3 className="font-bold text-gray-800">Google Sheet Connection</h3>
                         <p className="text-sm text-gray-500">{syncStatus === 'success' ? 'Connected and syncing.' : 'Disconnected or offline.'}</p>
                     </div>
                 </div>

                 <div className="space-y-4">
                     <Input 
                        label="Spreadsheet ID or URL" 
                        value={val} 
                        onChange={(e) => setVal(e.target.value)}
                        placeholder="1xfGsXrTU2..."
                     />
                     <div className="flex justify-end gap-2">
                         <a href={`https://docs.google.com/spreadsheets/d/${currentId}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 self-center mr-auto">
                             <ExternalLink size={14}/> Open Sheet
                         </a>
                         <Button onClick={() => onUpdate(val)} disabled={val === currentId}>Update ID</Button>
                     </div>
                 </div>
             </div>

             <div className="bg-red-50 p-6 rounded-xl border border-red-100 max-w-2xl">
                 <h3 className="font-bold text-red-800 mb-2">Danger Zone</h3>
                 <p className="text-sm text-red-700 mb-4">Resetting local data will clear the cache and reload from Google Sheets. Use this if the app feels out of sync.</p>
                 <Button variant="danger" onClick={onResetLocal} icon={<Trash2 size={16}/>}>Reset Local Cache</Button>
             </div>
        </div>
    );
};

const PicklistsSettings: React.FC<{ legends: LegendItem[], onUpdate: (items: LegendItem[]) => void, user: GoogleUser | null, syncStatus: string }> = ({ legends, onUpdate, user }) => {
    const grouped = useMemo(() => {
        const g: Record<string, LegendItem[]> = {};
        legends.forEach(l => {
            if (!g[l.listName]) g[l.listName] = [];
            g[l.listName].push(l);
        });
        return g;
    }, [legends]);

    const [editingList, setEditingList] = useState<string | null>(null);
    const [items, setItems] = useState<LegendItem[]>([]);

    useEffect(() => {
        if (editingList) {
            setItems(grouped[editingList] || []);
        }
    }, [editingList, grouped]);

    const handleSave = () => {
        if (!editingList) return;
        const otherLegends = legends.filter(l => l.listName !== editingList);
        const newLegends = [...otherLegends, ...items];
        onUpdate(newLegends);
        setEditingList(null);
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { listName: editingList!, value: 'New Item', displayOrder: prev.length + 1, color: '', isDefault: false, isActive: true, probability: 0 }
        ]);
    };

    const handleItemChange = (idx: number, field: keyof LegendItem, val: any) => {
        const next = [...items];
        next[idx] = { ...next[idx], [field]: val };
        setItems(next);
    };

    const handleDelete = (idx: number) => {
        const next = items.filter((_, i) => i !== idx);
        setItems(next);
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-xl font-bold text-gray-900">Picklist Editor</h2>
             
             {editingList ? (
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                     <div className="flex justify-between items-center mb-6">
                         <h3 className="font-bold text-gray-800 flex items-center gap-2">
                             <Edit2 size={16} /> Editing: <span className="text-blue-600 uppercase">{editingList.replace('_', ' ')}</span>
                         </h3>
                         <div className="flex gap-2">
                             <Button variant="secondary" onClick={() => setEditingList(null)}>Cancel</Button>
                             <Button onClick={handleSave} icon={<Save size={16}/>}>Save Changes</Button>
                         </div>
                     </div>
                     
                     <div className="space-y-2">
                         <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase px-2">
                             <div className="col-span-1">Order</div>
                             <div className="col-span-4">Value / Label</div>
                             <div className="col-span-3">Color Class (Tailwind)</div>
                             <div className="col-span-2 text-center">Active</div>
                             <div className="col-span-2 text-right">Actions</div>
                         </div>
                         {items.sort((a,b) => a.displayOrder - b.displayOrder).map((item, idx) => (
                             <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                 <div className="col-span-1">
                                     <input type="number" className="w-full text-xs bg-white border border-gray-300 rounded px-1 py-1" value={item.displayOrder} onChange={(e) => handleItemChange(idx, 'displayOrder', parseInt(e.target.value))} />
                                 </div>
                                 <div className="col-span-4">
                                     <input type="text" className="w-full text-sm bg-white border border-gray-300 rounded px-2 py-1 font-medium" value={item.value} onChange={(e) => handleItemChange(idx, 'value', e.target.value)} />
                                 </div>
                                 <div className="col-span-3">
                                     <input type="text" className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 text-gray-500" value={item.color} onChange={(e) => handleItemChange(idx, 'color', e.target.value)} placeholder="e.g. bg-red-100" />
                                 </div>
                                 <div className="col-span-2 flex justify-center">
                                     <input type="checkbox" checked={item.isActive} onChange={(e) => handleItemChange(idx, 'isActive', e.target.checked)} className="rounded text-blue-600 w-4 h-4"/>
                                 </div>
                                 <div className="col-span-2 flex justify-end">
                                     <button onClick={() => handleDelete(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                                 </div>
                             </div>
                         ))}
                     </div>
                     <Button size="sm" variant="outline" className="mt-4 w-full" onClick={handleAddItem} icon={<Plus size={14}/>}>Add Item</Button>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {Object.keys(grouped).map(key => (
                         <div key={key} onClick={() => setEditingList(key)} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group">
                             <div className="flex justify-between items-center mb-2">
                                 <h3 className="font-bold text-gray-700 uppercase text-xs">{key.replace('_list', '').replace(/_/g, ' ')}</h3>
                                 <Edit2 size={14} className="text-gray-300 group-hover:text-blue-500" />
                             </div>
                             <div className="flex flex-wrap gap-1">
                                 {grouped[key].slice(0, 4).map(i => (
                                     <span key={i.value} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{i.value}</span>
                                 ))}
                                 {grouped[key].length > 4 && <span className="text-[10px] text-gray-400">+{grouped[key].length - 4} more</span>}
                             </div>
                         </div>
                     ))}
                 </div>
             )}
        </div>
    );
};

const AutomationSettings: React.FC<{ stageRules: StageRule[], onUpdateStageRules: any, slaRules: SLARule[], onUpdateSLARules: any, autoActions: AutoActionRule[], onUpdateAutoActions: any, user: any, syncStatus: any }> = ({ stageRules, onUpdateStageRules, slaRules, onUpdateSLARules, autoActions, onUpdateAutoActions }) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900">Automation Logic</h2>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-500"/> Auto Next Actions</h3>
                <div className="space-y-2">
                    {autoActions.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm">
                            <span className="font-bold text-gray-700 w-32">{rule.triggerStage}</span>
                            <ArrowRight size={14} className="text-gray-400"/>
                            <span className="font-bold text-blue-600 flex-1">{rule.defaultNextAction}</span>
                            <span className="text-gray-500 text-xs">Due in {rule.defaultDays} days</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Shield size={18} className="text-red-500"/> Service Level Agreements (SLA)</h3>
                <div className="space-y-2">
                    {slaRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100 text-sm">
                            <span className="font-bold text-gray-700 w-32">{rule.stage}</span>
                            <ArrowRight size={14} className="text-gray-400"/>
                            <span className="font-bold text-red-600 flex-1">{rule.thresholdDays * 24} Hours</span>
                            <span className="text-gray-500 text-xs">Alert: {rule.alertLevel}</span>
                        </div>
                    ))}
                </div>
            </div>
            
             <p className="text-xs text-gray-400 italic text-center">
                * To edit rules, please modify the 'Stage Rules', 'SLA Rules', or 'Auto Next Action' sheets in Google Sheets directly.
            </p>
        </div>
    );
};

const TemplatesSettings: React.FC<{ templates: MessageTemplate[], onUpdate: any, user: any, syncStatus: any, legends: any, onUpdateLegends: any }> = ({ templates, onUpdate }) => {
    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-gray-900">Message Templates</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {templates.map(tpl => (
                     <div key={tpl.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                 <h3 className="font-bold text-gray-800">{tpl.name}</h3>
                                 <div className="flex gap-1 mt-1">
                                     <Badge variant="neutral">{tpl.stage || 'All'}</Badge>
                                     <Badge variant="info">{tpl.category || 'General'}</Badge>
                                 </div>
                             </div>
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button size="icon" variant="ghost"><Edit2 size={14}/></Button>
                             </div>
                         </div>
                         <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-3">
                             {tpl.body}
                         </p>
                     </div>
                 ))}
             </div>
             <p className="text-xs text-gray-400 italic text-center mt-4">
                * Edit templates in the 'Message Templates' sheet to sync changes.
            </p>
        </div>
    );
};
