import React, { useState, useEffect } from 'react';
import { scanSource, checkDuplicates, importRows, ScanResult } from '../services/intakeService';
import { INTAKE_SOURCES } from '../config/intakeSources';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { ShoppingCart, Package, Users, RefreshCw, CheckCircle, AlertTriangle, Info, Table, FileSpreadsheet, ExternalLink, XCircle } from 'lucide-react';
import { GoogleUser, Lead } from '../types';

interface IntakeInboxProps {
    user: GoogleUser | null;
    onImportSuccess: () => void;
    onLogin: () => void;
    existingLeads?: Lead[]; 
}

const SOURCE_TABS = [
  { key: 'commerce', label: 'Commerce', icon: ShoppingCart, color: 'blue' },
  { key: 'dropship', label: 'Dropship', icon: Package, color: 'purple' },
  { key: 'tkw', label: 'TKW', icon: Users, color: 'green' }
] as const;

export const IntakeInbox: React.FC<IntakeInboxProps> = ({ user, existingLeads = [], onImportSuccess }) => {
  const [activeTab, setActiveTab] = useState<'commerce' | 'dropship' | 'tkw'>('commerce');
  const [showConfigInfo, setShowConfigInfo] = useState(false);
  
  const [data, setData] = useState<Record<string, { rows: any[], stats: any, loading: boolean, error?: string, meta?: any }>>({
    commerce: { rows: [], stats: null, loading: false },
    dropship: { rows: [], stats: null, loading: false },
    tkw: { rows: [], stats: null, loading: false }
  });
  
  useEffect(() => {
    if (user) scanAll();
  }, [user]);
  
  const scanAll = async () => {
    for (const source of SOURCE_TABS) {
      setData(prev => ({ ...prev, [source.key]: { ...prev[source.key], loading: true, error: undefined } }));
      
      const result: ScanResult = await scanSource(source.key);
      
      if (result.error) {
           setData(prev => ({ 
               ...prev, 
               [source.key]: { 
                   rows: [], 
                   stats: null, 
                   loading: false, 
                   error: result.error,
                   meta: result.meta 
               } 
           }));
      } else {
           const checked = await checkDuplicates(result.rows, existingLeads);
           setData(prev => ({ 
               ...prev, 
               [source.key]: { 
                   rows: checked, 
                   stats: result.stats, 
                   loading: false, 
                   meta: result.meta 
               } 
           }));
      }
    }
  };
  
  const handleImport = async (row: any) => {
    await importRows([row], user?.name);
    setData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        rows: prev[activeTab].rows.filter((r: any) => r.id !== row.id)
      }
    }));
    onImportSuccess();
  };
  
  const currentData = data[activeTab];
  const sourceConfig = INTAKE_SOURCES[activeTab];
  // Cast mappings to a generic structure to avoid "never" type on key access when activeTab is dynamic/union
  const mappings = sourceConfig.mappings as Record<string, { required: boolean; field: string }>;
  
  const ready = currentData.rows?.filter((r: any) => r.isValid && !r.isDuplicate) || [];
  const invalid = currentData.rows?.filter((r: any) => !r.isValid) || [];
  const duplicates = currentData.rows?.filter((r: any) => r.isDuplicate) || [];
  
  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Source Tabs */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                    {SOURCE_TABS.map(tab => {
                        const Icon = tab.icon;
                        const tabData = data[tab.key];
                        const hasError = !!tabData.error;
                        return (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setShowConfigInfo(false); }}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap border ${
                            activeTab === tab.key
                                ? `bg-${tab.color}-100 text-${tab.color}-700 border-${tab.color}-200`
                                : hasError 
                                    ? 'bg-red-50 text-red-600 border-red-200'
                                    : 'text-gray-500 hover:bg-gray-100 border-transparent'
                            }`}
                        >
                            {hasError ? <AlertTriangle size={18}/> : <Icon size={18} />}
                            {tab.label}
                            {tabData.stats && tabData.stats.ready > 0 && (
                            <Badge variant="neutral" className="ml-1">{tabData.stats.ready}</Badge>
                            )}
                        </button>
                        );
                    })}
                 </div>

                 <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowConfigInfo(!showConfigInfo)}
                        className={showConfigInfo ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}
                    >
                        <Info size={18} />
                    </Button>
                    <Button onClick={scanAll} variant="ghost" size="sm" className="ml-auto" disabled={currentData.loading}>
                        <RefreshCw size={16} className={Object.values(data).some(d => d.loading) ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline ml-2">Refresh All</span>
                    </Button>
                 </div>
            </div>

            {/* Config Info Drawer */}
            {showConfigInfo && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 animate-fade-in text-sm text-blue-900">
                    <div className="flex items-start gap-3">
                        <FileSpreadsheet className="shrink-0 text-blue-500 mt-1" size={20} />
                        <div className="flex-1 space-y-2">
                            <h4 className="font-bold">Source Configuration: {sourceConfig.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-xs font-bold text-blue-400 uppercase">Sheet ID</span>
                                    <div className="font-mono bg-white/50 px-2 py-1 rounded select-all border border-blue-100 flex items-center justify-between">
                                        <span className="truncate">{sourceConfig.sheetId}</span>
                                        <a 
                                            href={`https://docs.google.com/spreadsheets/d/${sourceConfig.sheetId}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-blue-500 hover:text-blue-700"
                                        >
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs font-bold text-blue-400 uppercase">Tab Name</span>
                                    <div className="font-mono bg-white/50 px-2 py-1 rounded select-all border border-blue-100">
                                        {sourceConfig.tab}
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <span className="block text-xs font-bold text-blue-400 uppercase mb-1">Mapped Headers</span>
                                <div className="flex flex-wrap gap-1">
                                    {Object.keys(mappings).map(key => (
                                        <span key={key} className="bg-white px-2 py-0.5 rounded border border-blue-100 text-xs">
                                            {key} {mappings[key].required && <span className="text-red-500">*</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-slate-50 relative">
        
        {/* Loading Overlay */}
        {currentData.loading && (
             <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                 <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-blue-600" size={32}/> 
                    <p className="font-bold text-gray-600">Scanning Source...</p>
                 </div>
             </div>
        )}

        {/* Error State */}
        {currentData.error ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="bg-red-50 border border-red-100 p-8 rounded-xl max-w-lg text-center shadow-sm">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-red-900 mb-2">Connection Issue</h3>
                    <p className="text-red-700 mb-4">{currentData.error}</p>
                    
                    {currentData.meta?.missingHeaders && (
                        <div className="bg-white p-4 rounded border border-red-200 text-left mb-6">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Missing Columns:</p>
                            <div className="flex flex-wrap gap-2">
                                {currentData.meta.missingHeaders.map((h: string) => (
                                    <span key={h} className="text-xs font-mono bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100">
                                        {h}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex gap-3 justify-center">
                        <Button variant="secondary" onClick={() => setShowConfigInfo(true)}>View Config</Button>
                        <Button variant="danger" onClick={scanAll}>Retry Scan</Button>
                    </div>
                </div>
            </div>
        ) : (
            <>
                {/* Stats Bar */}
                <div className="bg-white px-6 py-3 border-b flex gap-6 overflow-x-auto no-scrollbar sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-medium">Ready: <strong className="text-gray-900">{ready.length}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                    <XCircle size={16} className="text-red-600" />
                    <span className="text-sm font-medium">Invalid: <strong className="text-gray-900">{invalid.length}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium">Duplicates: <strong className="text-gray-900">{duplicates.length}</strong></span>
                    </div>
                </div>

                {/* Data Table */}
                <div className="p-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden min-w-[800px] overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr className="text-left text-xs font-bold text-gray-500 uppercase border-b bg-gray-50">
                                <th className="px-6 py-3 whitespace-nowrap">Status</th>
                                {Object.keys(mappings).map(header => (
                                    <th key={header} className="px-6 py-3 whitespace-nowrap">{header}</th>
                                ))}
                                <th className="px-6 py-3 text-right whitespace-nowrap">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                            {ready.map((row: any) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <Badge variant="success">Ready</Badge>
                                </td>
                                {Object.entries(mappings).map(([header, config]) => (
                                    <td key={header} className="px-6 py-3 whitespace-nowrap text-gray-700">
                                        {row[config.field] ? String(row[config.field]).substring(0, 50) : <span className="text-gray-300">-</span>}
                                    </td>
                                ))}
                                <td className="px-6 py-3 text-right whitespace-nowrap">
                                    <Button size="sm" onClick={() => handleImport(row)} variant="primary">
                                    Import
                                    </Button>
                                </td>
                                </tr>
                            ))}
                            {invalid.map((row: any) => (
                                <tr key={row.id} className="bg-red-50/30">
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <Badge variant="danger">Invalid</Badge>
                                </td>
                                {Object.entries(mappings).map(([header, config]) => (
                                    <td key={header} className="px-6 py-3 whitespace-nowrap text-gray-700">
                                        {row[config.field] ? String(row[config.field]).substring(0, 50) : <span className="text-gray-300">-</span>}
                                    </td>
                                ))}
                                <td className="px-6 py-3 text-right text-xs text-red-600 font-medium whitespace-nowrap">{row.errors.join(', ')}</td>
                                </tr>
                            ))}
                            {duplicates.map((row: any) => (
                                <tr key={row.id} className="bg-yellow-50/30">
                                <td className="px-6 py-3 whitespace-nowrap">
                                    <Badge variant="warning">Duplicate</Badge>
                                </td>
                                {Object.entries(mappings).map(([header, config]) => (
                                    <td key={header} className="px-6 py-3 whitespace-nowrap text-gray-700">
                                        {row[config.field] ? String(row[config.field]).substring(0, 50) : <span className="text-gray-300">-</span>}
                                    </td>
                                ))}
                                <td className="px-6 py-3 text-right text-xs text-yellow-600 font-medium whitespace-nowrap">Already exists</td>
                                </tr>
                            ))}
                            {ready.length === 0 && invalid.length === 0 && duplicates.length === 0 && (
                                <tr>
                                    <td colSpan={Object.keys(mappings).length + 2} className="px-6 py-12 text-center text-gray-400">
                                        No new data found in this source.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};