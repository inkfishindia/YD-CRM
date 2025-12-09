
import React from 'react';
import { Owner } from '../types';

interface TabBarProps {
  currentFilter: Owner;
  onFilterChange: (poc: Owner) => void;
  owners: string[];
}

export const TabBar: React.FC<TabBarProps> = ({ currentFilter, onFilterChange, owners }) => {
  return (
    <div className="sticky top-[64px] z-20 bg-[#f5f5f5]/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          <button
              onClick={() => onFilterChange('All')}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${
                  currentFilter === 'All'
                    ? 'bg-gray-800 text-white shadow-md ring-2 ring-gray-800 ring-offset-2 ring-offset-[#f5f5f5]'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              All
          </button>
          {owners.map((poc) => (
            <button
              key={poc}
              onClick={() => onFilterChange(poc)}
              className={`
                px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap
                ${
                  currentFilter === poc
                    ? 'bg-gray-800 text-white shadow-md ring-2 ring-gray-800 ring-offset-2 ring-offset-[#f5f5f5]'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              {poc}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
