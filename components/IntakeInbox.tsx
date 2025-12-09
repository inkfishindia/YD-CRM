
import React, { useState, useEffect, useMemo } from 'react';
import { scanAllSources, checkDuplicates, importRows, IntakeService, SourceStat } from '../services/intakeService';
import { IntakeRow, GoogleUser, SourceConfig, FieldMapRule, Lead } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SourceSettingsModal } from './SourceSettingsModal';
import { AddSourceModal } from './AddSourceModal';
import { IntakeManagerModal } from './IntakeManagerModal';
import { 
    AlertTriangle, RefreshCw, UploadCloud, Save, Trash2, CheckCircle2, 
    ChevronDown, ChevronUp, Mail, Phone, Lock, Filter, LayoutGrid, 
    Table as TableIcon, XCircle, FileSpreadsheet, Play, Plus, Settings, Loader2, BookOpen, Columns, UserPlus, ArrowRight, AlertOctagon, Database, Edit2, Sliders, Layers, Tag, Box, Activity
} from 'lucide-react';

interface IntakeInboxProps {
    user: GoogleUser | null;
    onImportSuccess: () => void;
    onLogin: () => void;
    existingLeads?: Lead[]; 
}

const TAB_ALL = 'all';
const TAB_READY = 'ready';
const TAB_ERRORS = 'errors';
const TAB_DUPLICATES = 'duplicates';

