

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { FileSpreadsheet, ExternalLink, Import, Stethoscope, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Save, Trash2, XCircle, Loader2, Play, CheckSquare, Square, Filter, User, Phone, Mail, MapPin, ShoppingBag, MessageSquare, Building2, UserPlus, Layers, Table, FileText, Plus } from 'lucide-react';
import { SOURCE_CONFIG, fetchLeadsFromSource, fetchRemoteHeaders, fetchRemoteSheetNames, addLead, SourceConfigItem, fetchIntakeConfig } from '../services/sheetService';
import { Lead, GoogleUser, SourceConfig, FieldMapRule } from '../types';

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
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === validLeads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(validIds));
        }
    };

    const handleBulkImport = () => {
        const toImport = leads.filter(l => selectedIds.has(l.leadId));
        onImportBulk(toImport);
        setSelectedIds(new Set());
    };

    const selectedCount = selectedIds.size;

    return (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div 
                className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer border-b border-gray-100"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div onClick={e => e.stopPropagation()}>
                        <input 
                            type="checkbox" 
                            checked={selectedCount > 0 && selectedCount === validLeads.length}
                            onChange={toggleSelectAll}
                            disabled={validLeads.length === 0}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                    </div>
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <FileSpreadsheet size={16} className="text-green-600"/>
                        {sourceKey}
                    </h3>
                    <Badge variant="neutral">{leads.length} Leads</Badge>
                </div>
                
                <div className="flex items-center gap-3">
                    {selectedCount > 0 && (
                        <div className="flex items-center gap-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                            <span className="text-xs font-bold text-gray-500">{selectedCount} Selected</span>
                            <Button size="sm" variant="primary" onClick={handleBulkImport} icon={<Import size={14}/>}>
                                Import
                            </Button>
                        </div>
                    )}
                    <div className="text-gray-400">
                        {isExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                    </div>
                </div>
            </div>

            {/* Body */}
            {isExpanded && (
                <div className="p-4 bg-gray-50/50">
                    {leads.map(lead => (
                        <LeadResultCard 
                            key={lead.leadId}
                            lead={lead}
                            isSelected={selectedIds.has(lead.leadId)}
                            onToggle={() => toggleSelect(lead.leadId)}
                            onUpdate={onUpdate}
                            onDiscard={() => onRemove(lead.leadId)}
                            onImport={() => onImportSingle(lead)}
                            isSaving={false}
                        />
                    ))}
                    {leads.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            No leads found in this source.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const FetchLeadsView: React.FC<FetchLeadsViewProps> = ({ user, onSetImportedLeads, onViewImports }) => {
    const [leadsBySource, setLeadsBySource] = useState<Record<string, Lead[]>>({});
    const [loading, setLoading] = useState(false);
    const [sources, setSources] = useState<SourceConfig[]>([]);

    useEffect(() => {
        // Load initial config
        const load = async () => {
            const res = await fetchIntakeConfig();
            if (res.success) {
                setSources(res.sources);
            }
        };
        load();
    }, []);

    const handleScan = async () => {
        setLoading(true);
        const allLeads: Record<string, Lead[]> = {};
        const sourcesToScan = sources.length > 0 ? sources : Object.entries(SOURCE_CONFIG).map(([k,v]) => ({ layer: k, sheetId: v.id, tab: v.sheetName, type: 'Vendor', tags: [] }));

        for (const src of sourcesToScan) {
             const res = await fetchLeadsFromSource(src.layer as any);
             if (res.success) {
                 allLeads[src.layer] = res.leads;
             }
        }
        setLeadsBySource(allLeads);
        setLoading(false);
    };

    const handleUpdateLead = (lead: Lead) => {
        const sourceKey = Object.keys(leadsBySource).find(k => leadsBySource[k].some(l => l.leadId === lead.leadId));
        if (sourceKey) {
            setLeadsBySource(prev => ({
                ...prev,
                [sourceKey]: prev[sourceKey].map(l => l.leadId === lead.leadId ? lead : l)
            }));
        }
    };

    const handleRemoveLead = (leadId: string) => {
        const sourceKey = Object.keys(leadsBySource).find(k => leadsBySource[k].some(l => l.leadId === leadId));
        if (sourceKey) {
            setLeadsBySource(prev => ({
                ...prev,
                [sourceKey]: prev[sourceKey].filter(l => l.leadId !== leadId)
            }));
        }
    };

    const handleImportSingle = async (lead: Lead) => {
        const success = await addLead(lead);
        if (success) handleRemoveLead(lead.leadId);
    };

    const handleImportBulk = async (leads: Lead[]) => {
        for (const lead of leads) {
            await handleImportSingle(lead);
        }
    };

    const totalLeads = Object.values(leadsBySource).reduce((acc: number, l: Lead[]) => acc + l.length, 0);

    return (
        <div className="p-6 max-w-5xl mx-auto pb-24">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fetch Leads</h1>
                    <p className="text-gray-500">Scan external sheets for new leads.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onViewImports} icon={<Table size={16}/>}>
                        Staging
                    </Button>
                    <Button onClick={handleScan} isLoading={loading} icon={<Play size={16}/>}>
                        Scan Now
                    </Button>
                </div>
            </div>

            {totalLeads === 0 && !loading && (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <Import size={48} className="mx-auto text-gray-300 mb-4"/>
                    <p className="text-gray-500 font-medium">No leads fetched yet.</p>
                    <p className="text-sm text-gray-400">Click 'Scan Now' to check connected sheets.</p>
                </div>
            )}

            <div className="space-y-6">
                {Object.entries(leadsBySource).map(([key, leads]) => (
                    <ResultGroup 
                        key={key}
                        sourceKey={key}
                        leads={leads}
                        onUpdate={handleUpdateLead}
                        onRemove={handleRemoveLead}
                        onImportSingle={handleImportSingle}
                        onImportBulk={handleImportBulk}
                    />
                ))}
            </div>
        </div>
    );
};