

import React, { useState, useRef, useEffect } from 'react';
import { Lead, formatDate, toInputDate, fromInputDate } from '../types';
import { Calendar, CheckCircle2, Save, X } from 'lucide-react';

interface NextActionInputProps {
  lead: Lead;
  onUpdate: (lead: Lead) => void;
  onLogActivity?: (lead: Lead, type: string, notes: string) => void;
  urgencyLevel: 'critical' | 'warning' | 'okay' | 'scheduled' | 'gray';
  colorClass: string;
}

export const NextActionInput: React.FC<NextActionInputProps> = ({ lead, onUpdate, onLogActivity, urgencyLevel }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [action, setAction] = useState(lead.nextAction || '');
  const [date, setDate] = useState(toInputDate(lead.nextActionDate));
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAction(lead.nextAction || '');
    setDate(toInputDate(lead.nextActionDate));
  }, [lead]);

  // Click outside to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node) && isEditing) {
        handleSave();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, action, date]);

  const handleSave = () => {
    setIsEditing(false);
    
    const fmtDate = fromInputDate(date);
    if (action !== lead.nextAction || fmtDate !== lead.nextActionDate) {
         onUpdate({ ...lead, nextAction: action, nextActionDate: fmtDate });
         if (onLogActivity) onLogActivity(lead, 'Next Action Updated', `Action: ${action}, Due: ${fmtDate}`);
    }
  };

  const handleMarkDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ ...lead, nextAction: '', nextActionDate: '' });
    if (onLogActivity) onLogActivity(lead, 'Task Complete', `Completed: ${lead.nextAction}`);
  };

  const setDateShortcut = (days: number) => {
      const d = new Date();
      if (days === 999) { // Next Monday
          d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7));
          if (d.getDay() === 0) d.setDate(d.getDate() + 1); 
          if (d <= new Date()) d.setDate(d.getDate() + 7);
      } else {
          d.setDate(d.getDate() + days);
      }
      setDate(d.toISOString().split('T')[0]);
  };

  if (isEditing) {
      return (
          <div ref={wrapperRef} className="absolute left-0 top-0 w-full min-w-[300px] z-50 bg-white rounded-xl shadow-2xl ring-1 ring-black/10 animate-fade-in">
              {/* Yellow Accent Bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-yellow-400 rounded-l-xl z-10"></div>
              
              {/* Header Input */}
              <div className="bg-gray-800 p-3 rounded-t-xl ml-1.5">
                  <input 
                      autoFocus
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      placeholder="What needs to happen next?"
                      className="w-full bg-transparent text-white placeholder-gray-400 text-sm font-bold focus:outline-none"
                  />
              </div>

              {/* Body */}
              <div className="p-3 space-y-4 ml-1.5">
                  
                  {/* Date & Shortcuts */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="relative">
                           <input 
                              type="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="bg-gray-800 text-white text-xs font-medium rounded px-3 py-2 border-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[130px]"
                          />
                           <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>

                      <div className="flex gap-1">
                          <button onClick={() => setDateShortcut(0)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded transition-colors">Today</button>
                          <button onClick={() => setDateShortcut(1)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded transition-colors">Tom</button>
                          <button onClick={() => setDateShortcut(2)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded transition-colors">+2</button>
                          <button onClick={() => setDateShortcut(999)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded transition-colors">Mon</button>
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                       <button 
                          onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} 
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                       >
                           <X size={18} />
                       </button>
                       <button 
                          onClick={handleSave} 
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
                       >
                           <Save size={16} /> Save
                       </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- View Mode Styling ---
  let containerClasses = "bg-yellow-50 border-yellow-200 text-yellow-900";
  let iconColor = "text-yellow-600";
  let statusText = "Set next action...";
  let isItalic = true;

  if (lead.nextAction) {
      isItalic = false;
      statusText = lead.nextAction;
      
      if (urgencyLevel === 'critical') {
         containerClasses = "bg-red-50 border-red-200 text-red-900";
         iconColor = "text-red-600";
      } else if (urgencyLevel === 'warning') {
         containerClasses = "bg-yellow-50 border-yellow-200 text-yellow-900";
         iconColor = "text-yellow-600";
      } else if (urgencyLevel === 'scheduled') {
         containerClasses = "bg-blue-50 border-blue-200 text-blue-900";
         iconColor = "text-blue-600";
      } else {
         containerClasses = "bg-white border-gray-200 text-gray-700";
         iconColor = "text-gray-400";
      }
  }

  return (
    <div 
        className={`relative w-full rounded-xl p-3 border transition-all cursor-pointer group hover:shadow-md ${containerClasses}`}
        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
    >
        <div className="flex flex-col gap-1.5">
            <span className={`text-sm leading-snug ${isItalic ? 'font-serif italic opacity-80' : 'font-medium'}`}>
                {statusText}
            </span>
            
            <div className={`flex items-center gap-2 text-xs font-bold ${iconColor}`}>
                 <Calendar size={14} />
                 <span>{lead.nextActionDate || '--'}</span>
            </div>
        </div>

        {lead.nextAction && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={handleMarkDone}
                    className="p-1.5 rounded-full bg-white shadow-sm hover:bg-green-500 hover:text-white text-gray-400 border border-gray-100 transition-all"
                    title="Mark Complete"
                >
                    <CheckCircle2 size={16} />
                </button>
            </div>
        )}
    </div>
  );
};