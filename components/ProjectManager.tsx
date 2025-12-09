
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, Database, Lock, Activity, Book, History, Kanban, 
  Search, Filter, ChevronRight, Save, Plus, AlertTriangle, 
  CheckCircle, GitBranch, ArrowUpRight, X, Shield, Terminal, Loader2, RefreshCw,
  Box, Users, Layers, Zap, Command, Settings, Truck, Factory, MoreHorizontal, ArrowRight
} from 'lucide-react';
import { 
  PMViewType, RegistryItem, SectionConfig, WorkItem, 
  MOCK_WORK_ITEMS, RoleScope, SLAConfig, DictionaryItem, ChangeLogEntry
} from '../types/pm';
import { fetchProjectManagerData } from '../services/sheetService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface ProjectManagerProps {
  onExit: () => void;
}

// --- OVERVIEW SUB-COMPONENTS ---

const PODS_CONFIG = [
  { 
    id: 'Command Center', 
    label: 'Command Center', 
    icon: Command, 
    color: 'blue',
    roles: ['Admin', 'Analyst', 'Ops Lead'] 
  },
  { 
    id: 'Warehouse', 
    label: 'Warehouse & Fulfillment', 
    icon: Truck, 
    color: 'orange',
    roles: ['Manager', 'Picker', 'Packer', 'Dispatcher'] 
  },
  { 
    id: 'Production', 
    label: 'Production & QC', 
    icon: Factory, 
    color: 'purple',
    roles: ['Plant Mgr', 'QC Lead', 'Operator'] 
  }
];

