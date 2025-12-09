
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SourceConfig } from '../types';
import { IntakeService } from '../services/intakeService';
import { fetchDynamicSheet } from '../services/sheetService';
import { 
    Table, Database, Plus, Trash2, Edit2, Play, Eye, 
    ToggleLeft, ToggleRight, Loader2, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { AddSourceModal } from './AddSourceModal';
import { SourceSettingsModal } from './SourceSettingsModal';

interface IntakeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSourceUpdated: () => void;
}

export const IntakeManagerModal: React.FC<IntakeManagerModalProps> = ({ isOpen, onClose, onSourceUpdated }) => {
    const [sources, setSources] = useState<SourceConfig[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{ source: string, headers: string[], rows: any[][] } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    
    // Sub-modals
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState<SourceConfig | null>(null);
    const [configMaps, setConfigMaps] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) loadSources();
    }, [isOpen]);

    const loadSources = async () => {
        setLoading(true);
        try {
            const res = await IntakeService.fetchIntakeConfig();
            if (res.success) {
                setSources(res.sources);
                setConfigMaps(res.mappings);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleToggleActive = async (source: SourceConfig) => {
        if (!source._rowIndex) return;
        const newState = !source.isActive;
        const success = await IntakeService.updateSourceStatus(source._rowIndex, newState);
        if (success) {
            setSources(prev => prev.map(s => s.layer === source.layer ? { ...s, isActive: newState } : s));
            onSourceUpdated();
        } else {
            alert("Failed to update status.");
        }
    };

    const handleDelete = async (source: SourceConfig) => {
        if (!source._rowIndex) return;
        if (!confirm(`Are you sure you want to delete ${source.layer}? This cannot be undone easily.`)) return;
        
        const success = await IntakeService.deleteSourceConfig(source._rowIndex);
        if (success) {
            setSources(prev => prev.filter(s => s.layer !== source.layer));
            onSourceUpdated();
        } else {
            alert("Failed to delete source.");
        }
    };

    const handlePreview = async (source: SourceConfig) => {
        if (previewData?.source === source.layer) {
            setPreviewData(null); // Toggle off
            return;
        }
        
        setPreviewLoading(true);
        setPreviewData(null);
        
        const res = await fetchDynamicSheet(source.sheetId, source.tab);
        setPreviewLoading(false);
        
        if (res.success) {
            setPreviewData({
                source: source.layer,
                headers: res.headers,
                rows: res.rows.slice(0, 5) // Top 5 rows
            });
        } else {
            alert("Failed to fetch data preview. Check Sheet ID and Tab Name.");
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Intake Configuration & Sources">
                <div className="space-y-6 min-h-[60vh] flex flex-col">
                    
                    {/* Header Controls */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div>
                            <h3 className="font-bold text-gray-800 text-sm">Configured Sources</h3>
                            <p className="text-xs text-gray-500">Manage where your leads come from.</p>
                        </div>
                        <Button size="sm" icon={<Plus size={14}/>} onClick={() => setShowAdd(true)}>
                            Add Source
                        </Button>
                    </div>

                    {/* Source List */}
                    {loading ? (
                        <div className="flex justify-center py-10 text-gray-400">
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    ) : sources.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <Database size={32} className="mx-auto mb-2 opacity-50"/>
                            <p>No sources configured.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {sources.map(source => (
                                <div key={source.layer} className={`border rounded-lg transition-all ${!source.isActive ? 'bg-gray-50 opacity-80' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    {/* Source Card Header */}
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${source.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                                <Database size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-gray-800 text-sm">{source.layer}</h4>
                                                    <Badge variant={source.isActive ? "success" : "neutral"} className="text-[10px]">
                                                        {source.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                                    <span className="bg-gray-100 px-1.5 rounded">{source.type}</span>
                                                    <span>•</span>
                                                    <span className="font-mono text-gray-400 truncate max-w-[120px]" title={source.sheetId}>{source.sheetId}</span>
                                                    <span>/</span>
                                                    <span className="font-medium">{source.tab}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleToggleActive(source)}
                                                className={`p-1.5 rounded transition-colors ${source.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                                title={source.isActive ? "Deactivate" : "Activate"}
                                            >
                                                {source.isActive ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                                            </button>
                                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                            <button 
                                                onClick={() => handlePreview(source)} 
                                                className={`p-1.5 rounded hover:bg-blue-50 hover:text-blue-600 ${previewData?.source === source.layer ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                title="Preview Data"
                                            >
                                                <Eye size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => setShowEdit(source)} 
                                                className="p-1.5 rounded hover:bg-blue-50 hover:text-blue-600 text-gray-400"
                                                title="Configure & Map"
                                            >
                                                <Edit2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(source)}
                                                className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 text-gray-300"
                                                title="Delete Source"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Data Preview Drawer */}
                                    {previewData?.source === source.layer && (
                                        <div className="border-t border-gray-100 bg-gray-50/50 p-4 animate-fade-in">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                    <Table size={12}/> Live Preview (Top 5 Rows)
                                                </h5>
                                                <button onClick={() => setPreviewData(null)} className="text-[10px] text-blue-600 hover:underline">Close Preview</button>
                                            </div>
                                            
                                            <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-inner max-h-48">
                                                <table className="w-full text-left text-[10px] whitespace-nowrap">
                                                    <thead className="bg-gray-100 font-bold text-gray-600 sticky top-0">
                                                        <tr>
                                                            {previewData.headers.map((h, i) => (
                                                                <th key={i} className="px-3 py-2 border-b border-r last:border-r-0">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 text-gray-700 font-mono">
                                                        {previewData.rows.map((row, rIdx) => (
                                                            <tr key={rIdx}>
                                                                {previewData.headers.map((_, cIdx) => (
                                                                    <td key={cIdx} className="px-3 py-1.5 border-r last:border-r-0 truncate max-w-[150px]">
                                                                        {row[cIdx] || <span className="text-gray-300">-</span>}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {previewLoading && previewData === null && (
                                        <div className="p-4 text-center text-xs text-gray-400 bg-gray-50/50 border-t border-gray-100">
                                            <Loader2 size={14} className="animate-spin inline mr-2"/> Fetching data...
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Helper Modals */}
            <AddSourceModal 
                isOpen={showAdd} 
                onClose={() => setShowAdd(false)}
                onSuccess={() => { loadSources(); onSourceUpdated(); }}
            />
            {showEdit && (
                <SourceSettingsModal 
                    isOpen={!!showEdit}
                    onClose={() => setShowEdit(null)}
                    source={showEdit}
                    currentRules={configMaps.filter(m => m.sourceLayer === showEdit.layer)}
                />
            )}
        </>
    );
};
