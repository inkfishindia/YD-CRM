

import React from 'react';
import { Lead, MessageTemplate } from '../types';
import { Modal } from './ui/Modal';
import { MessageCircle, Send } from 'lucide-react';
import { Badge } from './ui/Badge';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  templates: MessageTemplate[];
  onSend: (template: MessageTemplate) => void;
  onCustom: () => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, lead, templates, onSend, onCustom }) => {
  if (!isOpen || !lead) return null;

  // PRD 6.1 Template Filtering Logic
  // Filter templates where:
  // template.stage === lead.stage AND 
  // (template.category === lead.category OR template.category === "ALL" OR template.category empty)
  const validTemplates = templates.filter(t => {
      const leadStage = (lead.status || '').toLowerCase();
      const tplStage = (t.stage || '').toLowerCase();
      
      const stageMatch = tplStage === leadStage || tplStage === 'all' || tplStage === 'any' || tplStage === '';
      
      const leadCat = (lead.category || '').toLowerCase();
      const tplCat = (t.category || '').toLowerCase();
      
      const categoryMatch = !t.category || tplCat === 'all' || tplCat === 'any' || tplCat === leadCat;
      
      return stageMatch && categoryMatch;
  });

  // PRD 6.2 Variable Substitution
  const renderBody = (body: string) => {
      let text = body || "";
      
      // Recognized variables
      // {{contact_person}}, {{company_name}}, {{yds_poc}}, {{category}}, {{estimated_qty}}, {{product_type}}, {{phone}}
      
      text = text.replace(/{{\s*contact_person\s*}}/gi, lead.contactPerson || "there");
      text = text.replace(/{{\s*company_name\s*}}/gi, lead.companyName || "");
      text = text.replace(/{{\s*yds_poc\s*}}/gi, lead.ydsPoc || "YDS Team");
      text = text.replace(/{{\s*category\s*}}/gi, lead.category || "");
      text = text.replace(/{{\s*estimated_qty\s*}}/gi, String(lead.estimatedQty || ""));
      text = text.replace(/{{\s*product_type\s*}}/gi, lead.productType || "products");
      text = text.replace(/{{\s*phone\s*}}/gi, lead.number || "");
      
      // Extra common ones just in case
      text = text.replace(/{{\s*owner\s*}}/gi, lead.ydsPoc || "YDS Team");

      return text;
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Select Template"
    >
        <div className="space-y-3">
             <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-start gap-3 mb-4">
                 <div className="bg-green-100 p-2 rounded-full text-green-600 mt-1">
                     <MessageCircle size={16} />
                 </div>
                 <div>
                     <h4 className="text-sm font-bold text-green-800">WhatsApp {lead.contactPerson}</h4>
                     <p className="text-xs text-green-700 mt-0.5">{lead.number}</p>
                 </div>
             </div>

             <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">Suggested Templates ({validTemplates.length})</p>
             <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
                 {validTemplates.map(tpl => {
                     const rendered = renderBody(tpl.body);
                     return (
                        <button
                            key={tpl.id}
                            onClick={() => onSend({ ...tpl, body: rendered })}
                            className="text-left p-3 rounded-xl border border-gray-200 hover:border-green-500 hover:shadow-md hover:bg-green-50/50 transition-all group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-gray-800 text-sm">{tpl.name}</span>
                                <Badge variant="neutral" className="text-[9px]">{tpl.category || 'All'}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 pr-6 whitespace-pre-wrap">{rendered}</p>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-green-600">
                                <Send size={16} />
                            </div>
                        </button>
                     )
                 })}
                 
                 {validTemplates.length === 0 && (
                     <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                         <p className="text-xs text-gray-400 italic">
                             No matching templates for stage "{lead.status}" and category "{lead.category}".
                         </p>
                     </div>
                 )}

                 <button 
                    onClick={onCustom}
                    className="w-full text-center py-3 text-sm text-gray-500 font-medium hover:text-green-600 hover:bg-gray-50 rounded-xl border border-dashed border-gray-300 hover:border-green-300 transition-colors mt-2"
                 >
                     Write custom message...
                 </button>
             </div>
        </div>
    </Modal>
  );
};