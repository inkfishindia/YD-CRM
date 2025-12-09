
import React, { useState, useMemo, useEffect } from 'react';
import { LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate, GoogleUser, Lead, REQUIRED_FIELDS_BY_STAGE, FORBIDDEN_TRANSITIONS, SHEET_IDS, SourceConfig, FieldMapRule } from '../types';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Form';
import { Edit2, Plus, CheckCircle, Trash2, Copy, AlertTriangle, Link, Save, RotateCcw, Cloud, Database, CloudOff, LogIn, Hammer, Loader2, MinusCircle, Table, BookOpen, Info, List, Stethoscope, Wrench, Shield, Zap, LayoutTemplate, Activity, UploadCloud, Tag, GitMerge, ArrowDown, Ban, CheckSquare, Clock, ArrowRight, Users, History, MessageCircle, FileSpreadsheet, Box, Network, ExternalLink, RefreshCw, Import, FileText, Columns, Compass, CheckCircle2, XCircle, Layout, Sun, FileSearch, RefreshCcw, Check, Square, Play, Terminal, Layers } from 'lucide-react';
import { initializeSheetStructure, diagnoseSheetStructure, SchemaReport, populateConfigData, fetchRemoteHeaders, SHEET_NAME_LEADS, SHEET_NAME_LEGEND, SHEET_NAME_ACTIVITY, SHEET_NAME_STAGE_RULES, SHEET_NAME_SLA_RULES, SHEET_NAME_AUTO_ACTION, SHEET_NAME_TEMPLATES, HEADER_LEAD_CSV, HEADER_LEGEND_CSV, HEADER_ACTIVITY_CSV, HEADER_STAGE_RULES_CSV, HEADER_SLA_RULES_CSV, HEADER_AUTO_ACTION_CSV, HEADER_TEMPLATES_CSV, SOURCE_CONFIG, SHEET_NAME_IDENTITY, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_DROPSHIP_FLOWS, SHEET_NAME_STORES, SHEET_NAME_ACCOUNT_MAP, SHEET_NAME_FLOW_HISTORY, HEADER_IDENTITY_CSV, HEADER_LEAD_FLOW_CSV, HEADER_DROPSHIP_FLOW_CSV, HEADER_STORE_CSV, HEADER_ACCOUNT_MAP_CSV, HEADER_FLOW_HISTORY_CSV, fetchLeadsFromSource, analyzeSheetColumns, ColumnMetadata, fetchRemoteSheetNames, SYSTEM_SHEET_NAMES, getSpreadsheetId, fetchIntakeConfig, saveFieldMappings } from '../services/sheetService';
import { IntakeService } from '../services/intakeService';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { MappingEditorModal } from './MappingEditorModal';

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
            <p className="text-xs text-gray-400 mt-2">In local cache</p>
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
            <li><strong>Flows (Operational):</strong> Stores transaction info (Stage, Amount, Owner).</li>
        </ul>
        <p>Use the tabs on the left to configure data sources, automation rules, and connection settings.</p>
    </div>
);

const SchemaSettings: React.FC = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-800">Identity Schema (Leads)</h3>
            </div>
            <div className="p-6 overflow-x-auto">
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                    {HEADER_IDENTITY_CSV}
                </pre>
            </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-800">Flow Schema (Lead_Flows)</h3>
            </div>
            <div className="p-6 overflow-x-auto">
                <pre className="text-xs bg-gray-900 text-blue-400 p-4 rounded-lg overflow-x-auto">
                    {HEADER_LEAD_FLOW_CSV}
                </pre>
            </div>
        </div>
    </div>
);

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

