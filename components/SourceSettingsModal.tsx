
import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { saveFieldMappings, fetchRemoteHeaders } from '../services/sheetService';
import { IntakeService } from '../services/intakeService';
import { FieldMapRule, SourceConfig, IntakeRow } from '../types';
import { Loader2, Play, AlertTriangle, CheckCircle2, FileText, Database, ArrowRight, Settings } from 'lucide-react';

interface SourceSettingsModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    source: SourceConfig | null; 
    currentRules: FieldMapRule[];
}

export const SourceSettingsModal: React.FC<SourceSettingsModalProps> = ({ isOpen, onClose, source, currentRules }) => {
    const [activeTab, setActiveTab] = useState<'test' | 'map' | 'config'>('test');
    
    // --- Mapping State ---
    const [localRules, setLocalRules] = useState<Record<string, string>>({});
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [loadingHeaders, setLoadingHeaders] = useState(false);
    const [saving, setSaving] = useState(false);

    // --- Testing State ---
    const [testResults, setTestResults] = useState<{ raw: any, parsed: IntakeRow }[]>([]);
    const [testing, setTesting] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);

    // --- Config State ---
    const [configData, setConfigData] = useState<Partial<SourceConfig>>({});

    useEffect(() => {
        if (source && isOpen) {
            // Init Mapping
            const map: Record<string, string> = {};
            currentRules.forEach(r => map[r.intakeField] = r.sourceHeader);
            setLocalRules(map);
            setConfigData(source);

            // Fetch Headers
            setLoadingHeaders(true);
            fetchRemoteHeaders(source.sheetId, source.tab || 'Sheet1')
                .then(res => {
                    if (res.success && res.headers) {
                        setAvailableHeaders(res.headers);
                    }
                })
                .catch(err => console.error("Failed to fetch headers", err))
                .finally(() => setLoadingHeaders(false));
        }
    }, [source, isOpen, currentRules]);

    const handleSaveMapping = async () => {
        if (!source) return;
        setSaving(true);
        const newMappings = Object.entries(localRules)
            .filter(([_, val]) => val && (val as string).trim() !== '')
            .map(([field, header]) => ({
                sourceHeader: header as string,
                intakeField: field,
                transform: '',
                isRequired: field === 'companyName'
            }));
        
        await saveFieldMappings(source.layer, newMappings);
        setSaving(false);
        // Don't close immediately, give feedback
        alert("Mappings saved! Switch to 'Test' tab to verify.");
    };

    const handleRunTest = async () => {
        if (!source) return;
        setTesting(true);
        setTestError(null);
        setTestResults([]);

        // Build temporary rules from current UI state to test unsaved mappings
        const tempRules: FieldMapRule[] = Object.entries(localRules).map(([field, header]) => ({
            id: 'temp',
            sourceLayer: source.layer,
            sourceHeader: header,
            intakeField: field,
            transform: '',
            isRequired: field === 'companyName',
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

    const standardFields = [
        { key: 'companyName', label: 'Company Name *' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'number', label: 'Phone Number' },
        { key: 'email', label: 'Email' },
        { key: 'city', label: 'City' },
        { key: 'estimatedQty', label: 'Quantity' },
        { key: 'productType', label: 'Product' },
        { key: 'remarks', label: 'Notes' },
        { key: 'date', label: 'Date Column' },
        { key: 'sourceRowId', label: 'Unique ID (Optional)' }
    ];

    if (!source) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Source Settings: ${source.layer}`}>
            <div className="flex flex-col h-[70vh]">
                
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                    <button 
                        onClick={() => setActiveTab('test')} 
                        className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'test' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Play size={14}/> Test & Check
                    </button>
                    <button 
                        onClick={() => setActiveTab('map')} 
                        className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'map' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Database size={14}/> Map Columns
                    </button>
                    <button 
                        onClick={() => setActiveTab('config')} 
                        className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Settings size={14}/> Configuration
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                    
                    {/* TEST TAB */}
                    {activeTab === 'test' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold">Verify your data mapping</p>
                                    <p className="text-xs mt-1">Fetches the top 3 rows from the sheet and applies current mapping rules.</p>
                                </div>
                                <Button onClick={handleRunTest} isLoading={testing} icon={<Play size={14}/>}>
                                    Fetch Sample
                                </Button>
                            </div>

                            {testError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2">
                                    <AlertTriangle size={16}/> {testError}
                                </div>
                            )}

                            <div className="space-y-4">
                                {testResults.map((res, i) => (
                                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 flex justify-between">
                                            <span>Row {i + 1}</span>
                                            {res.parsed.isValid ? (
                                                <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Valid</span>
                                            ) : (
                                                <span className="text-red-600 flex items-center gap-1"><AlertTriangle size={12}/> Invalid</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 text-xs">
                                            <div className="p-3 border-r border-gray-100 bg-gray-50/30">
                                                <div className="font-bold text-gray-400 mb-2 uppercase tracking-wider">Raw Data</div>
                                                <pre className="whitespace-pre-wrap text-gray-600 font-mono overflow-hidden">
                                                    {JSON.stringify(res.raw, null, 2)}
                                                </pre>
                                            </div>
                                            <div className="p-3">
                                                <div className="font-bold text-gray-400 mb-2 uppercase tracking-wider">Parsed CRM Lead</div>
                                                <div className="space-y-1">
                                                    <div><span className="font-bold text-gray-700">Company:</span> {res.parsed.companyName || <span className="text-red-400">Missing</span>}</div>
                                                    <div><span className="font-bold text-gray-700">Contact:</span> {res.parsed.contactPerson}</div>
                                                    <div><span className="font-bold text-gray-700">Phone:</span> {res.parsed.number}</div>
                                                    <div><span className="font-bold text-gray-700">Email:</span> {res.parsed.email}</div>
                                                    <div><span className="font-bold text-gray-700">Qty:</span> {res.parsed.estimatedQty}</div>
                                                    {res.parsed.errors.length > 0 && (
                                                        <div className="text-red-500 mt-2 font-bold">Errors: {res.parsed.errors.join(', ')}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {testResults.length === 0 && !testing && !testError && (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        Click 'Fetch Sample' to see live data.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MAP TAB */}
                    {activeTab === 'map' && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded text-xs text-gray-500">
                                Map sheet headers to CRM fields. Only mapped fields will be imported.
                                {loadingHeaders && <div className="mt-2 flex items-center gap-1 text-blue-600"><Loader2 size={10} className="animate-spin"/> Refreshing headers...</div>}
                            </div>

                            <datalist id="headers-list">
                                {availableHeaders.map((h, i) => <option key={i} value={h}/>)}
                            </datalist>

                            <div className="grid grid-cols-2 gap-4">
                                {standardFields.map(f => (
                                    <div key={f.key}>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">{f.label}</label>
                                        <div className="relative">
                                            <input 
                                                list="headers-list"
                                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                                                value={localRules[f.key] || ''}
                                                onChange={e => setLocalRules(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                placeholder={`Header for ${f.label}`}
                                            />
                                            {localRules[f.key] && !availableHeaders.includes(localRules[f.key]) && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-400" title="Header not found in sheet sample">
                                                    <AlertTriangle size={12}/>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <Button onClick={handleSaveMapping} isLoading={saving}>Save Mappings</Button>
                            </div>
                        </div>
                    )}

                    {/* CONFIG TAB */}
                    {activeTab === 'config' && (
                        <div className="space-y-4">
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Source Name</label>
                                    <input className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-gray-100" value={configData.layer} readOnly />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Spreadsheet ID</label>
                                    <input className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" value={configData.sheetId} readOnly />
                                    <p className="text-[10px] text-gray-400 mt-1">To change ID, please delete and recreate source.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Tab Name</label>
                                    <input className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" value={configData.tab} readOnly />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
                                    <input className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-gray-100" value={configData.type} readOnly />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
