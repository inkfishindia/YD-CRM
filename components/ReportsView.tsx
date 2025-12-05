

import React, { useMemo } from 'react';
import { Lead, parseDate, LegendItem } from '../types';
import { AlertCircle, Clock, ShieldAlert, BarChart, PieChart, TrendingUp } from 'lucide-react';

interface ReportsViewProps {
  leads: Lead[];
  stages: string[];
  legends?: LegendItem[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ leads, stages, legends = [] }) => {
  const metrics = useMemo(() => {
    const total = leads.length;
    const active = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;
    const won = leads.filter(l => l.status === 'Won').length;
    const lost = leads.filter(l => l.status === 'Lost').length;
    const closed = won + lost;
    const conversion = closed > 0 ? Math.round((won / closed) * 100) : 0;

    // Pipeline Value (Total Qty)
    const pipelineValue = leads
         .filter(l => l.status !== 'Won' && l.status !== 'Lost')
         .reduce((acc, l) => acc + (l.estimatedQty || 0), 0);

    // Weighted Value (Forecast)
    // Formula: Sum of (Estimated Qty * Stage Probability)
    const weightedValue = leads
         .filter(l => l.status !== 'Won' && l.status !== 'Lost')
         .reduce((acc, l) => {
             const stageItem = legends.find(leg => leg.listName === 'stage' && leg.value === l.status);
             const prob = stageItem?.probability || 0;
             return acc + ((l.estimatedQty || 0) * (prob / 100));
         }, 0);

    // Avg Days to Close (Won Only)
    let totalDaysToClose = 0;
    let closedCountForAvg = 0;
    
    // Avg Lead Age (Active Only)
    let totalActiveDays = 0;
    let activeCount = 0;
    const today = new Date();

    // 5.1 SLA & Aging Data Buckets
    const slaBreachesByOwner: Record<string, number> = {};
    const lostReasons: Record<string, number> = {};
    const agingByStage: Record<string, { totalDays: number, count: number }> = {};

    leads.forEach(l => {
        // Close Time
        if (l.status === 'Won' && l.wonDate && l.date) {
            const start = parseDate(l.date);
            const end = parseDate(l.wonDate);
            if (start && end) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalDaysToClose += diffDays;
                closedCountForAvg++;
            }
        }
        
        // Active Age
        if (l.status !== 'Won' && l.status !== 'Lost' && l.date) {
             const start = parseDate(l.date);
             if (start) {
                const diffTime = Math.abs(today.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalActiveDays += diffDays;
                activeCount++;
             }
        }

        // SLA Counting
        if (l.slaStatus === 'Violated' || l.slaHealth?.includes('🔴')) {
             const owner = l.ydsPoc || 'Unassigned';
             slaBreachesByOwner[owner] = (slaBreachesByOwner[owner] || 0) + 1;
        }

        // Lost Reasons
        if (l.status === 'Lost') {
            const reason = l.lostReason || 'Unknown';
            lostReasons[reason] = (lostReasons[reason] || 0) + 1;
        }

        // Aging by Stage (Active Leads only)
        if (l.status !== 'Won' && l.status !== 'Lost') {
             // We estimate days in stage based on stageChangedDate or creation date
             const stageStart = parseDate(l.stageChangedDate) || parseDate(l.date) || today;
             const daysInStage = Math.ceil(Math.abs(today.getTime() - stageStart.getTime()) / (1000 * 60 * 60 * 24));
             
             if (!agingByStage[l.status]) agingByStage[l.status] = { totalDays: 0, count: 0 };
             agingByStage[l.status].totalDays += daysInStage;
             agingByStage[l.status].count++;
        }
    });
    
    const avgDaysToClose = closedCountForAvg > 0 ? Math.round(totalDaysToClose / closedCountForAvg) : 0;
    const avgLeadAge = activeCount > 0 ? Math.round(totalActiveDays / activeCount) : 0;

    // SLA Data Formatting
    const slaData = Object.entries(slaBreachesByOwner)
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count);

    // Lost Reason Formatting
    const lostReasonData = Object.entries(lostReasons)
        .map(([reason, count]) => ({ reason, count, pct: Math.round((count/lost)*100) }))
        .sort((a,b) => b.count - a.count);

    // Aging Formatting
    const agingData = Object.entries(agingByStage)
        .map(([stage, data]) => ({ stage, avgDays: Math.round(data.totalDays / data.count) }))
        .sort((a,b) => b.avgDays - a.avgDays);

    // Upcoming Actions (Immediate)
    const upcomingActions = leads
        .filter(l => l.status !== 'Won' && l.status !== 'Lost' && l.nextAction)
        .map(l => {
            const d = parseDate(l.nextActionDate);
            return { ...l, sortDate: d || new Date(9999, 11, 31) };
        })
        .filter(l => l.sortDate <= new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000))) // next 3 days
        .sort((a,b) => a.sortDate.getTime() - b.sortDate.getTime())
        .slice(0, 5); // top 5


    // Pipeline Data
    const funnel = stages.map(stage => {
        const count = leads.filter(l => l.status.toLowerCase() === stage.toLowerCase()).length;
        const stageItem = legends.find(leg => leg.listName === 'stage' && leg.value === stage);
        return { stage, count, pct: total > 0 ? (count / total) * 100 : 0, probability: stageItem?.probability || 0 };
    });

    // Owner Performance
    const owners: Record<string, { total: number, won: number, value: number }> = {};
    leads.forEach(l => {
        const o = l.ydsPoc || 'Unassigned';
        if (!owners[o]) owners[o] = { total: 0, won: 0, value: 0 };
        owners[o].total++;
        if (l.status === 'Won') {
            owners[o].won++;
            owners[o].value += (l.estimatedQty || 0);
        }
    });

    const ownerData = Object.entries(owners)
        .map(([name, data]) => ({ 
            name, 
            ...data, 
            winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0 
        }))
        .sort((a,b) => b.won - a.won);

    // Source Data
    const sources: Record<string, { total: number, won: number }> = {};
    leads.forEach(l => {
        const s = l.source || 'Unknown';
        if (!sources[s]) sources[s] = { total: 0, won: 0 };
        sources[s].total++;
        if (l.status === 'Won') sources[s].won++;
    });

    const sourceData = Object.entries(sources)
        .map(([name, data]) => ({
            name,
            ...data,
            winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0
        }))
        .sort((a,b) => b.total - a.total);
        
    // Category Breakdown
    const categories: Record<string, { total: number, won: number, active: number }> = {};
    leads.forEach(l => {
        const c = l.category || 'Other';
        if (!categories[c]) categories[c] = { total: 0, won: 0, active: 0 };
        categories[c].total++;
        if (l.status === 'Won') categories[c].won++;
        if (l.status !== 'Won' && l.status !== 'Lost') categories[c].active++;
    });
    
    const categoryData = Object.entries(categories)
         .map(([name, data]) => ({ name, ...data }))
         .sort((a,b) => b.total - a.total);

    return { total, active, won, lost, conversion, funnel, ownerData, sourceData, categoryData, pipelineValue, weightedValue, avgDaysToClose, avgLeadAge, slaData, lostReasonData, agingData, upcomingActions };
  }, [leads, stages, legends]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 overflow-y-auto h-full">
        
        {/* Top Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Active Leads</p>
                <p className="text-2xl lg:text-3xl font-bold text-blue-600">{metrics.active}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Won Deals</p>
                <p className="text-2xl lg:text-3xl font-bold text-green-600">{metrics.won}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Win Rate</p>
                <p className="text-2xl lg:text-3xl font-bold text-indigo-600">{metrics.conversion}%</p>
            </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pipeline</p>
                <p className="text-2xl lg:text-3xl font-bold text-purple-600">{(metrics.pipelineValue / 1000).toFixed(1)}k</p>
            </div>
             <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={14}/> Forecast</p>
                <p className="text-2xl lg:text-3xl font-bold text-blue-800">{(metrics.weightedValue / 1000).toFixed(1)}k</p>
                <p className="text-[10px] text-blue-500 font-medium">Weighted Value</p>
            </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Lead Age</p>
                <p className="text-2xl lg:text-3xl font-bold text-orange-600">{metrics.avgLeadAge}d</p>
            </div>
        </div>

        {/* --- NEW SECTION: Operational Health --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
             
             {/* 5.1 SLA By Owner */}
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase flex items-center gap-2">
                     <ShieldAlert size={16} className="text-red-500"/> SLA Breaches by Owner
                 </h3>
                 <div className="space-y-3">
                     {metrics.slaData.length === 0 ? (
                         <p className="text-sm text-gray-400 italic">No SLA breaches found. Good job!</p>
                     ) : (
                         metrics.slaData.map(item => (
                             <div key={item.name}>
                                 <div className="flex justify-between text-xs font-medium mb-1">
                                     <span className="text-gray-900">{item.name}</span>
                                     <span className="text-red-600 font-bold">{item.count} Violations</span>
                                 </div>
                                 <div className="h-2 w-full bg-gray-100 rounded-full flex overflow-hidden">
                                     <div 
                                         className="h-full bg-red-500"
                                         style={{ width: `${Math.min((item.count / 10) * 100, 100)}%` }}
                                     ></div>
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
             </div>

             {/* 5.2 Next Actions Coming Up */}
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase flex items-center gap-2">
                     <Clock size={16} className="text-blue-500"/> Next Actions (3 Days)
                 </h3>
                 <div className="space-y-2">
                     {metrics.upcomingActions.length === 0 ? (
                         <p className="text-sm text-gray-400 italic">No urgent actions due soon.</p>
                     ) : (
                         metrics.upcomingActions.map(l => (
                             <div key={l.leadId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100">
                                 <div className="flex flex-col">
                                     <span className="text-xs font-bold text-gray-800">{l.companyName}</span>
                                     <span className="text--[10px] text-gray-500">{l.nextAction}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                         {l.nextActionDate}
                                     </span>
                                     <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[9px] font-bold">
                                         {l.ydsPoc?.charAt(0)}
                                     </span>
                                 </div>
                             </div>
                         ))
                     )}
                 </div>
             </div>
        </div>
        
        {/* --- NEW SECTION: Deep Dive --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
             {/* 5.3 Aging by Stage */}
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase flex items-center gap-2">
                     <BarChart size={16} className="text-orange-500"/> Avg Days in Stage
                 </h3>
                 <div className="space-y-3">
                     {metrics.agingData.map(d => (
                         <div key={d.stage}>
                             <div className="flex justify-between text-xs font-medium mb-1">
                                 <span className="text-gray-900">{d.stage}</span>
                                 <span className="text-gray-600 font-bold">{d.avgDays} days</span>
                             </div>
                             <div className="h-2 w-full bg-gray-100 rounded-full flex overflow-hidden">
                                 <div 
                                     className="h-full bg-orange-400"
                                     style={{ width: `${Math.min((d.avgDays / 30) * 100, 100)}%` }}
                                 ></div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>

             {/* 5.4 Lost Reasons */}
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase flex items-center gap-2">
                     <PieChart size={16} className="text-gray-500"/> Lost Reasons
                 </h3>
                 <div className="space-y-3">
                     {metrics.lostReasonData.map(d => (
                         <div key={d.reason} className="flex flex-col gap-1">
                             <div className="flex justify-between text-xs font-medium text-gray-600">
                                 <span>{d.reason}</span>
                                 <span>{d.count} ({d.pct}%)</span>
                             </div>
                             <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                 <div 
                                     className="h-full bg-gray-500"
                                     style={{ width: `${d.pct}%` }} 
                                 />
                             </div>
                         </div>
                     ))}
                     {metrics.lostReasonData.length === 0 && <p className="text-sm text-gray-400 italic">No lost leads recorded.</p>}
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Pipeline Funnel */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-1">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase">Pipeline By Stage</h3>
                <div className="space-y-3">
                    {metrics.funnel.map((item) => (
                        <div key={item.stage} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-medium text-gray-600">
                                <span>{item.stage}</span>
                                <span>{item.count}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                <div 
                                    className={`h-full rounded-full ${
                                        item.stage === 'Won' ? 'bg-green-500' :
                                        item.stage === 'Lost' ? 'bg-red-400' :
                                        'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.max(item.pct, 2)}%` }} 
                                />
                            </div>
                            {item.probability > 0 && item.stage !== 'Won' && (
                                <span className="text-[9px] text-gray-400 text-right">Prob: {item.probability}%</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Category Breakdown (New) */}
             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-1">
                 <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase">Leads by Category</h3>
                 <div className="space-y-3">
                     {metrics.categoryData.map(cat => (
                         <div key={cat.name} className="flex flex-col gap-1">
                            <div className="flex justify-between text-xs font-medium mb-1">
                                 <span className="text-gray-900">{cat.name}</span>
                                 <span className="text-gray-500">{cat.active} Active / {cat.total} Total</span>
                             </div>
                             <div className="h-2 w-full bg-gray-100 rounded-full flex overflow-hidden">
                                 <div 
                                     className="h-full bg-indigo-400"
                                     style={{ width: `${metrics.total > 0 ? (cat.total / metrics.total) * 100 : 0}%` }}
                                 ></div>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Owner Performance Chart (Bar) */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-1">
                 <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase">Performance by Owner</h3>
                 <div className="space-y-4">
                     {metrics.ownerData.slice(0, 5).map(owner => (
                         <div key={owner.name}>
                             <div className="flex justify-between text-xs font-medium mb-1">
                                 <span className="text-gray-900">{owner.name}</span>
                                 <span className="text-green-600 font-bold">{owner.won} Won / {owner.total} Total</span>
                             </div>
                             <div className="h-2 w-full bg-gray-100 rounded-full flex overflow-hidden">
                                 <div 
                                     className="h-full bg-green-500"
                                     style={{ width: `${owner.winRate}%` }}
                                 ></div>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Source Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-xs uppercase">Conversion by Source</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-white border-b border-gray-100">
                        <tr>
                            <th className="px-5 py-2">Source</th>
                            <th className="px-5 py-2 text-right">Total</th>
                            <th className="px-5 py-2 text-right">Won</th>
                            <th className="px-5 py-2 text-right">Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {metrics.sourceData.map(row => (
                            <tr key={row.name}>
                                <td className="px-5 py-2 font-medium text-gray-700">{row.name}</td>
                                <td className="px-5 py-2 text-right text-gray-600">{row.total}</td>
                                <td className="px-5 py-2 text-right text-green-600 font-bold">{row.won}</td>
                                <td className="px-5 py-2 text-right text-gray-600">{row.winRate}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

             {/* Owner Table Details */}
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-xs uppercase">Sales Leaderboard</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-white border-b border-gray-100">
                        <tr>
                            <th className="px-5 py-2">Owner</th>
                            <th className="px-5 py-2 text-right">Deals Won</th>
                            <th className="px-5 py-2 text-right">Total Est. Qty (Won)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {metrics.ownerData.map(row => (
                            <tr key={row.name}>
                                <td className="px-5 py-2 font-medium text-gray-700">{row.name}</td>
                                <td className="px-5 py-2 text-right text-green-600 font-bold">{row.won}</td>
                                <td className="px-5 py-2 text-right text-gray-600">{row.value.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};