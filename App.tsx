
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Lead, GoogleUser, AppOptions, LegendItem, StageRule, SLARule, 
  AutoActionRule, MessageTemplate, ActivityLog, determineLeadHealth
} from './types';
import { 
  MOCK_LEADS, MOCK_LEGENDS, MOCK_STAGE_RULES, 
  MOCK_SLA_RULES, MOCK_AUTO_ACTIONS, MOCK_TEMPLATES 
} from './data/mock/mockData';
import { initGoogleAuth, loginToGoogle, logoutGoogle, restoreSession, trySilentRefresh, safeSetItem, safeGetItem } from './services/googleAuth';
import { updateLead, getSpreadsheetId, setSpreadsheetId, addActivityLog, fetchAllLeads, addLead, loadSheetRange, MODULE_IDS } from './services/sheetService';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { StatsBar } from './components/StatsBar';
import { TabBar } from './components/TabBar';
import { LeadList } from './components/LeadList';
import { PipelineBoard } from './components/PipelineBoard';
import { SettingsView } from './components/SettingsView';
import { ImportsView } from './components/ImportsView';
import { IntakeInbox } from './components/IntakeInbox';
import { ContactsView, AccountsView, StoresView, ProductsView, OrdersView } from './components/ModuleViews';
import { ReportsView } from './components/ReportsView';
import { ProjectManager } from './components/ProjectManager';
import { AddLeadModal } from './components/AddLeadModal';
import { SmartAlertsBar } from './components/SmartAlertsBar';
import { FilterPanel } from './components/FilterPanel';
import { Toast } from './components/Toast';

type ViewState = 'contacts' | 'accounts' | 'flows' | 'stores' | 'products' | 'orders' | 'reports' | 'settings' | 'board' | 'list' | 'tasks' | 'intake';

