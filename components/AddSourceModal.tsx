
import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input, Select } from './ui/Form';
import { Button } from './ui/Button';
import { SourceConfig } from '../types';
import { addSourceConfig } from '../services/sheetService';

interface AddSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (source: SourceConfig) => void;
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<Partial<SourceConfig>>({
        layer: '',
        sheetId: '',
        tab: '',
        type: 'Vendor',
        tags: []
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.layer || !formData.sheetId || !formData.tab) return;
        setLoading(true);
        const success = await addSourceConfig(formData as SourceConfig);
        setLoading(false);
        if (success) {
            onSuccess(formData as SourceConfig);
            onClose();
        } else {
            alert("Failed to add source. Check permissions.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Data Source">
            <div className="space-y-4">
                <Input 
                    label="Source Name" 
                    placeholder="e.g. Q1 Marketing Sheet" 
                    value={formData.layer}
                    onChange={e => setFormData({...formData, layer: e.target.value})}
                />
                <Input 
                    label="Spreadsheet ID" 
                    placeholder="1sImoVXLv..." 
                    value={formData.sheetId}
                    onChange={e => setFormData({...formData, sheetId: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Tab Name" 
                        placeholder="Sheet1" 
                        value={formData.tab}
                        onChange={e => setFormData({...formData, tab: e.target.value})}
                    />
                    <Select 
                        label="Type"
                        options={['Vendor', 'Commerce', 'Referral', 'Manual']}
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                    />
                </div>
                <div className="bg-gray-50 p-3 rounded text-xs text-gray-500">
                    <strong>Tip:</strong> The Spreadsheet ID is the long string in the Google Sheet URL between <code>/d/</code> and <code>/edit</code>.
                </div>
                <div className="pt-4 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} isLoading={loading}>Add & Configure</Button>
                </div>
            </div>
        </Modal>
    );
};