const KANBAN_COLUMNS = ['Backlog', 'In Progress', 'Review', 'Ready', 'Shipped'];

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onExit }) => {
  const [activeView, setActiveView] = useState<PMViewType>('overview');
  const [workspace, setWorkspace] = useState('All');
  const [businessUnit, setBusinessUnit] = useState('D2C');
  
  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [registry, setRegistry] = useState<RegistryItem[]>([]);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [roles, setRoles] = useState<RoleScope[]>([]);
  const [slas, setSlas] = useState<SLAConfig[]>([]);
  const [dictionary, setDictionary] = useState<DictionaryItem[]>([]);
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([]);
  
  // Work Items are still mock for now
  const [workItems, setWorkItems] = useState<WorkItem[]>(MOCK_WORK_ITEMS || []);

  // Overview Context State
  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Drawer State
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [drawerType, setDrawerType] = useState<'section' | 'registry' | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
      loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      const res = await fetchProjectManagerData();
      if (res.success) {
          setRegistry(res.registry || []);
          setSections(res.sections || []);
          setRoles(res.roles || []);
          setSlas(res.slas || []);
          setDictionary(res.dictionary || []);
          setChangelog(res.changelog || []);
          setError(null);
      } else {
          setError(res.error || "Failed to load PM data");
      }
      setLoading(false);
  };

  // --- Handlers ---

  const handleBumpVersion = (sectionId: string) => {
    // Optimistic Update Simulation
    setSections(prev => prev.map(s => {
      if (s.sectionID === sectionId) {
        const parts = s.version.split('.');
        const patch = parseInt(parts[2]) || 0;
        const newVersion = `${parts[0] || 1}.${parts[1] || 0}.${patch + 1}`;
        return { ...s, version: newVersion };
      }
      return s;
    }));
    setSelectedItemId(null);
  };

  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button 
      onClick={() => { setActiveView(id); setSelectedItemId(null); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-r-2 ${
        activeView === id 
          ? 'bg-slate-100 text-slate-900 border-slate-900' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  // --- Derived Overview Data ---
  const filteredModules = useMemo(() => {
    let mods = registry;
    // Map existing statuses to Kanban columns if strictly needed, or just use as is if they match
    if (selectedPod) {
      mods = mods.filter(m => m.ownerPod === selectedPod);
    }
    return mods;
  }, [registry, selectedPod]);

  // Improved Filtering Logic for accuracy
  const filteredSections = useMemo(() => {
    let secs = sections;
    if (selectedModule) {
      const moduleItem = registry.find(m => m.id === selectedModule);
      if (moduleItem) {
         // Heuristic 1: Match if Section ID contains Module ID (e.g., MOD-1 -> SEC-MOD-1)
         const specificMatches = secs.filter(s => 
             s.sectionID.toLowerCase().includes(moduleItem.id.toLowerCase()) || 
             (moduleItem.moduleID && s.sectionID.toLowerCase().includes(moduleItem.moduleID.toLowerCase()))
         );
         
         if (specificMatches.length > 0) {
             secs = specificMatches;
         } else {
             // Heuristic 2: Fallback to Owner Pod match
             if (moduleItem.ownerPod) {
                 secs = secs.filter(s => s.owner === moduleItem.ownerPod);
             }
         }
      }
    } else if (selectedPod) {
      secs = secs.filter(s => s.owner === selectedPod);
    }
    return secs;
  }, [sections, selectedPod, selectedModule, registry]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'review': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'in progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getMissingRequirements = (section: SectionConfig) => {
    const missing = [];
    if (!section.visibleControls) missing.push('Controls');
    if (!section.actions) missing.push('Actions');
    const sla = slas.find(s => s.sectionID === section.sectionID);
    if (!sla) missing.push('SLA');
    return missing;
  };

  // Metric Helper
  const getPodMetrics = (podId: string) => {
      const mods = registry.filter(r => (r.ownerPod || '').toLowerCase() === podId.toLowerCase());
      const active = mods.filter(m => ['Active', 'Live', 'Ready'].includes(m.status)).length;
      return { total: mods.length, active };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans text-slate-800">
      
      {/* 1. Top Control Bar */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white">
              <Terminal size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">System</span>
              <span className="text-sm font-bold text-slate-900 leading-none">Control Room</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          {/* Context Switchers */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Workspace:</span>
              <select 
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="All">Global (All)</option>
                <option value="Command Center">Command Center</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Production">Production</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Business Unit:</span>
              <select 
                value={businessUnit}
                onChange={(e) => setBusinessUnit(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="D2C">Direct to Consumer (D2C)</option>
                <option value="B2B">Wholesale (B2B)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={loadData} title="Refresh Data">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          <button className="text-xs font-bold text-slate-500 hover:text-slate-900">Documentation</button>
          <Button variant="secondary" size="sm" onClick={onExit} className="border-slate-300">
            Exit to App
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. Left Rail */}
        <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col py-4 overflow-y-auto shrink-0">
          <div className="px-4 mb-6">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input 
                placeholder="Jump to ID..." 
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="px-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Views</div>
            <NavItem id="overview" label="Overview" icon={Layout} />
            <div className="px-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 mt-4">Core Registry</div>
            <NavItem id="registry" label="Registry" icon={Database} />
            <NavItem id="sections" label="Sections & UX" icon={Layers} />
            <NavItem id="dictionary" label="Data Dictionary" icon={Book} />
            
            <div className="px-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 mt-4">Governance</div>
            <NavItem id="rbac" label="RBAC & Scope" icon={Lock} />
            <NavItem id="slas" label="SLA Monitor" icon={Activity} />
            
            <div className="px-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2 mt-4">Execution</div>
            <NavItem id="work_items" label="Work Items" icon={Kanban} />
            <NavItem id="changelog" label="Changelog" icon={History} />
          </div>

          <div className="mt-auto px-4 pt-6 text-[10px] text-slate-400">
            <p>Engine v2.4.0</p>
            <p>Env: Production</p>
          </div>
        </aside>

        {/* 3. Main Canvas */}
        <main className="flex-1 bg-white overflow-hidden relative flex flex-col">
          
          {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p>Loading System Configuration...</p>
              </div>
          ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500">
                  <AlertTriangle size={32} className="mb-4" />
                  <p>{error}</p>
                  <Button onClick={loadData} className="mt-4" variant="secondary">Retry</Button>
              </div>
          ) : activeView === 'overview' ? (
            /* --- OVERVIEW DASHBOARD --- */
            <div className="flex flex-col h-full">
                
                {/* A. Pods Header */}
                <div className="border-b border-slate-200 p-6 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PODS_CONFIG.map(pod => {
                            const isSelected = selectedPod === pod.id;
                            const Icon = pod.icon;
                            const metrics = getPodMetrics(pod.id);
                            
                            return (
                                <div 
                                    key={pod.id}
                                    onClick={() => { setSelectedPod(isSelected ? null : pod.id); setSelectedModule(null); }}
                                    className={`
                                        relative bg-white rounded-xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow-md
                                        ${isSelected ? `border-${pod.color}-500 ring-1 ring-${pod.color}-500` : 'border-slate-200'}
                                    `}
                                >
                                    <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl bg-${pod.color}-500`}></div>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-lg bg-${pod.color}-50 text-${pod.color}-600`}>
                                                <Icon size={20} />
                                            </div>
                                            <h3 className="font-bold text-slate-800">{pod.label}</h3>
                                        </div>
                                        {isSelected && <CheckCircle size={18} className={`text-${pod.color}-500`} />}
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {pod.roles.map(role => (
                                            <button
                                                key={role}
                                                onClick={(e) => { e.stopPropagation(); setSelectedRole(selectedRole === role ? null : role); }}
                                                className={`
                                                    text-[10px] uppercase font-bold px-2 py-1 rounded-full border transition-all
                                                    ${selectedRole === role 
                                                        ? `bg-${pod.color}-100 text-${pod.color}-700 border-${pod.color}-200 ring-1 ring-${pod.color}-300` 
                                                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300'}
                                                `}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Metrics Footer */}
                                    <div className="flex justify-between items-end mt-3 border-t border-slate-100 pt-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">Modules</span>
                                            <span className="text-xl font-bold text-slate-700 leading-none">{metrics.total}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">{metrics.active} Active</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* B. Main Content Split */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Center: Module Kanban */}
                    <div className="flex-1 bg-slate-50/30 p-6 overflow-x-auto border-r border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Box size={18} className="text-slate-500"/> 
                                Modules {selectedPod && <span className="text-slate-400 font-normal">in {selectedPod}</span>}
                            </h3>
                            <span className="text-xs text-slate-400 font-mono">{filteredModules.length} Modules</span>
                        </div>

                        <div className="flex gap-4 h-[calc(100%-40px)] min-w-max">
                            {KANBAN_COLUMNS.map(col => {
                                // Filter modules by status (mapping heuristic: Active -> Ready, Beta -> Review, etc)
                                const colModules = filteredModules.filter(m => {
                                    // Simple mapping for demo purposes if sheet uses different terms
                                    const s = m.status || 'Backlog';
                                    if (s === 'Active' || s === 'Live') return col === 'Ready';
                                    if (s === 'Beta') return col === 'Review';
                                    if (s === 'Deprecating') return col === 'Backlog';
                                    return s === col;
                                });

                                return (
                                    <div key={col} className="w-64 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200/60">
                                        <div className="p-3 border-b border-slate-200/60 text-xs font-bold uppercase text-slate-500 flex justify-between sticky top-0 bg-slate-100/50 rounded-t-xl backdrop-blur-sm">
                                            {col}
                                            <span className="bg-slate-200 text-slate-600 px-1.5 rounded">{colModules.length}</span>
                                        </div>
                                        <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                                            {colModules.map(mod => (
                                                <div 
                                                    key={mod.id}
                                                    onClick={() => setSelectedModule(selectedModule === mod.id ? null : mod.id)}
                                                    className={`
                                                        p-3 rounded-lg border shadow-sm cursor-pointer transition-all bg-white
                                                        ${selectedModule === mod.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200 hover:shadow-md'}
                                                        ${selectedRole ? 'opacity-90' : 'opacity-100'}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <Badge variant="neutral" className="font-mono text-[10px]">{mod.id}</Badge>
                                                        <span className="text-[10px] font-bold text-slate-400">v{mod.version}</span>
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-800 mb-1 leading-tight">{mod.name}</h4>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                        <Users size={10} /> {mod.ownerPod}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: Linked Sections Table */}
                    <div className="w-[450px] bg-white flex flex-col border-l border-slate-200 shadow-xl z-10">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Layers size={18} className="text-indigo-600"/> 
                                    Sections
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedModule ? `Linked to ${selectedModule}` : selectedPod ? `All in ${selectedPod}` : 'All Sections'}
                                </p>
                            </div>
                            <Badge variant="neutral">{filteredSections.length}</Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {filteredSections.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    No sections found for this selection.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredSections.map(sec => {
                                        const missing = getMissingRequirements(sec);
                                        const isMissingStuff = missing.length > 0;
                                        
                                        return (
                                            <div 
                                                key={sec.sectionID} 
                                                onClick={() => { setSelectedItemId(sec.sectionID); setDrawerType('section'); }}
                                                className="p-4 hover:bg-slate-50 cursor-pointer group transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{sec.sectionID}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusColor(sec.status)}`}>
                                                        {sec.status}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                                    <span>v{sec.version}</span>
                                                    <span>•</span>
                                                    <span>{sec.owner}</span>
                                                </div>

                                                {/* Requirements Badges */}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {sec.visibleControls?.split(',').filter(Boolean).map(c => (
                                                        <span key={c} className="text-[9px] bg-slate-50 border border-slate-200 text-slate-500 px-1 rounded">{c.trim()}</span>
                                                    ))}
                                                </div>

                                                {isMissingStuff && (
                                                    <div className="mt-3 flex items-center gap-2 text-[10px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100">
                                                        <AlertTriangle size={10} />
                                                        Missing: {missing.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Context Footer (Sticky) */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50">
                            <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Required Actions</h4>
                            <div className="space-y-2">
                                {filteredSections.some(s => getMissingRequirements(s).length > 0) ? (
                                    <div className="flex items-center justify-between text-xs p-2 bg-white border border-red-200 rounded text-red-700 shadow-sm">
                                        <span className="flex items-center gap-2"><Shield size={12}/> Resolve Compliance Gaps</span>
                                        <ArrowRight size={12}/>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between text-xs p-2 bg-white border border-green-200 rounded text-green-700 shadow-sm">
                                        <span className="flex items-center gap-2"><CheckCircle size={12}/> All Sections Healthy</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          ) : (
            <>
                {/* VIEW: Sections */}
                {activeView === 'sections' && (
                    <div className="p-8 max-w-6xl mx-auto">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                        <h1 className="text-2xl font-bold text-slate-900">Interface Sections</h1>
                        <p className="text-slate-500 mt-1">Manage UI modules, route bindings, and control visibility.</p>
                        </div>
                        <Button icon={<Plus size={16}/>} className="bg-slate-900 text-white hover:bg-slate-800">New Section</Button>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">Entities</th>
                            <th className="px-6 py-3">Routes</th>
                            <th className="px-6 py-3">Controls</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Ver</th>
                            <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sections.map(sec => (
                            <tr key={sec.sectionID} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-3 font-mono text-xs font-bold text-slate-700">{sec.sectionID}</td>
                                <td className="px-6 py-3 text-xs">{sec.entities}</td>
                                <td className="px-6 py-3 font-mono text-xs text-slate-500 max-w-[200px] truncate">{sec.routes}</td>
                                <td className="px-6 py-3 text-xs">
                                    <span className="truncate max-w-[150px] block" title={sec.visibleControls}>{sec.visibleControls}</span>
                                </td>
                                <td className="px-6 py-3">
                                <Badge variant={sec.status === 'Live' ? 'success' : 'warning'}>{sec.status}</Badge>
                                </td>
                                <td className="px-6 py-3 font-mono text-xs">{sec.version}</td>
                                <td className="px-6 py-3 text-right">
                                <button 
                                    onClick={() => { setSelectedItemId(sec.sectionID); setDrawerType('section'); }}
                                    className="text-indigo-600 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Edit Spec
                                </button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>
                )}

                {/* VIEW: Registry */}
                {activeView === 'registry' && (
                    <div className="p-8 max-w-6xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-900">System Registry</h1>
                        <p className="text-slate-500 mt-1">Master record of all immutable system entities.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {registry.map(item => (
                        <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${item.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                <span className="font-mono text-xs font-bold text-slate-500">{item.type}</span>
                            </div>
                            <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{item.id}</span>
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">{item.name}</h3>
                            <div className="text-xs text-slate-500 flex flex-wrap gap-2 mt-3">
                            <span className="bg-slate-50 border px-1.5 py-0.5 rounded">Owner: {item.ownerPod}</span>
                            <span className="bg-slate-50 border px-1.5 py-0.5 rounded">v{item.version}</span>
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>
                )}

                {/* VIEW: SLAs */}
                {activeView === 'slas' && (
                    <div className="p-8 max-w-6xl mx-auto">
                        <h1 className="text-2xl font-bold text-slate-900 mb-6">SLA Configurations</h1>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">SLA ID</th>
                                        <th className="px-6 py-3">Section</th>
                                        <th className="px-6 py-3">KPI</th>
                                        <th className="px-6 py-3">Target</th>
                                        <th className="px-6 py-3">Threshold</th>
                                        <th className="px-6 py-3">Owner</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {slas.map(s => (
                                        <tr key={s.slaID} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono text-xs">{s.slaID}</td>
                                            <td className="px-6 py-3">{s.sectionID}</td>
                                            <td className="px-6 py-3 font-bold">{s.kpi}</td>
                                            <td className="px-6 py-3 text-green-600">{s.target}</td>
                                            <td className="px-6 py-3 text-red-600">{s.alertThreshold}</td>
                                            <td className="px-6 py-3">{s.owner}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VIEW: Data Dictionary */}
                {activeView === 'dictionary' && (
                    <div className="p-8 max-w-6xl mx-auto">
                        <h1 className="text-2xl font-bold text-slate-900 mb-6">Data Dictionary</h1>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Entity</th>
                                        <th className="px-6 py-3">Field</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Required</th>
                                        <th className="px-6 py-3">Constraints</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dictionary.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-mono text-xs font-bold text-indigo-700">{d.entityID}</td>
                                            <td className="px-6 py-3 font-medium">{d.field}</td>
                                            <td className="px-6 py-3 text-xs bg-gray-50"><span className="p-1 border rounded">{d.type}</span></td>
                                            <td className="px-6 py-3">{d.required === 'Yes' ? '✅' : ''}</td>
                                            <td className="px-6 py-3 text-xs text-gray-500 font-mono">{d.enumConstraints}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* VIEW: RBAC */}
                {activeView === 'rbac' && (
                    <div className="p-8 max-w-6xl mx-auto">
                        <h1 className="text-2xl font-bold text-slate-900 mb-6">Role Scope Grants</h1>
                        <div className="grid gap-4">
                            {roles.map((role, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                    <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                                        <h3 className="font-bold text-slate-800">{role.role}</h3>
                                        <Badge variant="neutral">v{role.version}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="block text-xs font-bold text-slate-400 uppercase">Scope Refs</span>
                                            <p className="font-mono text-xs bg-slate-50 p-1 rounded mt-1">{role.scopeRefs}</p>
                                        </div>
                                        <div>
                                            <span className="block text-xs font-bold text-slate-400 uppercase">Grants</span>
                                            <p className="text-slate-600 mt-1">{role.grants}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW: Changelog */}
                {activeView === 'changelog' && (
                    <div className="p-8 max-w-4xl mx-auto">
                        <h1 className="text-2xl font-bold text-slate-900 mb-6">System Changelog</h1>
                        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                            {changelog.map((log, i) => (
                                <div key={i} className="relative pl-6">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 border-2 border-white"></div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-slate-900">{log.date}</span>
                                        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">v{log.specVersion}</span>
                                    </div>
                                    <p className="text-slate-600 mb-2 font-medium">{log.summary}</p>
                                    <div className="flex gap-4 text-xs text-slate-400">
                                        <span>Rows: {log.rowsChanged}</span>
                                        <span>Owner: {log.owners}</span>
                                        {log.PR && <span className="font-mono">PR: {log.PR}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VIEW: Work Items (Kanban) - Still Mock */}
                {activeView === 'work_items' && (
                    <div className="p-8 h-full flex flex-col">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                        <h1 className="text-2xl font-bold text-slate-900">Implementation Plan</h1>
                        <p className="text-slate-500 mt-1">Track spec changes through to production (Mock Data).</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                        {['Backlog', 'In Progress', 'Review', 'Ready'].map(status => (
                        <div key={status} className="w-72 bg-slate-50 rounded-xl border border-slate-200 flex flex-col shrink-0">
                            <div className="p-3 border-b border-slate-200 font-bold text-xs uppercase text-slate-500 flex justify-between">
                            {status}
                            <span className="bg-slate-200 text-slate-600 px-1.5 rounded">{(workItems || []).filter(i => i.status === status).length}</span>
                            </div>
                            <div className="p-2 space-y-2 overflow-y-auto flex-1">
                            {(workItems || []).filter(i => i.status === status).map(item => (
                                <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
                                    {item.prLink && <a href="#" className="text-indigo-600 hover:underline flex items-center gap-1 text-[10px]"><GitBranch size={10}/> PR</a>}
                                </div>
                                <p className="text-sm font-medium text-slate-800 mb-3">{item.title}</p>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">{item.linkedSectionId}</span>
                                    <span className={item.due.includes('Oct') ? 'text-orange-600 font-bold' : ''}>{item.due}</span>
                                </div>
                                </div>
                            ))}
                            </div>
                        </div>
                        ))}
                    </div>
                    </div>
                )}
            </>
          )}

        </main>

        {/* 4. Detail Drawer (Right) */}
        {selectedItemId && (
          <div className="w-96 bg-white border-l border-slate-200 shadow-2xl absolute right-0 top-0 bottom-0 z-20 flex flex-col animate-slide-in-right">
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
              <span className="font-bold text-slate-700 text-sm">Inspector</span>
              <button onClick={() => setSelectedItemId(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {drawerType === 'section' && (
                <div className="space-y-6">
                  {(() => {
                    const sec = sections.find(s => s.sectionID === selectedItemId);
                    if (!sec) return null;
                    return (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Section ID</label>
                          <div className="font-mono text-sm bg-slate-100 p-2 rounded border border-slate-200 flex justify-between items-center">
                            {sec.sectionID}
                            <Lock size={12} className="text-slate-400"/>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                          <select className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            <option>Live</option>
                            <option>Draft</option>
                            <option>Deprecated</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Visible Controls</label>
                          <div className="space-y-2 border border-slate-200 rounded p-3">
                            {['filter', 'export', 'bulk_edit', 'scan', 'print_label', 'delete'].map(opt => (
                              <label key={opt} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={(sec.visibleControls || '').includes(opt)} readOnly className="rounded text-indigo-600"/>
                                {opt}
                              </label>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Changes here will trigger a version bump.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Routes</label>
                          <textarea 
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono h-20"
                            value={sec.routes}
                            readOnly
                          />
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                          <Button 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white justify-center shadow-lg"
                            icon={<Save size={16}/>}
                            onClick={() => handleBumpVersion(sec.sectionID)}
                          >
                            Save & Bump v{sec.version}
                          </Button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