const CACHE_KEY_LEADS = 'yds_leads_cache';
const CACHE_KEY_LEGENDS = 'yds_legends_cache';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);

  // App Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  // Activity Logs are now lazy-loaded, so we only keep track of logs added in the current session
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  // Config State
  const [appOptions, setAppOptions] = useState<AppOptions>({
    owners: MOCK_LEGENDS.owner_list,
    stages: MOCK_LEGENDS.stage_list,
    sources: MOCK_LEGENDS.source_list,
    categories: MOCK_LEGENDS.category_list,
    priorities: MOCK_LEGENDS.priority_list,
    productTypes: MOCK_LEGENDS.product_type_list,
    printTypes: MOCK_LEGENDS.print_type_list,
    contactStatus: MOCK_LEGENDS.contact_status_list,
    paymentStatus: MOCK_LEGENDS.payment_update_list,
    designStatus: MOCK_LEGENDS.design_status_list,
    lostReasons: ['Price', 'Competitor', 'No Response'],
    customerTypes: MOCK_LEGENDS.customer_type_list,
    platformTypes: MOCK_LEGENDS.platform_type_list,
    sampleStatus: MOCK_LEGENDS.sample_status_list,
    orderStatus: ['Pending', 'Processing', 'Shipped'],
    nextActionTypes: ['Call', 'Email', 'Meeting'],
    intents: MOCK_LEGENDS.intent_list,
    workflowTypes: MOCK_LEGENDS.workflow_type_list
  });

  const [legends, setLegends] = useState<LegendItem[]>([]);
  const [stageRules, setStageRules] = useState<StageRule[]>(MOCK_STAGE_RULES as any);
  const [slaRules, setSLARules] = useState<SLARule[]>(MOCK_SLA_RULES as any);
  const [autoActions, setAutoActions] = useState<AutoActionRule[]>(MOCK_AUTO_ACTIONS as any);
  const [templates, setTemplates] = useState<MessageTemplate[]>(MOCK_TEMPLATES as any);

  // UI State
  const [currentView, setCurrentView] = useState<ViewState>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pmMode, setPmMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  
  // Filter State
  const [currentOwnerFilter, setCurrentOwnerFilter] = useState('All');
  const [advancedFilters, setAdvancedFilters] = useState({
    stage: 'All', owner: 'All', category: 'All', priority: 'All', source: 'All', city: ''
  });

  // Staging State
  const [stagedLeads, setStagedLeads] = useState<Lead[]>([]);
  const [showStaging, setShowStaging] = useState(false);

  // --- Auth & Init ---
  useEffect(() => {
    // 1. Instant Cache Hydration (SWR Pattern)
    hydrateFromCache();

    // 2. Auth & Network Fetch
    initGoogleAuth(async (success) => {
      if (success) {
        const session = restoreSession();
        if (session) {
          setUser(session.user);
          loadData(); // Background fetch
        } else {
          const refreshed = await trySilentRefresh();
          if (refreshed) {
            setUser(refreshed.user);
            loadData(); // Background fetch
          } else {
            // Guest mode
            setSyncStatus('success'); 
          }
        }
      } else {
        setSyncStatus('error');
      }
      setAuthLoading(false);
    });
  }, []);

  const hydrateFromCache = () => {
      const cachedLeads = safeGetItem(CACHE_KEY_LEADS);
      const cachedLegends = safeGetItem(CACHE_KEY_LEGENDS);
      
      if (cachedLeads) {
          try {
              setLeads(JSON.parse(cachedLeads));
          } catch(e) {}
      }
      if (cachedLegends) {
          try {
              updateLegends(JSON.parse(cachedLegends));
          } catch(e) {}
      }
  };

  const updateLegends = (newLegends: LegendItem[]) => {
      setLegends(newLegends);
      // Map legends to appOptions
      const newOptions: any = { ...appOptions };
      const map = {
          'owner': 'owners', 'stage': 'stages', 'source': 'sources', 
          'category': 'categories', 'priority': 'priorities'
      };
      
      Object.entries(map).forEach(([listName, optionKey]) => {
          const items = newLegends.filter(l => l.listName === listName && l.isActive).sort((a,b) => a.displayOrder - b.displayOrder).map(l => l.value);
          if (items.length > 0) newOptions[optionKey] = items;
      });
      setAppOptions(newOptions);
  };

  const handleLogin = async () => {
    try {
      const { user } = await loginToGoogle();
      setUser(user);
      loadData();
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
  };

  const handleLogout = () => {
    logoutGoogle();
    setUser(null);
    setLeads(MOCK_LEADS as any);
  };

  // --- Data Loading (Optimized) ---
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Parallel fetch for Leads and Config
      const [leadsData, legendsData] = await Promise.all([
          fetchAllLeads(),
          loadSheetRange(getSpreadsheetId(), 'Legend!A:G')
      ]);

      if (leadsData) {
          setLeads(leadsData);
          safeSetItem(CACHE_KEY_LEADS, JSON.stringify(leadsData));
          
          if (!authLoading) {
             setToast({ msg: 'Synced with Google Sheets', type: 'success' });
          }
      }

      if (legendsData && legendsData.length > 0) {
          const realLegends = legendsData.slice(1).map((r: any[]) => ({
            listName: r[0], value: r[1], displayOrder: r[2], color: r[3], 
            isDefault: r[4] === true || r[4] === 'TRUE', 
            isActive: r[5] === true || r[5] === 'TRUE',
            probability: r[6]
          })).filter((l: any) => l.listName) as LegendItem[];
          
          updateLegends(realLegends);
          safeSetItem(CACHE_KEY_LEGENDS, JSON.stringify(realLegends));
      }

      setSyncStatus('success');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
    setLoading(false);
  };

  const handleUpdateSpreadsheetId = async (id: string) => {
      setSpreadsheetId(id);
      await loadData();
      setToast({ msg: 'Connected to new Sheet', type: 'success' });
  };

  // --- Actions ---

  const handleUpdateLead = useCallback(async (updatedLead: Lead, options: { skipLog?: boolean, customLogType?: string } = {}) => {
    // Optimistic Update
    const health = determineLeadHealth(updatedLead, slaRules);
    const calculatedLead = { 
        ...updatedLead, 
        slaHealth: health.status === 'Violated' ? '🔴' : health.status === 'Warning' ? '🟡' : '🟢', 
        slaStatus: health.status, 
        actionOverdue: health.isOverdue ? 'OVERDUE' : health.status === 'Warning' ? 'DUE SOON' : 'OK' 
    };

    setLeads(prev => {
        const next = prev.map(l => l.leadId === calculatedLead.leadId ? calculatedLead : l);
        safeSetItem(CACHE_KEY_LEADS, JSON.stringify(next)); // Update cache immediately
        return next;
    });
    
    if (user) {
        // Fire and forget (Optimistic)
        updateLead(calculatedLead, user.email).then(success => {
            if (!success) setSyncStatus('error');
        });
        
        if (!options.skipLog) {
             const log = {
                logId: Date.now().toString(),
                leadId: calculatedLead.leadId,
                activityType: options.customLogType || 'Update',
                timestamp: new Date().toLocaleString(),
                owner: user.name || 'System',
                notes: 'Updated lead details',
                fromValue: '',
                toValue: ''
            };
            // Only add to local session logs for UI feedback, full logs fetched lazily
            setActivityLogs(prev => [log, ...prev]);
            
            if (options.customLogType && options.customLogType !== 'Stage Change') {
                 addActivityLog(log);
            }
        }
    }
  }, [slaRules, user, leads]);

  const handleAddLead = async (newLead: Partial<Lead>) => {
      const fullLead = { ...newLead, status: 'New', stage: 'New' } as Lead;
      
      // Optimistic add locally
      setLeads(prev => {
          const next = [fullLead, ...prev];
          safeSetItem(CACHE_KEY_LEADS, JSON.stringify(next));
          return next;
      });
      
      if (user) {
          const success = await addLead(fullLead);
          if (success) {
              setToast({ msg: 'Lead Created & Saved', type: 'success' });
              // Reload to get correct row indices
              loadData(); 
          } else {
              setToast({ msg: 'Saved locally only (Sync Failed)', type: 'error' });
          }
      } else {
          setToast({ msg: 'Lead Created (Offline)', type: 'success' });
      }
  };

  const handleFilterChange = (key: string, value: string) => {
      setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- Derived State ---
  const filteredLeads = useMemo(() => {
      let data = leads;
      
      if (searchQuery) {
          const lower = searchQuery.toLowerCase();
          data = data.filter(l => 
              l.companyName?.toLowerCase().includes(lower) || 
              l.contactPerson?.toLowerCase().includes(lower) ||
              l.number?.includes(lower)
          );
      }

      if (currentOwnerFilter !== 'All') {
          data = data.filter(l => l.ydsPoc === currentOwnerFilter);
      }

      if (advancedFilters.stage !== 'All') data = data.filter(l => l.status === advancedFilters.stage);
      if (advancedFilters.owner !== 'All') data = data.filter(l => l.ydsPoc === advancedFilters.owner);
      if (advancedFilters.category !== 'All') data = data.filter(l => l.category === advancedFilters.category);
      if (advancedFilters.priority !== 'All') data = data.filter(l => l.priority?.includes(advancedFilters.priority));
      if (advancedFilters.source !== 'All') data = data.filter(l => l.source === advancedFilters.source);
      if (advancedFilters.city) data = data.filter(l => l.city?.toLowerCase().includes(advancedFilters.city.toLowerCase()));

      return data;
  }, [leads, searchQuery, currentOwnerFilter, advancedFilters]);

  // --- Render ---

  if (pmMode) {
      return <ProjectManager onExit={() => setPmMode(false)} />;
  }

  if (showStaging) {
      return (
          <ImportsView 
              importedLeads={stagedLeads} 
              onClearImports={() => { setStagedLeads([]); setShowStaging(false); }}
              onImportComplete={() => { loadData(); setShowStaging(false); }}
              onBack={() => setShowStaging(false)}
          />
      );
  }

  const renderView = () => {
      if (currentView === 'intake') {
          return (
              <IntakeInbox 
                  user={user} 
                  onLogin={handleLogin} 
                  onImportSuccess={loadData} 
                  existingLeads={leads}
              />
          );
      }
      
      if (currentView === 'settings') {
          return (
              <SettingsView 
                  leads={leads}
                  legends={legends}
                  onUpdateLegends={setLegends}
                  stageRules={stageRules}
                  onUpdateStageRules={setStageRules}
                  slaRules={slaRules}
                  onUpdateSLARules={setSLARules}
                  autoActions={autoActions}
                  onUpdateAutoActions={setAutoActions}
                  templates={templates}
                  onUpdateTemplates={setTemplates}
                  currentSpreadsheetId={getSpreadsheetId()}
                  onUpdateSpreadsheetId={handleUpdateSpreadsheetId}
                  user={user}
                  syncStatus={syncStatus}
                  onResetLocalData={() => setLeads([])}
                  onSetImportedLeads={(l) => { setStagedLeads(l); }}
                  onViewImports={() => setShowStaging(true)}
                  onEnterPMMode={() => setPmMode(true)}
              />
          );
      }

      if (currentView === 'reports') return <ReportsView leads={leads} stages={appOptions.stages} legends={legends} />;
      if (currentView === 'contacts') return <ContactsView leads={leads} onUpdateLead={handleUpdateLead} />;
      if (currentView === 'accounts') return <AccountsView />;
      if (currentView === 'stores') return <StoresView />;
      if (currentView === 'products') return <ProductsView />;
      if (currentView === 'orders') return <OrdersView />;

      return (
          <>
             <StatsBar leads={leads} />
             {currentView === 'board' && (
                 <>
                    <TabBar owners={appOptions.owners} currentFilter={currentOwnerFilter} onFilterChange={setCurrentOwnerFilter} />
                    <SmartAlertsBar leads={filteredLeads} onFilter={() => {}} />
                    <PipelineBoard 
                        leads={filteredLeads} 
                        stages={appOptions.stages}
                        onUpdateLead={handleUpdateLead}
                        loading={loading && leads.length === 0} // Only show loader if no cache
                        onQuickNote={(l) => { /* open note */ }}
                        appOptions={appOptions}
                        stageRules={stageRules}
                        slaRules={slaRules}
                        autoActions={autoActions}
                        templates={templates}
                        activityLogs={activityLogs}
                        onLogActivity={(l, type, note) => { /* log */ }}
                    />
                 </>
             )}
             {(currentView === 'list' || currentView === 'tasks') && (
                 <LeadList 
                    leads={filteredLeads}
                    viewMode={currentView}
                    onUpdateLead={handleUpdateLead}
                    loading={loading && leads.length === 0}
                    onQuickNote={(l) => {}}
                    appOptions={appOptions}
                    stageRules={stageRules}
                    slaRules={slaRules}
                    autoActions={autoActions}
                    templates={templates}
                    activityLogs={activityLogs}
                    user={user}
                 />
             )}
          </>
      );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] text-slate-800 font-sans">
      <Header 
        user={user}
        loading={authLoading || loading}
        syncStatus={syncStatus}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRefresh={loadData}
        onAddClick={() => setShowAddModal(true)}
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFilterActive={isFilterPanelOpen}
        onToggleFilterPanel={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
      />

      <main className="flex-1 overflow-hidden relative">
          {renderView()}
      </main>

      <BottomNav currentView={currentView} onViewChange={setCurrentView} />

      <FilterPanel 
          isOpen={isFilterPanelOpen} 
          onClose={() => setIsFilterPanelOpen(false)}
          appOptions={appOptions}
          filters={advancedFilters}
          onFilterChange={handleFilterChange}
          onReset={() => setAdvancedFilters({ stage: 'All', owner: 'All', category: 'All', priority: 'All', source: 'All', city: '' })}
      />

      <AddLeadModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)}
          onSave={handleAddLead}
          appOptions={appOptions}
      />

      {toast && (
          <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default App;
