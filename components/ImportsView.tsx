
import React, { useState } from 'react';
import { Lead } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { CheckCircle2, XCircle, Save, Trash2, ArrowLeft, ChevronDown, AlertTriangle, Database, User, Calendar, Phone, Mail, MapPin, Tag, ShoppingBag, MessageSquare, Building2, Pencil, Lock, Table as TableIcon, LayoutGrid, Import, Layers, CheckCircle, UserPlus, GitMerge, Box, FileText, ArrowRight, Activity } from 'lucide-react';
import { addLead } from '../services/sheetService';

interface ImportsViewProps {
  importedLeads: Lead[];
  onClearImports: () => void;
  onImportComplete: () => void;
  onBack: () => void;
}

// Helper to check for critical missing data
const validateImport = (lead: Lead) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!lead.companyName) errors.push("Company Name is missing (Required)");
    if (!lead.contactPerson) warnings.push("Contact Person is missing");
    if (!lead.number && !lead.email) warnings.push("No contact details (Phone or Email missing)");

    return { isValid: errors.length === 0, errors, warnings };
};

// Styling helper for inputs
const getInputClass = (val: string | number | undefined, required = false, warning = false) => {
    if (!val && required) return "bg-red-50 border-red-300 focus:border-red-500 focus:ring-red-200 placeholder-red-400";
    if (!val && warning) return "bg-yellow-50 border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200 placeholder-yellow-500";
    // Filled State: Gray background
    if (val) return "bg-gray-100 border-gray-200 text-gray-800 font-semibold focus:bg-white focus:border-blue-500 transition-colors shadow-none";
    // Empty State: White background
    return "bg-white border-gray-300 focus:border-blue-500 shadow-sm text-gray-600";
};

