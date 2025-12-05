
import React, { useMemo } from 'react';
import { Lead, parseDate } from '../types';

interface StatsBarProps {
  leads: Lead[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ leads }) => {
  const stats = useMemo(() => {
    return {
      total: leads.length,
      newToday: leads.filter(l => {
          const d = parseDate(l.date);
          if (!d) return false;
          const today = new Date();
          return d.getDate() === today.getDate() && 
                 d.getMonth() === today.getMonth() && 
                 d.getFullYear() === today.getFullYear();
      }).length,
      won: leads.filter(l => l.status === 'Won').length,
      pipelineQty: leads
        .filter(l => l.status !== 'Won' && l.status !== 'Lost')
        .reduce((sum, l) => sum + (l.estimatedQty || 0), 0)
    };
  }, [leads]);

  const StatItem = ({ label, value, subtext, colorClass }: { label: string, value: string | number, subtext?: string, colorClass: string }) => (
    <div className="flex flex-col min-w-[80px]">
      <span className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 text-gray-500`}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold leading-none ${colorClass}`}>{value}</span>
        {subtext && <span className="text-xs text-gray-400 font-medium">{subtext}</span>}
      </div>
    </div>
  );

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm z-20 relative">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        
        {/* Mobile: Horizontal Scroll */}
        <div className="flex md:hidden gap-6 overflow-x-auto no-scrollbar items-center">
          <StatItem label="New Today" value={stats.newToday} colorClass="text-blue-600" />
          <div className="w-px bg-gray-200 h-8 shrink-0" />
          <StatItem label="Active" value={stats.total} colorClass="text-gray-900" />
          <div className="w-px bg-gray-200 h-8 shrink-0" />
          <StatItem label="Won" value={stats.won} colorClass="text-green-600" />
          <div className="w-px bg-gray-200 h-8 shrink-0" />
          <StatItem label="Pipeline" value={stats.pipelineQty >= 1000 ? `${(stats.pipelineQty/1000).toFixed(1)}k` : stats.pipelineQty} subtext="units" colorClass="text-indigo-600" />
        </div>

        {/* Desktop: Grid Dashboard */}
        <div className="hidden md:flex items-center gap-12">
           <StatItem label="New Leads Today" value={stats.newToday} colorClass="text-blue-600" />
           <div className="w-px bg-gray-200 h-10" />
           <StatItem label="Total Active Leads" value={stats.total} colorClass="text-gray-900" />
           <div className="w-px bg-gray-200 h-10" />
           <StatItem label="Deals Won" value={stats.won} colorClass="text-green-600" />
           <div className="w-px bg-gray-200 h-10" />
           <StatItem label="Open Pipeline Volume" value={stats.pipelineQty.toLocaleString()} subtext="units estimated" colorClass="text-indigo-600" />
        </div>

      </div>
    </div>
  );
};
