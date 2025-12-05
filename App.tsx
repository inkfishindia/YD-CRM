
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { PipelineBoard } from './components/PipelineBoard'; 
import { LeadList } from './components/LeadList';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AddLeadModal } from './components/AddLeadModal';
import { Toast } from './components/Toast';
import { LeadDetailPanel } from './components/LeadDetailPanel'; 
import { BulkActionBar } from './components/BulkActionBar';
import { BottomNav } from './components/BottomNav';
import { TabBar } from './components/TabBar'; 
import { FilterPanel } from './components/FilterPanel';
import { SmartAlertsBar } from './components/SmartAlertsBar';
import { ImportsView } from './components/ImportsView';
import { FetchLeadsView } from './components/FetchLeadsView'; // NEW
import { 
  fetchSystemData, addLead, updateLead, setAccessToken, addActivityLog, 
  saveLegends, saveStageRules, saveSLARules, saveAutoActions, saveTemplates,
  getSpreadsheetId, setSpreadsheetId, resetLocalData 
} from './services/sheetService';
import { initGoogleAuth, loginToGoogle, logoutGoogle, restoreSession, trySilentRefresh } from './services/googleAuth';
import { 
  Lead, Owner, GoogleUser, LegendItem, calculatePriority, calcSLAHealth, AppOptions,
  StageRule, SLARule, AutoActionRule, MessageTemplate, parseDate, ActivityLog, formatDate, determineLeadHealth
} from './types';
import { Plus } from 'lucide-react';

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [legends, setLegends] = useState<LegendItem[]>([]);
  const [stageRules, setStageRules] = useState<StageRule[]>([]);
  const [slaRules, setSlaRules] = useState<SLARule[]>([]);
  const [autoActions, setAutoActions] = useState<AutoActionRule[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  // Staging / Imports State
  const [importedLeads, setImportedLeads] = useState<Lead[]>([]);

  // Filters & View State
  const [currentView, setCurrentView] = useState<'board' | 'list' | 'tasks' | 'reports' | 'settings' | 'imports' | 'fetch'>('board');
  const [currentFilter, setCurrentFilter] = useState<Owner>('All'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Unified Filter State
  const [filters, setFilters] = useState({
      stage: 'All',
      owner: 'All',
      category: 'All',
      priority: 'All',
      source: 'All',
      city: ''
  });
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [smartFilter, setSmartFilter] = useState<string>('All'); 

  // Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error'>('success');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [selectedLeadForNote, setSelectedLeadForNote] = useState<Lead | null>(null);

  // Auth State
  const [user, setUser] = useState<GoogleUser | null>(() => {
    const session = restoreSession();
    return session ? session.user : null;
  });

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if typing in input/textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        const key = e.key.toLowerCase();
        
        if (key === 'n') {
            e.preventDefault();
            setIsModalOpen(true);
        }
        if (key === 's' || key === '/') {
            e.preventDefault();
            document.getElementById('global-search')?.focus();
        }
        if (key === 't') setCurrentView('list');
        if (key === 'p') setCurrentView('board');
        if (key === 'd') setCurrentView('tasks');
        if (e.key === 'Escape') {
            setIsModalOpen(false);
            setIsFilterPanelOpen(false);
            setSelectedLeadForNote(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Extract Dynamic Options
  const appOptions = useMemo<AppOptions>(() => {
      const extract = (name: string) => legends
          .filter(l => l.listName === name && l.isActive)
          .sort((a,b) => a.displayOrder - b.displayOrder)
          .map(l => l.value);

      return {
          owners: extract('owner'),
          stages: extract('stage'),
          sources: extract('source'),
          categories: extract('category'),
          priorities: extract('priority'),
          productTypes: extract('product_type'),
          printTypes: extract('print_type'),
          contactStatus: extract('contact_status'),
          paymentStatus: extract('payment_update'), // Fixed: matches sheet data key
          designStatus: extract('design_status'),
          lostReasons: extract('lost_reason'),
          customerTypes: extract('customer_type'),
          platformTypes: extract('platform_type'),
          sampleStatus: extract('sample_status'),
          orderStatus: extract('order_status'),
          nextActionTypes: extract('next_action_type'),
          intents: extract('intent'),
          workflowTypes: extract('workflow_type')
      };
  }, [legends]);

  // Load Data
  const loadData = useCallback(async (isRefresh = false) => {
    setLoading(true);
    const data = await fetchSystemData(isRefresh); 
    setLeads(data.leads);
    setLegends(data.legends);
    setStageRules(data.stageRules);
    setSlaRules(data.slaRules);
    setAutoActions(data.autoActions);
    setTemplates(data.templates);
    setActivityLogs(data.activityLogs);

    setLoading(false);

    if (user && data.dataSource === 'local') {
        setSyncStatus('error');
        setToast({ 
            message: `Sync Failed: ${data.error || 'Check Sheet Permissions or ID'}`, 
            type: 'error' 
        });
    } else {
        setSyncStatus(data.success ? 'success' : 'error');
        if (isRefresh && data.success) {
           setToast({ message: 'Synced successfully!', type: 'success' });
        }
    }
  }, [user]);

  // Initialization Effect
  useEffect(() => {
    let isMounted = true;
    const session = restoreSession();
    
    if (session) {
      setAccessToken(session.accessToken);
    }

    const initialize = async () => {
      initGoogleAuth(async (success) => {
        if (!isMounted) return;
        if (success) {
           if (session) {
              setAccessToken(session.accessToken);
              loadData(false);
           } else {
              const refreshedSession = await trySilentRefresh();
              if (refreshedSession && isMounted) {
                  setAccessToken(refreshedSession.accessToken);
                  setUser(refreshedSession.user);
                  loadData(false);
              } else {
                  loadData(false); 
              }
           }
        } else {
            loadData(false);
        }
      });
    };
    initialize();
    return () => { isMounted = false; };
  }, [loadData]);

  const handleLogin = async () => {
    try {
      const { accessToken, user } = await loginToGoogle();
      setAccessToken(accessToken);
      setUser(user);
      setToast({ message: `Welcome ${user.name}!`, type: 'success' });
      setTimeout(() => loadData(true), 100); 
    } catch (error) {
      setToast({ message: 'Login cancelled.', type: 'error' });
    }
  };

  const handleLogout = () => {
    logoutGoogle();
    setAccessToken(null);
    setUser(null);
    setToast({ message: 'Logged out', type: 'success' });
    setTimeout(() => loadData(true), 100);
  };

  const handleUpdateLegends = async (newLegends: LegendItem[]) => {
      setLegends(newLegends);
      await saveLegends(newLegends);
      setToast({ message: 'Config Saved (Syncing...)', type: 'success' });
  };
  
  const handleUpdateStageRules = async (rules: StageRule[]) => {
      setStageRules(rules);
      await saveStageRules(rules);
      setToast({ message: 'Rules Saved', type: 'success' });
  };

  const handleUpdateSLARules = async (rules: SLARule[]) => {
      setSlaRules(rules);
      await saveSLARules(rules);
      setToast({ message: 'SLA Saved', type: 'success' });
  };

  const handleUpdateAutoActions = async (rules: AutoActionRule[]) => {
      setAutoActions(rules);
      await saveAutoActions(rules);
      setToast({ message: 'Actions Saved', type: 'success' });
  };

  const handleUpdateTemplates = async (tpls: MessageTemplate[]) => {
      setTemplates(tpls);
      await saveTemplates(tpls);
      setToast({ message: 'Templates Saved', type: 'success' });
  };

  const handleUpdateSpreadsheetId = (id: string) => {
      setSpreadsheetId(id);
      setToast({ message: 'Spreadsheet ID updated. Reloading...', type: 'success' });
      setTimeout(() => loadData(true), 100);
  };

  const handleSmartFilter = (type: string) => {
      setSmartFilter(prev => prev === type ? 'All' : type);
  };

  const handleResetFilters = () => {
      setFilters({ stage: 'All', owner: 'All', category: 'All', priority: 'All', source: 'All', city: '' });
      setSmartFilter('All');
      setCurrentFilter('All');
  };

  // --- Filtering Logic ---
  const filteredLeads = useMemo(() => {
    let result = leads;
    
    // 1. My Day Task View specific logic (owner mapping)
    if (currentView === 'tasks' && user) {
        const userOwnerName = appOptions.owners.find(o => user.name.toLowerCase().includes(o.toLowerCase()));
        if(userOwnerName) {
            result = result.filter(l => l.ydsPoc === userOwnerName);
        } else if (currentFilter !== 'All') {
            result = result.filter(l => l.ydsPoc === currentFilter);
        }
    } else {
        // TabBar Filter (Quick Owner)
        if (currentFilter !== 'All') {
            result = result.filter(l => l.ydsPoc === currentFilter);
        }
    }

    // 2. Text Search
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(l => 
            (l.companyName || '').toLowerCase().includes(q) ||
            (l.contactPerson || '').toLowerCase().includes(q) ||
            (l.leadId || '').toLowerCase().includes(q) ||
            (l.number || '').includes(q)
        );
    }

    // 3. Detailed Filters
    if (filters.stage !== 'All') result = result.filter(l => l.status === filters.stage);
    if (filters.owner !== 'All') result = result.filter(l => l.ydsPoc === filters.owner);
    if (filters.category !== 'All') result = result.filter(l => l.category === filters.category);
    if (filters.priority !== 'All') result = result.filter(l => l.priority === filters.priority);
    if (filters.source !== 'All') result = result.filter(l => l.source === filters.source);
    if (filters.city) result = result.filter(l => (l.city || '').toLowerCase().includes(filters.city.toLowerCase()));

    // 4. Smart Alerts Logic
    if (smartFilter !== 'All') {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (smartFilter === 'smart_overdue') {
            result = result.filter(l => {
                const health = determineLeadHealth(l, slaRules);
                return health.isOverdue;
            });
        }
        if (smartFilter === 'smart_no_action') {
            result = result.filter(l => !l.nextAction && l.status !== 'Won' && l.status !== 'Lost');
        }
        if (smartFilter === 'smart_unassigned') {
            result = result.filter(l => (!l.ydsPoc || l.ydsPoc === 'Unassigned') && l.status !== 'Won' && l.status !== 'Lost');
        }
        if (smartFilter === 'smart_stale_proposal') {
            result = result.filter(l => {
                if (l.status !== 'Proposal') return false;
                const last = parseDate(l.stageChangedDate) || parseDate(l.date);
                if (!last) return false;
                const days = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
                return days > 5;
            });
        }
    }

    return result;
  }, [leads, currentFilter, currentView, user, searchQuery, filters, smartFilter, appOptions, slaRules]);

  // Recalculate Fields
  const recalculateLeadFields = useCallback((lead: Lead, currentSlaRules: SLARule[]): Lead => {
    const health = determineLeadHealth(lead, currentSlaRules);
    return {
        ...lead,
        priority: calculatePriority(lead.estimatedQty || 0),
        slaHealth: health.status === 'Violated' ? '🔴' : health.status === 'Warning' ? '🟡' : '🟢',
        slaStatus: health.status,
        actionOverdue: health.isOverdue ? 'OVERDUE' : health.status === 'Warning' ? 'DUE SOON' : 'OK'
    };
  }, []);

  const handleAddLead = useCallback(async (newLead: Partial<Lead>) => {
    const todayStr = formatDate();
    const optimisticLead: Lead = {
       ...newLead,
       _rowIndex: -1, 
       leadId: 'TEMP-' + Date.now(),
       status: 'New',
       priority: '🟢 Low',
       daysOpen: '0d',
       date: todayStr,
       stageChangedDate: todayStr
    } as Lead;
    
    const calculatedLead = recalculateLeadFields(optimisticLead, slaRules);
    setLeads(prev => [calculatedLead, ...prev]);

    const success = await addLead(newLead);
    if (success) {
      setToast({ message: 'Lead added!', type: 'success' });
      await loadData(true); // Force refresh to get real ID
    } else {
      setToast({ message: 'Failed to write (View Only?)', type: 'error' });
    }
  }, [recalculateLeadFields, slaRules, loadData]);

  // Logging Helper
  const handleLogActivity = useCallback(async (lead: Lead, type: string, notes: string, fromVal: string = '', toVal: string = '') => {
      const logEntry: ActivityLog = {
          logId: Date.now().toString(),
          leadId: lead.leadId,
          timestamp: new Date().toLocaleString('en-GB'),
          activityType: type,
          owner: user?.name || 'Unknown',
          fromValue: fromVal,
          toValue: toVal,
          notes: notes
      };
      
      setActivityLogs(prev => [logEntry, ...prev]);
      return await addActivityLog(logEntry);
  }, [user]);

  const handleUpdateLead = useCallback(async (updatedLead: Lead, options: { skipLog?: boolean, customLogType?: string } = {}) => {
    // Critical: Re-run health check before save to persist correct status
    const calculatedLead = recalculateLeadFields(updatedLead, slaRules);

    if (!options.skipLog) {
        const original = leads.find(l => l.leadId === updatedLead.leadId);
        if (original) {
             const trackedFields: (keyof Lead)[] = ['status', 'ydsPoc', 'contactStatus', 'priority', 'nextAction', 'nextActionDate'];
             
             for (const field of trackedFields) {
                if (original[field] !== calculatedLead[field]) {
                    let activityType = `${String(field).charAt(0).toUpperCase() + String(field).slice(1)} Change`;
                    if (field === 'status') activityType = 'Stage Change';
                    if (field === 'ydsPoc') activityType = 'Owner Change';
                    if (field === 'nextAction' || field === 'nextActionDate') activityType = 'Next Action Updated';
                    if (options.customLogType) activityType = options.customLogType;

                    let notes = `Changed ${String(field)} from ${original[field] || '(empty)'} to ${calculatedLead[field] || '(empty)'}`;
                    
                    if (field === 'nextAction' || field === 'nextActionDate') {
                         notes = `Action: ${calculatedLead.nextAction || 'None'} (Due: ${calculatedLead.nextActionDate || 'None'})`;
                    }
                    if (field === 'ydsPoc' && calculatedLead.reassignReason) {
                        notes += `. Reason: ${calculatedLead.reassignReason}`;
                    }

                    await handleLogActivity(calculatedLead, activityType, notes, String(original[field]), String(calculatedLead[field]));
                }
             }
        }
    }
    setLeads(prev => prev.map(l => l.leadId === calculatedLead.leadId ? calculatedLead : l));
    const success = await updateLead(calculatedLead);
    if (!success) setToast({ message: 'Update failed.', type: 'error' });
  }, [recalculateLeadFields, slaRules, leads, handleLogActivity]);

  const toggleSelection = useCallback((leadId: string) => {
      setSelectedLeadIds(prev => {
          const next = new Set(prev);
          if (next.has(leadId)) next.delete(leadId);
          else next.add(leadId);
          return next;
      });
  }, []);

  const handleBulkAction = async (action: string, value: any) => {
      const selectedIds = Array.from(selectedLeadIds);
      const leadsToUpdate = leads.filter(l => selectedIds.includes(l.leadId));
      
      const today = formatDate();

      const updates = leadsToUpdate.map(lead => {
          const newLead = { ...lead };
          if (action === 'owner') {
             newLead.ydsPoc = value;
             newLead.reassignReason = "Bulk Assignment";
          }
          if (action === 'stage') {
              newLead.status = value;
              newLead.stageChangedDate = today;
              newLead.lastContactDate = today;
              if (value === 'Won') {
                 newLead.wonDate = today;
                 newLead.paymentUpdate = 'Done';
              }
              if (value === 'Lost') newLead.lostDate = today;
          }
          if (action === 'nextAction') {
               newLead.nextAction = value.action;
               if (value.date) {
                   const d = new Date(value.date);
                   newLead.nextActionDate = formatDate(d);
               }
          }
          return newLead;
      });

      setLeads(prev => prev.map(l => {
          const updated = updates.find(u => u.leadId === l.leadId);
          return updated ? recalculateLeadFields(updated, slaRules) : l;
      }));

      for (const lead of updates) {
          let logType = 'Bulk Update';
          let notes = `Bulk update action: ${action}`;
          
          if (action === 'owner') {
              logType = 'Bulk Update – Owner';
              notes = `Bulk changed to ${value}`;
          } else if (action === 'stage') {
              logType = 'Bulk Update – Stage';
              notes = `Bulk changed to ${value}`;
          } else if (action === 'nextAction') {
              logType = 'Bulk Update – Next Action';
              notes = `Set Action: ${value.action}`;
          }

          await handleLogActivity(lead, logType, notes, '', JSON.stringify(value));
          await handleUpdateItem(lead, { skipLog: true }); 
      }
      setToast({ message: `Updated ${updates.length} leads`, type: 'success' });
  };

  // Helper because TypeScript might complain about handleUpdateLead in loop above
  const handleUpdateItem = (lead: Lead, opts: any) => handleUpdateLead(lead, opts);

  const commonProps = useMemo(() => ({
    onUpdateLead: handleUpdateLead,
    loading: loading,
    onQuickNote: (lead: Lead) => setSelectedLeadForNote(lead),
    appOptions: appOptions,
    autoActions: autoActions,
    templates: templates,
    stageRules: stageRules,
    slaRules: slaRules,
    selectedIds: selectedLeadIds,
    onToggleSelect: toggleSelection,
    onLogActivity: (lead: Lead, type: string, notes: string) => handleLogActivity(lead, type, notes),
    activityLogs: activityLogs,
    user: user
  }), [handleUpdateLead, loading, appOptions, autoActions, templates, stageRules, slaRules, selectedLeadIds, toggleSelection, handleLogActivity, activityLogs, user]);

  const handleRefresh = useCallback(() => loadData(true), [loadData]);

  // Handler for clearing imports
  const handleClearImports = () => {
      setImportedLeads([]);
      setCurrentView('board'); // Go back to default
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col h-screen overflow-hidden">
      <Header 
        onAddClick={() => setIsModalOpen(true)} 
        onRefresh={handleRefresh}
        onLogin={handleLogin}
        onLogout={handleLogout}
        user={user}
        loading={loading}
        syncStatus={syncStatus}
        currentView={currentView as any}
        onViewChange={(v) => setCurrentView(v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFilterActive={Object.values(filters).some(v => v !== 'All' && v !== '')}
        onToggleFilterPanel={() => setIsFilterPanelOpen(true)}
      />
      
      {/* Hide Top Bars if in Settings or Reports or Imports */}
      {currentView !== 'reports' && currentView !== 'settings' && currentView !== 'imports' && currentView !== 'fetch' && (
          <>
            <SmartAlertsBar leads={leads} onFilter={handleSmartFilter} currentUserId={user?.email} />
            <div className="flex-none hidden md:block">
                <TabBar 
                    currentFilter={currentFilter} 
                    onFilterChange={setCurrentFilter} 
                    owners={appOptions.owners} 
                />
                <StatsBar leads={filteredLeads} />
            </div>
          </>
      )}

      <div className="flex-1 overflow-hidden relative pb-16 md:pb-0 bg-[#f5f5f5]">
         <div key={currentView} className="h-full w-full animate-fade-in">
             {currentView === 'board' ? (
                 <PipelineBoard leads={filteredLeads} stages={appOptions.stages} {...commonProps} />
             ) : currentView === 'reports' ? (
                 <ReportsView leads={leads} stages={appOptions.stages} legends={legends} />
             ) : currentView === 'imports' ? (
                 <ImportsView 
                    importedLeads={importedLeads}
                    onClearImports={handleClearImports}
                    onImportComplete={() => loadData(true)}
                    onBack={() => setCurrentView('fetch')}
                 />
             ) : currentView === 'fetch' ? (
                 <FetchLeadsView 
                    user={user}
                    onSetImportedLeads={setImportedLeads}
                    onViewImports={() => setCurrentView('imports')}
                 />
             ) : currentView === 'settings' ? (
                 <SettingsView 
                    leads={leads}
                    legends={legends} 
                    onUpdateLegends={handleUpdateLegends}
                    stageRules={stageRules}
                    onUpdateStageRules={handleUpdateStageRules}
                    slaRules={slaRules}
                    onUpdateSLARules={handleUpdateSLARules}
                    autoActions={autoActions}
                    onUpdateAutoActions={handleUpdateAutoActions}
                    templates={templates}
                    onUpdateTemplates={handleUpdateTemplates}
                    currentSpreadsheetId={getSpreadsheetId()}
                    onUpdateSpreadsheetId={handleUpdateSpreadsheetId}
                    user={user}
                    syncStatus={syncStatus}
                    onResetLocalData={resetLocalData}
                    onInspectLead={(lead) => setSelectedLeadForNote(lead)}
                    onRefreshData={handleRefresh}
                    onSetImportedLeads={setImportedLeads}
                    onViewImports={() => setCurrentView('imports')}
                 />
             ) : (
                 <div className="h-full overflow-y-auto custom-scrollbar">
                     <LeadList leads={filteredLeads} viewMode={currentView === 'tasks' ? 'tasks' : 'list'} {...commonProps} />
                 </div>
             )}
         </div>
      </div>

      <BulkActionBar 
         selectedCount={selectedLeadIds.size}
         onClearSelection={() => setSelectedLeadIds(new Set())}
         onBulkAction={handleBulkAction}
         appOptions={appOptions}
      />

      {/* Floating Action Button (FAB) for Quick Add */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 active:scale-95 flex items-center justify-center"
        title="Quick Add (N)"
      >
          <Plus size={24} />
      </button>

      <FilterPanel 
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        appOptions={appOptions}
        filters={filters}
        onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
        onReset={handleResetFilters}
      />

      <BottomNav currentView={currentView as any} onViewChange={(v) => setCurrentView(v)} />

      <AddLeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddLead} 
        appOptions={appOptions}
      />
      
      {selectedLeadForNote && (
          <LeadDetailPanel
             isOpen={!!selectedLeadForNote}
             onClose={() => setSelectedLeadForNote(null)}
             lead={selectedLeadForNote}
             allLeads={leads} 
             onUpdate={handleUpdateLead}
             initialTab="details"
             appOptions={appOptions}
             autoActions={autoActions}
             templates={templates}
             stageRules={stageRules}
             activityLogs={activityLogs}
             onLogActivity={(type, notes) => handleLogActivity(selectedLeadForNote, type, notes)}
          />
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default App;
