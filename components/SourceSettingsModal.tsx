
import React from 'react';
import { Modal } from './ui/Modal';
import { SourceConfig, FieldMapRule } from '../types';

interface SourceSettingsModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    source: SourceConfig | null; 
    currentRules: FieldMapRule[];
}

export const SourceSettingsModal: React.FC<SourceSettingsModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Source Settings">
            <div className="p-4 text-center text-gray-500">
                <p>Source settings are read-only in this version.</p>
            </div>
        </Modal>
    );
};