export const IntakeInbox: React.FC<IntakeInboxProps> = ({ user, onImportSuccess, onLogin, existingLeads = [] }) => {
    const [rows, setRows] = useState<IntakeRow[]>([]);
    const [stats, setStats] = useState<SourceStat[]>([]);
    const [activeSource, setActiveSource] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>(TAB_READY);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Config & UI State
    const [configSources, setConfigSources] = useState<SourceConfig[]>([]);
    const [showSourceSettings, setShowSourceSettings] = useState<SourceConfig | null>(null);
    const [showAddSource, setShowAddSource] = useState(false);
    const [showManager, setShowManager] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Initial Scan
    useEffect(() => {
        if (user) scanSources();
    }, [user]);

    const scanSources = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Scan (fetches and maps)
            const result = await scanAllSources();
            let scannedRows = result.rows;
            
            // 2. Duplicate Check
            if (scannedRows.length > 0) {
                scannedRows = await checkDuplicates(scannedRows);
            }
            
            setRows(scannedRows);
            setStats(result.stats);
            
            // Set active source if not set
            if (!activeSource && result.stats.length > 0) {
                const firstWithData = result.stats.find(s => s.count > 0);
                if (firstWithData) setActiveSource(firstWithData.name);
                else setActiveSource(result.stats[0]?.name || null);
            }

            // Fetch Config for Menus
            const conf = await IntakeService.fetchIntakeConfig();
            if (conf.success) setConfigSources(conf.sources);

        } catch (e: any) {
            setError(e.message);
        }
        setLoading(false);
    };

    // Filter Logic
    const sourceRows = useMemo(() => rows.filter(r => r.sourceLayer === activeSource), [rows, activeSource]);
    
    const filteredRows = useMemo(() => {
        if (activeTab === TAB_READY) return sourceRows.filter(r => r.isValid && !r.isDuplicate);
        if (activeTab === TAB_ERRORS) return sourceRows.filter(r => !r.isValid);
        if (activeTab === TAB_DUPLICATES) return sourceRows.filter(r => r.isDuplicate);
        return sourceRows;
    }, [sourceRows, activeTab]);

    // Counts
    const counts = useMemo(() => ({
        all: sourceRows.length,
        ready: sourceRows.filter(r => r.isValid && !r.isDuplicate).length,
        error: sourceRows.filter(r => !r.isValid).length,
        dupes: sourceRows.filter(r => r.isDuplicate).length
    }), [sourceRows]);

    // Actions
    const handleImport = async (row: IntakeRow) => {
        setProcessingId(row.id);
        const res = await importRows([row], user?.name);
        setProcessingId(null);
        if (res.successCount > 0) {
            setRows(prev => prev.filter(r => r.id !== row.id));
            onImportSuccess();
        } else {
            alert(`Import Failed: ${res.errors.join(', ')}`);
        }
    };

    const handleImportBulk = async () => {
        const toImport = filteredRows.filter(r => selectedIds.has(r.id));
        if (toImport.length === 0) return;
        
        if (!confirm(`Import ${toImport.length} leads?`)) return;
        
        setLoading(true);
        const res = await importRows(toImport, user?.name);
        setLoading(false);
        
        if (res.successCount > 0) {
            setRows(prev => prev.filter(r => !selectedIds.has(r.id)));
            setSelectedIds(new Set());
            onImportSuccess();
            alert(`Imported ${res.successCount} leads successfully.`);
        } else {
            alert(`Bulk Import Failed: ${res.errors.join(', ')}`);
        }
    };

    const handleDiscard = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
        if (selectedIds.has(id)) {
            const next = new Set(selectedIds);
            next.delete(id);
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
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Intake Engine</h2>
                    <p className="text-sm text-gray-500">Scan connected sheets and import leads.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowManager(true)} icon={<Sliders size={14}/>}>
                        Sources
                    </Button>
                    <Button variant="secondary" onClick={scanSources} isLoading={loading} icon={<RefreshCw size={14}/>}>
                        Scan Now
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Sources */}
                <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase">Active Sources</span>
                    </div>
                    <div className="p-2 space-y-1">
                        {stats.map((stat, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveSource(stat.name)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${
                                    activeSource === stat.name ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <span>{stat.name}</span>
                                {stat.count > 0 && (
                                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{stat.count}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Tabs */}
                    {activeSource && (
                        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-4">
                            <h3 className="font-bold text-gray-800">{activeSource}</h3>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {[
                                    { id: TAB_READY, label: `Ready (${counts.ready})`, color: 'text-green-600' },
                                    { id: TAB_ERRORS, label: `Errors (${counts.error})`, color: 'text-red-600' },
                                    { id: TAB_DUPLICATES, label: `Dupes (${counts.dupes})`, color: 'text-amber-600' },
                                    { id: TAB_ALL, label: `All (${counts.all})`, color: 'text-gray-600' },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                            activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <span className={activeTab === tab.id ? tab.color : ''}>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                            
                            {selectedIds.size > 0 && (
                                <div className="ml-auto flex items-center gap-2 animate-fade-in">
                                    <span className="text-xs font-bold text-gray-500">{selectedIds.size} Selected</span>
                                    <Button size="sm" variant="primary" onClick={handleImportBulk}>Import Selected</Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Table */}
                    <div className="flex-1 overflow-auto p-6">
                        {filteredRows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <CheckCircle2 size={48} className="mb-2 opacity-20"/>
                                <p>No leads in this bucket.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 w-10">
                                                <input type="checkbox" checked={selectedIds.size === filteredRows.length} onChange={toggleSelectAll} />
                                            </th>
                                            <th className="px-4 py-3">Source Data</th>
                                            <th className="px-4 py-3">Mapped Identity</th>
                                            <th className="px-4 py-3">Contact</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRows.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-center">
                                                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} />
                                                </td>
                                                <td className="px-4 py-3 w-1/3">
                                                    <div className="text-xs font-mono text-gray-500 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                                                        {Object.entries(row.rawData).slice(0, 3).map(([k, v]) => (
                                                            <div key={k} className="truncate"><span className="font-bold">{k}:</span> {v}</div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">{row.companyName || <span className="text-red-400 italic">Missing</span>}</div>
                                                    <div className="text-xs text-gray-500">{row.contactPerson}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <div>{row.number}</div>
                                                    <div className="text-gray-400">{row.email}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {!row.isValid ? (
                                                        <Badge variant="danger">Invalid</Badge>
                                                    ) : row.isDuplicate ? (
                                                        <Badge variant="warning">Duplicate</Badge>
                                                    ) : (
                                                        <Badge variant="success">Ready</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleDiscard(row.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={16}/></button>
                                                        <button 
                                                            onClick={() => handleImport(row)} 
                                                            disabled={!row.isValid || row.isDuplicate} 
                                                            className={`p-1 rounded ${(!row.isValid || row.isDuplicate) ? 'text-gray-300' : 'hover:bg-green-50 text-green-600'}`}
                                                        >
                                                            {processingId === row.id ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Config Modals */}
            {showManager && <IntakeManagerModal isOpen={showManager} onClose={() => setShowManager(false)} onSourceUpdated={scanSources} />}
        </div>
    );
};
