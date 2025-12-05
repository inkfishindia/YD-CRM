
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { FileSpreadsheet, ExternalLink, Import, Stethoscope, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Save, Trash2, XCircle, Loader2, Play, CheckSquare, Square, Filter, User, Phone, Mail, MapPin, ShoppingBag, MessageSquare, Building2, UserPlus, Layers } from 'lucide-react';
import { SOURCE_CONFIG, fetchLeadsFromSource, fetchRemoteHeaders, addLead } from '../services/sheetService';
import { Lead, GoogleUser } from '../types';

interface FetchLeadsViewProps {
  user: GoogleUser | null;
  onSetImportedLeads: (leads: Lead[]) => void;
  onViewImports: () => void;
}

// Local validation helper
const validateLead = (lead: Lead) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!lead.companyName) errors.push("Company Name is missing");
    if (!lead.contactPerson) warnings.push("Contact Person is missing");
    if (!lead.number && !lead.email) warnings.push("No contact details");

    return { isValid: errors.length === 0, errors, warnings };
};

// Styling helper for inputs
const getInputClass = (val: string | number | undefined, required = false, warning = false) => {
    if (!val && required) return "bg-red-50 border-red-300 focus:border-red-500 focus:ring-red-200 placeholder-red-400";
    if (!val && warning) return "bg-yellow-50 border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200 placeholder-yellow-500";
    // Filled State: Gray background to signify 'done' or 'existing data'
    if (val) return "bg-gray-100 border-gray-200 text-gray-800 font-semibold focus:bg-white focus:border-blue-500 transition-colors shadow-none";
    // Empty State: White background to signify 'editable' or 'needs input'
    return "bg-white border-gray-300 focus:border-blue-500 shadow-sm text-gray-600";
};