// --- SUB-COMPONENT: Table Row ---
const ImportTableRow: React.FC<{
    lead: Lead;
    isSelected: boolean;
    onToggleSelect: () => void;
    onUpdate: (lead: Lead) => void;
    onDiscard: () => void;
    onImport: () => void;
}> = ({ lead, isSelected, onToggleSelect, onUpdate, onDiscard, onImport }) => {
    const { isValid, errors, warnings } = validateImport(lead);

    const handleChange = (field: keyof Lead, value: string) => {
        onUpdate({ ...lead, [field]: value });
    };

    return (
        <tr className={`group hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
            <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={onToggleSelect}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
            </td>
            <td className="px-4 py-2">
                <div className="flex flex-col gap-1">
                    {!isValid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 w-max">
                            <XCircle size={10}/> Invalid
                        </span>
                    ) : warnings.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-100 w-max">
                            <AlertTriangle size={10}/> Check
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 w-max">
                            <CheckCircle2 size={10}/> Ready
                        </span>
                    )}
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded cursor-not-allowed w-full">
                    <Lock size={10} className="shrink-0"/> <span className="truncate">{lead.date}</span>
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded cursor-not-allowed w-full">
                    <Lock size={10} className="shrink-0"/> <span className="truncate">{lead.source}</span>
                </div>
            </td>
            <td className="px-4 py-2">
                <input 
                    className={`w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-1 ${getInputClass(lead.companyName, true)}`}
                    value={lead.companyName || ''}
                    onChange={e => handleChange('companyName', e.target.value)}
                    placeholder="Required *"
                />
            </td>
            <td className="px-4 py-2">
                <input 
                    className={`w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-1 ${getInputClass(lead.contactPerson, false, warnings.includes("Contact Person is missing"))}`}
                    value={lead.contactPerson || ''}
                    onChange={e => handleChange('contactPerson', e.target.value)}
                    placeholder="Contact Name"
                />
            </td>
            <td className="px-4 py-2">
                <input 
                    className={`w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-1 ${getInputClass(lead.number, false, !lead.email)}`}
                    value={lead.number || ''}
                    onChange={e => handleChange('number', e.target.value)}
                    placeholder="Phone"
                />
            </td>
            <td className="px-4 py-2">
                <input 
                    className={`w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-1 ${getInputClass(lead.email, false, !lead.number)}`}
                    value={lead.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="Email"
                />
            </td>
            <td className="px-4 py-2">
                <input 
                    className={`w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-1 ${getInputClass(lead.city)}`}
                    value={lead.city || ''}
                    onChange={e => handleChange('city', e.target.value)}
                    placeholder="City"
                />
            </td>
            <td className="px-4 py-2">
                <input 
                    type="number"
                    className={`w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-1 ${getInputClass(lead.estimatedQty)}`}
                    value={lead.estimatedQty || ''}
                    onChange={e => handleChange('estimatedQty', e.target.value)}
                    placeholder="0"
                />
            </td>
            <td className="px-4 py-2">
                <input 
                    className={`w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-1 ${getInputClass(lead.remarks)}`}
                    value={lead.remarks || ''}
                    onChange={e => handleChange('remarks', e.target.value)}
                    placeholder="Notes..."
                />
            </td>
            <td className="px-4 py-2 text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={onImport} 
                        disabled={!isValid}
                        className={`p-1.5 rounded transition-colors ${isValid ? 'hover:bg-green-100 text-green-600' : 'text-gray-300 cursor-not-allowed'}`}
                        title="Import This Lead"
                    >
                        <Save size={16} />
                    </button>
                    <button 
                        onClick={onDiscard} 
                        className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                        title="Discard"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// --- SUB-COMPONENT: Individual Import Card ---
const ImportCard: React.FC<{ 
    lead: Lead; 
    isSelected: boolean; 
    onToggleSelect: () => void;
    onImport: () => void;
    onDiscard: () => void;
    onUpdate: (lead: Lead) => void;
    isSaving: boolean;
}> = ({ lead, isSelected, onToggleSelect, onImport, onDiscard, onUpdate, isSaving }) => {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'identity' | 'flow'>('identity');
    const { isValid, errors, warnings } = validateImport(lead);

    const handleChange = (field: keyof Lead, value: string) => {
        onUpdate({ ...lead, [field]: value });
    };

    // RAW SOURCE DATA (Derived from Lead structure if rawData isn't strictly available in Lead type, 
    // but in a real app Lead might have a .rawData property. We simulate by showing non-empty fields)
    const sourceFields = [
        { label: 'Company', val: lead.companyName },
        { label: 'Contact', val: lead.contactPerson },
        { label: 'Phone', val: lead.number },
        { label: 'Email', val: lead.email },
        { label: 'Raw Source', val: lead.source },
        { label: 'Imported Date', val: lead.date },
        { label: 'Raw Note', val: lead.remarks },
        { label: 'City', val: lead.city },
        { label: 'Qty', val: lead.estimatedQty },
        { label: 'Product', val: lead.productType },
        { label: 'Requirements', val: lead.orderInfo },
        { label: 'Platform', val: lead.platformType },
        { label: 'Store URL', val: lead.storeUrl },
    ].filter(f => f.val !== undefined && f.val !== '' && f.val !== 0);

    // SECTION 1: IDENTITY (Leads Sheet)
    const identityFields = [
        { key: 'companyName', label: 'Company Name', icon: Building2, type: 'text', required: true, colSpan: 2 },
        { key: 'contactPerson', label: 'Contact Name', icon: User, type: 'text' },
        { key: 'phone', label: 'Phone', icon: Phone, type: 'tel', mapKey: 'number' },
        { key: 'email', label: 'Email', icon: Mail, type: 'email' },
        { key: 'city', label: 'City', icon: MapPin, type: 'text' },
        { key: 'source', label: 'Source', icon: Database, type: 'text', readOnly: true },
        { key: 'leadScore', label: 'Lead Score', icon: Activity, type: 'number' },
        { key: 'tags', label: 'Tags', icon: Tag, type: 'text' },
    ];

    // SECTION 2: FLOW (Lead_Flows Sheet)
    const flowFields = [
        { key: 'category', label: 'Category', icon: Layers, type: 'text' },
        { key: 'status', label: 'Initial Status', icon: CheckCircle, type: 'text', readOnly: true }, // Default 'New'
        { key: 'estimatedQty', label: 'Est. Qty', icon: Box, type: 'number' },
        { key: 'productType', label: 'Product Type', icon: ShoppingBag, type: 'text' },
        { key: 'priority', label: 'Priority', icon: AlertTriangle, type: 'text' },
        { key: 'owner', label: 'Assigned To', icon: UserPlus, type: 'text', mapKey: 'ydsPoc' },
        { key: 'remarks', label: 'Remarks/Notes', icon: MessageSquare, type: 'text', colSpan: 2 },
    ];

    const renderInput = (f: any) => {
        const fieldKey = f.mapKey || f.key;
        const val = lead[fieldKey as keyof Lead];
        let isWarning = false;
        
        if (f.required && !val) isWarning = true;
        if (fieldKey === 'number' && !val && !lead.email) isWarning = true;

        return (
            <div key={f.key} className={`flex flex-col ${f.colSpan ? `col-span-${f.colSpan}` : ''}`}>
                <label className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1 truncate font-bold uppercase">
                    {f.label} 
                    {f.readOnly && <Lock size={8} className="text-gray-300"/>}
                    {f.required && <span className="text-red-500">*</span>}
                </label>
                
                {f.readOnly ? (
                    <div className="w-full text-xs border border-transparent bg-gray-100 rounded px-2 py-1.5 text-gray-500 truncate cursor-not-allowed select-none">
                        {val as string || '-'}
                    </div>
                ) : (
                    <input 
                        type={f.type}
                        className={`
                            w-full text-xs rounded px-2 py-1.5 outline-none border focus:ring-2
                            ${getInputClass(val as string, f.required, isWarning)}
                        `}
                        value={val as string || ''}
                        onChange={(e) => handleChange(fieldKey as keyof Lead, e.target.value)}
                        placeholder={isWarning ? "Required..." : "Empty"}
                    />
                )}
            </div>
        );
    };

    return (
        <div 
            className={`
                relative bg-white rounded-xl border transition-all duration-200 flex flex-col group
                ${isSelected ? 'border-blue-400 ring-1 ring-blue-100 shadow-md' : 'border-gray-200 shadow-sm hover:shadow-md'}
                ${expanded ? 'col-span-full lg:col-span-2 row-span-2' : ''} 
            `}
        >
            {/* Header Area (Always Visible) */}
            <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-start gap-3">
                    <div onClick={e => e.stopPropagation()} className="pt-1">
                        <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={onToggleSelect}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <h3 className={`font-bold text-sm truncate pr-2 ${!lead.companyName ? 'text-red-500 italic' : 'text-gray-900'}`}>
                                {lead.companyName || 'Missing Company Name'}
                            </h3>
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                {lead.source}
                            </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <span className="truncate max-w-[120px] font-medium">{lead.contactPerson || <span className="text-orange-400">No Contact</span>}</span>
                            {lead.estimatedQty > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                    <span className="font-mono text-gray-600">{lead.estimatedQty} units</span>
                                </>
                            )}
                        </div>

                        {/* Quick validation indicator */}
                        <div className="mt-2 flex flex-wrap gap-2">
                            {!isValid && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1 font-medium">
                                    <XCircle size={10}/> Data Missing
                                </span>
                            )}
                            {isValid && (
                                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1 font-medium">
                                    <CheckCircle2 size={10}/> Ready to Import
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={`text-gray-300 transition-transform duration-200 ${expanded ? 'rotate-180 text-blue-500' : 'group-hover:text-gray-500'}`}>
                        <ChevronDown size={18} />
                    </div>
                </div>
            </div>

            {/* Expanded Details - 2 Column Layout */}
            {expanded && (
                <div className="border-t border-gray-100 bg-white rounded-b-xl animate-fade-in cursor-default flex flex-col md:flex-row h-96" onClick={e => e.stopPropagation()}>
                    
                    {/* LEFT COL: SOURCE DATA (Read Only) */}
                    <div className="w-full md:w-1/3 bg-gray-50 p-4 border-r border-gray-200 overflow-y-auto custom-scrollbar">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FileText size={12}/> Original Source Data
                        </h4>
                        <div className="space-y-2">
                            {sourceFields.map((f, i) => (
                                <div key={i} className="text-xs">
                                    <span className="text-gray-400 block text-[10px] font-bold uppercase">{f.label}</span>
                                    <span className="text-gray-700 font-medium break-words bg-white border border-gray-200 px-2 py-1 rounded block">{f.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT COL: IMPORT CONFIG (Tabs) */}
                    <div className="w-full md:w-2/3 flex flex-col">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button 
                                onClick={() => setActiveTab('identity')}
                                className={`flex-1 py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${activeTab === 'identity' ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <User size={12}/> Lead Identity (Table 1)
                            </button>
                            <button 
                                onClick={() => setActiveTab('flow')}
                                className={`flex-1 py-2.5 text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors ${activeTab === 'flow' ? 'text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <GitMerge size={12}/> Lead Flow (Table 2)
                            </button>
                        </div>

                        {/* Form Area */}
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                            {activeTab === 'identity' ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {identityFields.map(f => renderInput(f))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {flowFields.map(f => renderInput(f))}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="text-xs">
                                {errors.length > 0 && <span className="text-red-500 font-bold">{errors.length} Errors</span>}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8"
                                    onClick={onDiscard}
                                >
                                    Discard
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={isValid ? "primary" : "secondary"} 
                                    disabled={!isValid || isSaving}
                                    onClick={onImport}
                                    className={isValid ? "bg-green-600 hover:bg-green-700 h-8 shadow-sm" : "h-8 opacity-50"}
                                    icon={isValid ? <Save size={14}/> : <XCircle size={14}/>}
                                >
                                    {isValid ? "Import to CRM" : "Complete Data"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ImportsView: React.FC<ImportsViewProps> = ({ importedLeads, onClearImports, onImportComplete, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(importedLeads.map(l => l.leadId)));
  const [isSaving, setIsSaving] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(importedLeads); 
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid'); // Default to Grid for new layout

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        leads: Lead[];
        onConfirm: () => Promise<void>;
  }>({ isOpen: false, leads: [], onConfirm: async () => {} });

  // If local state is empty but props had leads, likely successfully imported all
  if (leads.length === 0 && importedLeads.length > 0) {
      onBack();
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === leads.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(leads.map(l => l.leadId)));
      }
  };

  const handleUpdateLead = (updatedLead: Lead) => {
      setLeads(prev => prev.map(l => l.leadId === updatedLead.leadId ? updatedLead : l));
  };

  // Trigger Import with Confirmation
  const triggerImport = (leadsToImport: Lead[]) => {
      setConfirmState({
          isOpen: true,
          leads: leadsToImport,
          onConfirm: async () => {
              setIsSaving(true);
              let successCount = 0;
              const successfullyImportedIds = new Set<string>();

              for (const lead of leadsToImport) {
                  const { isValid } = validateImport(lead);
                  if (isValid) {
                      const success = await addLead(lead);
                      if (success) {
                          successCount++;
                          successfullyImportedIds.add(lead.leadId);
                      }
                  }
              }

              setIsSaving(false);
              setConfirmState(prev => ({ ...prev, isOpen: false }));
              
              // Remove successfully imported leads
              const nextLeads = leads.filter(l => !successfullyImportedIds.has(l.leadId));
              setLeads(nextLeads);
              setSelectedIds(new Set()); // Clear selection

              alert(`Successfully imported ${successCount} leads.`);
              
              if (nextLeads.length === 0) {
                  onImportComplete(); 
                  onBack();
              }
          }
      });
  };

  const handleBulkImport = () => {
    const idsToImport = selectedIds.size > 0 ? selectedIds : new Set(leads.map(l => l.leadId));
    if (idsToImport.size === 0) return;
    const leadsToImport = leads.filter(l => idsToImport.has(l.leadId));
    triggerImport(leadsToImport);
  };

  const handleSingleImport = (lead: Lead) => {
      triggerImport([lead]);
  };

  const handleDiscard = (leadId: string) => {
      setLeads(prev => prev.filter(l => l.leadId !== leadId));
      const nextSel = new Set(selectedIds);
      nextSel.delete(leadId);
      setSelectedIds(nextSel);
  };

  // Calculate importable count
  const validCount = leads.filter(l => validateImport(l).isValid).length;
  const selectedCount = selectedIds.size;
  const importLabel = selectedCount > 0 
      ? `Import ${selectedCount} Selected` 
      : `Import All Valid (${validCount})`;

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5] animate-fade-in">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 z-10 sticky top-0 shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Review & Import</h2>
                    <p className="text-xs text-gray-500">{leads.length} leads in staging area.</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Card View"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Table View"
                    >
                        <TableIcon size={16} />
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                <Button variant="danger" size="sm" onClick={onClearImports} icon={<Trash2 size={16}/>} className="flex-1 sm:flex-none">
                    Discard All
                </Button>
                <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleBulkImport} 
                    disabled={leads.length === 0 || isSaving}
                    isLoading={isSaving}
                    icon={<Save size={16}/>}
                    className="flex-1 sm:flex-none"
                >
                    {importLabel}
                </Button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
            {leads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <Database size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No staged leads found.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>Go back to Fetch</Button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min">
                        {leads.map(lead => (
                            <ImportCard 
                                key={lead.leadId} 
                                lead={lead} 
                                isSelected={selectedIds.has(lead.leadId)}
                                onToggleSelect={() => toggleSelect(lead.leadId)}
                                onImport={() => handleSingleImport(lead)}
                                onDiscard={() => handleDiscard(lead.leadId)}
                                onUpdate={handleUpdateLead}
                                isSaving={isSaving}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider shadow-sm">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center border-b">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.size === leads.length && leads.length > 0} 
                                        onChange={toggleSelectAll}
                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                </th>
                                <th className="px-4 py-3 w-28 border-b">Status</th>
                                <th className="px-4 py-3 w-28 border-b">Date (Lock)</th>
                                <th className="px-4 py-3 w-32 border-b">Source (Lock)</th>
                                <th className="px-4 py-3 w-48 border-b">Company Name <span className="text-red-500">*</span></th>
                                <th className="px-4 py-3 w-40 border-b">Contact</th>
                                <th className="px-4 py-3 w-32 border-b">Phone</th>
                                <th className="px-4 py-3 w-40 border-b">Email</th>
                                <th className="px-4 py-3 w-32 border-b">City</th>
                                <th className="px-4 py-3 w-24 border-b">Qty</th>
                                <th className="px-4 py-3 border-b min-w-[200px]">Remarks</th>
                                <th className="px-4 py-3 w-24 border-b text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {leads.map(lead => (
                                <ImportTableRow 
                                    key={lead.leadId}
                                    lead={lead}
                                    isSelected={selectedIds.has(lead.leadId)}
                                    onToggleSelect={() => toggleSelect(lead.leadId)}
                                    onUpdate={handleUpdateLead}
                                    onDiscard={() => handleDiscard(lead.leadId)}
                                    onImport={() => handleSingleImport(lead)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

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
                            <p className="text-xs text-blue-700 mt-1">These leads will be moved from staging to your main pipeline.</p>
                        </div>
                    </div>

                    {/* Triggers & Defaults Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Layers size={12} /> Key Triggers Applied
                        </h5>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400">Status</span>
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
                                <span className="font-bold text-gray-800">{confirmState.leads[0]?.source || 'Various'}</span>
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
                        <Button variant="primary" onClick={confirmState.onConfirm} isLoading={isSaving}>
                            Confirm Import
                        </Button>
                    </div>
                </div>
            </Modal>
        )}
    </div>
  );
};
