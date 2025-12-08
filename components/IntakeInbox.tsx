
import React, { useState, useEffect, useMemo } from 'react';
import { IntakeService, SourceStat } from '../services/intakeService';
import { IntakeRow, GoogleUser, SourceConfig, FieldMapRule, Lead } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { MappingEditorModal } from './MappingEditorModal';
import { AddSourceModal } from './AddSourceModal';
import { 
    AlertTriangle, RefreshCw, UploadCloud, Save, Trash2, CheckCircle2, 
    ChevronDown, ChevronUp, Mail, Phone, Lock, Filter, LayoutGrid, 
    Table as TableIcon, XCircle, FileSpreadsheet, Play, Plus, Settings, Loader2, BookOpen, Columns, UserPlus, ArrowRight, AlertOctagon, Database
} from 'lucide-react';

interface IntakeInboxProps {
    user: GoogleUser | null;
    onImportSuccess: () => void;
    onLogin: () => void;
    existingLeads?: Lead[]; 
}

// --- CONSTANTS ---
const TAB_ALL = 'all';
const TAB_READY = 'ready';
const TAB_ERRORS = 'errors';
const TAB_DUPLICATES = 'duplicates';

// --- HELPER: Duplicate Checker ---
const checkDuplicate = (row: IntakeRow, db: Lead[]): Lead | undefined => {
    if (!db || db.length === 0) return undefined;
    
    // Normalize inputs
    const inPhone = row.number ? String(row.number).replace(/\D/g, '') : '';
    const inEmail = row.email ? String(row.email).toLowerCase().trim() : '';

    // Search DB
    return db.find(l => {
        const dbPhone = l.number ? String(l.number).replace(/\D/g, '') : '';
        const dbEmail = l.email ? String(l.email).toLowerCase().trim() : '';
        
        const phoneMatch = inPhone.length > 6 && dbPhone.length > 6 && (dbPhone.includes(inPhone) || inPhone.includes(dbPhone));
        const emailMatch = inEmail.length > 4 && dbEmail === inEmail;

        return phoneMatch || emailMatch;
    });
};

