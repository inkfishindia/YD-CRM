
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, AppOptions, formatDate, toInputDate, fromInputDate } from '../types';
import { X, User, MapPin, Building2, Tag, Layers, CheckCircle2, XCircle, ArrowRight, ShieldAlert, Clock, Phone, MessageCircle, Mail, Send, History, Loader2, Save } from 'lucide-react';
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
  appOptions?: AppOptions;
  autoActions?: any[];
  templates?: any[];
  stageRules?: any[];
  activityLogs?: any[];
  onLogActivity?: (type: string, notes: string) => void;
}

const SECTION_TITLE_CLASS = "text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4";

export const LeadDetailPanel: React.FC<LeadDetailPanelProps> = ({ 
  isOpen, onClose, lead, onUpdate, appOptions, templates = [], onLogActivity
}) => {
  const [formData, setFormData] = useState<Lead>(lead);
  const [isDirty, setIsDirty] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  useEffect(() => { if (isOpen) { setFormData(lead); setIsDirty(false); } }, [isOpen, lead.leadId]);

  const handleChange = (field: keyof Lead, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setIsDirty(true);
  };

  const handleSave = () => {
      onUpdate(formData);
      setIsDirty(false);
  };

  const opts = appOptions || { owners: [], stages: [], sources: [], categories: [], productTypes: [], printTypes: [] } as any;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-gray-50 shadow-2xl flex flex-col h-full animate-slide-in-right border-l border-gray-200">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start shrink-0">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-gray-900">{formData.companyName || 'New Lead'}</h2>
                    <Badge variant={formData.priority?.includes('High') ? 'danger' : 'neutral'}>{formData.priority}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><User size={12}/> {formData.contactPerson}</span>
                    <span className="w-px h-3 bg-gray-300"></span>
                    <span className="flex items-center gap-1.5"><MapPin size={12}/> {formData.city || 'No City'}</span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={24}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Main Form Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Identity Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                     <h3 className={SECTION_TITLE_CLASS}><User size={14} className="text-blue-500"/> Contact Information</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Input label="Company Name" value={formData.companyName} onChange={e => handleChange('companyName', e.target.value)} />
                         <Input label="Contact Person" value={formData.contactPerson} onChange={e => handleChange('contactPerson', e.target.value)} />
                         <Input label="Phone" value={formData.number} onChange={e => handleChange('number', e.target.value)} />
                         <Input label="Email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                         <Input label="City" value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                         <Select label="Source" options={opts.sources} value={formData.source} onChange={e => handleChange('source', e.target.value)} />
                     </div>
                </div>

                {/* 2. Order/Flow Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                     <h3 className={SECTION_TITLE_CLASS}><Layers size={14} className="text-orange-500"/> Requirement & Flow</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Select label="Stage" options={opts.stages} value={formData.status} onChange={e => handleChange('status', e.target.value)} />
                         <Select label="Owner" options={opts.owners} value={formData.ydsPoc} onChange={e => handleChange('ydsPoc', e.target.value)} />
                         <Select label="Category" options={opts.categories} value={formData.category} onChange={e => handleChange('category', e.target.value)} />
                         <Input label="Est. Qty" type="number" value={formData.estimatedQty} onChange={e => handleChange('estimatedQty', parseInt(e.target.value))} />
                         <Select label="Product Type" options={opts.productTypes} value={formData.productType} onChange={e => handleChange('productType', e.target.value)} />
                         <Select label="Print Type" options={opts.printTypes} value={formData.printType} onChange={e => handleChange('printType', e.target.value)} />
                     </div>
                     <div className="mt-4">
                         <Textarea label="Order Requirements / Notes" value={formData.orderInfo} onChange={e => handleChange('orderInfo', e.target.value)} rows={3} />
                     </div>
                </div>

                {/* 3. Action Plan */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                     <h3 className={SECTION_TITLE_CLASS}><ShieldAlert size={14} className="text-red-500"/> Next Actions</h3>
                     <div className="flex gap-4">
                         <div className="flex-1">
                             <Input label="Next Action" value={formData.nextAction} onChange={e => handleChange('nextAction', e.target.value)} placeholder="What's next?" />
                         </div>
                         <div className="w-40">
                             <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
                             <input type="date" className="w-full rounded-lg border-gray-300 shadow-sm text-sm h-10 px-3" value={toInputDate(formData.nextActionDate)} onChange={e => handleChange('nextActionDate', fromInputDate(e.target.value))} />
                         </div>
                     </div>
                </div>
            </div>

            {/* Sidebar Actions */}
            <div className="w-64 bg-gray-50 border-l border-gray-200 p-4 space-y-4">
                <div className="space-y-2">
                    <Button className="w-full justify-start" variant="outline" icon={<Phone size={14}/>} onClick={() => window.location.href=`tel:${formData.number}`}>Call</Button>
                    <Button className="w-full justify-start" variant="outline" icon={<MessageCircle size={14}/>} onClick={() => setShowTemplateModal(true)}>WhatsApp</Button>
                    <Button className="w-full justify-start" variant="outline" icon={<Mail size={14}/>} onClick={() => window.location.href=`mailto:${formData.email}`}>Email</Button>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                    <Button 
                        className="w-full justify-center" 
                        variant="primary" 
                        icon={<Save size={14}/>} 
                        disabled={!isDirty}
                        onClick={handleSave}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>

        {showTemplateModal && (
            <TemplateModal 
                isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)}
                lead={formData} templates={templates}
                onSend={(t) => { window.open(`https://wa.me/${formData.number}?text=${encodeURIComponent(t.body)}`); setShowTemplateModal(false); }}
                onCustom={() => { window.open(`https://wa.me/${formData.number}`); setShowTemplateModal(false); }}
            />
        )}
      </div>
    </div>
  );
};