// --- Sub-component: Expandable Result Card ---
const LeadResultCard: React.FC<{
  lead: Lead;
  isSelected: boolean;
  onToggle: () => void;
  onUpdate: (lead: Lead) => void;
  onDiscard: () => void;
  onImport: () => void;
  isSaving: boolean;
}> = ({ lead, isSelected, onToggle, onUpdate, onDiscard, onImport, isSaving }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isValid, warnings } = validateLead(lead);

  return (
    <div className={`bg-white border rounded-lg transition-all ${isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-50 z-10' : 'border-gray-200 shadow-sm hover:shadow-md'} mb-3 relative group`}>
        {/* Card Header / Summary */}
        <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
             <div onClick={e => e.stopPropagation()} className="shrink-0 pt-1">
                <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={onToggle} 
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer" 
                />
             </div>
             
             <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2">
                     <h4 className={`text-sm font-bold truncate ${!lead.companyName ? 'text-red-500 italic' : 'text-gray-900'}`}>
                         {lead.companyName || 'Missing Company Name'}
                     </h4>
                     {/* Status Badge */}
                     <div className="shrink-0">
                        {!isValid ? <Badge variant="danger">Invalid</Badge> : warnings.length > 0 ? <Badge variant="warning">Check</Badge> : <Badge variant="success">Ready</Badge>}
                     </div>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                     <span className="truncate max-w-[150px] font-medium">{lead.contactPerson || 'No Contact Person'}</span>
                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                     <span className="truncate">{lead.city || 'No City'}</span>
                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                     <span className="font-mono text-gray-400">Qty: {lead.estimatedQty || 0}</span>
                 </div>
             </div>
             
             <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                 {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
             </div>
        </div>

        {/* Expanded Form Area */}
        {isExpanded && (
            <div className="px-4 pb-4 pt-4 border-t border-gray-100 mt-1 cursor-default bg-gray-50/30 rounded-b-lg" onClick={e => e.stopPropagation()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                     
                     <div className="col-span-full sm:col-span-1">
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                             <Building2 size={12}/> Company Name <span className="text-red-500">*</span>
                         </label>
                         <input 
                            className={`w-full text-xs rounded px-2.5 py-2 outline-none border focus:ring-2 ${getInputClass(lead.companyName, true)}`}
                            value={lead.companyName || ''} 
                            onChange={e => onUpdate({...lead, companyName: e.target.value})}
                            placeholder="Required Field"
                         />
                     </div>
                     
                     <div>
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <User size={12}/> Contact Person
                         </label>
                         <input 
                            className={`w-full text-xs rounded px-2.5 py-2 outline-none border focus:ring-2 ${getInputClass(lead.contactPerson, false, true)}`}
                            value={lead.contactPerson || ''} 
                            onChange={e => onUpdate({...lead, contactPerson: e.target.value})}
                            placeholder="Missing Contact Name"
                         />
                     </div>

                     <div>
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <Phone size={12}/> Phone
                         </label>
                         <input 
                            className={`w-full text-xs rounded px-2.5 py-2 outline-none border focus:ring-2 ${getInputClass(lead.number, false, !lead.email)}`}
                            value={lead.number || ''} 
                            onChange={e => onUpdate({...lead, number: e.target.value})}
                            placeholder={!lead.email ? "Phone or Email Required" : "Phone"}
                         />
                     </div>

                     <div>
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <Mail size={12}/> Email
                         </label>
                         <input 
                            className={`w-full text-xs rounded px-2.5 py-2 outline-none border focus:ring-2 ${getInputClass(lead.email, false, !lead.number)}`}
                            value={lead.email || ''} 
                            onChange={e => onUpdate({...lead, email: e.target.value})}
                            placeholder={!lead.number ? "Phone or Email Required" : "Email"}
                         />
                     </div>

                     <div>
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <MapPin size={12}/> City
                         </label>
                         <input 
                            className={`w-full text-xs rounded px-2.5 py-2 outline-none border focus:ring-2 ${getInputClass(lead.city)}`}
                            value={lead.city || ''} 
                            onChange={e => onUpdate({...lead, city: e.target.value})}
                            placeholder="City / Location"
                         />
                     </div>

                     <div>
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <ShoppingBag size={12}/> Est. Qty
                         </label>
                         <input 
                            type="number"
                            className={`w-full text-xs rounded px-2.5 py-2 outline-none border focus:ring-2 ${getInputClass(lead.estimatedQty)}`}
                            value={lead.estimatedQty || ''} 
                            onChange={e => onUpdate({...lead, estimatedQty: parseInt(e.target.value) || 0})}
                            placeholder="0"
                         />
                     </div>

                     <div className="col-span-full">
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <MessageSquare size={12}/> Notes / Remarks
                         </label>
                         <input 
                            className={`w-full text-xs rounded px-2.5 py-2 outline-none border focus:ring-2 ${getInputClass(lead.remarks)}`}
                            value={lead.remarks || ''} 
                            onChange={e => onUpdate({...lead, remarks: e.target.value})}
                            placeholder="Add notes..."
                         />
                     </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                     <div className="flex gap-2 text-xs">
                         {warnings.length > 0 && <span className="text-yellow-600 flex items-center gap-1"><AlertTriangle size={12}/> {warnings[0]}</span>}
                     </div>
                     <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 h-8" onClick={onDiscard} icon={<Trash2 size={14}/>}>Discard</Button>
                        <Button size="sm" variant="primary" disabled={!isValid || isSaving} onClick={onImport} icon={isSaving ? <Loader2 size={14} className="animate-spin"/> : <Import size={14}/>} className="h-8">Import Lead</Button>
                     </div>
                </div>
            </div>
        )}
    </div>
  )
}

// --- Sub-component: Result Group Container ---
const ResultGroup: React.FC<{
    sourceKey: string;
    leads: Lead[];
    onUpdate: (lead: Lead) => void;
    onRemove: (leadId: string) => void;
    onImportSingle: (lead: Lead) => void;
    onImportBulk: (leads: Lead[]) => void;
}> = ({ sourceKey, leads, onUpdate, onRemove, onImportSingle, onImportBulk }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isExpanded, setIsExpanded] = useState(true);

    // Filter valid leads for selection
    const validLeads = leads.filter(l => validateLead(l).isValid);
    const validIds = new Set(validLeads.map(l => l.leadId));

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === validLeads.length && validLeads.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(validIds);
        }
    }

    const handleBulkImport = () => {
        const toImport = leads.filter(l => selectedIds.has(l.leadId));
        if (toImport.length === 0) return;
        onImportBulk(toImport);
        setSelectedIds(new Set());
    }

    if (leads.length === 0) return null;

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl mb-6 overflow-hidden animate-fade-in-up">
             {/* Group Header */}
             <div className="p-4 flex flex-wrap justify-between items-center bg-white border-b border-gray-200 gap-3">
                 <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                     <div onClick={e => e.stopPropagation()} title="Select All Valid">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.size > 0 && selectedIds.size === validLeads.length} 
                            onChange={toggleSelectAll} 
                            disabled={validLeads.length === 0} 
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50 cursor-pointer" 
                        />
                     </div>
                     <h3 className="font-bold text-gray-800 flex items-center gap-2">
                         {SOURCE_CONFIG[sourceKey as keyof typeof SOURCE_CONFIG]?.name || sourceKey}
                         <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{leads.length}</span>
                     </h3>
                     {isExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                 </div>

                 <div className="flex items-center gap-2">
                     {selectedIds.size > 0 && (
                         <Button size="sm" onClick={handleBulkImport} icon={<Import size={14}/>} className="bg-green-600 hover:bg-green-700 text-white border-transparent">
                             Import {selectedIds.size} Selected
                         </Button>
                     )}
                 </div>
             </div>

             {isExpanded && (
                 <div className="p-4 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar bg-gray-50/50">
                     {leads.map(lead => (
                         <LeadResultCard 
                            key={lead.leadId}
                            lead={lead}
                            isSelected={selectedIds.has(lead.leadId)}
                            onToggle={() => toggleSelect(lead.leadId)}
                            onUpdate={l => onUpdate(l)}
                            onDiscard={() => onRemove(lead.leadId)}
                            onImport={() => onImportSingle(lead)}
                            isSaving={false}
                         />
                     ))}
                     {leads.length === 0 && <div className="text-center py-8 text-gray-400">No leads found in this source.</div>}
                 </div>
             )}
        </div>
    )
}

