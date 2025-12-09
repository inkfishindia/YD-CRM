
import React from 'react';
import { Modal } from './ui/Modal';
import { SourceConfig, FieldMapRule } from '../types';

interface MappingEditorModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    source: SourceConfig | null; 
    currentRules: FieldMapRule[];
}

export const MappingEditorModal: React.FC<MappingEditorModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Mapping">
            <div className="p-4 text-center text-gray-500">
                <p>Field mappings are configured in code.</p>
            </div>
        </Modal>
    );
};
