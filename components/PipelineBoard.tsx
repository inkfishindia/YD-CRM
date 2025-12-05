

import React, { useMemo, useState } from 'react';
import { Lead, AppOptions, AutoActionRule, MessageTemplate, StageRule, AUTO_NEXT_ACTIONS_DEFAULT, addDaysToDate, parseDate, REQUIRED_FIELDS_BY_STAGE, ActivityLog, formatDate, FORBIDDEN_TRANSITIONS, SLARule } from '../types';
import { LeadCard } from './LeadCard';
import { LeadDetailPanel } from './LeadDetailPanel';
import { Filter, AlertTriangle, ShieldAlert, Star, Box, Layers, TestTube, Users } from 'lucide-react';

interface PipelineBoardProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  loading: boolean;
  onQuickNote: (lead: Lead) => void;
  stages: string[];
  // Configs
  appOptions?: AppOptions;
  autoActions?: AutoActionRule[];
  templates?: MessageTemplate[];
  stageRules?: StageRule[];
  slaRules?: SLARule[];
  activityLogs?: ActivityLog[];
  
  // Selection
  selectedIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  onLogActivity?: (lead: Lead, type: string, notes: string) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({ 
  leads, 
  onUpdateLead, 
  loading, 
  onQuickNote, 
  stages,
  appOptions,
  autoActions = [],
  templates,
  stageRules = [],
  slaRules = [],
  activityLogs = [],
  selectedIds,
  onToggleSelect,
  onLogActivity
}) => {
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filter Logic
  const filteredLeads = useMemo(() => {
      let filtered = leads;
      if (activeFilter === 'sla_breach') {
          filtered = filtered.filter(l => l.slaHealth?.includes('🔴') || l.slaStatus === 'Violated');
      } else if (activeFilter === 'missing_action') {
          filtered = filtered.filter(l => !l.nextAction);
      } else if (activeFilter === 'high_priority') {
          filtered = filtered.filter(l => l.priority?.includes('High'));
      } else if (activeFilter === 'big_qty') {
          filtered = filtered.filter(l => (l.estimatedQty || 0) >= 20);
      } else if (activeFilter === 'customisation') {
          filtered = filtered.filter(l => l.category?.toLowerCase().includes('customisation'));
      } else if (activeFilter === 'sampling') {
          filtered = filtered.filter(l => l.category?.toLowerCase().includes('sampling'));
      } else if (activeFilter === 'partner') {
          filtered = filtered.filter(l => l.category?.toLowerCase().includes('partner') || l.category?.toLowerCase().includes('dropshipping'));
      }
      return filtered;
  }, [leads, activeFilter]);

  // Group leads by status
  const columns = useMemo(() => {
    const cols: Record<string, Lead[]> = {};
    stages.forEach(stage => { cols[stage] = []; });
    
    filteredLeads.forEach(lead => {
      const stageKey = stages.find(s => s.toLowerCase() === (lead.status || '').toLowerCase()) || stages[0];
      if (cols[stageKey]) cols[stageKey].push(lead);
      else cols[stages[0]].push(lead);
    });
    return cols;
  }, [filteredLeads, stages]);

  const getColumnMetrics = (stageLeads: Lead[]) => {
      const count = stageLeads.length;
      const totalQty = stageLeads.reduce((acc, l) => acc + (l.estimatedQty || 0), 0);
      const breaches = stageLeads.filter(l => l.slaHealth?.includes('🔴') || l.slaStatus === 'Violated').length;
      const missingAction = stageLeads.filter(l => !l.nextAction).length;
      
      let totalDays = 0;
      let validCount = 0;
      const today = new Date();
      stageLeads.forEach(l => {
          const d = parseDate(l.stageChangedDate) || parseDate(l.date);
          if (d) {
              totalDays += Math.ceil(Math.abs(today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
              validCount++;
          }
      });
      const avgAge = validCount > 0 ? Math.round(totalDays / validCount) : 0;

      return { count, totalQty, breaches, avgAge, missingAction };
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedOverColumn !== stage) setDraggedOverColumn(stage);
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const leadId = e.dataTransfer.getData('leadId');
    const lead = leads.find(l => l.leadId === leadId);

    if (!lead || lead.status === targetStage) return;

    // 1. Validation Logic (Strict PRD 4.1 & 4.2 compliance)
    const forbidden = FORBIDDEN_TRANSITIONS[lead.status];
    if (forbidden && forbidden.includes(targetStage)) {
        alert(`❌ Stage change not allowed as per SOP (${lead.status} -> ${targetStage}).`);
        return;
    }

    // Dynamic Requirement Construction (Same as LeadDetailPanel)
    const reqs = new Set<string>();
    (REQUIRED_FIELDS_BY_STAGE[targetStage] || []).forEach(f => reqs.add(f));
    const cat = (lead.category || '').toLowerCase();
    
    // Category overrides
    if (cat.includes('dropship') || cat.includes('partner')) {
        if (targetStage === 'Assigned' || targetStage === 'Qualified') { 
            reqs.add('platformType'); 
            reqs.add('integrationReady');
            reqs.add('customerType'); 
        }
        reqs.delete('printType');
    } else if (cat.includes('customisation')) {
        if (targetStage === 'Qualified') reqs.add('printType');
    } else if (cat.includes('sampling')) {
        reqs.delete('estimatedQty');
        if (targetStage === 'Dispatch Sample') {
            reqs.add('sampleRequired');
            reqs.add('sampleStatus');
        }
    } else if (cat.includes('corporate') && targetStage === 'Qualified') {
        reqs.add('estimatedQty');
        reqs.add('productType');
    }

    const missing = Array.from(reqs).filter(field => {
        const val = lead[field as keyof Lead];
        if (field === 'estimatedQty') return !val || Number(val) <= 0;
        return !val || String(val).trim() === '' || val === 'Unassigned' || val === 'Pending';
    });

    if (missing.length > 0) {
        alert(`❌ Cannot move to ${targetStage}.\nMissing info: ${missing.join(', ')}.\nOpening card...`);
        setSelectedLead(lead); // Open for user to fix
        return; 
    }

    // 2. Prepare Update (Stage Engine Side Effects)
    const updatedLead = { ...lead, status: targetStage };
    const todayStr = formatDate();
    updatedLead.stageChangedDate = todayStr;
    updatedLead.lastContactDate = todayStr;

    if (targetStage === 'Won') {
        updatedLead.wonDate = todayStr;
        updatedLead.lostDate = '';
        if (updatedLead.paymentUpdate === 'Pending') updatedLead.paymentUpdate = 'Done';
    } else if (targetStage === 'Lost') {
        updatedLead.lostDate = todayStr;
        updatedLead.wonDate = '';
    }

    // 3. Auto Next Action
    const stageRule = autoActions.find(r => r.triggerStage.toLowerCase() === targetStage.toLowerCase());
    if (stageRule) {
            updatedLead.nextAction = stageRule.defaultNextAction;
            updatedLead.nextActionDate = addDaysToDate(stageRule.defaultDays);
    } else {
            const autoRule = AUTO_NEXT_ACTIONS_DEFAULT[targetStage];
            if (autoRule) {
               updatedLead.nextAction = autoRule.action;
               updatedLead.nextActionDate = addDaysToDate(autoRule.days);
            }
    }

    onLogActivity?.(updatedLead, 'Stage Change', `Dragged from ${lead.status} to ${targetStage}`);
    onUpdateLead(updatedLead);
  };

  const FilterButton = ({ id, label, icon: Icon, color }: any) => (
      <button 
         onClick={() => setActiveFilter(activeFilter === id ? 'all' : id)}
         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
             activeFilter === id 
             ? `bg-${color}-50 text-${color}-700 border-${color}-200 ring-2 ring-${color}-100` 
             : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
         }`}
      >
          <Icon size={14} /> {label}
      </button>
  );

  if (loading && leads.length === 0) {
      return <div className="p-10 text-center text-gray-500">Loading Pipeline...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5]">
      {/* Quick Filters Bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center text-gray-400 mr-2"><Filter size={14} /></div>
          <FilterButton id="sla_breach" label="SLA Breach" icon={ShieldAlert} color="red" />
          <FilterButton id="missing_action" label="No Action" icon={AlertTriangle} color="yellow" />
          <FilterButton id="high_priority" label="High Priority" icon={Star} color="orange" />
          <FilterButton id="big_qty" label="Big Qty" icon={Box} color="blue" />
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <FilterButton id="customisation" label="Custom" icon={Layers} color="indigo" />
          <FilterButton id="sampling" label="Sampling" icon={TestTube} color="purple" />
          <FilterButton id="partner" label="Partner" icon={Users} color="green" />
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 pt-2">
        <div className="flex h-full gap-4 min-w-max">
          {stages.map((stage) => {
            const stageLeads = columns[stage] || [];
            const metrics = getColumnMetrics(stageLeads);
            const isWon = stage === 'Won';
            const isLost = stage === 'Lost';
            
            return (
              <div 
                  key={stage} 
                  className={`flex flex-col w-[320px] h-full rounded-xl bg-gray-50 border shadow-sm transition-colors
                     ${isWon ? 'border-green-200' : isLost ? 'border-red-200' : 'border-gray-200'}
                     ${draggedOverColumn === stage ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                  `}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Header with Metrics */}
                <div className={`p-3 border-b rounded-t-xl shrink-0 ${isWon ? 'bg-green-50 border-green-200' : isLost ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                   <div className="flex justify-between items-center mb-2">
                       <h3 className="font-bold text-sm text-gray-800 uppercase">{stage}</h3>
                       <span className="bg-white/60 text-gray-800 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-100 shadow-sm">{metrics.count}</span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-y-1 text-[10px] text-gray-500 font-medium">
                       <div className="flex items-center gap-1">
                           <span className="text-gray-400">Avg Age:</span> {metrics.avgAge}d
                       </div>
                       <div className="flex items-center gap-1 justify-end">
                           <span className="text-gray-400">Val:</span> {metrics.totalQty.toLocaleString()}u
                       </div>
                       
                       {metrics.breaches > 0 && (
                           <div className="col-span-2 flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 mt-1 w-max">
                               <ShieldAlert size={10} /> {metrics.breaches} SLA Breaches
                           </div>
                       )}
                       {metrics.missingAction > 0 && !metrics.breaches && (
                           <div className="col-span-2 flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-1 w-max">
                               <AlertTriangle size={10} /> {metrics.missingAction} Needs Action
                           </div>
                       )}
                   </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                  {stageLeads.map((lead) => (
                    <LeadCard 
                      key={lead.leadId} 
                      lead={lead} 
                      onClick={() => setSelectedLead(lead)}
                      onQuickNote={onQuickNote}
                      appOptions={appOptions}
                      slaRules={slaRules} 
                      isSelected={selectedIds?.has(lead.leadId)}
                      onToggleSelect={onToggleSelect}
                      draggable={true}
                      onDragStart={handleDragStart}
                    />
                  ))}
                  {stageLeads.length === 0 && (
                     <div className="h-32 flex flex-col items-center justify-center text-gray-300 text-xs border-2 border-dashed border-gray-200 rounded-lg m-1">
                        Drop Leads Here
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailPanel 
          isOpen={!!selectedLead} 
          onClose={() => setSelectedLead(null)} 
          lead={selectedLead} 
          allLeads={leads}
          onUpdate={onUpdateLead} 
          appOptions={appOptions}
          autoActions={autoActions}
          templates={templates}
          stageRules={stageRules}
          activityLogs={activityLogs}
          onLogActivity={onLogActivity ? (type, notes) => onLogActivity(selectedLead, type, notes) : undefined}
        />
      )}
    </div>
  );
};