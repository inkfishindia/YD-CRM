
import React from 'react';
import { Lead, AppOptions, SLARule } from '../types';
import { Phone, MessageCircle, Copy, Clock, Box, Layers, Globe, StickyNote, GripVertical, Mail, AlertTriangle, CheckCircle2, MoreHorizontal, ShoppingBag } from 'lucide-react';
import { useLeadCalculations } from '../hooks/useLeadCalculations';
import { Badge } from './ui/Badge';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onQuickNote: (lead: Lead) => void;
  // Configs
  appOptions?: AppOptions;
  slaRules?: SLARule[];
  
  // Selection
  isSelected?: boolean;
  onToggleSelect?: (leadId: string) => void;
  
  // Drag and Drop
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, leadId: string) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ 
  lead, 
  onClick,
  onQuickNote,
  slaRules = [],
  isSelected = false,
  draggable = false,
  onDragStart
}) => {
  const { urgencyLevel, signalColor, isOverdue, daysInStage, slaStatus } = useLeadCalculations(lead, slaRules);

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.number) window.location.href = `tel:${lead.number}`;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanNumber = lead.number?.replace(/\D/g, '');
    if (cleanNumber) window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.email) window.location.href = `mailto:${lead.email}`;
  };

  const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = `*${lead.companyName}* (${lead.contactPerson})\nStatus: ${lead.status}\nNext: ${lead.nextAction || 'None'} (Due: ${lead.nextActionDate || 'Na'})`;
      navigator.clipboard.writeText(text);
  };

  // Border & Background Logic
  const borderClass = 
      signalColor === 'red' ? 'border-l-4 border-l-red-500' :
      signalColor === 'yellow' ? 'border-l-4 border-l-yellow-400' :
      signalColor === 'blue' ? 'border-l-4 border-l-blue-500' :
      signalColor === 'green' ? 'border-l-4 border-l-green-400' :
      'border-l-4 border-l-gray-300';
      
  let bgClass = "bg-white";
  if (lead.status === 'Lost') bgClass = "bg-gray-50 opacity-70 grayscale";
  if (lead.status === 'Won') bgClass = "bg-green-50/40";

  // Action Panel Color
  let actionBg = "bg-gray-50 text-gray-500 border-gray-100";
  if (urgencyLevel === 'critical') actionBg = "bg-red-50 text-red-700 border-red-100";
  if (urgencyLevel === 'warning') actionBg = "bg-yellow-50 text-yellow-800 border-yellow-100";
  if (urgencyLevel === 'scheduled') actionBg = "bg-blue-50 text-blue-700 border-blue-100";

  return (
    <div 
        className={`
            group relative rounded-xl shadow-sm border-r border-t border-b transition-all duration-200 cursor-pointer
            flex flex-col mb-3 hover:shadow-md hover:translate-y-[-1px]
            ${bgClass} ${borderClass}
            ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
        `}
        onClick={onClick}
        draggable={draggable}
        onDragStart={(e) => onDragStart && onDragStart(e, lead.leadId)}
    >
        {/* HOVER SNAPSHOT (Tooltip) */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[105%] w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 invisible group-hover:visible">
            <div className="font-bold border-b border-gray-700 pb-1 mb-1">{lead.companyName}</div>
            <div className="space-y-1">
                <div className="flex justify-between"><span className="text-gray-400">Requirement:</span> <span className="text-right truncate max-w-[140px]">{lead.orderInfo || 'None'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Next:</span> <span className="text-right">{lead.nextAction || 'None'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Attempts:</span> <span>{lead.contactAttempts || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">In Stage:</span> <span>{daysInStage} days</span></div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
        </div>

        <div className="p-3 flex flex-col gap-2">
            
            {/* TOP: Identity & Drag Handle */}
            <div className="flex items-start gap-2">
                 {draggable && (
                     <div className="text-gray-300 cursor-grab hover:text-gray-500 pt-1 -ml-1">
                         <GripVertical size={14} />
                     </div>
                 )}
                 
                 <div className="flex-1 min-w-0">
                     <div className="flex justify-between items-start">
                         <h3 className="font-bold text-gray-900 text-sm leading-tight truncate pr-2" title={lead.companyName}>
                            {lead.companyName || 'Unnamed Lead'}
                         </h3>
                         <Badge variant="neutral" className="shrink-0 text-[9px] py-0 px-1">{lead.category?.substring(0, 10)}</Badge>
                     </div>
                     <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                         <span className="truncate font-medium text-gray-700 max-w-[120px]">{lead.contactPerson}</span>
                         {lead.source && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-400 flex items-center gap-0.5"><Globe size={8}/> {lead.source}</span>}
                     </div>
                 </div>
            </div>

            {/* TAGS ROW - Now includes Intent */}
            <div className="flex flex-wrap gap-1.5">
                {lead.intent && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 border-blue-100 text-blue-700">
                        {lead.intent}
                    </span>
                )}
                {lead.estimatedQty > 0 && (
                    <span className="text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Box size={10} /> {lead.estimatedQty}
                    </span>
                )}
                {lead.productType && (
                     <span className="text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ShoppingBag size={10} /> {lead.productType}
                     </span>
                )}
                {lead.priority?.includes('High') && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-50 border-red-100 text-red-700">
                        🔥 High
                    </span>
                )}
            </div>

            {/* NEXT ACTION PANEL (Click to Expand in Detail) */}
            <div className={`rounded-lg p-2 border text-xs flex flex-col gap-1 ${actionBg}`}>
                <div className="flex justify-between items-start">
                    <span className="font-bold truncate max-w-[180px]">
                        {lead.nextAction || 'Set next action...'}
                    </span>
                    {lead.nextActionDate && (
                         <span className={`font-mono font-bold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'inherit'}`}>
                             {isOverdue && <Clock size={10} />}
                             {lead.nextActionDate}
                         </span>
                    )}
                </div>
                {!lead.nextAction && (
                    <div className="text-[10px] opacity-70 italic">Click to plan next step</div>
                )}
            </div>

            {/* FOOTER: Owner, SLA, Actions */}
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center mt-1">
                 <div className="flex items-center gap-2">
                     <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shadow-sm
                             ${!lead.ydsPoc || lead.ydsPoc === 'Unassigned' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200'}
                         `} title={`Owner: ${lead.ydsPoc || 'Unassigned'}`}>
                            {lead.ydsPoc ? lead.ydsPoc.charAt(0) : '?'}
                     </div>
                     
                     {/* SLA / Age Badge */}
                     <div className={`text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded border
                        ${slaStatus === 'Violated' ? 'bg-red-50 text-red-700 border-red-200' : 
                          slaStatus === 'Warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                          'bg-gray-50 text-gray-500 border-gray-100'}
                     `} title="Time in Stage">
                        {daysInStage}d
                        {slaStatus === 'Violated' && ' 🚨'}
                     </div>
                 </div>

                 {/* Quick Actions */}
                 <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    {lead.number && (
                        <>
                            <button onClick={handleCall} className="p-1.5 rounded hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors" title="Call">
                                <Phone size={12} />
                            </button>
                            <button onClick={handleWhatsApp} className="p-1.5 rounded hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors" title="WhatsApp">
                                <MessageCircle size={12} />
                            </button>
                        </>
                    )}
                    {lead.email && (
                        <button onClick={handleEmail} className="p-1.5 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors" title="Email">
                            <Mail size={12} />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onQuickNote(lead); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Note">
                        <StickyNote size={12} />
                    </button>
                 </div>
            </div>
        </div>
    </div>
  );
};
