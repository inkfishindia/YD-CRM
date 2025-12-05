import React, { useState } from 'react';
import { User, ArrowRight, Trash2, X, Calendar, MessageCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Form';
import { AppOptions, addDaysToDate } from '../types';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: string, value: any) => Promise<void>;
  appOptions: AppOptions;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ 
  selectedCount, 
  onClearSelection, 
  onBulkAction,
  appOptions
}) => {
  const [actionType, setActionType] = useState<'owner' | 'stage' | 'nextAction' | null>(null);
  const [value, setValue] = useState('');
  const [dateValue, setDateValue] = useState(''); // For next action date
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
      if (!actionType) return;
      if (actionType === 'nextAction' && (!value || !dateValue)) return;
      if (actionType !== 'nextAction' && !value) return;

      setLoading(true);
      
      if (actionType === 'nextAction') {
          // Pass composite value for next action
          await onBulkAction('nextAction', { action: value, date: dateValue });
      } else {
          await onBulkAction(actionType, value);
      }
      
      setLoading(false);
      setActionType(null);
      setValue('');
      setDateValue('');
      onClearSelection();
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4 animate-fade-in-up w-[90%] md:w-auto">
       <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
           <span className="font-bold text-lg">{selectedCount}</span>
           <span className="text-xs text-gray-400 font-medium uppercase">Selected</span>
       </div>

       {actionType === null ? (
           <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
               <Button size="sm" variant="secondary" onClick={() => setActionType('owner')} icon={<User size={14} />}>
                   Assign
               </Button>
               <Button size="sm" variant="secondary" onClick={() => setActionType('stage')} icon={<ArrowRight size={14} />}>
                   Move Stage
               </Button>
               <Button size="sm" variant="secondary" onClick={() => setActionType('nextAction')} icon={<Calendar size={14} />}>
                   Next Action
               </Button>
           </div>
       ) : (
           <div className="flex items-center gap-2 animate-slide-in-right">
               {actionType === 'owner' && (
                   <select 
                     className="bg-gray-800 border-gray-700 text-white text-sm rounded-lg h-8 px-2 focus:ring-1 focus:ring-blue-500"
                     value={value}
                     onChange={(e) => setValue(e.target.value)}
                   >
                       <option value="">Select Owner...</option>
                       {appOptions.owners.map(o => <option key={o} value={o}>{o}</option>)}
                   </select>
               )}
               
               {actionType === 'stage' && (
                   <select 
                     className="bg-gray-800 border-gray-700 text-white text-sm rounded-lg h-8 px-2 focus:ring-1 focus:ring-blue-500"
                     value={value}
                     onChange={(e) => setValue(e.target.value)}
                   >
                       <option value="">Select Stage...</option>
                       {appOptions.stages.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
               )}

               {actionType === 'nextAction' && (
                   <div className="flex items-center gap-2">
                       <input 
                           placeholder="Action..." 
                           className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg h-8 px-2 w-32 focus:ring-1 focus:ring-blue-500"
                           value={value}
                           onChange={(e) => setValue(e.target.value)}
                       />
                       <input 
                           type="date"
                           className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg h-8 px-2 w-32 focus:ring-1 focus:ring-blue-500"
                           value={dateValue}
                           onChange={(e) => setDateValue(e.target.value)}
                       />
                   </div>
               )}

               <Button 
                 size="sm" 
                 variant="primary" 
                 onClick={handleExecute} 
                 disabled={(actionType === 'nextAction' && (!value || !dateValue)) || (actionType !== 'nextAction' && !value)}
                 isLoading={loading}
               >
                   Apply
               </Button>
               <button onClick={() => setActionType(null)} className="p-1 hover:text-gray-300"><X size={16}/></button>
           </div>
       )}

       <button onClick={onClearSelection} className="ml-auto p-2 text-gray-500 hover:text-white transition-colors">
           <X size={18} />
       </button>
    </div>
  );
};