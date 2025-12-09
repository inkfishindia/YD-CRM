
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { fetchRemoteHeaders } from '../services/sheetService';
import { IntakeService } from '../services/intakeService';
import { FieldMapRule, SourceConfig, IntakeRow } from '../types';
import { Loader2, Play, AlertTriangle, CheckCircle2, FileText, Database, ArrowRight, Settings, Wand2, RefreshCw } from 'lucide-react';

interface SourceSettingsModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    source: SourceConfig | null; 
    currentRules: FieldMapRule[];
}

interface MappingState {
    header: string;
    transform: string;
}

export const SourceSettingsModal: React.FC<SourceSettingsModalProps> = ({ isOpen, onClose, source, currentRules }) => {
    const [activeTab, setActiveTab] = useState<'test' | 'map' | 'config'>('map');
    
    // --- Mapping State ---
    const [localMappings, setLocalMappings] = useState<Record<string, MappingState>>({});
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [loadingHeaders, setLoadingHeaders] = useState(false);
    const [saving, setSaving] = useState(false);

    // --- Testing State ---
    const [testResults, setTestResults] = useState<{ raw: any, parsed: IntakeRow }[]>([]);
    const [testing, setTesting] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);

    // --- Config State ---
    const [configData, setConfigData] = useState<Partial<SourceConfig>>({});

    const standardFields = [
        { key: 'companyName', label: 'Company Name', required: true, aliases: ['company', 'business', 'firm', 'organization', 'client'] },
        { key: 'contactPerson', label: 'Contact Person', required: false, aliases: ['contact', 'name', 'full name', 'person', 'customer'] },
        { key: 'number', label: 'Phone Number', required: false, aliases: ['phone', 'mobile', 'cell', 'tel', 'whatsapp', 'contact no'] },
        { key: 'email', label: 'Email Address', required: false, aliases: ['email', 'mail', 'e-mail'] },
        { key: 'city', label: 'City / Location', required: false, aliases: ['city', 'town', 'location', 'address', 'region'] },
        { key: 'estimatedQty', label: 'Quantity', required: false, aliases: ['qty', 'quantity', 'units', 'volume', 'count', 'pieces'] },
        { key: 'productType', label: 'Product Type', required: false, aliases: ['product', 'item', 'type', 'goods', 'commodity', 'apparel'] },
        { key: 'orderInfo', label: 'Requirements', required: false, aliases: ['requirements', 'details', 'specs', 'order info', 'description'] },
        { key: 'remarks', label: 'Notes / Remarks', required: false, aliases: ['notes', 'remarks', 'comments', 'info'] },
        { key: 'date', label: 'Date Column', required: false, aliases: ['date', 'created', 'timestamp', 'submitted'] },
        { key: 'sourceRowId', label: 'Unique ID', required: false, aliases: ['id', 'uuid', 'ref'] }
    ];

    useEffect(() => {
        if (source && isOpen) {
            // Init Mapping from existing rules
            const map: Record<string, MappingState> = {};
            currentRules.forEach(r => {
                map[r.intakeField] = { header: r.sourceHeader, transform: r.transform || '' };
            });
            setLocalMappings(map);
            setConfigData(source);

            // Fetch Headers immediately
            fetchHeaders();
        }
    }, [source, isOpen]); // removed currentRules to avoid reset on saving

    const fetchHeaders = () => {
        if (!source) return;
        setLoadingHeaders(true);
        fetchRemoteHeaders(source.sheetId, source.tab || 'Sheet1')
            .then(res => {
                if (res.success && res.headers) {
                    setAvailableHeaders(res.headers);
                }
            })
            .catch(err => console.error("Failed to fetch headers", err))
            .finally(() => setLoadingHeaders(false));
    };

    const handleAutoMap = () => {
        const newMap = { ...localMappings };
        let matchCount = 0;

        standardFields.forEach(field => {
            // Skip if already mapped
            if (newMap[field.key]?.header) return;

            // Find best match
            const match = availableHeaders.find(h => {
                const lowerH = h.toLowerCase();
                // Direct match
                if (lowerH === field.key.toLowerCase()) return true;
                // Alias match
                if (field.aliases.some(alias => lowerH.includes(alias))) return true;
                return false;
            });

            if (match) {
                newMap[field.key] = { header: match, transform: '' };
                
                // Auto-apply useful transforms
                if (field.key === 'number') newMap[field.key].transform = 'normalizePhone';
                if (field.key === 'companyName' || field.key === 'contactPerson') newMap[field.key].transform = 'titleCase';
                
                matchCount++;
            }
        });

        setLocalMappings(newMap);
        if (matchCount > 0) alert(`Auto-mapped ${matchCount} fields! Verify them below.`);
        else alert("No new automatic matches found.");
    };

    const handleSaveMapping = async () => {
        if (!source) return;
        setSaving(true);
        const newMappings = Object.entries(localMappings)
            .filter(([_, val]) => (val as MappingState).header && (val as MappingState).header.trim() !== '')
            .map(([field, val]) => ({
                sourceHeader: (val as MappingState).header,
                intakeField: field,
                transform: (val as MappingState).transform,
                isRequired: field === 'companyName'
            }));
        
        await IntakeService.saveFieldMappings(source.layer, newMappings);
        setSaving(false);
        setActiveTab('test'); // Move to test tab after save
    };

    const handleRunTest = async () => {
        if (!source) return;
        setTesting(true);
        setTestError(null);
        setTestResults([]);

        // Build temporary rules from current UI state
        const tempRules: FieldMapRule[] = Object.entries(localMappings).map(([field, val]) => ({
            id: 'temp',
            sourceLayer: source.layer,
            sourceHeader: (val as MappingState).header,
            intakeField: field,
            transform: (val as MappingState).transform,
            isRequired: field === 'companyName',
            targetTable: 'Leads',
            notes: ''
        }));

        const res = await IntakeService.previewSource(source, tempRules);
        setTesting(false);
        
        if (res.success) {
            setTestResults(res.results);
        } else {
            setTestError(res.error || "Test failed");
        }
    };

    const updateMapping = (field: string, key: 'header' | 'transform', value: string) => {
        setLocalMappings(prev => ({
            ...prev,
            [field]: { ...prev[field], [key]: value }
        }));
    };

    if (!source) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Source Settings: ${source.layer}`}>
            <div className="flex flex-col h-[80vh] bg-white">
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 shrink-0 px-2 bg-gray-50">
                    <button 
                        onClick={() => setActiveTab('map')} 
                        className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'map' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Database size={14}/> Map Columns
                    </button>
                    <button 
                        onClick={() => setActiveTab('test')} 
                        className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'test' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Play size={14}/> Test Logic
                    </button>
                    <button 
                        onClick={() => setActiveTab('config')} 
                        className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'config' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings size={14}/> Config
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    
                    {/* MAP TAB */}
                    {activeTab === 'map' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold">Intelligent Header Mapping</p>
                                    <p className="text-xs mt-1 opacity-80">
                                        Use 'Auto Map' to guess fields, or manually select from the sheet headers.
                                    </p>
                                    {loadingHeaders && <div className="mt-2 flex items-center gap-2 text-blue-600 font-medium"><Loader2 size={12} className="animate-spin"/> Refreshing headers...</div>}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={fetchHeaders} icon={<RefreshCw size={14}/>}>
                                        Refresh Headers
                                    </Button>
                                    <Button size="sm" variant="primary" onClick={handleAutoMap} icon={<Wand2 size={14}/>}>
                                        Auto Map
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 text-xs uppercase">
                                        <tr>
                                            <th className="px-4 py-3 w-1/3">System Field</th>
                                            <th className="px-4 py-3 w-1/3">Source Header</th>
                                            <th className="px-4 py-3 w-1/3">Transform</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {standardFields.map(f => (
                                            <tr key={f.key} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900">{f.label}</div>
                                                    <div className="text-[10px] font-mono text-gray-400" title="System Field Key">{f.key}</div>
                                                    {f.required && <span className="text-[10px] text-red-500 font-bold mt-0.5 block">Required</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select 
                                                        className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 ${localMappings[f.key]?.header ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-gray-300 text-gray-500'}`}
                                                        value={localMappings[f.key]?.header || ''}
                                                        onChange={e => updateMapping(f.key, 'header', e.target.value)}
                                                    >
                                                        <option value="">-- Not Mapped --</option>
                                                        {availableHeaders.map((h, i) => (
                                                            <option key={i} value={h}>{h}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select 
                                                        className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 bg-white"
                                                        value={localMappings[f.key]?.transform || ''}
                                                        onChange={e => updateMapping(f.key, 'transform', e.target.value)}
                                                    >
                                                        <option value="">None</option>
                                                        <option value="titleCase">Title Case</option>
                                                        <option value="upperCase">UPPER CASE</option>
                                                        <option value="lowerCase">lower case</option>
                                                        <option value="normalizePhone">Clean Phone (+91)</option>
                                                        <option value="dateParse">Parse Date</option>
                                                        <option value="parseInt">Parse Number</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <Button onClick={handleSaveMapping} isLoading={saving} className="bg-green-600 hover:bg-green-700 shadow-lg">Save & Continue</Button>
                            </div>
                        </div>
                    )}

                    {/* TEST TAB */}
                    {activeTab === 'test' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">Preview Results</h4>
                                    <p className="text-xs text-gray-500">Fetches live data from the sheet using current mapping logic.</p>
                                </div>
                                <Button onClick={handleRunTest} isLoading={testing} icon={<Play size={14}/>}>
                                    Run Test Fetch
                                </Button>
                            </div>

                            {testError && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                                    <AlertTriangle size={16}/> {testError}
                                </div>
                            )}

                            <div className="space-y-4">
                                {testResults.map((res, i) => (
                                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 flex justify-between items-center">
                                            <span>Row {i + 1}</span>
                                            {res.parsed.isValid ? (
                                                <span className="text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-200"><CheckCircle2 size={12}/> Valid Lead</span>
                                            ) : (
                                                <span className="text-red-600 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-200"><AlertTriangle size={12}/> Invalid Data</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 text-xs divide-x divide-gray-100">
                                            <div className="p-3 bg-gray-50/50">
                                                <div className="font-bold text-gray-400 mb-2 uppercase tracking-wider">Raw Sheet Data</div>
                                                <div className="space-y-1">
                                                    {Object.entries(res.raw).slice(0,6).map(([k, v]) => (
                                                        <div key={k} className="flex justify-between gap-2">
                                                            <span className="text-gray-500 truncate w-1/2" title={k}>{k}:</span>
                                                            <span className="text-gray-900 font-mono truncate w-1/2 text-right" title={String(v)}>{String(v)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white">
                                                <div className="font-bold text-blue-600 mb-2 uppercase tracking-wider">Mapped System Data</div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between"><span className="text-gray-500">Company:</span> <span className="font-bold text-gray-800">{res.parsed.companyName}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Contact:</span> <span className="font-bold text-gray-800">{res.parsed.contactPerson}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="font-bold text-gray-800">{res.parsed.number}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-500">Qty:</span> <span className="font-bold text-gray-800">{res.parsed.estimatedQty}</span></div>
                                                    {res.parsed.errors.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-red-100 text-red-600 font-medium">
                                                            Missing: {res.parsed.errors.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {testResults.length === 0 && !testing && !testError && (
                                    <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                        Click 'Run Test Fetch' to verify your mappings.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CONFIG TAB */}
                    {activeTab === 'config' && (
                        <div className="space-y-6 max-w-md mx-auto py-4">
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source Name</label>
                                    <input className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed" value={configData.layer} readOnly />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Spreadsheet ID</label>
                                    <div className="relative">
                                        <input className="w-full text-xs font-mono border border-gray-300 rounded px-3 py-2 pr-8 bg-gray-50" value={configData.sheetId} readOnly />
                                        <a href={`https://docs.google.com/spreadsheets/d/${configData.sheetId}`} target="_blank" rel="noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700">
                                            <ArrowRight size={14}/>
                                        </a>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tab Name</label>
                                    <input className="w-full text-sm border border-gray-300 rounded px-3 py-2" value={configData.tab} readOnly />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Source Type</label>
                                    <input className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-gray-50" value={configData.type} readOnly />
                                </div>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg text-xs text-yellow-800 border border-yellow-200">
                                <strong>Note:</strong> To change connection details (ID/Tab), please delete this source and recreate it. Mappings will need to be re-done.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
