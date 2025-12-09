
import React from 'react';
import { Modal } from './ui/Modal';

interface IntakeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSourceUpdated: () => void;
}

export const IntakeManagerModal: React.FC<IntakeManagerModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Intake Configuration">
            <div className="p-4 text-center text-gray-500">
                <p>Source configuration is now managed via code (hardcoded sources).</p>
            </div>
        </Modal>
    );
};
