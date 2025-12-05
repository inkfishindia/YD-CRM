
import React, { useMemo } from 'react';
import { Lead, parseDate } from '../types';
import { AlertTriangle, Clock, UserX, AlertCircle, ArrowRight } from 'lucide-react';

interface SmartAlertsBarProps {
  leads: Lead[];
  onFilter: (criteria: string) => void;
  currentUserId?: string; // To filter specific alerts for the user if needed
}

export const SmartAlertsBar: React.FC<SmartAlertsBarProps> = ({ leads, onFilter, currentUserId }) => {
  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeLeads = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost');
    
    // 1. No Next Action
    const noAction = activeLeads.filter(l => !l.nextAction).length;
    
    // 2. Overdue
    const overdue = activeLeads.filter(l => {
        const d = parseDate(l.nextActionDate);
        return d && d < today;
    }).length;

    // 3. Unassigned (No Owner)
    const unassigned = activeLeads.filter(l => !l.ydsPoc || l.ydsPoc === 'Unassigned').length;

    // 4. Stale Proposals (Proposal stage, no update > 5 days)
    const staleProposals = activeLeads.filter(l => {
        if (l.status !== 'Proposal') return false;
        const last = parseDate(l.stageChangedDate) || parseDate(l.date);
        if (!last) return false;
        const days = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        return days > 5;
    }).length;

    return { noAction, overdue, unassigned, staleProposals };
  }, [leads]);

  if (Object.values(alerts).every(v => v === 0)) return null;

  return (
    <div className="bg-indigo-900 text-white px-4 py-2 text-xs font-medium relative z-20 shadow-inner">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-x-auto no-scrollbar">
            <span className="font-bold text-indigo-200 uppercase tracking-wider shrink-0 flex items-center gap-2">
                <AlertCircle size={14} /> Attention Needed:
            </span>
            
            {alerts.overdue > 0 && (
                <button onClick={() => onFilter('smart_overdue')} className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-1 rounded transition-colors shrink-0">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                    <span className="text-white">{alerts.overdue} Overdue Tasks</span>
                </button>
            )}

            {alerts.noAction > 0 && (
                <button onClick={() => onFilter('smart_no_action')} className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-1 rounded transition-colors shrink-0">
                    <AlertTriangle size={12} className="text-amber-400" />
                    <span className="text-white">{alerts.noAction} Missing Next Actions</span>
                </button>
            )}

            {alerts.unassigned > 0 && (
                <button onClick={() => onFilter('smart_unassigned')} className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-1 rounded transition-colors shrink-0">
                    <UserX size={12} className="text-orange-300" />
                    <span className="text-white">{alerts.unassigned} Unassigned Leads</span>
                </button>
            )}

            {alerts.staleProposals > 0 && (
                <button onClick={() => onFilter('smart_stale_proposal')} className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-1 rounded transition-colors shrink-0">
                    <Clock size={12} className="text-blue-300" />
                    <span className="text-white">{alerts.staleProposals} Stale Proposals</span>
                </button>
            )}
        </div>
    </div>
  );
};
