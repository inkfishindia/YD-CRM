

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Lead, AppOptions, AUTO_NEXT_ACTIONS_DEFAULT, calculatePriority, addDaysToDate, AutoActionRule, MessageTemplate, StageRule, ActivityLog, parseDate, REQUIRED_FIELDS_BY_STAGE, FORBIDDEN_TRANSITIONS, formatDate, SLARule, determineLeadHealth, toInputDate, fromInputDate } from '../types';
import { X, Phone, Mail, Calendar, MessageCircle, User, ArrowRight, CheckCircle2, History, Loader2, Send, ShoppingBag, Globe, AlertTriangle, Layers, Clock, ShieldAlert, AlertOctagon, UserPlus, Box, FileText, Check, ChevronDown, Lock, XCircle, Edit2, Filter, ChevronRight, CheckSquare, MapPin, Monitor, Tag, Flag, Briefcase, Rocket, TrendingUp } from 'lucide-react';
import { Button } from './ui/Button';
import { Select, Input, Textarea } from './ui/Form';
import { Badge } from './ui/Badge';
import { TemplateModal } from './TemplateModal';

interface LeadDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  allLeads?: Lead[]; 
  onUpdate: (lead: Lead) => void;
  initialTab?: 'details' | 'history';
  appOptions?: AppOptions;
  autoActions?: AutoActionRule[];
  templates?: MessageTemplate[];
  stageRules?: StageRule[];
  slaRules?: SLARule[];
  activityLogs?: ActivityLog[];
  onLogActivity?: (type: string, notes: string) => void;
}