// --- SUB-COMPONENT: Expanded Row Editor (Split View) ---
const ExpandedRowEditor: React.FC<{
    row: IntakeRow;
    headers: string[];
    onUpdate: (r: IntakeRow) => void;
    onImport: () => void;
    onDiscard: () => void;
    isSaving: boolean;
}> = ({ row, headers, onUpdate, onImport, onDiscard, isSaving }) => {
    
    const handleChange = (field: keyof IntakeRow, value: any) => {
        const next = { ...row, [field]: value };
        // Simple re-validation logic
        const hasIdentity = !!next.companyName || !!next.contactPerson;
        const errors = hasIdentity ? [] : ["Identity missing"];
        onUpdate({ ...next, isValid: errors.length === 0, errors });
    };

    const crmFields = [
        { key: 'companyName', label: 'Company Name', required: true },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'number', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'city', label: 'City' },
        { key: 'estimatedQty', label: 'Est. Qty', type: 'number' },
        { key: 'productType', label: 'Product Type' },
        { key: 'owner', label: 'Owner' },
        { key: 'remarks', label: 'Remarks', type: 'textarea' },
    ];

    // Source Data - Use headers to drive display if available
    const sourceDataDisplay = headers.length > 0 ? headers.map(h => ({ key: h, value: row.rawData[h] })) : Object.entries(row.rawData).map(([k, v]) => ({ key: k, value: v }));

    return (
        <div className="bg-gray-50/80 p-6 border-b border-gray-200 shadow-inner">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left: Source Data (Read Only) */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col h-full max-h-[500px]">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                            <Database size={12}/> Source Data ({row.sourceLayer})
                        </h4>
                        <span className="text-[10px] bg-white border border-gray-300 px-1.5 rounded text-gray-500 font-mono">Row {row.sourceRowIndex}</span>
                    </div>
                    <div className="overflow-y-auto p-0 flex-1 custom-scrollbar">
                        <table className="w-full text-xs">
                            <tbody className="divide-y divide-gray-100">
                                {sourceDataDisplay.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2.5 font-medium text-gray-500 w-1/3 border-r border-gray-100 bg-gray-50/30 text-right truncate select-none" title={item.key}>{item.key}</td>
                                        <td className="px-4 py-2.5 text-gray-800 font-mono break-words">{item.value !== null && item.value !== undefined ? String(item.value) : <span className="text-gray-300 italic">null</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: CRM Mapping (Editable) */}
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                            <LayoutGrid size={12}/> CRM Data Mapping
                        </h4>
                        {!row.isValid && <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-bold flex items-center gap-1"><AlertTriangle size={10}/> Validation Error</span>}
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                        
                        {/* Static Metadata */}
                        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date</label>
                                <div className="text-sm font-medium text-gray-700">{row.date}</div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Source</label>
                                <div className="text-sm font-medium text-gray-700">{row.source}</div>
                            </div>
                        </div>

                        {crmFields.map(field => {
                            const val = row[field.key as keyof IntakeRow];
                            const isMissing = field.required && !val;
                            return (
                                <div key={field.key} className="flex items-center gap-3">
                                    <label className="w-28 text-xs font-bold text-gray-500 text-right flex-shrink-0 truncate" title={field.label}>
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            className="flex-1 text-sm border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 border min-h-[60px]"
                                            value={val as string || ''}
                                            onChange={e => handleChange(field.key as keyof IntakeRow, e.target.value)}
                                            placeholder={`Enter ${field.label}...`}
                                        />
                                    ) : (
                                        <input
                                            type={field.type || 'text'}
                                            className={`flex-1 text-sm rounded-lg px-3 py-1.5 outline-none border focus:ring-2 transition-all ${isMissing ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'}`}
                                            value={val as string || (field.type === 'number' && !val ? 0 : '')}
                                            onChange={e => handleChange(field.key as keyof IntakeRow, field.type === 'number' ? parseInt(e.target.value) : e.target.value)}
                                            placeholder={isMissing ? "Required" : ""}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                        <Button variant="ghost" onClick={onDiscard} className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-transparent">
                            Ignore Row
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={onImport} 
                            disabled={!row.isValid || isSaving}
                            isLoading={isSaving}
                            className={row.isValid ? "bg-blue-600 hover:bg-blue-700" : "opacity-50"}
                        >
                            Save & Import
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: Expandable Table Row Wrapper ---
const IntakeTableRow: React.FC<{
    row: IntakeRow;
    headers: string[];
    isSelected: boolean;
    onToggleSelect: () => void;
    onUpdate: (r: IntakeRow) => void;
    onImport: () => void;
    onDiscard: () => void;
    isSaving: boolean;
    duplicateMatch?: Lead;
}> = ({ row, headers, isSelected, onToggleSelect, onUpdate, onImport, onDiscard, isSaving, duplicateMatch }) => {
    const [expanded, setExpanded] = useState(false);

    // Smart styling for input validation state (Collapsed View)
    const getInputClass = (val: any, required = false) => {
        if (required && !val) return "bg-red-50 border-red-300 focus:ring-red-200 placeholder-red-400";
        return "bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-gray-300 focus:border-blue-500";
    };

    const handleChange = (field: keyof IntakeRow, val: any) => {
        const next = { ...row, [field]: val };
        const hasIdentity = !!next.companyName || !!next.contactPerson;
        const errors = hasIdentity ? [] : ["Identity missing"];
        onUpdate({ ...next, isValid: errors.length === 0, errors });
    };

    // Calculate Status Icon
    let statusIcon = <CheckCircle2 size={16} className="text-green-500" />;
    let statusTitle = "Ready to Import";
    
    if (isSaving) {
        statusIcon = <Loader2 size={16} className="animate-spin text-blue-500" />;
        statusTitle = "Processing...";
    } else if (duplicateMatch) {
        statusIcon = <UserPlus size={16} className="text-amber-500" />;
        statusTitle = "Potential Duplicate";
    } else if (!row.isValid) {
        statusIcon = <AlertOctagon size={16} className="text-red-500" />;
        statusTitle = row.errors.join(", ");
    }

    return (
        <>
            <tr 
                className={`
                    group transition-colors border-b border-gray-100 last:border-0 text-sm cursor-pointer relative
                    ${isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'} 
                    ${expanded ? 'bg-gray-50 border-b-gray-200 shadow-inner' : ''}
                `}
            >
                {/* Selection Checkbox */}
                <td className="px-4 py-3 w-12 text-center" onClick={e => e.stopPropagation()}>
                    <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={onToggleSelect}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                </td>

                {/* Status Icon */}
                <td className="px-2 py-3 w-12 text-center" onClick={() => setExpanded(!expanded)}>
                    <div className="flex justify-center items-center h-full" title={statusTitle}>
                        {statusIcon}
                    </div>
                </td>

                {/* Collapsed View Columns */}
                <td className="px-2 py-3 w-24 text-xs font-mono text-gray-500 truncate" onClick={() => setExpanded(!expanded)}>
                    {row.date}
                </td>

                <td className="px-2 py-3 min-w-[180px] max-w-[250px]" onClick={e => e.stopPropagation()}>
                    <input 
                        className={`w-full text-sm rounded px-2 py-1 outline-none border transition-all ${getInputClass(row.companyName, true)}`}
                        value={row.companyName || ''}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        placeholder="Company *"
                    />
                </td>

                <td className="px-2 py-3 min-w-[140px] max-w-[200px]" onClick={e => e.stopPropagation()}>
                    <input 
                        className={`w-full text-sm rounded px-2 py-1 outline-none border transition-all ${getInputClass(row.contactPerson)}`}
                        value={row.contactPerson || ''}
                        onChange={(e) => handleChange('contactPerson', e.target.value)}
                        placeholder="Contact Name"
                    />
                </td>

                <td className="px-2 py-3 w-32" onClick={e => e.stopPropagation()}>
                    <input 
                        className={`w-full text-sm rounded px-2 py-1 outline-none border transition-all ${getInputClass(row.number)}`}
                        value={row.number || ''}
                        onChange={(e) => handleChange('number', e.target.value)}
                        placeholder="Phone"
                    />
                </td>

                {/* Expand Toggle Button */}
                <td className="px-2 py-3 text-center w-20">
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${expanded ? 'bg-gray-200 text-gray-700' : 'text-blue-600 hover:bg-blue-50'}`}
                    >
                        {expanded ? 'Close' : 'Expand'}
                    </button>
                </td>

                {/* Quick Actions */}
                <td className="px-2 py-3 text-right w-20 pr-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={onImport} 
                            disabled={!row.isValid || isSaving}
                            className={`p-1.5 rounded transition-colors ${row.isValid ? 'hover:bg-green-100 text-green-600' : 'text-gray-300 cursor-not-allowed'}`}
                            title="Import"
                        >
                            <Save size={16}/>
                        </button>
                    </div>
                </td>
            </tr>

            {/* EXPANDED DRAWER */}
            {expanded && (
                <tr className="bg-gray-50/80 border-b border-gray-200 shadow-inner">
                    <td colSpan={8} className="p-0 cursor-default">
                        <ExpandedRowEditor 
                            row={row} 
                            headers={headers}
                            onUpdate={onUpdate} 
                            onImport={onImport} 
                            onDiscard={onDiscard} 
                            isSaving={isSaving} 
                        />
                    </td>
                </tr>
            )}
        </>
    );
};

// --- COMPONENT: Bulk Toolbar ---
const BulkEditToolbar: React.FC<{
    selectedCount: number;
    onClear: () => void;
    onApply: (field: string, value: string) => void;
    onImportAll: () => void;
}> = ({ selectedCount, onClear, onApply, onImportAll }) => {
    const [activeField, setActiveField] = useState<string | null>(null);
    const [value, setValue] = useState('');

    const handleApply = () => {
        if(activeField && value) {
            onApply(activeField, value);
            setActiveField(null);
            setValue('');
        }
    };

    if (selectedCount === 0) return null;

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl px-6 py-3 shadow-2xl flex items-center gap-6 animate-fade-in-up">
            <div className="flex items-center gap-3 border-r border-gray-700 pr-6">
                <span className="font-bold text-lg">{selectedCount}</span>
                <span className="text-xs uppercase text-gray-400 font-bold tracking-wider">Selected</span>
                <button onClick={onClear} className="text-gray-500 hover:text-white transition-colors"><XCircle size={18}/></button>
            </div>

            {activeField ? (
                <div className="flex items-center gap-2 animate-slide-in-right">
                    <span className="text-xs font-bold text-gray-400 capitalize">{activeField}:</span>
                    <input 
                        autoFocus
                        className="bg-gray-800 border-gray-700 rounded h-8 px-3 text-sm focus:ring-1 focus:ring-blue-500 text-white placeholder-gray-500 w-40"
                        placeholder="Enter new value..."
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleApply()}
                    />
                    <button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 rounded h-8 px-4 text-xs font-bold transition-colors">Apply</button>
                    <button onClick={() => setActiveField(null)} className="hover:text-red-400 transition-colors"><XCircle size={16}/></button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <button onClick={() => setActiveField('owner')} className="px-3 py-1.5 hover:bg-gray-800 rounded text-xs font-bold border border-gray-700 transition-colors">Set Owner</button>
                    <button onClick={() => setActiveField('source')} className="px-3 py-1.5 hover:bg-gray-800 rounded text-xs font-bold border border-gray-700 transition-colors">Set Source</button>
                    <div className="w-px h-6 bg-gray-700 mx-2"></div>
                    <button 
                        onClick={onImportAll}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow-lg transition-colors"
                    >
                        <Play size={12} fill="currentColor"/> Import Selected
                    </button>
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
export const IntakeInbox: React.FC<IntakeInboxProps> = ({ user, onImportSuccess, onLogin, existingLeads = [] }) => {
    const [rows, setRows] = useState<IntakeRow[]>([]);
    const [stats, setStats] = useState<SourceStat[]>([]);
    const [activeSource, setActiveSource] = useState<string | null>(null);
    const [headersMap, setHeadersMap] = useState<Record<string, string[]>>({});
    
    const [viewMode, setViewMode] = useState<'crm' | 'source'>('crm');
    const [activeTab, setActiveTab] = useState<string>(TAB_ALL);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    const [configSources, setConfigSources] = useState<SourceConfig[]>([]);
    const [configMaps, setConfigMaps] = useState<FieldMapRule[]>([]);
    const [showMappingEditor, setShowMappingEditor] = useState<SourceConfig | null>(null);
    const [showAddSource, setShowAddSource] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null); 
    const [importProgress, setImportProgress] = useState<{ current: number; total: number; currentRow: string; } | null>(null);

    useEffect(() => {
        scanSources();
    }, [user]);

    const scanSources = async () => {
        setLoading(true);
        setError(null);
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const conf = await IntakeService.getConfig();
            setConfigSources(conf.sources);
            setConfigMaps(conf.fieldMaps);

            const result = await IntakeService.scanSources();
            setRows(result.rows);
            setStats(result.sourceStats);
            setHeadersMap(result.headersMap);
            
            if (!activeSource && result.sourceStats.some(s => s.count > 0)) {
                setActiveSource(result.sourceStats.find(s => s.count > 0)?.name || null);
            }

            if (result.errors.length > 0) setError(`Connection Issues: ${result.errors.join(', ')}`);
        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    // Performance Optimization: Memoized duplicate checking
    const duplicatesMap = useMemo(() => {
        const map: Record<string, Lead> = {};
        if (rows.length > 0 && existingLeads.length > 0) {
            rows.forEach(r => {
                const match = checkDuplicate(r, existingLeads);
                if (match) map[r.id] = match;
            });
        }
        return map;
    }, [rows, existingLeads]);

    // Derived State: Filtering
    const sourceRows = useMemo(() => rows.filter(r => r.sourceLayer === activeSource), [rows, activeSource]);
    
    const filteredRows = useMemo(() => {
        if (activeTab === TAB_READY) return sourceRows.filter(r => r.isValid && !duplicatesMap[r.id]);
        if (activeTab === TAB_ERRORS) return sourceRows.filter(r => !r.isValid);
        if (activeTab === TAB_DUPLICATES) return sourceRows.filter(r => !!duplicatesMap[r.id]);
        return sourceRows;
    }, [sourceRows, activeTab, duplicatesMap]);

    // Derived State: Counts
    const counts = useMemo(() => ({
        ready: sourceRows.filter(r => r.isValid && !duplicatesMap[r.id]).length,
        error: sourceRows.filter(r => !r.isValid).length,
        dupes: sourceRows.filter(r => !!duplicatesMap[r.id]).length
    }), [sourceRows, duplicatesMap]);

    const activeHeaders = activeSource ? (headersMap[activeSource] || []) : [];

    // -- Actions --

    const handleImport = async (row: IntakeRow) => {
        setProcessingId(row.id);
        const res = await IntakeService.pushToCRM([row]);
        setProcessingId(null);
        if (res.successCount > 0) {
            removeRow(row);
            onImportSuccess();
        } else {
            alert(`Failed to import. ${res.errors.join(', ')}`);
        }
    };

    const handleImportSelected = async () => {
        const rowsToImport = filteredRows.filter(r => selectedIds.has(r.id) && r.isValid);
        if (rowsToImport.length === 0) return;

        if (!confirm(`Import ${rowsToImport.length} valid leads?`)) return;

        setImportProgress({ current: 0, total: rowsToImport.length, currentRow: 'Starting...' });
        
        let success = 0;
        const failedErrors: string[] = [];

        for (let i = 0; i < rowsToImport.length; i++) {
            const row = rowsToImport[i];
            setImportProgress({ 
                current: i + 1, 
                total: rowsToImport.length, 
                currentRow: row.companyName || row.contactPerson 
            });
            
            const res = await IntakeService.pushToCRM([row]);
            if (res.successCount > 0) {
                success++;
                // Update local state incrementally to reflect progress in UI
                setRows(prev => prev.filter(r => r.id !== row.id)); 
            } else {
                failedErrors.push(...res.errors);
            }
        }

        setImportProgress(null);
        
        // Update stats
        setStats(prev => prev.map(s => s.name === activeSource ? { ...s, count: Math.max(0, s.count - success) } : s));
        setSelectedIds(new Set());
        onImportSuccess();
        
        if (failedErrors.length > 0) {
            alert(`Imported ${success}/${rowsToImport.length}. Errors:\n${failedErrors.join('\n')}`);
        } else {
            alert(`Successfully imported ${success} leads.`);
        }
    };

    const handleUpdate = (updated: IntakeRow) => {
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    const handleBulkUpdate = (field: string, value: string) => {
        setRows(prev => prev.map(r => {
            if (selectedIds.has(r.id)) {
                const next = { ...r, [field]: value };
                const hasIdentity = !!next.companyName || !!next.contactPerson;
                return { ...next, isValid: hasIdentity, errors: hasIdentity ? [] : ["Identity missing"] };
            }
            return r;
        }));
    };

    const handleDiscard = async (row: IntakeRow) => {
        if (confirm("Discard this lead? It will be marked as 'Ignored' in the source sheet.")) {
            setProcessingId(row.id);
            const success = await IntakeService.ignoreRow(row);
            setProcessingId(null);
            
            if (success) removeRow(row);
            else alert("Failed to update source sheet.");
        }
    };

    const removeRow = (row: IntakeRow) => {
        setRows(prev => prev.filter(r => r.id !== row.id));
        setStats(prev => prev.map(s => s.name === row.sourceLayer ? { ...s, count: s.count - 1 } : s));
        if (selectedIds.has(row.id)) {
            const next = new Set(selectedIds);
            next.delete(row.id);
            setSelectedIds(next);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredRows.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredRows.map(r => r.id)));
    };

    return (
        <div className="flex flex-col h-full bg-[#f5f5f5] animate-fade-in relative overflow-hidden">
            
            {/* 1. Header Area */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-20 sticky top-0 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <UploadCloud size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Intake Inbox</h2>
                        <p className="text-xs text-gray-500">Review & clean incoming leads from {stats.reduce((acc,s)=>acc+s.count,0)} pending items</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!user && (
                        <div className="bg-amber-50 text-amber-800 px-3 py-1.5 rounded text-xs font-bold border border-amber-200 flex items-center gap-2">
                            <Lock size={12} /> Login Required
                            <Button size="sm" variant="ghost" onClick={onLogin} className="h-6 px-2 text-[10px]">Login</Button>
                        </div>
                    )}
                    <Button variant="secondary" onClick={scanSources} isLoading={loading} icon={<RefreshCw size={14} />}>
                        Scan Sources
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 px-6 py-3 text-sm flex items-center gap-2 border-b border-red-100 shrink-0">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                
                {/* 2. Sidebar: Source List */}
                <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Filter size={12}/> Sources
                        </h3>
                        <button onClick={() => setShowAddSource(true)} className="p-1 hover:bg-gray-100 rounded text-blue-600" title="Add Source">
                            <Plus size={14}/>
                        </button>
                    </div>
                    
                    <div className="p-2 space-y-1">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="group flex items-center gap-1">
                                <button
                                    onClick={() => setActiveSource(stat.name)}
                                    className={`flex-1 text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                                        activeSource === stat.name 
                                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-100' 
                                        : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <div className={`w-2 h-2 rounded-full ${stat.status === 'error' ? 'bg-red-400' : stat.count > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="truncate">{stat.name}</span>
                                    </div>
                                    {stat.count > 0 && (
                                        <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded-full text-gray-500 shadow-sm font-bold">
                                            {stat.count}
                                        </span>
                                    )}
                                </button>
                                <button 
                                    className="p-2 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                        const src = configSources.find(s => s.layer === stat.name);
                                        if(src) setShowMappingEditor(src);
                                    }}
                                    title="Map Columns"
                                >
                                    <Settings size={14}/>
                                </button>
                            </div>
                        ))}
                        {stats.length === 0 && !loading && (
                            <div className="p-4 text-center text-xs text-gray-400 italic">No sources found.</div>
                        )}
                    </div>
                </div>

                {/* 3. Main Workspace */}
                <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
                    
                    {/* Toolbar */}
                    {activeSource && (
                        <div className="px-6 py-3 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50/50 gap-4 shrink-0">
                            <div className="flex items-center gap-6">
                                <h3 className="font-bold text-gray-800 text-lg hidden sm:block">{activeSource}</h3>
                                
                                {/* Smart Buckets Navigation */}
                                <div className="flex bg-gray-200/50 p-1 rounded-lg">
                                    <button onClick={() => setActiveTab(TAB_ALL)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === TAB_ALL ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                        All ({sourceRows.length})
                                    </button>
                                    <button onClick={() => setActiveTab(TAB_READY)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeTab === TAB_READY ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <CheckCircle2 size={12} className={activeTab === TAB_READY ? "text-green-600" : ""}/> Ready ({counts.ready})
                                    </button>
                                    <button onClick={() => setActiveTab(TAB_ERRORS)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeTab === TAB_ERRORS ? 'bg-white shadow text-red-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <XCircle size={12} className={activeTab === TAB_ERRORS ? "text-red-600" : ""}/> Errors ({counts.error})
                                    </button>
                                    <button onClick={() => setActiveTab(TAB_DUPLICATES)} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${activeTab === TAB_DUPLICATES ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <UserPlus size={12} className={activeTab === TAB_DUPLICATES ? "text-amber-600" : ""}/> Dupes ({counts.dupes})
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex bg-white border border-gray-200 p-0.5 rounded-lg text-xs">
                                    <button onClick={() => setViewMode('crm')} className={`px-2 py-1 rounded ${viewMode === 'crm' ? 'bg-gray-100 text-gray-800 font-bold' : 'text-gray-400'}`} title="CRM View"><LayoutGrid size={14}/></button>
                                    <button onClick={() => setViewMode('source')} className={`px-2 py-1 rounded ${viewMode === 'source' ? 'bg-gray-100 text-gray-800 font-bold' : 'text-gray-400'}`} title="Source View"><Columns size={14}/></button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-auto bg-gray-50/30 relative">
                        {!activeSource ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <UploadCloud size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Select a source to start intake</p>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500 opacity-20" />
                                <p>Bucket empty. Nice work!</p>
                            </div>
                        ) : viewMode === 'source' ? (
                            /* RAW TABLE VIEW */
                            <div className="w-full overflow-x-auto bg-white">
                                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                                    <thead className="bg-gray-50 font-bold text-gray-600 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 border-r w-10 text-center bg-gray-50 sticky left-0 z-20">#</th>
                                            {activeHeaders.map((h, i) => <th key={i} className="px-4 py-3 border-r min-w-[120px]">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRows.map((row, i) => (
                                            <tr key={row.id} className="hover:bg-blue-50/50">
                                                <td className="px-4 py-2 border-r text-center bg-gray-50 sticky left-0 font-mono text-gray-400">{i + 1}</td>
                                                {activeHeaders.map((h, j) => (
                                                    <td key={j} className="px-4 py-2 border-r text-gray-700 max-w-[200px] truncate" title={String(row.rawData[h] || '')}>
                                                        {row.rawData[h] || <span className="text-gray-300 italic">null</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* CRM SMART TABLE VIEW */
                            <div className="min-w-[1000px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-center w-12 bg-gray-50">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.size > 0 && selectedIds.size === filteredRows.length}
                                                    onChange={toggleSelectAll}
                                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-2 py-3 text-center w-12 bg-gray-50">Stat</th>
                                            <th className="px-2 py-3 w-24 bg-gray-50">Date</th>
                                            <th className="px-2 py-3 min-w-[180px] bg-gray-50">Company Name <span className="text-red-500">*</span></th>
                                            <th className="px-2 py-3 min-w-[140px] bg-gray-50">Contact Person</th>
                                            <th className="px-2 py-3 w-32 bg-gray-50">Phone</th>
                                            <th className="px-2 py-3 w-20 text-center bg-gray-50">Expand</th>
                                            <th className="px-2 py-3 text-right w-20 pr-4 bg-gray-50">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {filteredRows.map(row => (
                                            <IntakeTableRow 
                                                key={row.id} 
                                                row={row}
                                                headers={activeHeaders}
                                                isSelected={selectedIds.has(row.id)}
                                                onToggleSelect={() => toggleSelect(row.id)}
                                                onUpdate={handleUpdate}
                                                onImport={() => handleImport(row)}
                                                onDiscard={() => handleDiscard(row)}
                                                isSaving={processingId === row.id}
                                                duplicateMatch={duplicatesMap[row.id]}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        <BulkEditToolbar 
                            selectedCount={selectedIds.size}
                            onClear={() => setSelectedIds(new Set())}
                            onApply={handleBulkUpdate}
                            onImportAll={handleImportSelected}
                        />
                    </div>
                </div>
            </div>

            {/* IMPORT PROGRESS OVERLAY */}
            {importProgress && (
                <div className="fixed bottom-8 right-8 z-50 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 w-80 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-800">Importing Leads...</span>
                        <span className="text-xs font-mono text-gray-500">{importProgress.current} / {importProgress.total}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 truncate">
                        Processing: <span className="font-medium text-gray-800">{importProgress.currentRow}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-300 ease-out"
                            style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Modals */}
            {showMappingEditor && (
                <MappingEditorModal 
                    isOpen={!!showMappingEditor}
                    onClose={() => setShowMappingEditor(null)}
                    source={showMappingEditor}
                    currentRules={configMaps.filter(m => m.sourceLayer === showMappingEditor?.layer)}
                />
            )}
            <AddSourceModal 
                isOpen={showAddSource}
                onClose={() => setShowAddSource(false)}
                onSuccess={(newSource) => { scanSources(); setShowMappingEditor(newSource); }}
            />
        </div>
    );
};
