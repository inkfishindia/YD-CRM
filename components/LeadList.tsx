

import React, { useMemo, useState, useEffect } from 'react';
import { Lead, getPriorityColor, getStageColor, AppOptions, AutoActionRule, MessageTemplate, StageRule, SLARule, AUTO_NEXT_ACTIONS_DEFAULT, addDaysToDate, parseDate, getPriorityColor as getPC, REQUIRED_FIELDS_BY_STAGE, GoogleUser, formatDate } from '../types';
import { LeadDetailPanel } from './LeadDetailPanel';
import { useLeadCalculations } from '../hooks/useLeadCalculations';
import { AlertCircle, ShieldAlert, CheckCircle2, Calendar, MapPin, Info, MessageSquare, AlertTriangle, Layers, Edit2, ChevronDown, ListTodo, Phone, MessageCircle, MoreHorizontal, ArrowRight, Clock, Box, Globe, Copy, Trash2, StickyNote, Mail, UserX } from 'lucide-react';
import { Badge } from './ui/Badge';
import { TemplateModal } from './TemplateModal';
import { NextActionInput } from './NextActionInput';

interface LeadListProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => void;
  loading: boolean;
  onQuickNote: (lead: Lead) => void;
  viewMode?: 'list' | 'tasks';
  // Configs
  appOptions?: AppOptions;
  autoActions?: AutoActionRule[];
  templates?: MessageTemplate[];
  stageRules?: StageRule[];
  slaRules?: SLARule[];
  
  // Selection
  selectedIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  onLogActivity?: (lead: Lead, type: string, notes: string) => void;
  activityLogs?: any[];
  user?: GoogleUser | null;
}