const SourceIntegrations: React.FC<{ user: GoogleUser | null, onSetImportedLeads: (leads: Lead[]) => void, onViewImports: () => void }> = ({ user, onSetImportedLeads, onViewImports }) => {
    // 1. Load Dynamic Sources from Sheet
    const [dynamicSources, setDynamicSources] = useState<SourceConfig[]>([]);
    const [fieldMaps, setFieldMaps] = useState<FieldMapRule[]>([]);
    const [loadingConfig, setLoadingConfig] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoadingConfig(true);
            try {
                const res = await fetchIntakeConfig();
                if (res.success) {
                    setDynamicSources(res.sources);
                    setFieldMaps(res.fieldMaps);
                }
            } catch (e) {
                console.error("Failed to load source config", e);
            }
            setLoadingConfig(false);
        };
        load();
    }, []);

    // 2. Fallback if no dynamic sources found
    const staticSources = Object.entries(SOURCE_CONFIG).map(([key, config]) => ({ key, name: key, ...config, headers: [] as string[] }));
    
    // Normalize for display
    const displaySources = dynamicSources.length > 0 
        ? dynamicSources.map(s => ({ key: s.layer, name: s.layer, id: s.sheetId, sheetName: s.tab, headers: [] as string[] })) 
        : staticSources;

    const [inspectedHeaders, setInspectedHeaders] = useState<{name: string, headers: string[], error?: string, expected: string[], currentTab: string} | null>(null);
    const [inspectedTabs, setInspectedTabs] = useState<string[]>([]);
    const [loadingState, setLoadingState] = useState<{action: string, key: string} | null>(null);
    const [importResult, setImportResult] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [editorOpen, setEditorOpen] = useState<{ isOpen: boolean, source: any }>({ isOpen: false, source: null });

    const handleInspect = async (sourceKey: string, source: any) => {
        setLoadingState({ action: 'inspect', key: sourceKey });
        const sheetName = source.sheetName || 'Sheet1';
        
        try {
            const [headerRes, tabRes] = await Promise.all([
                fetchRemoteHeaders(source.id, sheetName),
                fetchRemoteSheetNames(source.id)
            ]);

            setInspectedHeaders({
                name: source.name,
                headers: headerRes.headers || [],
                error: headerRes.error,
                expected: source.headers || [],
                currentTab: sheetName
            });
            setInspectedTabs(tabRes.sheetNames || []);
            setImportResult(null);
        } catch (e: any) {
            setImportResult({ message: `Inspection Failed: ${e.message}`, type: 'error' });
        } finally {
            setLoadingState(null);
        }
    };

    const handleImport = async (sourceKey: string) => {
        setLoadingState({ action: 'import', key: sourceKey });
        setImportResult(null);
        
        // Use IntakeService for consistent parsing logic
        const scanRes = await IntakeService.scanSources();
        // Filter for specific source
        const relevantRows = scanRes.rows.filter(r => r.sourceLayer === sourceKey);
        
        // Convert IntakeRow to Lead to match interface expected by imports view
        // Note: fetchLeadsFromSource usually returns Lead[] directly, but using IntakeService gives IntakeRows.
        // We will transform them or use the simpler fetchLeadsFromSource if it was updated.
        // Let's use fetchLeadsFromSource which we updated in sheetService to be basic but functional.
        // Or better, use IntakeService logic if we want robust field mapping.
        
        // Since we are inside SourceIntegrations which feeds into ImportsView (staging), 
        // passing fully parsed leads is better.
        
        // Let's try the fetchLeadsFromSource wrapper we updated in sheetService.
        const res = await fetchLeadsFromSource(sourceKey as any);
        
        setLoadingState(null);
        
        if (res.success && res.leads.length > 0) {
            onSetImportedLeads(res.leads);
            onViewImports(); // Navigate to Imports View
        } else {
            setImportResult({
                message: res.message || "No new leads found.",
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

            {loadingConfig && <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Loading configurations from Sheet...</div>}

            {importResult && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${importResult.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {importResult.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                    <div className="font-medium text-sm">{importResult.message}</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {displaySources.map(src => (
                    <div key={src.id + src.sheetName} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <FileSpreadsheet size={16} className="text-green-600"/> {src.name}
                            </h3>
                            <div className="flex gap-1">
                                <button onClick={() => setEditorOpen({ isOpen: true, source: { layer: src.name, ...src } })} className="p-1 text-gray-400 hover:text-blue-600" title="Edit Mapping">
                                    <Edit2 size={14}/>
                                </button>
                                <a href={`https://docs.google.com/spreadsheets/d/${src.id}`} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-blue-600" title="Open Sheet">
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 font-mono bg-gray-50 p-1.5 rounded truncate" title={src.id}>{src.id}</p>
                        
                        <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <Table size={10}/> Tab: <span className="font-medium text-gray-700">{src.sheetName}</span>
                        </div>

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
                                Inspect Headers
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {dynamicSources.length === 0 && !loadingConfig && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                    <p className="font-bold flex items-center gap-2"><Info size={16}/> Using Default System Sources</p>
                    <p className="mt-1">
                        To add custom sources, add rows to the <strong>Sources</strong> tab in your Google Sheet.
                        <br/>Format: Name | Spreadsheet ID | Tab Name | Type | Tags
                    </p>
                </div>
            )}

            {inspectedHeaders && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 animate-slide-in-right">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Stethoscope size={18} /> Header Inspection: {inspectedHeaders.name}
                    </h3>
                    
                    {inspectedHeaders.error ? (
                        <div className="text-red-600 bg-red-50 p-3 rounded text-sm">{inspectedHeaders.error}</div>
                    ) : (
                        <div className="space-y-6">
                             {/* Tabs Section */}
                             <div>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                     <Layers size={12}/> Available Sheets (Tabs)
                                 </p>
                                 <div className="flex flex-wrap gap-2">
                                     {inspectedTabs.map(tab => (
                                         <span 
                                            key={tab} 
                                            className={`text-xs px-2 py-1.5 rounded border flex items-center gap-1 ${
                                                tab === inspectedHeaders.currentTab 
                                                ? 'bg-blue-100 text-blue-800 border-blue-200 font-bold' 
                                                : 'bg-white text-gray-600 border-gray-200'
                                            }`}
                                         >
                                             {tab === inspectedHeaders.currentTab && <CheckCircle size={10} />}
                                             {tab}
                                         </span>
                                     ))}
                                     {inspectedTabs.length === 0 && <span className="text-xs text-gray-400 italic">No tabs found</span>}
                                 </div>
                             </div>

                             {/* Headers Section */}
                             <div>
                                 <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                     <Table size={12}/> Actual Headers in '{inspectedHeaders.currentTab}'
                                 </p>
                                 <div className="flex gap-2 flex-wrap">
                                     {inspectedHeaders.headers.map(h => {
                                         const isExpected = inspectedHeaders.expected.map(e => e.toLowerCase()).includes(h.toLowerCase());
                                         return (
                                             <span key={h} className={`text-xs px-2 py-1 rounded border ${isExpected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                 {h}
                                             </span>
                                         )
                                     })}
                                     {inspectedHeaders.headers.length === 0 && <span className="text-xs text-gray-400 italic">Empty or unreadable row</span>}
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {editorOpen.isOpen && (
                <MappingEditorModal 
                    isOpen={editorOpen.isOpen} 
                    onClose={() => setEditorOpen({ isOpen: false, source: null })} 
                    source={editorOpen.source}
                    currentRules={fieldMaps.filter(f => f.sourceLayer === editorOpen.source.name)}
                />
            )}
        </div>
    );
};

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