// --- Main Component ---
export const FetchLeadsView: React.FC<FetchLeadsViewProps> = ({ user, onSetImportedLeads, onViewImports }) => {
    const sources = Object.entries(SOURCE_CONFIG).map(([key, config]) => ({ key, ...config }));

    const [inspectedHeaders, setInspectedHeaders] = useState<{name: string, headers: string[], error?: string, expected: string[]} | null>(null);
    const [loadingState, setLoadingState] = useState<{action: string, key: string} | null>(null);
    const [importResult, setImportResult] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const [results, setResults] = useState<Record<string, Lead[]>>({});
    const [loadingAll, setLoadingAll] = useState(false);
    const [globalImporting, setGlobalImporting] = useState(false);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        leads: Lead[];
        onConfirm: () => Promise<void>;
        sourceKey?: string;
    }>({ isOpen: false, leads: [], onConfirm: async () => {} });

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

    const handleFetchSingle = async (sourceKey: string) => {
        setLoadingState({ action: 'import', key: sourceKey });
        setImportResult(null);
        const res = await fetchLeadsFromSource(sourceKey as any);
        setLoadingState(null);
        
        if (res.success && res.leads.length > 0) {
            setResults({ [sourceKey]: res.leads });
        } else {
            setImportResult({
                message: res.message,
                type: res.success ? 'success' : 'error'
            });
        }
    };

    const handleFetchAll = async () => {
        setLoadingAll(true);
        setImportResult(null);
        setResults({});
        
        const keys = Object.keys(SOURCE_CONFIG);
        const newResults: Record<string, Lead[]> = {};
        let totalFound = 0;

        try {
            await Promise.all(keys.map(async (key) => {
                const res = await fetchLeadsFromSource(key as any);
                if (res.success && res.leads.length > 0) {
                    newResults[key] = res.leads;
                    totalFound += res.leads.length;
                }
            }));
            setResults(newResults);
            
            if (totalFound === 0) {
                 setImportResult({ message: "No new leads found in any source.", type: 'success' });
            }
        } catch (e) {
            setImportResult({ message: "Error fetching some sources.", type: 'error' });
        }
        setLoadingAll(false);
    };

    const handleUpdateLead = (sourceKey: string, updatedLead: Lead) => {
        setResults(prev => ({
            ...prev,
            [sourceKey]: prev[sourceKey].map(l => l.leadId === updatedLead.leadId ? updatedLead : l)
        }));
    };

    const handleRemoveLead = (sourceKey: string, leadId: string) => {
        setResults(prev => {
            const nextList = prev[sourceKey].filter(l => l.leadId !== leadId);
            if (nextList.length === 0) {
                const copy = { ...prev };
                delete copy[sourceKey];
                return copy;
            }
            return { ...prev, [sourceKey]: nextList };
        });
    };

    // Trigger Import with Confirmation
    const triggerImport = (leadsToImport: Lead[], sourceKey: string) => {
        setConfirmState({
            isOpen: true,
            leads: leadsToImport,
            sourceKey,
            onConfirm: async () => {
                let successCount = 0;
                const importedIds: string[] = [];
                setGlobalImporting(true);

                for (const lead of leadsToImport) {
                    if (validateLead(lead).isValid) {
                        const success = await addLead(lead);
                        if (success) {
                            successCount++;
                            importedIds.push(lead.leadId);
                        }
                    }
                }
                
                setGlobalImporting(false);
                setConfirmState(prev => ({ ...prev, isOpen: false }));

                // Update UI to remove imported
                setResults(prev => {
                     const nextList = prev[sourceKey].filter(l => !importedIds.includes(l.leadId));
                     if (nextList.length === 0) {
                         const copy = { ...prev };
                         delete copy[sourceKey];
                         return copy;
                     }
                     return { ...prev, [sourceKey]: nextList };
                });

                if (successCount > 0) {
                    setImportResult({ message: `Successfully imported ${successCount} leads into pipeline.`, type: 'success' });
                }
            }
        });
    };

    const totalLeads = Object.values(results).reduce((acc, list) => acc + list.length, 0);

    return (
        <div className="space-y-6 animate-fade-in p-6 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Fetch External Leads</h2>
                    <p className="text-sm text-gray-500">Connect to data sources to import new leads.</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {!user && (
                        <div className="bg-yellow-50 text-yellow-800 px-3 py-2 rounded text-xs font-bold border border-yellow-200 flex items-center gap-2 flex-1 md:flex-none justify-center">
                            <AlertTriangle size={14} /> Offline Mode
                        </div>
                    )}
                    <Button 
                        variant="primary" 
                        onClick={handleFetchAll}
                        isLoading={loadingAll}
                        disabled={loadingAll || globalImporting}
                        icon={<Play size={16} fill="currentColor"/>}
                        className="flex-1 md:flex-none shadow-md bg-indigo-600 hover:bg-indigo-700"
                    >
                        Fetch All Sources
                    </Button>
                </div>
            </div>

            {importResult && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${importResult.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {importResult.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                    <div className="font-medium text-sm">{importResult.message}</div>
                </div>
            )}

            {/* RESULTS SECTION */}
            {totalLeads > 0 && (
                <div className="space-y-4 border-t border-gray-200 pt-6 mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Import size={20} className="text-blue-600" /> 
                            Fetch Results ({totalLeads})
                        </h2>
                    </div>

                    {Object.entries(results).map(([key, leads]) => (
                        <ResultGroup 
                            key={key}
                            sourceKey={key}
                            leads={leads}
                            onUpdate={(l) => handleUpdateLead(key, l)}
                            onRemove={(id) => handleRemoveLead(key, id)}
                            onImportSingle={(l) => triggerImport([l], key)}
                            onImportBulk={(leads) => triggerImport(leads, key)}
                        />
                    ))}
                </div>
            )}

            {/* SOURCES GRID */}
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-8 mb-4">Individual Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sources.map(src => (
                    <div key={src.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <FileSpreadsheet size={16} className="text-green-600"/> {src.name}
                            </h3>
                            {user && (
                                <a href={`https://docs.google.com/spreadsheets/d/${src.id}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-600 transition-colors" title="Open Sheet">
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1 mb-4 flex-1">
                            <div className="flex justify-between"><span className="font-medium">Sheet:</span> <span className="truncate max-w-[100px]">{src.sheetName}</span></div>
                            <div className="font-mono bg-gray-50 p-1 rounded truncate text-[9px] mt-1 text-gray-400">{src.id}</div>
                        </div>
                        
                        <div className="mt-auto flex gap-2">
                             <Button 
                                variant="secondary" 
                                size="sm"
                                className="flex-1"
                                onClick={() => handleFetchSingle(src.key)}
                                isLoading={loadingState?.key === src.key && loadingState?.action === 'import'}
                                icon={<Import size={14}/>}
                            >
                                Fetch
                            </Button>
                            {user && (
                                <Button 
                                    variant="outline"
                                    size="icon" 
                                    onClick={() => handleInspect(src.key, src)}
                                    isLoading={loadingState?.key === src.key && loadingState?.action === 'inspect'}
                                    title="Inspect Headers"
                                >
                                    <Stethoscope size={14}/>
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {inspectedHeaders && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 animate-slide-in-right mt-6">
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

            {/* CONFIRMATION MODAL */}
            {confirmState.isOpen && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                    title="Confirm Import"
                >
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                            <Import className="text-blue-600 shrink-0 mt-0.5" size={18} />
                            <div>
                                <h4 className="font-bold text-blue-900 text-sm">Ready to import {confirmState.leads.length} lead{confirmState.leads.length > 1 ? 's' : ''}?</h4>
                                <p className="text-xs text-blue-700 mt-1">These leads will be added to your main pipeline.</p>
                            </div>
                        </div>

                        {/* Triggers & Defaults Section */}
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Layers size={12} /> Triggers & Fields
                            </h5>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400">Status Trigger</span>
                                    <span className="font-bold text-green-600 flex items-center gap-1">
                                        <CheckCircle size={10}/> New
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400">Allocated To</span>
                                    <span className="font-bold text-gray-800 flex items-center gap-1">
                                        <UserPlus size={10}/> {confirmState.leads[0]?.ydsPoc || 'Unassigned'}
                                        {confirmState.leads.some(l => l.ydsPoc !== confirmState.leads[0]?.ydsPoc) && ' (Mixed)'}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400">Source</span>
                                    <span className="font-bold text-gray-800">{SOURCE_CONFIG[confirmState.sourceKey as keyof typeof SOURCE_CONFIG]?.name || 'Unknown'}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400">Created Date</span>
                                    <span className="font-bold text-gray-800">{confirmState.leads[0]?.date}</span>
                                </div>
                            </div>
                        </div>

                        {/* Preview List */}
                        <div>
                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Preview</h5>
                            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Company</th>
                                            <th className="px-3 py-2 font-medium">Contact</th>
                                            <th className="px-3 py-2 font-medium text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {confirmState.leads.slice(0, 10).map((l, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 truncate max-w-[120px] font-medium">{l.companyName}</td>
                                                <td className="px-3 py-2 truncate max-w-[100px] text-gray-500">{l.contactPerson}</td>
                                                <td className="px-3 py-2 text-right text-gray-500">{l.estimatedQty}</td>
                                            </tr>
                                        ))}
                                        {confirmState.leads.length > 10 && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-2 text-center text-gray-400 italic">
                                                    ...and {confirmState.leads.length - 10} more
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={confirmState.onConfirm} isLoading={globalImporting}>
                                Confirm Import
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
