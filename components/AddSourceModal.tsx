
import React from 'react';
import { Modal } from './ui/Modal';
import { SourceConfig } from '../types';

interface AddSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (source: SourceConfig) => void;
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Source">
            <div className="p-4 text-center text-gray-500">
                <p>Adding dynamic sources is disabled in this version.</p>
            </div>
        </Modal>
    );
};