// --- SUB-COMPONENT: TaskCard (For My Day View) ---
const TaskCard: React.FC<{
    lead: Lead;
    onUpdate: (lead: Lead) => void;
    onQuickNote: (lead: Lead) => void;
    onLogActivity?: (lead: Lead, type: string, notes: string) => void;
    appOptions: AppOptions;
    slaRules: SLARule[];
    onClick: () => void;
}> = ({ lead, onUpdate, onQuickNote, onLogActivity, appOptions, slaRules, onClick }) => {
    const { urgencyLevel, signalColor, isOverdue } = useLeadCalculations(lead, slaRules);

    const handleCall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lead.number) {
            onLogActivity?.(lead, 'Call', 'Call from My Day');
            window.location.href = `tel:${lead.number}`;
        }
    };

    const handleWhatsApp = (e: React.MouseEvent) => {
        e.stopPropagation();
        const cleanNumber = lead.number?.replace(/\D/g, '');
        if (cleanNumber) {
            onLogActivity?.(lead, 'WhatsApp', 'WhatsApp from My Day');
            window.open(`https://wa.me/${cleanNumber}`, '_blank');
        }
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `*${lead.companyName}* (${lead.contactPerson})\nStatus: ${lead.status}\nNext: ${lead.nextAction || 'None'} (Due: ${lead.nextActionDate || 'Na'})`;
        navigator.clipboard.writeText(text);
    };

    // Visuals based on System Principles
    const borderClass = 
      signalColor === 'red' ? 'border-l-4 border-l-red-500' :
      signalColor === 'yellow' ? 'border-l-4 border-l-yellow-400' :
      signalColor === 'blue' ? 'border-l-4 border-l-blue-500' :
      'border-l-4 border-l-gray-400';
    
    return (
        <div 
            onClick={onClick}
            className={`bg-white rounded-lg shadow-sm border-r border-t border-b border-gray-200 ${borderClass} p-3 hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row gap-3 items-start sm:items-center group`}
        >
            {/* 1. Left: Info & Chips */}
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 truncate text-sm" title={lead.companyName}>{lead.companyName}</h3>
                    <span className="text-xs text-gray-500 truncate">- {lead.contactPerson}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral" className="py-0 px-1 text-[9px]">{lead.category}</Badge>
                    <span className={`text-[9px] font-bold px-1 rounded border ${lead.priority?.includes('High') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                         {lead.priority}
                    </span>
                    {lead.estimatedQty > 0 && (
                        <span className="text-[9px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-1 rounded">
                             {lead.estimatedQty}u
                        </span>
                    )}
                </div>
            </div>

            {/* 2. Center: The "Job" (Inline Edit) */}
            <div className="flex-1 w-full sm:w-[280px]">
                <NextActionInput 
                    lead={lead} 
                    onUpdate={onUpdate} 
                    onLogActivity={onLogActivity}
                    urgencyLevel={urgencyLevel} 
                    colorClass="" 
                />
            </div>

            {/* 3. Right: Quick Actions Toolbar */}
            <div className="flex items-center gap-1 shrink-0 self-end sm:self-center ml-2">
                 <button onClick={handleCopy} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Copy">
                     <Copy size={14} />
                 </button>
                 {lead.number && (
                     <>
                        <button onClick={handleCall} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                            <Phone size={14} />
                        </button>
                        <button onClick={handleWhatsApp} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                            <MessageCircle size={14} />
                        </button>
                     </>
                 )}
                 <button onClick={(e) => { e.stopPropagation(); onQuickNote(lead); }} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                    <StickyNote size={14} />
                 </button>
                 
                 {/* Owner Indicator */}
                 <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 ml-1" title={lead.ydsPoc}>
                     {lead.ydsPoc ? lead.ydsPoc.charAt(0) : '?'}
                 </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: LeadRow (Table View) ---
const LeadRow: React.FC<{
    lead: Lead;
    slaRules: SLARule[];
    stageRules: StageRule[];
    autoActions: AutoActionRule[];
    appOptions: AppOptions;
    isSelected: boolean;
    onToggleSelect?: (id: string) => void;
    onClick: () => void;
    onUpdate: (lead: Lead) => void;
    onContextMenu: (e: React.MouseEvent, lead: Lead) => void;
    onLogActivity?: (lead: Lead, type: string, notes: string) => void;
    onOpenTemplate: (lead: Lead) => void;
    user?: GoogleUser | null;
}> = ({ lead, slaRules, stageRules, autoActions, appOptions, isSelected, onToggleSelect, onClick, onUpdate, onContextMenu, onLogActivity, onOpenTemplate, user }) => {
    const { urgencyLevel, isOverdue, signalColor } = useLeadCalculations(lead, slaRules);
    
    // Visuals - Urgency Background Tint
    let rowClass = "border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-xs group cursor-pointer";
    if (lead.status === 'Lost') rowClass += " bg-gray-50 opacity-60 grayscale";
    else if (lead.status === 'Won') rowClass += " bg-green-50/20";
    else if (urgencyLevel === 'critical') rowClass += " bg-red-50/30 hover:bg-red-50";
    else if (urgencyLevel === 'warning') rowClass += " bg-yellow-50/30 hover:bg-yellow-50";
    else if (isSelected) rowClass += " bg-blue-50";
    else rowClass += " bg-white";

    const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        const newStage = e.target.value;
        if (newStage === lead.status) return;

        // Validation Logic for Table View
        const rule = stageRules.find(r => 
            (r.fromStage.toLowerCase() === lead.status.toLowerCase() && r.toStage.toLowerCase() === newStage.toLowerCase())
        );
        const entryRules = stageRules.filter(r => r.toStage.toLowerCase() === newStage.toLowerCase() && r.requiresField.length > 0);
        
        const defaults = REQUIRED_FIELDS_BY_STAGE[newStage] || [];
        const requiredFields = new Set<string>();
        if (rule) rule.requiresField.forEach(f => requiredFields.add(f));
        entryRules.forEach(r => r.requiresField.forEach(f => requiredFields.add(f)));
        defaults.forEach(f => requiredFields.add(f));

        if (requiredFields.size > 0) {
            const missing = Array.from(requiredFields).filter(field => {
                    const val = lead[field as keyof Lead];
                    if (field === 'estimatedQty') return !val || val === 0;
                    return !val || val === '' || val === 'Unassigned' || val === 'Pending' || val === 'Not Needed' || val === 'Not Contacted';
            });
    
            if (missing.length > 0) {
                alert(`Cannot move to ${newStage}.\nMissing: ${missing.join(', ')}.`);
                return; 
            }
        }

        const todayStr = formatDate();
        const updatedLead = { ...lead, status: newStage, stageChangedDate: todayStr, lastContactDate: todayStr };
        if (newStage === 'Won') {
             updatedLead.wonDate = todayStr;
             updatedLead.paymentUpdate = 'Done';
        }
        if (newStage === 'Lost') updatedLead.lostDate = todayStr;
        
        const dynamicRule = autoActions.find(r => r.triggerStage.toLowerCase() === newStage.toLowerCase());
        if (dynamicRule) {
             updatedLead.nextAction = dynamicRule.defaultNextAction;
             updatedLead.nextActionDate = addDaysToDate(dynamicRule.defaultDays);
        } else {
             const autoRule = AUTO_NEXT_ACTIONS_DEFAULT[newStage];
             if (autoRule) {
                updatedLead.nextAction = autoRule.action;
                updatedLead.nextActionDate = addDaysToDate(autoRule.days);
             }
        }
        onUpdate(updatedLead);
        onLogActivity?.(lead, 'Stage Change', `Changed to ${newStage}`);
    };

    const handleOwnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation();
        const newOwner = e.target.value;
        if (newOwner === 'ASSIGN_ME' && user) {
             const userOwnerName = appOptions.owners.find(o => user.name.toLowerCase().includes(o.toLowerCase()));
             if (userOwnerName) {
                 onUpdate({ ...lead, ydsPoc: userOwnerName });
                 onLogActivity?.(lead, 'Owner Change', `Assigned to self (${userOwnerName})`);
             } else {
                 alert("Your Google name doesn't match any Owner in the list.");
             }
             return;
        }
        if (newOwner === lead.ydsPoc) return;
        onUpdate({ ...lead, ydsPoc: newOwner });
        onLogActivity?.(lead, 'Owner Change', `Assigned to ${newOwner}`);
    };

    const handleQuickAttempt = (type: 'Call' | 'WhatsApp' | 'Email') => {
        const current = lead.contactAttempts || 0;
        const today = formatDate();
        
        const updates: Partial<Lead> = {
            contactAttempts: current + 1,
            lastAttemptDate: today,
            lastContactDate: today,
            contactStatus: 'Attempted' // Auto status update
        };
        
        if (lead.contactStatus === 'Contacted' || lead.contactStatus === 'Responsive') {
             delete updates.contactStatus;
        }

        onUpdate({ ...lead, ...updates });
        onLogActivity?.(lead, type, `${type} attempt made. Count: ${current + 1}`);

        if (type === 'Call' && lead.number) window.location.href=`tel:${lead.number}`;
        if (type === 'Email' && lead.email) window.location.href=`mailto:${lead.email}`;
        if (type === 'WhatsApp') {
            onOpenTemplate(lead); // Use template modal for WA
        }
    };

    return (
        <tr className={rowClass} onClick={onClick} onContextMenu={(e) => onContextMenu(e, lead)}>
            {onToggleSelect && (
                <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(lead.leadId)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                </td>
            )}
            
            <td className="px-3 py-3 text-center" title={`Stage Age: ${lead.daysOpen}`}>
                 <span className="font-bold text-gray-700">{lead.daysOpen} {signalColor === 'red' ? '🔴' : signalColor === 'yellow' ? '🟡' : '🟢'}</span>
            </td>

            <td className="px-3 py-3">
                <div className="flex flex-col gap-0.5 max-w-[200px]">
                    <span className="font-bold text-gray-900 truncate hover:text-blue-600" title={lead.companyName}>
                        {lead.companyName || 'Unnamed'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <span className="truncate max-w-[100px]">{lead.contactPerson}</span>
                    </div>
                </div>
            </td>

            <td className="px-3 py-3 text-center">
                 <div className="inline-flex flex-col items-center gap-1">
                    <Badge variant="neutral" className="whitespace-nowrap">{lead.category}</Badge>
                    <span className={`text-[9px] font-bold px-1 rounded border ${getPC(lead.priority)}`}>{lead.priority}</span>
                 </div>
            </td>

            <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                 <div className="flex items-center gap-1 justify-center">
                    <button onClick={() => handleQuickAttempt('Call')} className="p-1 hover:bg-green-100 rounded text-gray-400 hover:text-green-600" title="Call"><Phone size={12}/></button>
                    <button onClick={() => handleQuickAttempt('WhatsApp')} className="p-1 hover:bg-green-100 rounded text-gray-400 hover:text-green-600" title="WhatsApp"><MessageCircle size={12}/></button>
                    <span className="text-[10px] font-bold text-gray-500 ml-1">({lead.contactAttempts || 0})</span>
                 </div>
            </td>

            <td className="px-3 py-3 text-right font-mono font-medium text-gray-700">
                {lead.estimatedQty > 0 ? lead.estimatedQty.toLocaleString() : '-'}
            </td>

            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                 <select
                    value={lead.status}
                    onChange={handleStageChange}
                    className={`appearance-none cursor-pointer px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-transparent pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500 ${getStageColor(lead.status)}`}
                 >
                     {appOptions.stages.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
            </td>

            <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                 <select
                    value={lead.ydsPoc || ''}
                    onChange={handleOwnerChange}
                    className="appearance-none cursor-pointer w-full bg-transparent text-[11px] font-medium text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded border border-transparent hover:border-gray-200 hover:bg-white px-1 py-0.5"
                 >
                    <option value="">Unassigned</option>
                    <option value="ASSIGN_ME" className="font-bold text-blue-600">+ Assign to Me</option>
                    <optgroup label="Owners">
                        {appOptions.owners.map(o => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                 </select>
            </td>

            <td className="px-3 py-3 w-64" onClick={e => e.stopPropagation()}>
                <NextActionInput 
                    lead={lead} 
                    onUpdate={onUpdate} 
                    onLogActivity={onLogActivity}
                    urgencyLevel={urgencyLevel} 
                    colorClass="" 
                />
            </td>

            <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                 <button onClick={() => onOpenTemplate(lead)} className="group relative inline-block p-1 hover:bg-green-50 rounded-full transition-colors">
                    <MessageCircle size={16} className={lead.remarks ? 'text-green-600' : 'text-gray-300 group-hover:text-green-500'} />
                </button>
            </td>
        </tr>
    );
};

export const LeadList: React.FC<LeadListProps> = ({ 
  leads, 
  onUpdateLead, 
  loading, 
  onQuickNote, 
  viewMode = 'list',
  appOptions = { 
      stages: [], owners: [], sources: [], categories: [], priorities: [], productTypes: [], printTypes: [], 
      contactStatus: [], paymentStatus: [], designStatus: [], lostReasons: [], customerTypes: [], platformTypes: [], sampleStatus: [], orderStatus: [], nextActionTypes: [] 
  } as unknown as AppOptions,
  autoActions = [],
  templates,
  stageRules = [],
  slaRules = [],
  selectedIds,
  onToggleSelect,
  onLogActivity,
  activityLogs,
  user
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [templateModalState, setTemplateModalState] = useState<{ isOpen: boolean, lead: Lead | null }>({ isOpen: false, lead: null });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, lead: Lead } | null>(null);
  
  // My Day specific filtering state
  const [myDayFilter, setMyDayFilter] = useState<'all' | 'overdue' | 'missing' | 'unassigned'>('all');

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, lead: Lead) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, lead });
  };

  const handleMenuAction = (action: string) => {
      if (!contextMenu) return;
      const { lead } = contextMenu;
      const today = formatDate();

      if (action === 'open') {
          setSelectedLead(lead);
      } else if (action === 'copy_phone') {
          if (lead.number) navigator.clipboard.writeText(lead.number);
      } else if (action === 'snooze') {
          onUpdateLead({ ...lead, nextActionDate: addDaysToDate(2) });
          onLogActivity?.(lead, 'Snooze', 'Snoozed for 2 days');
      } else if (action === 'lost') {
          onUpdateLead({ ...lead, status: 'Lost', lostDate: today });
          onLogActivity?.(lead, 'Stage Change', 'Marked Lost');
      } else if (action === 'won') {
          onUpdateLead({ ...lead, status: 'Won', wonDate: today, paymentUpdate: 'Done' });
          onLogActivity?.(lead, 'Stage Change', 'Marked Won');
      } else if (action === 'note') {
          onQuickNote(lead);
      }
      setContextMenu(null);
  };

  const handleSendTemplate = (template: MessageTemplate) => {
      const lead = templateModalState.lead;
      if (!lead || !lead.number) return;
      
      let body = template.body;
      body = body.replace('{{contact_person}}', lead.contactPerson || 'there');
      body = body.replace('{{company_name}}', lead.companyName || '');
      body = body.replace('{{owner}}', lead.ydsPoc || 'YDS Team');
      
      const encoded = encodeURIComponent(body);
      window.open(`https://wa.me/${lead.number.replace(/\D/g, '')}?text=${encoded}`, '_blank');
      
      onLogActivity?.(lead, 'WhatsApp Template', `Sent: ${template.name}`);
      const timestamp = new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
      onUpdateLead({ ...lead, remarks: `[${timestamp}] Sent ${template.name}\n${lead.remarks || ''}` });
      setTemplateModalState({ isOpen: false, lead: null });
  };

  const handleCustomTemplate = () => {
      const lead = templateModalState.lead;
      if (lead && lead.number) {
          window.open(`https://wa.me/${lead.number.replace(/\D/g, '')}`, '_blank');
          onLogActivity?.(lead, 'WhatsApp', 'Opened plain WhatsApp');
      }
      setTemplateModalState({ isOpen: false, lead: null });
  };

  if (loading && leads.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-4"></div>
            <p>Loading...</p>
        </div>
    );
  }

  // --- MY DAY VIEW (Smart Tasks) ---
  if (viewMode === 'tasks') {
     const { overdue, today, upcoming, missingAction, unassigned } = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        
        const buckets = {
            overdue: [] as Lead[],
            today: [] as Lead[],
            upcoming: [] as Lead[],
            missingAction: [] as Lead[],
            unassigned: [] as Lead[]
        };

        leads.forEach(lead => {
            if (lead.status === 'Won' || lead.status === 'Lost') return;
            
            // Unassigned Count (Global within My Day context if desired, or per user)
            if (!lead.ydsPoc || lead.ydsPoc === 'Unassigned') buckets.unassigned.push(lead);

            // Filter for buckets
            if (myDayFilter === 'unassigned' && lead.ydsPoc && lead.ydsPoc !== 'Unassigned') return;
            // (Wait, unassigned filter logic should be applied after bucket sorting or just show unassigned leads)

            // Missing Action
            if (!lead.nextAction) {
                buckets.missingAction.push(lead);
                return;
            }

            const actionDate = parseDate(lead.nextActionDate);
            if (!actionDate) return; 

            const diffTime = actionDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) buckets.overdue.push(lead);
            else if (diffDays === 0) buckets.today.push(lead);
            else if (diffDays <= 3) buckets.upcoming.push(lead); // Next 3 days per spec
        });

        // Sort Overdue by Severity (SLA)
        buckets.overdue.sort((a, b) => {
             const getScore = (l: Lead) => l.slaStatus === 'Violated' ? 1000 : 0;
             return getScore(b) - getScore(a);
        });
        
        // Sort Today by Priority
        const pScore = { '🔴 High': 3, '🟡 Med': 2, '🟢 Low': 1, '⚪': 0 };
        buckets.today.sort((a,b) => (pScore[b.priority as keyof typeof pScore] || 0) - (pScore[a.priority as keyof typeof pScore] || 0));

        return buckets;
    }, [leads, myDayFilter]);

    // Apply main filter if active
    const filteredBuckets = {
        overdue: myDayFilter === 'all' || myDayFilter === 'overdue' ? overdue : [],
        today: myDayFilter === 'all' ? today : [],
        upcoming: myDayFilter === 'all' ? upcoming : [],
        missingAction: myDayFilter === 'all' || myDayFilter === 'missing' ? missingAction : [],
        unassigned: myDayFilter === 'unassigned' ? unassigned : [] // Special view for unassigned
    };

    const renderSection = (title: string, items: Lead[], colorClass: string, icon: React.ReactNode, isCollapsible = false) => {
        if (items.length === 0) return null;
        return (
            <div className="mb-8 animate-fade-in-up">
                <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 ${colorClass}`}>
                    {icon}
                    <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map(lead => (
                         <TaskCard 
                            key={lead.leadId}
                            lead={lead}
                            onUpdate={onUpdateLead}
                            onQuickNote={onQuickNote}
                            onLogActivity={onLogActivity}
                            appOptions={appOptions}
                            slaRules={slaRules}
                            onClick={() => setSelectedLead(lead)}
                         />
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
            
            {/* 1 — ATTENTION BAR (Top Section) */}
            <div className="mb-6 flex gap-4 overflow-x-auto no-scrollbar pb-2">
                 <button 
                    onClick={() => setMyDayFilter(myDayFilter === 'overdue' ? 'all' : 'overdue')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shadow-sm ${myDayFilter === 'overdue' ? 'bg-red-50 border-red-200 ring-2 ring-red-100' : 'bg-white border-gray-200 hover:border-red-200'}`}
                 >
                     <div className="bg-red-100 text-red-600 p-1.5 rounded-full"><ShieldAlert size={16} /></div>
                     <div className="flex flex-col items-start">
                         <span className="text-xl font-bold text-gray-800 leading-none">{overdue.length}</span>
                         <span className="text-[10px] font-bold text-gray-500 uppercase">Overdue</span>
                     </div>
                 </button>

                 <button 
                    onClick={() => setMyDayFilter(myDayFilter === 'missing' ? 'all' : 'missing')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shadow-sm ${myDayFilter === 'missing' ? 'bg-yellow-50 border-yellow-200 ring-2 ring-yellow-100' : 'bg-white border-gray-200 hover:border-yellow-200'}`}
                 >
                     <div className="bg-yellow-100 text-yellow-600 p-1.5 rounded-full"><AlertTriangle size={16} /></div>
                     <div className="flex flex-col items-start">
                         <span className="text-xl font-bold text-gray-800 leading-none">{missingAction.length}</span>
                         <span className="text-[10px] font-bold text-gray-500 uppercase">Missing Action</span>
                     </div>
                 </button>
                 
                 <button 
                    onClick={() => setMyDayFilter(myDayFilter === 'unassigned' ? 'all' : 'unassigned')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all shadow-sm ${myDayFilter === 'unassigned' ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' : 'bg-white border-gray-200 hover:border-orange-200'}`}
                 >
                     <div className="bg-orange-100 text-orange-600 p-1.5 rounded-full"><UserX size={16} /></div>
                     <div className="flex flex-col items-start">
                         <span className="text-xl font-bold text-gray-800 leading-none">{unassigned.length}</span>
                         <span className="text-[10px] font-bold text-gray-500 uppercase">No Owner</span>
                     </div>
                 </button>
            </div>

            {myDayFilter === 'unassigned' && renderSection('Unassigned Leads', filteredBuckets.unassigned, 'text-orange-600', <UserX size={18} />)}

            {myDayFilter !== 'unassigned' && (
                <>
                    {/* A — Overdue Actions (Red) */}
                    {renderSection('Overdue Actions', filteredBuckets.overdue, 'text-red-600', <ShieldAlert size={18} />)}
                    
                    {/* B — Due Today (Blue) */}
                    {renderSection('Due Today', filteredBuckets.today, 'text-blue-600', <Calendar size={18} />)}

                    {/* D — Without Next Action (Yellow) - Spec puts this here or below, logically high prio so putting before upcoming */}
                    {renderSection('Missing Next Action', filteredBuckets.missingAction, 'text-yellow-600', <AlertTriangle size={18} />)}

                    {/* C — Coming Up (Grey) */}
                    {renderSection('Coming Up (3 Days)', filteredBuckets.upcoming, 'text-gray-500', <Clock size={18} />, true)}
                </>
            )}
            
            {!overdue.length && !today.length && !upcoming.length && !missingAction.length && !unassigned.length && (
                 <div className="text-center py-20 opacity-50">
                     <CheckCircle2 size={48} className="mx-auto mb-2 text-green-500" />
                     <p>All caught up! Great work.</p>
                 </div>
            )}

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
  }

  // --- COMMAND CENTRE (List View) ---
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 overflow-x-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-w-[1200px]">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold border-b border-gray-200 tracking-wider">
                <tr>
                    {onToggleSelect && <th className="px-4 py-3 w-10"></th>}
                    <th className="px-3 py-3 w-20 text-center">Age/SLA</th>
                    <th className="px-3 py-3 w-64">Lead Identity</th>
                    <th className="px-3 py-3 w-32 text-center">Type / Pri</th>
                    <th className="px-3 py-3 w-32 text-center">Attempts</th>
                    <th className="px-3 py-3 w-24 text-right">Est. Qty</th>
                    <th className="px-3 py-3 w-32">Stage</th>
                    <th className="px-3 py-3 w-32">Owner</th>
                    <th className="px-3 py-3 w-64">Next Action</th>
                    <th className="px-3 py-3 w-12 text-center">Msg</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                    <LeadRow
                        key={lead.leadId}
                        lead={lead}
                        slaRules={slaRules}
                        stageRules={stageRules}
                        autoActions={autoActions}
                        appOptions={appOptions}
                        isSelected={selectedIds?.has(lead.leadId) || false}
                        onToggleSelect={onToggleSelect}
                        onClick={() => setSelectedLead(lead)}
                        onUpdate={onUpdateLead}
                        onContextMenu={handleContextMenu}
                        onLogActivity={onLogActivity}
                        onOpenTemplate={(l) => setTemplateModalState({ isOpen: true, lead: l })}
                        user={user}
                    />
                ))}
            </tbody>
        </table>
      </div>

      {contextMenu && (
          <div 
             className="fixed bg-white rounded-lg shadow-xl border border-gray-200 w-48 z-50 py-1 animate-fade-in"
             style={{ top: contextMenu.y, left: contextMenu.x }}
             onClick={(e) => e.stopPropagation()} 
          >
             <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 truncate">
                 {contextMenu.lead.companyName}
             </div>
             <button onClick={() => handleMenuAction('open')} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                 <ArrowRight size={14} /> Open Lead
             </button>
             <button onClick={() => handleMenuAction('note')} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                 <StickyNote size={14} /> Quick Note
             </button>
             <button onClick={() => handleMenuAction('snooze')} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                 <Clock size={14} /> Snooze 2 Days
             </button>
             {contextMenu.lead.number && (
                 <button onClick={() => handleMenuAction('copy_phone')} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                     <Copy size={14} /> Copy Phone
                 </button>
             )}
             <div className="border-t border-gray-100 my-1"></div>
             <button onClick={() => handleMenuAction('won')} className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 hover:text-green-600 flex items-center gap-2">
                 <CheckCircle2 size={14} /> Mark Won
             </button>
             <button onClick={() => handleMenuAction('lost')} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 hover:text-red-600 flex items-center gap-2">
                 <Trash2 size={14} /> Mark Lost
             </button>
          </div>
      )}

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

      {templateModalState.isOpen && templateModalState.lead && templates && (
          <TemplateModal 
             isOpen={templateModalState.isOpen}
             onClose={() => setTemplateModalState({ isOpen: false, lead: null })}
             lead={templateModalState.lead}
             templates={templates}
             onSend={handleSendTemplate}
             onCustom={handleCustomTemplate}
          />
      )}
    </div>
  );
};
