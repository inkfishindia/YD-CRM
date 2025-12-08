
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
import { IntakeInbox } from './components/IntakeInbox';
import { ContactsView, AccountsView, StoresView, ProductsView, OrdersView } from './components/ModuleViews';
import { ProjectManager } from './components/ProjectManager';
import { 
  fetchSystemData, addLead, updateLead, setAccessToken, addActivityLog, 
  resetLocalData, getSpreadsheetId, updateGlobalSpreadsheetId 
} from './services/sheetService';
import { RoutingService, StageService } from './services/workflow';
import { initGoogleAuth, loginToGoogle, logoutGoogle, restoreSession, trySilentRefresh } from './services/googleAuth';
import { 
  Lead, Owner, GoogleUser, ConfigStore, AppOptions,
  ActivityLog, formatDate, determineLeadHealth
} from './types';
import { Plus, Hammer, AlertTriangle } from 'lucide-react';

type ViewState = 'board' | 'list' | 'tasks' | 'reports' | 'settings' | 'intake' | 'contacts' | 'accounts' | 'flows' | 'stores' | 'products' | 'orders';

function App() {
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Config Store State (New)
  const [config, setConfig] = useState<ConfigStore>({
      legends: {},
      stageRules: [],
      slaRules: [],
      autoActions: [],
      templates: []
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  // View State - Default to 'intake' (Inbox) as Landing Page
  const [currentView, setCurrentView] = useState<ViewState>('intake');
  const [flowSubView, setFlowSubView] = useState<'board' | 'list' | 'tasks'>('board');
  const [currentFilter, setCurrentFilter] = useState<Owner>('All'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isPMMode, setIsPMMode] = useState(false);
  const [currentSpreadsheetId, setCurrentSpreadsheetId] = useState<string>(getSpreadsheetId());

  // Filters
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
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // UI State
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error'>('success');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [selectedLeadForNote, setSelectedLeadForNote] = useState<Lead | null>(null);

  // Auth
  const [user, setUser] = useState<GoogleUser | null>(() => {
    const session = restoreSession();
    return session ? session.user : null;
  });

  // --- DERIVED OPTIONS FROM CONFIG STORE ---
  const appOptions = useMemo<AppOptions>(() => {
      // Helper to flatten legend items to strings
      const extract = (key: string) => (config.legends[key] || []).map(i => i.value);

      return {
          owners: extract('owner'),
          stages: extract('stage'),
          sources: extract('source'),
          categories: extract('category'),
          priorities: extract('priority'),
          productTypes: extract('product_type'),
          printTypes: extract('print_type'),
          contactStatus: extract('contact_status'),
          paymentStatus: extract('payment_update'),
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
  }, [config]);

  // --- DATA LOADING ---
  const loadData = useCallback(async (isRefresh = false) => {
    setLoading(true);
    const data = await fetchSystemData(isRefresh); 
    
    setLeads(data.leads);
    setConfig(data.config); // Load normalized config
    setActivityLogs(data.activityLogs);

    setLoading(false);

    if (user && data.dataSource === 'local') {
        setSyncStatus('error');
        setSyncErrorMsg(data.error || 'Failed to fetch data from Google Sheets');
        setToast({ 
            message: `Sync Failed: ${data.error || 'Check Module Permissions'}`, 
            type: 'error' 
        });
    } else {
        setSyncStatus(data.success ? 'success' : 'error');
        setSyncErrorMsg('');
        if (isRefresh && data.success) {
           setToast({ message: 'Modules synced!', type: 'success' });
        }
    }
  }, [user]);

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

  // --- ACTIONS ---

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

  const handleUpdateSpreadsheetId = async (id: string) => {
      updateGlobalSpreadsheetId(id);
      setCurrentSpreadsheetId(id);
      setToast({ message: 'Updating Connection...', type: 'success' });
      await loadData(true);
  };

  const handleAddLead = useCallback(async (newLead: Partial<Lead>) => {
    // 1. Route Lead (Routing Engine)
    const routedLead = RoutingService.routeLead(newLead, config);
    
    // 2. Set defaults
    const todayStr = formatDate();
    const optimisticLead: Lead = { 
        ...routedLead, 
        _rowIndex: -1, 
        leadId: 'TEMP-' + Date.now(), 
        priority: '🟢 Low', 
        daysOpen: '0d', 
        date: todayStr, 
        createdAt: todayStr, 
        stageChangedDate: todayStr 
    } as Lead;

    // 3. UI Update
    setLeads(prev => [optimisticLead, ...prev]);
    
    // 4. Backend Update
    const success = await addLead(routedLead);
    if (success) { 
        setToast({ message: 'Lead added!', type: 'success' }); 
        await loadData(true); 
    } else { 
        setToast({ message: 'Failed to write (View Only?)', type: 'error' }); 
    }
  }, [config, loadData]);

  const handleUpdateLead = useCallback(async (updatedLead: Lead, options: { skipLog?: boolean, customLogType?: string } = {}) => {
    const health = determineLeadHealth(updatedLead, config.slaRules);
    const calculatedLead = { 
        ...updatedLead, 
        slaHealth: health.status === 'Violated' ? '🔴' : health.status === 'Warning' ? '🟡' : '🟢', 
        slaStatus: health.status, 
        actionOverdue: health.isOverdue ? 'OVERDUE' : health.status === 'Warning' ? 'DUE SOON' : 'OK' 
    };

    setLeads(prev => prev.map(l => l.leadId === calculatedLead.leadId ? calculatedLead : l));
    
    if (!options.skipLog) {
        addActivityLog({
            logId: Date.now().toString(),
            leadId: calculatedLead.leadId,
            activityType: options.customLogType || 'Update',
            timestamp: new Date().toLocaleString(),
            owner: user?.name || 'System',
            notes: 'Updated lead details',
            fromValue: '',
            toValue: 'New'
        });
    }

    await updateLead(calculatedLead);
  }, [config.slaRules, user]);

  const handleViewChange = (view: ViewState) => {
      if (['board', 'list', 'tasks'].includes(view)) {
          setFlowSubView(view as any);
          setCurrentView(view);
      } else {
          setCurrentView(view);
      }
  };

  const isFlowView = ['board', 'list', 'tasks'].includes(currentView);

  // --- RENDER ---

  if (isPMMode) {
      return <ProjectManager onExit={() => setIsPMMode(false)} />;
  }

  const commonProps = useMemo(() => ({
      onUpdateLead: handleUpdateLead,
      loading: loading,
      onQuickNote: (lead: Lead) => setSelectedLeadForNote(lead),
      appOptions: appOptions,
      autoActions: config.autoActions,
      templates: config.templates,
      stageRules: config.stageRules,
      slaRules: config.slaRules,
      selectedIds: selectedLeadIds,
      onToggleSelect: (id: string) => setSelectedLeadIds(prev => { const n = new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n; }),
      activityLogs: activityLogs,
      user: user
  }), [handleUpdateLead, loading, appOptions, config, selectedLeadIds, activityLogs, user]);

  const filteredLeads = useMemo(() => {
      return leads.filter(l => {
          if (currentFilter !== 'All' && l.ydsPoc !== currentFilter) return false;
          if (searchQuery && !l.companyName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          return true;
      });
  }, [leads, currentFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col h-screen overflow-hidden">
      <Header 
        onAddClick={() => setIsModalOpen(true)} 
        onRefresh={() => loadData(true)}
        onLogin={handleLogin}
        onLogout={handleLogout}
        user={user}
        loading={loading}
        syncStatus={syncStatus}
        currentView={currentView}
        onViewChange={handleViewChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFilterActive={false}
        onToggleFilterPanel={() => setIsFilterPanelOpen(true)}
      />
      
      {/* Global Error Banner */}
      {syncStatus === 'error' && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm font-bold flex justify-between items-center shadow-md relative z-50 shrink-0 animate-fade-in-up">
            <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <span>Connection Error: {syncErrorMsg || 'Unable to sync with Google Sheets. Using offline data.'}</span>
            </div>
            <button 
                onClick={() => loadData(true)} 
                className="bg-white text-red-600 px-3 py-1 rounded hover:bg-red-50 text-xs uppercase font-bold transition-colors"
            >
                Retry
            </button>
        </div>
      )}
      
      <button onClick={() => setIsPMMode(true)} className="fixed top-20 right-4 z-50 p-2 bg-slate-800 text-white rounded-full shadow-lg opacity-20 hover:opacity-100 transition-opacity">
        <Hammer size={16} />
      </button>

      {isFlowView && (
          <>
            <SmartAlertsBar leads={leads} onFilter={setSmartFilter} />
            <div className="flex-none hidden md:block">
                <TabBar currentFilter={currentFilter} onFilterChange={setCurrentFilter} owners={appOptions.owners} />
                <StatsBar leads={filteredLeads} />
            </div>
          </>
      )}

      <div className="flex-1 overflow-hidden relative pb-16 md:pb-0 bg-[#f5f5f5]">
         <div key={currentView} className="h-full w-full animate-fade-in">
             {currentView === 'board' ? <PipelineBoard leads={filteredLeads} stages={appOptions.stages} {...commonProps} /> :
              currentView === 'list' ? <div className="h-full overflow-y-auto"><LeadList leads={filteredLeads} viewMode='list' {...commonProps} /></div> :
              currentView === 'tasks' ? <div className="h-full overflow-y-auto"><LeadList leads={filteredLeads} viewMode='tasks' {...commonProps} /></div> :
              currentView === 'intake' ? <IntakeInbox user={user} onImportSuccess={() => loadData(true)} onLogin={handleLogin} existingLeads={leads} /> :
              currentView === 'settings' ? <SettingsView 
                                                legends={Object.values(config.legends).flat()} 
                                                stageRules={config.stageRules} 
                                                slaRules={config.slaRules} 
                                                autoActions={config.autoActions} 
                                                templates={config.templates} 
                                                currentSpreadsheetId={currentSpreadsheetId}
                                                onUpdateSpreadsheetId={handleUpdateSpreadsheetId}
                                                user={user} 
                                                syncStatus={syncStatus} 
                                                onResetLocalData={resetLocalData} 
                                                // These are no longer needed but kept for type compat if strictly checked, otherwise removed
                                                onSetImportedLeads={() => {}} 
                                                onViewImports={() => {}} 
                                                onEnterPMMode={() => setIsPMMode(true)} 
                                                onUpdateLegends={()=>{}} onUpdateStageRules={()=>{}} onUpdateSLARules={()=>{}} onUpdateAutoActions={()=>{}} onUpdateTemplates={()=>{}}
                                            /> :
              currentView === 'reports' ? <ReportsView leads={leads} stages={appOptions.stages} legends={Object.values(config.legends).flat()} /> :
              currentView === 'contacts' ? <ContactsView leads={leads} onUpdateLead={handleUpdateLead} /> :
              currentView === 'accounts' ? <AccountsView /> :
              currentView === 'stores' ? <StoresView /> :
              currentView === 'products' ? <ProductsView /> :
              currentView === 'orders' ? <OrdersView /> :
              null
             }
         </div>
      </div>

      {isFlowView && <BulkActionBar selectedCount={selectedLeadIds.size} onClearSelection={() => setSelectedLeadIds(new Set())} onBulkAction={async () => {}} appOptions={appOptions} />}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-20 right-4 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"><Plus size={24} /></button>
      
      <AddLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddLead} appOptions={appOptions} />
      {selectedLeadForNote && <LeadDetailPanel isOpen={true} onClose={() => setSelectedLeadForNote(null)} lead={selectedLeadForNote} onUpdate={handleUpdateLead} appOptions={appOptions} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default App;
