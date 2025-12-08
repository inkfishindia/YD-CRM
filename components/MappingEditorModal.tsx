import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { saveFieldMappings, fetchRemoteHeaders } from '../services/sheetService';
import { FieldMapRule, SourceConfig } from '../types';
import { Loader2 } from 'lucide-react';

interface MappingEditorModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    source: SourceConfig | null; 
    currentRules: FieldMapRule[];
}

export const MappingEditorModal: React.FC<MappingEditorModalProps> = ({ isOpen, onClose, source, currentRules }) => {
    const [localRules, setLocalRules] = useState<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        currentRules.forEach(r => map[r.intakeField] = r.sourceHeader);
        return map;
    });
    
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [loadingHeaders, setLoadingHeaders] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (source && isOpen) {
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
    }, [source, isOpen]);

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

    const handleSave = async () => {
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
        onClose();
        alert("Mappings saved. Please rescan sources to apply changes.");
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Mapping: ${source?.layer}`}>
            <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-100 flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                        Map the headers from your <strong>{source?.layer}</strong> Google Sheet to System Fields.
                    </p>
                    {loadingHeaders && <span className="text-xs text-blue-600 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Fetching Headers...</span>}
                </div>

                <datalist id="sheet-headers">
                    {availableHeaders.map((h, i) => (
                        <option key={i} value={h} />
                    ))}
                </datalist>

                <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                    {standardFields.map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{f.label}</label>
                            <input 
                                list="sheet-headers"
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                                value={localRules[f.key] || ''}
                                onChange={e => setLocalRules(prev => ({ ...prev, [f.key]: e.target.value }))}
                                placeholder={`Header for ${f.label}`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={saving}>Save Mappings</Button>
                </div>
            </div>
        </Modal>
    );
};