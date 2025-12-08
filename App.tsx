
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Lead, GoogleUser, AppOptions, LegendItem, StageRule, SLARule, 
  AutoActionRule, MessageTemplate, ActivityLog, determineLeadHealth, 
  ConfigStore 
} from './types';
import { 
  MOCK_LEADS, MOCK_LEGENDS, MOCK_STAGE_RULES, 
  MOCK_SLA_RULES, MOCK_AUTO_ACTIONS, MOCK_TEMPLATES 
} from './data/mock/mockData';
import { initGoogleAuth, loginToGoogle, logoutGoogle, restoreSession, trySilentRefresh } from './services/googleAuth';
import { updateLead, loadSheetRange, getSpreadsheetId, SHEET_NAME_LEADS, SHEET_NAME_LEAD_FLOWS, SHEET_NAME_ACTIVITY, addActivityLog } from './services/sheetService';

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

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);

  // App Data State
  const [leads, setLeads] = useState<Lead[]>([]);
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
    initGoogleAuth(async (success) => {
      if (success) {
        const session = restoreSession();
        if (session) {
          setUser(session.user);
          loadData();
        } else {
          // Attempt silent refresh
          const refreshed = await trySilentRefresh();
          if (refreshed) {
            setUser(refreshed.user);
            loadData();
          } else {
            // Guest / Offline Mode - Load Mocks
            setLeads(MOCK_LEADS as any);
            setSyncStatus('success'); 
          }
        }
      } else {
        setSyncStatus('error');
      }
      setAuthLoading(false);
    });
  }, []);

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
    setLeads(MOCK_LEADS as any); // Fallback to mock on logout
  };

  // --- Data Loading ---
  const loadData = async () => {
    setLoading(true);
    try {
      // In a real implementation, we would fetch all sheets here.
      // For now, we simulate or fetch if user is logged in.
      if (user) {
         // TODO: Implement actual fetch logic mapping sheet rows to Lead objects
         // const rows = await loadSheetRange(getSpreadsheetId(), `${SHEET_NAME_LEAD_FLOWS}!A2:Z`);
         // const mappedLeads = mapRowsToLeads(rows);
         // setLeads(mappedLeads);
         
         // For demonstration, keep using mocks mixed with live capability if implemented
         setLeads(MOCK_LEADS as any);
      }
      setSyncStatus('success');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
    setLoading(false);
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

    setLeads(prev => prev.map(l => l.leadId === calculatedLead.leadId ? calculatedLead : l));
    
    if (!options.skipLog) {
        const log = {
            logId: Date.now().toString(),
            leadId: calculatedLead.leadId,
            flowId: calculatedLead.flowId,
            activityType: options.customLogType || 'Update',
            timestamp: new Date().toLocaleString(),
            owner: user?.name || 'System',
            notes: 'Updated lead details',
            fromValue: '',
            toValue: ''
        };
        setActivityLogs(prev => [log, ...prev]);
        if (user) await addActivityLog(log);
    }

    if (user) await updateLead(calculatedLead, user.email);
  }, [slaRules, user]);

  const handleAddLead = async (newLead: Partial<Lead>) => {
      // Create new lead logic
      const fullLead = { ...newLead, status: 'New', stage: 'New' } as Lead;
      setLeads(prev => [fullLead, ...prev]);
      if (user) {
          // call addLead service
      }
      setToast({ msg: 'Lead Created', type: 'success' });
  };

  const handleFilterChange = (key: string, value: string) => {
      setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- Derived State ---
  const filteredLeads = useMemo(() => {
      let data = leads;
      
      // Global Search
      if (searchQuery) {
          const lower = searchQuery.toLowerCase();
          data = data.filter(l => 
              l.companyName?.toLowerCase().includes(lower) || 
              l.contactPerson?.toLowerCase().includes(lower) ||
              l.number?.includes(lower)
          );
      }

      // Tab Filter (Owner)
      if (currentOwnerFilter !== 'All') {
          data = data.filter(l => l.ydsPoc === currentOwnerFilter);
      }

      // Advanced Filters
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
                  onUpdateSpreadsheetId={(id) => { /* update id */ }}
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

      // Core Views (Board/List/Tasks)
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
                        loading={loading}
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
                    loading={loading}
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
