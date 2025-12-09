
import React from 'react';
import { Button } from './ui/Button';
import { Import } from 'lucide-react';
import { GoogleUser, Lead } from '../types';

interface FetchLeadsViewProps {
  user: GoogleUser | null;
  onSetImportedLeads: (leads: Lead[]) => void;
  onViewImports: () => void;
}

export const FetchLeadsView: React.FC<FetchLeadsViewProps> = ({ onViewImports }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md">
                <Import size={48} className="mx-auto text-blue-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Moved to Inbox</h2>
                <p className="text-gray-500 mb-6">
                    Lead fetching and importing has been upgraded. Please use the unified <strong>Inbox</strong> to manage incoming leads from all sources.
                </p>
                <Button onClick={onViewImports} variant="primary" className="w-full">
                    Go to Inbox
                </Button>
            </div>
        </div>
    );
};