const getFieldLabel = (field: string): string => {
    const map: Record<string, string> = {
        ydsPoc: 'Lead Owner',
        estimatedQty: 'Est. Quantity',
        contactStatus: 'Contact Status',
        printType: 'Print Method',
        productType: 'Product Type',
        orderInfo: 'Requirements',
        integrationReady: 'Integration Ready',
        sampleStatus: 'Sample Status',
        design: 'Design Received',
        paymentUpdate: 'Payment Status',
        platformType: 'Platform',
        remarks: 'Notes / Remarks',
        sourceDetail: 'Source Detail',
        companyName: 'Company Name',
        contactPerson: 'Contact Person',
        email: 'Email Address',
        city: 'City / Location',
        sampleRequired: 'Sample Required',
        customerType: 'Customer Type',
        intent: 'Lead Intent',
        workflowType: 'Workflow Type',
        storeUrl: 'Store URL',
        onboardingStartedDate: 'Onboarding Date',
        dashboardLinkSent: 'Dash Link Sent',
        expectedCloseDate: 'Expected Close Date'
    };
    return map[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const isFieldValid = (field: string, value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (String(value).trim() === '') return false;
  if (value === 'Unassigned') return false;
  if (value === 'Pending' && field !== 'paymentUpdate' && field !== 'integrationReady') return false; 
  if (field === 'estimatedQty') return Number(value) > 0;
  if (field === 'contactStatus') return value !== 'Not Contacted';
  return true;
};

export const LeadDetailPanel: React.FC<LeadDetailPanelProps> = ({ 
  isOpen, onClose, lead, onUpdate, appOptions, autoActions = [], templates = [], stageRules = [], slaRules = [], activityLogs = [], onLogActivity
}) => {
  const [formData, setFormData] = useState<Lead>(lead);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'comms' | 'notes' | 'system'>('all');
  const [editingField, setEditingField] = useState<string | null>(null);

  const isDirtyRef = useRef(false);
  const formDataRef = useRef(lead);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const options = appOptions || { stages: [], owners: [], sources: [], categories: [], productTypes: [], printTypes: [], contactStatus: [], paymentStatus: [], designStatus: [], lostReasons: [], customerTypes: [], platformTypes: [], sampleStatus: [], orderStatus: [], intents: [], workflowTypes: [] } as unknown as AppOptions;

  const isSampling = (formData.category || '').toLowerCase().includes('sampling');

  useEffect(() => {
    if (isOpen) {
      setFormData(lead);
      formDataRef.current = lead;
      setSaveStatus('idle');
      isDirtyRef.current = false;
      setEditingField(null);
    }
  }, [isOpen, lead.leadId]);

  // SLA Info
  const slaInfo = useMemo(() => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const stageDate = parseDate(formData.stageChangedDate) || parseDate(formData.date) || today;
      const stageAge = Math.ceil(Math.abs(today.getTime() - stageDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const health = determineLeadHealth(formData, slaRules);
      return { stageAge, health };
  }, [formData, slaRules]);

  // Requirements Logic for Next Stage (Visual Helper)
  const nextStage = useMemo(() => {
      const idx = options.stages.indexOf(formData.status);
      if (idx === -1 || idx === options.stages.length - 1) return null;
      return options.stages[idx + 1];
  }, [formData.status, options.stages]);

  const getRequirementsForStage = useCallback((targetStage: string) => {
      const reqs = new Set<string>();
      
      const defaults = REQUIRED_FIELDS_BY_STAGE[targetStage] || [];
      defaults.forEach(f => reqs.add(f));

      const cat = (formData.category || '').toLowerCase();
      
      if (cat.includes('dropship') || cat.includes('partner')) {
          if (targetStage === 'Assigned' || targetStage === 'Qualified') {
             reqs.add('platformType');
             reqs.add('integrationReady');
             reqs.add('customerType');
          }
          reqs.delete('printType'); 
      } else if (cat.includes('customisation')) {
          if (targetStage === 'Qualified' || targetStage === 'Proposal') {
               reqs.add('printType');
          }
      } else if (cat.includes('sampling')) {
          reqs.delete('estimatedQty');
          if (targetStage === 'Dispatch Sample' || targetStage === 'Sample Feedback') {
               reqs.add('sampleRequired');
               reqs.add('sampleStatus');
          }
      } else if (cat.includes('corporate') || cat.includes('vendor')) {
          if (targetStage === 'Qualified') {
              reqs.add('estimatedQty');
              reqs.add('productType');
          }
      }

      return Array.from(reqs);
  }, [formData.category]);

  const requirements = useMemo(() => {
      return nextStage ? getRequirementsForStage(nextStage) : [];
  }, [nextStage, getRequirementsForStage]);

  const reqStatus = useMemo(() => {
      const status: Record<string, boolean> = {};
      requirements.forEach(f => status[f] = isFieldValid(f, formData[f as keyof Lead]));
      return status;
  }, [formData, requirements]);

  // Intent-based Dynamic Fields logic (Section 3.4)
  const activeFields = useMemo(() => {
      const i = (formData.intent || '').toLowerCase();
      // Basic fields for all
      const basic = ['intent', 'customerType', 'estimatedQty', 'sampleRequired']; 
      
      if (i.includes('pod')) {
          // POD Intent: Show product + print method + design
          return [...basic, 'productType', 'printType', 'design', 'sampleStatus'];
      }
      if (i.includes('b2b') || i.includes('corporate')) {
           // B2B Intent: Show corporate fields
           return [...basic, 'workflowType', 'orderInfo']; 
      }
      if (i.includes('drop')) {
           // DS Intent: Show platform fields
           return [...basic, 'platformType', 'storeUrl', 'dashboardLinkSent', 'onboardingStartedDate'];
      }
      
      // Default/Fallback
      return [...basic, 'productType', 'orderInfo'];
  }, [formData.intent]);

  // Routing Logic
  const routingStatus = useMemo(() => {
      const i = (formData.intent || '').toLowerCase();
      
      if (i.includes('pod')) {
          const hasProduct = isFieldValid('productType', formData.productType);
          const hasPrint = isFieldValid('printType', formData.printType);
          const hasQty = (formData.estimatedQty || 0) > 0;
          const paid = formData.paymentUpdate === 'Done';
          
          if (hasProduct && hasPrint && hasQty && paid) return { ready: true, target: 'OMS', label: 'Route to OMS' };
          return { 
              ready: false, 
              missing: [!hasProduct && 'Product', !hasPrint && 'Print', !hasQty && 'Qty', !paid && 'Payment'].filter(Boolean),
              label: 'Route to OMS'
          };
      }
      
      if (i.includes('drop')) {
           const hasPlatform = isFieldValid('platformType', formData.platformType);
           const hasLink = formData.dashboardLinkSent === 'Yes';
           const hasOnboard = isFieldValid('onboardingStartedDate', formData.onboardingStartedDate);
           
           if (hasPlatform && hasLink && hasOnboard) return { ready: true, target: 'Partner DB', label: 'Route to Partner DB' };
           return { 
               ready: false, 
               missing: [!hasPlatform && 'Platform', !hasLink && 'Dash Link', !hasOnboard && 'Onboarding Date'].filter(Boolean),
               label: 'Route to Partner DB'
            };
      }
      return null;
  }, [formData]);

  const performSave = useCallback(async (data: Lead) => {
      setSaveStatus('saving');
      const now = formatDate();
      await onUpdate({ ...data, updatedAt: now });
      setSaveStatus('saved');
      isDirtyRef.current = false;
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 2000);
  }, [onUpdate]);

  const handleStageChange = (newStage: string) => {
      const currentStage = formData.status;
      if (newStage === currentStage) return;

      const forbidden = FORBIDDEN_TRANSITIONS[currentStage];
      if (forbidden && forbidden.includes(newStage)) {
          alert(`❌ Stage change not allowed as per SOP.\nCannot move from ${currentStage} to ${newStage}.`);
          return;
      }

      const required = getRequirementsForStage(newStage);
      const missing = required.filter(field => !isFieldValid(field, formData[field as keyof Lead]));
      
      if (missing.length > 0) {
          alert(`❌ Missing required fields for ${newStage}:\n${missing.map(f => `- ${getFieldLabel(f)}`).join('\n')}`);
          return;
      }

      const todayStr = formatDate();
      const updates: Partial<Lead> = {
          status: newStage,
          stageChangedDate: todayStr,
          lastContactDate: todayStr
      };

      if (newStage === 'Won') {
          updates.wonDate = todayStr;
          updates.paymentUpdate = 'Done';
      }
      if (newStage === 'Lost') {
          updates.lostDate = todayStr;
      }
      if (newStage === 'Assigned' && !formData.firstResponseTime) {
           updates.firstResponseTime = todayStr;
      }

      const cat = (formData.category || '').toLowerCase();
      const exactRule = autoActions.find(r => r.triggerStage.toLowerCase() === newStage.toLowerCase()); 
      
      if (exactRule) {
          updates.nextAction = exactRule.defaultNextAction;
          updates.nextActionDate = addDaysToDate(exactRule.defaultDays);
      } else {
          const defaults = AUTO_NEXT_ACTIONS_DEFAULT[newStage];
          if (defaults) {
              updates.nextAction = defaults.action;
              updates.nextActionDate = addDaysToDate(defaults.days);
          } else {
              updates.nextAction = '';
              updates.nextActionDate = '';
          }
      }

      // Update days_open
      const today = new Date();
      const createdDate = parseDate(formData.date) || new Date();
      const diff = Math.ceil(Math.abs(today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      updates.daysOpen = `${diff}d`;

      onLogActivity?.('Stage Change', `Moved to ${newStage}`);
      setFormData(prev => {
          const next = { ...prev, ...updates };
          performSave(next);
          return next;
      });
  };

  const handleChange = (field: keyof Lead, value: any) => {
    if (field === 'status') {
        handleStageChange(value as string);
        return;
    }

    // Lane Switch Logging
    if (field === 'intent' && value !== formData.intent) {
        onLogActivity?.('Intent Switch', `Changed intent from ${formData.intent || 'None'} to ${value}`);
    }

    setFormData(prev => {
        const newData = { ...prev, [field]: value };
        if (field === 'estimatedQty' && !isSampling) newData.priority = calculatePriority(parseInt(value) || 0);
        
        formDataRef.current = newData;
        isDirtyRef.current = true;
        setSaveStatus('idle');
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => performSave(newData), 1000);
        return newData;
    });
  };

  const handleActionClick = (type: 'Call' | 'WhatsApp' | 'Email' | 'Note' | 'Attempt') => {
      if (type === 'Attempt') {
          const today = formatDate();
          const current = formData.contactAttempts || 0;
          const updates: Partial<Lead> = {
              contactAttempts: current + 1,
              lastAttemptDate: today,
              lastContactDate: today,
              contactStatus: formData.contactStatus === 'Not Contacted' ? 'Attempted' : formData.contactStatus
          };
          handleChange('contactAttempts', updates.contactAttempts); 
          setFormData(prev => { const next = { ...prev, ...updates }; performSave(next); return next; });
          onLogActivity?.('Contact Attempt', `Manual attempt logged. Count: ${current + 1}`);
          return;
      }
      
      onLogActivity?.(type, type === 'Note' ? 'Manual note' : `${type} action initiated`);
      
      if (type === 'WhatsApp') {
          if (formData.number) setShowTemplateModal(true);
      }
      if (type === 'Call' && formData.number) window.location.href=`tel:${formData.number}`;
      if (type === 'Email' && formData.email) window.location.href=`mailto:${formData.email}`;
      if (type === 'Note') noteInputRef.current?.focus();
  };

  const handleSnooze = (days: number | 'monday') => {
      let d = new Date();
      if (days === 'monday') {
          const day = d.getDay();
          const diff = day === 0 ? 1 : 8 - day; // If Sun(0) -> +1=Mon. If Mon(1) -> +7=NextMon
          d.setDate(d.getDate() + diff);
      } else {
          d.setDate(d.getDate() + days);
      }
      const dateStr = formatDate(d);
      handleChange('nextActionDate', dateStr);
      onLogActivity?.('Snooze', `Snoozed task to ${dateStr}`);
  };

  const handleMarkComplete = () => {
       handleChange('nextAction', '');
       handleChange('nextActionDate', '');
       onLogActivity?.('Task Complete', 'Marked next action as done');
  };

  const getOptionList = (key: string): string[] => {
      const mapping: Record<string, keyof AppOptions> = {
          ydsPoc: 'owners',
          source: 'sources',
          category: 'categories',
          priority: 'priorities',
          productType: 'productTypes',
          printType: 'printTypes',
          contactStatus: 'contactStatus',
          paymentUpdate: 'paymentStatus',
          design: 'designStatus',
          customerType: 'customerTypes',
          platformType: 'platformTypes',
          sampleStatus: 'sampleStatus',
          orderStatus: 'orderStatus',
          intent: 'intents',
          workflowType: 'workflowTypes'
      };
      
      const optionKey = mapping[key];
      if (optionKey && options[optionKey]) {
          return options[optionKey] as string[];
      }
      // Fallback
      return (options[key as keyof AppOptions] as string[]) || [];
  };

  const renderField = (key: keyof Lead, labelOverride?: string) => {
      const label = labelOverride || getFieldLabel(key);
      const commonProps = { 
          disabled: formData.status === 'Lost' && key !== 'lostReason', 
          className: "bg-white text-sm" 
      };

      if (['source', 'ydsPoc', 'priority', 'category', 'customerType', 'productType', 'printType', 'contactStatus', 'design', 'paymentUpdate', 'platformType', 'integrationReady', 'sampleRequired', 'sampleStatus', 'intent', 'workflowType', 'dashboardLinkSent'].includes(key)) {
          let opts = getOptionList(key);
          
          // Manual Fallbacks for hardcoded lists or booleans if missing from options
          if (key === 'integrationReady' || key === 'sampleRequired' || key === 'dashboardLinkSent') opts = ['Yes', 'No'];
          if (key === 'intent' && opts.length === 0) opts = ['POD', 'B2B', 'Dropshipping', 'Unclear'];

          return <Select label={label} options={opts} value={formData[key] as string} onChange={(e) => handleChange(key, e.target.value)} {...commonProps} />;
      }
      if (key === 'orderInfo' || key === 'remarks') {
          return <Textarea label={label} value={formData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={3} {...commonProps} />;
      }
      if (key === 'onboardingStartedDate' || key === 'expectedCloseDate') {
          return (
              <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <input 
                    type="date" 
                    className="w-full rounded-lg border-gray-300 bg-white text-gray-900 shadow-sm text-sm border h-10 px-3" 
                    value={toInputDate(formData[key] as string)} 
                    onChange={(e) => handleChange(key, fromInputDate(e.target.value))} 
                  />
              </div>
          )
      }
      return <Input label={label} value={formData[key] as string || ''} onChange={(e) => handleChange(key, e.target.value)} {...commonProps} />;
  };

  const filteredLogs = useMemo(() => {
      let logs = activityLogs.filter(l => l.leadId === lead.leadId);
      if (timelineFilter === 'comms') logs = logs.filter(l => ['Call', 'WhatsApp', 'Email'].includes(l.activityType));
      if (timelineFilter === 'notes') logs = logs.filter(l => l.activityType === 'Note');
      if (timelineFilter === 'system') logs = logs.filter(l => l.activityType.includes('Change') || l.activityType.includes('Update') || l.activityType.includes('Switch'));
      return logs;
  }, [activityLogs, lead.leadId, timelineFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-[1200px] bg-gray-50 shadow-2xl flex flex-col h-full transform transition-transform animate-slide-in-right border-l border-gray-200">
        
        {/* TOP HEADER - LEAD IDENTITY & STATUS */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 flex justify-between items-start shadow-sm z-10">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{formData.companyName}</h2>
                    {formData.intent && <Badge variant="info" className="text-xs">{formData.intent}</Badge>}
                    <Badge variant={formData.priority?.includes('High') ? 'danger' : 'default'} className="text-xs">{formData.priority}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><User size={12}/> {formData.contactPerson}</span>
                    <span className="w-px h-3 bg-gray-300"></span>
                    <span className="flex items-center gap-1.5"><MapPin size={12}/> {formData.city || 'No City'}</span>
                    <span className="w-px h-3 bg-gray-300"></span>
                    <span className="font-mono text-gray-400">#{formData.leadId}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                     <select 
                         value={formData.status} 
                         onChange={(e) => handleStageChange(e.target.value)}
                         className="bg-gray-100 border-none text-blue-800 font-bold text-sm py-1 pl-3 pr-8 rounded-lg cursor-pointer hover:bg-gray-200 focus:ring-2 focus:ring-blue-500"
                     >
                         {options.stages.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                     
                     <div className="flex items-center gap-1.5 mt-1">
                         <span className="text-[10px] text-gray-400 font-medium">{slaInfo.stageAge} days in stage</span>
                         
                         {/* SLA Badge in Header */}
                         {slaInfo.health.status !== 'Healthy' && (
                             <span className={`text-[9px] font-bold px-1.5 rounded flex items-center gap-1 border
                                ${slaInfo.health.status === 'Violated' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                             `}>
                                 {slaInfo.health.status === 'Violated' ? <ShieldAlert size={10}/> : <Clock size={10}/>}
                                 {slaInfo.health.label}
                             </span>
                         )}
                     </div>
                 </div>
                 <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                     <X size={24}/>
                 </button>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            
            {/* LEFT: MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* Section A: Contact Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                         <User size={14} className="text-blue-500"/> Contact Information
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                         {renderField('companyName')}
                         {renderField('contactPerson')}
                         {renderField('number', 'Phone Number')}
                         {renderField('email')}
                         {renderField('city')}
                         {renderField('source')}
                     </div>
                </div>

                {/* Section B: Classification (Enhanced with Intent) */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                         <Tag size={14} className="text-orange-500"/> Classification & Intent
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                         {renderField('intent')}
                         {renderField('category', 'Lead Category')}
                         {renderField('priority')}
                         {renderField('customerType')}
                     </div>
                </div>

                {/* Section C: Requirements & Specs (Dynamic based on Intent) */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                         <ShoppingBag size={14} className="text-purple-500"/> Order Requirements & Forecast
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                         {/* Forecast Fields */}
                         <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-2">
                            {renderField('estimatedQty', formData.intent?.toLowerCase().includes('b2b') ? 'Volume (Units)' : 'Est. Quantity')}
                            {renderField('expectedCloseDate')}
                         </div>

                         {/* Dynamic Field Rendering based on activeFields from intent */}
                         {activeFields.map(field => {
                             if (field === 'estimatedQty' || field === 'expectedCloseDate') return null; // Already rendered
                             
                             let label;
                             if (field === 'orderInfo' && formData.intent?.toLowerCase().includes('b2b')) label = 'Event Timeline / Specs';
                             
                             if (field === 'orderInfo') return null; // Render separately below
                             
                             return <div key={field}>{renderField(field as keyof Lead, label)}</div>;
                         })}
                         
                         <div className="md:col-span-2 lg:col-span-3">
                            {renderField('orderInfo', formData.intent?.toLowerCase().includes('b2b') ? 'Event Timeline / Specs' : 'Detailed Specs / Requirements')}
                         </div>
                     </div>
                </div>

                {/* Section D: Notes & Timeline */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <History size={14} className="text-gray-500"/> Notes & Activity
                        </h3>
                        <div className="flex bg-gray-100 rounded p-0.5">
                            {['all', 'comms', 'notes'].map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setTimelineFilter(f as any)} 
                                    className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-all ${timelineFilter === f ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                                >{f}</button>
                            ))}
                        </div>
                     </div>
                    
                    <div className="flex gap-2 mb-6">
                        <Input ref={noteInputRef} placeholder="Type a note or activity..." className="flex-1" />
                        <Button size="sm" onClick={() => { if(noteInputRef.current?.value) { handleActionClick('Note'); noteInputRef.current.value = ''; } }}>Post Note</Button>
                    </div>

                    <div className="space-y-6 pl-2">
                        {filteredLogs.map(log => (
                            <div key={log.logId} className="relative pl-6 border-l-2 border-gray-100 last:border-0">
                                <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${log.activityType === 'Note' ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                                <div className="text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-900 text-xs">{log.owner}</span>
                                        <span className="text-[10px] text-gray-400">{log.timestamp}</span>
                                        {log.activityType !== 'Note' && <span className="text-[9px] uppercase bg-gray-100 px-1.5 rounded text-gray-500 font-bold">{log.activityType}</span>}
                                    </div>
                                    <div className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        {log.notes}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: COMMAND BAR (Sidebar) */}
            <div className="w-full lg:w-96 bg-gray-50 border-l border-gray-200 flex flex-col shrink-0 h-full overflow-y-auto">
                 
                 {/* 0. Routing Action Bar (New) */}
                 {routingStatus && (
                     <div className={`p-4 border-b border-gray-200 ${routingStatus.ready ? 'bg-green-50' : 'bg-gray-100'}`}>
                         <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2 text-gray-600">
                             <Rocket size={14} className={routingStatus.ready ? "text-green-600" : "text-gray-400"} />
                             Routing Status
                         </h3>
                         
                         {routingStatus.ready ? (
                             <div className="space-y-2">
                                 <p className="text-sm text-green-700 font-medium">Ready for {routingStatus.target}</p>
                                 <Button className="w-full shadow-md bg-green-600 hover:bg-green-700" size="sm" icon={<ArrowRight size={14}/>}>
                                     {routingStatus.label}
                                 </Button>
                             </div>
                         ) : (
                             <div>
                                 <p className="text-xs text-gray-500 mb-2">Missing Info for {routingStatus.target}:</p>
                                 <div className="flex flex-wrap gap-1">
                                     {routingStatus.missing?.map(m => (
                                         <Badge key={m as string} variant="neutral" className="text-[10px] bg-white border-gray-300">
                                             {m}
                                         </Badge>
                                     ))}
                                 </div>
                             </div>
                         )}
                     </div>
                 )}

                 {/* 1. Stage Checklist */}
                 <div className="p-5 border-b border-gray-200 bg-white">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <CheckSquare size={14} className="text-blue-600"/> Required for {nextStage || 'Next Stage'}
                        </h3>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {Object.values(reqStatus).filter(Boolean).length} / {Math.max(requirements.length, 1)}
                        </span>
                     </div>
                     
                     <div className="space-y-1">
                         {requirements.map(field => {
                             const isDone = reqStatus[field];
                             const isEditing = editingField === field;
                             return (
                                 <div key={field} className="group">
                                    {!isEditing ? (
                                        <div 
                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isDone ? 'hover:bg-green-50' : 'hover:bg-red-50 bg-white border border-gray-200'}`}
                                            onClick={() => setEditingField(field)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isDone ? <CheckCircle2 size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-400"/>}
                                                <span className={`text-xs font-medium ${isDone ? 'text-gray-600 line-through decoration-gray-300' : 'text-gray-800'}`}>
                                                    {getFieldLabel(field)}
                                                </span>
                                            </div>
                                            <Edit2 size={12} className="text-gray-300 group-hover:text-blue-500"/>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in relative">
                                            <button onClick={(e) => {e.stopPropagation(); setEditingField(null);}} className="absolute right-2 top-2"><X size={12} className="text-gray-400"/></button>
                                            {renderField(field as keyof Lead)}
                                        </div>
                                    )}
                                 </div>
                             )
                         })}
                         {requirements.length === 0 && <p className="text-xs text-gray-400 italic p-2">No requirements for next stage.</p>}
                     </div>
                 </div>

                 {/* 2. Action Plan (SLA & Next Step) */}
                 <div className="p-5 border-b border-gray-200 bg-gradient-to-b from-white to-gray-50">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <ShieldAlert size={14} className={formData.actionOverdue === 'OVERDUE' ? 'text-red-500' : 'text-green-500'}/> Action Plan
                        </h3>
                        <Badge variant={formData.actionOverdue === 'OVERDUE' ? 'danger' : formData.actionOverdue?.includes('DUE') ? 'warning' : 'success'}>
                            {formData.actionOverdue || 'On Track'}
                        </Badge>
                     </div>

                     <div className="space-y-3">
                         <div className="relative">
                             <Input 
                                value={formData.nextAction || ''}
                                onChange={(e) => handleChange('nextAction', e.target.value)}
                                placeholder="What needs to happen next?"
                                className="font-medium pr-8"
                             />
                             {formData.nextAction && (
                                 <button onClick={handleMarkComplete} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-green-500" title="Mark Complete">
                                     <CheckCircle2 size={18} />
                                 </button>
                             )}
                         </div>

                         <div className="flex gap-2">
                             <input 
                                type="date" 
                                className="flex-1 text-sm border-gray-300 rounded-lg focus:ring-blue-500 text-gray-600 bg-white h-9 px-3 border"
                                value={toInputDate(formData.nextActionDate)}
                                onChange={(e) => handleChange('nextActionDate', fromInputDate(e.target.value))}
                             />
                             <div className="flex gap-1">
                                 <button onClick={() => handleSnooze(1)} className="px-3 bg-white border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-50 hover:text-blue-600 text-gray-600">+1D</button>
                                 <button onClick={() => handleSnooze(2)} className="px-3 bg-white border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-50 hover:text-blue-600 text-gray-600">+2D</button>
                                 <button onClick={() => handleSnooze('monday')} className="px-3 bg-white border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-50 hover:text-blue-600 text-gray-600">Mon</button>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* 3. Quick Actions Grid */}
                 <div className="p-5 border-b border-gray-200">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
                     <div className="grid grid-cols-2 gap-3">
                         <button onClick={() => handleActionClick('Call')} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all text-sm font-medium text-gray-600">
                             <Phone size={16}/> Call
                         </button>
                         <button onClick={() => handleActionClick('WhatsApp')} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all text-sm font-medium text-gray-600">
                             <MessageCircle size={16}/> WhatsApp
                         </button>
                         <button onClick={() => setShowTemplateModal(true)} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all text-sm font-medium text-gray-600 col-span-2">
                             <Send size={16}/> Send Template
                         </button>
                         <button onClick={() => handleActionClick('Attempt')} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-100 transition-all text-sm font-medium text-gray-600">
                             <Flag size={16}/> Log Attempt
                         </button>
                         <button onClick={() => handleActionClick('Email')} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all text-sm font-medium text-gray-600">
                             <Mail size={16}/> Email
                         </button>
                     </div>
                 </div>

                 {/* 4. Assignment */}
                 <div className="p-5">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Owner</h3>
                        <button onClick={() => handleChange('ydsPoc', 'Me')} className="text-[10px] text-blue-600 font-bold hover:underline">+ Assign to Me</button>
                     </div>
                     <div className="bg-white p-1 rounded-lg border border-gray-200">
                         <Select 
                            options={options.owners} 
                            value={formData.ydsPoc} 
                            onChange={(e) => handleChange('ydsPoc', e.target.value)} 
                            className="border-none shadow-none focus:ring-0 text-sm font-medium"
                         />
                     </div>
                     <div className="text-[10px] text-gray-400 mt-2 text-center">
                         {saveStatus === 'saving' ? <span className="flex items-center justify-center gap-1"><Loader2 size={10} className="animate-spin"/> Saving changes...</span> : saveStatus === 'saved' ? 'All changes saved.' : ''}
                     </div>
                 </div>
            </div>
        </div>
      </div>
      
      <TemplateModal 
        isOpen={showTemplateModal} 
        onClose={() => setShowTemplateModal(false)}
        lead={formData}
        templates={templates}
        onSend={(t) => {
             const encoded = encodeURIComponent(t.body);
             window.open(`https://wa.me/${formData.number?.replace(/\D/g, '')}?text=${encoded}`, '_blank');
             setShowTemplateModal(false);
             onLogActivity?.('WhatsApp Template', `Sent: ${t.name}`);
        }}
        onCustom={() => {
             window.open(`https://wa.me/${formData.number?.replace(/\D/g, '')}`, '_blank');
             setShowTemplateModal(false);
        }}
      />
    </div>
  );
};