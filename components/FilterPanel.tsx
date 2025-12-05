import React from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { AppOptions } from '../types';
import { Button } from './ui/Button';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appOptions: AppOptions;
  filters: {
    stage: string;
    owner: string;
    category: string;
    priority: string;
    source: string;
    city: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ 
  isOpen, 
  onClose, 
  appOptions, 
  filters, 
  onFilterChange, 
  onReset 
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl border-l border-gray-200 transform transition-transform animate-slide-in-right flex flex-col">
          
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <Filter size={18} className="text-blue-600" /> Filters
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                  <X size={20} />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Stage Filter */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Stage</label>
                  <select 
                    value={filters.stage} 
                    onChange={(e) => onFilterChange('stage', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                      <option value="All">All Stages</option>
                      {appOptions.stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>

              {/* Owner Filter */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Lead Owner</label>
                  <select 
                    value={filters.owner} 
                    onChange={(e) => onFilterChange('owner', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                      <option value="All">All Owners</option>
                      {appOptions.owners.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
              </div>

              {/* Category Filter */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                  <select 
                    value={filters.category} 
                    onChange={(e) => onFilterChange('category', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                      <option value="All">All Categories</option>
                      {appOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>

              {/* Priority Filter */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Priority</label>
                  <select 
                    value={filters.priority} 
                    onChange={(e) => onFilterChange('priority', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                      <option value="All">All Priorities</option>
                      {appOptions.priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
              </div>

              {/* Source Filter */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Source</label>
                  <select 
                    value={filters.source} 
                    onChange={(e) => onFilterChange('source', e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  >
                      <option value="All">All Sources</option>
                      {appOptions.sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
              
              {/* City Filter (Simple Input for now) */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">City</label>
                  <input 
                    type="text"
                    value={filters.city} 
                    onChange={(e) => onFilterChange('city', e.target.value)}
                    placeholder="Filter by city..."
                    className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
              </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
              <Button onClick={onReset} variant="outline" className="w-full" icon={<RotateCcw size={14} />}>
                  Reset All Filters
              </Button>
          </div>
      </div>
    </>
  );
};