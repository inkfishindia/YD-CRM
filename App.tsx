
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lead, GoogleUser, AppOptions, LegendItem, StageRule, SLARule, AutoActionRule, MessageTemplate } from './types';
import { initGoogleAuth, loginToGoogle, logoutGoogle, restoreSession, trySilentRefresh } from './services/googleAuth';
import { updateLead, getSpreadsheetId, setSpreadsheetId, fetchAllLeads, addLead, loadSheetRange } from './services/sheetService';

// View Components
import { Layout, ViewState } from './components/Layout';
import { StatsBar } from './components/StatsBar';
import { TabBar } from './components/TabBar';
import { LeadList } from './components/LeadList';
import { PipelineBoard } from './components/PipelineBoard';
import { AddLeadModal } from './components/AddLeadModal';
import { Toast } from './components/Toast';
import { FilterPanel } from './components/FilterPanel';
import { SettingsView } from './components/SettingsView';
import { ProjectManager } from './components/ProjectManager';
import { ContactsView, AccountsView, StoresView, ProductsView, OrdersView } from './components/ModuleViews';
import { ReportsView } from './components/ReportsView';
import { IntakeInbox } from './components/IntakeInbox';

const DEFAULT_OPTIONS: AppOptions = {
    owners: ['Chandan', 'Ashwini', 'Muskan', 'Admin'],
    stages: ['New', 'Contacted', 'Qualified', 'Negotiation', 'Won', 'Lost'],
    sources: ['Vendor', 'Instagram', 'Website', 'Referral'],
    categories: ['Customisation', 'POD', 'Dropshipping', 'B2B'],
    priorities: ['🔴 High', '🟡 Med', '🟢 Low'],
    productTypes: ['T-Shirt', 'Hoodie', 'Polo', 'Cap'],
    printTypes: ['DTF', 'Embroidery', 'Screen'],
    contactStatus: [], paymentStatus: [], designStatus: [], lostReasons: [], customerTypes: [], platformTypes: [], sampleStatus: [], orderStatus: [], nextActionTypes: [], intents: [], workflowTypes: []
};

const App: React.FC = () => {
  // --- STATE ---
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'success' | 'error'>('success');
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  
  // Data State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appOptions, setAppOptions] = useState<AppOptions>(DEFAULT_OPTIONS);
  const [rules, setRules] = useState<{ stage: StageRule[], sla: SLARule[], auto: AutoActionRule[] }>({ stage: [], sla: [], auto: [] });
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [legends, setLegends] = useState<LegendItem[]>([]);

  // UI State
  const [currentView, setCurrentView] = useState<ViewState>('board');
  const [pmMode, setPmMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ stage: 'All', owner: 'All', category: 'All', priority: 'All', source: 'All', city: '' });

  // --- INIT ---
  useEffect(() => {
    initGoogleAuth(async (success) => {
      if (success) {
        const session = restoreSession();
        if (session) setUser(session.user);
        else trySilentRefresh().then(res => { if (res) setUser(res.user); });
      }
    });
  }, []);

  useEffect(() => { if (user) loadData(); }, [user]);

  // --- ACTIONS ---
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
        // 1. Load Configs
        const [legendRows, tplRows, stageRows] = await Promise.all([
            loadSheetRange(getSpreadsheetId(), 'Legend!A2:E'),
            loadSheetRange(getSpreadsheetId(), 'Message_Templates!A2:E'),
            loadSheetRange(getSpreadsheetId(), 'Stage_Rules!A2:C')
        ]).catch(() => [[], [], []]); // Fail safe

        if (legendRows && legendRows.length > 0) {
            const newLegends = legendRows.map(r => ({ listName: r[0], value: r[1], color: r[2], isActive: r[3] === 'TRUE', displayOrder: parseInt(r[4]) || 99 }));
            setLegends(newLegends);
            
            // Build Dynamic Options
            const newOpts = { ...DEFAULT_OPTIONS };
            newLegends.forEach(l => {
                const key = l.listName.toLowerCase() + 's'; // Pluralize roughly (stages, owners)
                // Manual mapping for strict types keys
                if(l.listName === 'Owner') newOpts.owners.push(l.value);
                if(l.listName === 'Stage') newOpts.stages.push(l.value);
                if(l.listName === 'Source') newOpts.sources.push(l.value);
                if(l.listName === 'Category') newOpts.categories.push(l.value);
            });
            // Dedup
            newOpts.owners = [...new Set(newOpts.owners)];
            newOpts.stages = [...new Set(newOpts.stages)];
            setAppOptions(newOpts);
        }

        if (tplRows) setTemplates(tplRows.map(r => ({ id: r[0], name: r[1], body: r[2], stage: r[3], category: r[4] })));
        if (stageRows) setRules(prev => ({ ...prev, stage: stageRows.map(r => ({ fromStage: r[0], toStage: r[1], requiresField: r[2] ? r[2].split(',') : [] })) }));

        // 2. Load Leads
        const leadsData = await fetchAllLeads();
        if (leadsData) {
            setLeads(leadsData);
            setSyncStatus('success');
        } else {
            setSyncStatus('error');
        }
    } catch (e) {
        console.error(e);
        setSyncStatus('error');
        setToast({ msg: "Sync Failed", type: 'error' });
    }
    setLoading(false);
  };

  const handleUpdateLead = useCallback(async (updatedLead: Lead) => {
      // Optimistic UI Update
      setLeads(prev => prev.map(l => l.leadId === updatedLead.leadId ? updatedLead : l));
      // Async Write
      const success = await updateLead(updatedLead);
      if (!success) {
          setToast({ msg: "Failed to save changes to Sheet", type: "error" });
          setSyncStatus('error');
      }
  }, []);

  const filteredLeads = useMemo(() => {
      let data = leads;
      const q = searchQuery.toLowerCase();
      if (q) data = data.filter(l => (l.companyName || '').toLowerCase().includes(q) || (l.contactPerson || '').toLowerCase().includes(q) || (l.number || '').includes(q));
      if (ownerFilter !== 'All') data = data.filter(l => l.ydsPoc === ownerFilter);
      if (advancedFilters.stage !== 'All') data = data.filter(l => l.status === advancedFilters.stage);
      if (advancedFilters.category !== 'All') data = data.filter(l => l.category === advancedFilters.category);
      if (advancedFilters.city) data = data.filter(l => (l.city || '').toLowerCase().includes(advancedFilters.city.toLowerCase()));
      return data;
  }, [leads, searchQuery, ownerFilter, advancedFilters]);

  // --- RENDER ---
  if (pmMode) return <ProjectManager onExit={() => setPmMode(false)} />;

  return (
    <Layout
      currentView={currentView} onViewChange={setCurrentView}
      user={user} onLogin={loginToGoogle} onLogout={() => { logoutGoogle(); setUser(null); setLeads([]); }}
      onAddLead={() => setShowAddModal(true)}
      syncStatus={syncStatus} isSyncing={loading}
      searchQuery={searchQuery} onSearchChange={setSearchQuery}
      isFilterActive={isFilterPanelOpen} onToggleFilter={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
      onOpenPM={() => setPmMode(true)}
    >
      {/* Dynamic View Rendering */}
      {(() => {
          const commonProps = { leads: filteredLeads, onUpdateLead: handleUpdateLead };
          
          switch (currentView) {
              case 'board':
              case 'tasks':
              case 'list':
                  return (
                      <>
                        <StatsBar leads={leads} />
                        <TabBar owners={appOptions.owners} currentFilter={ownerFilter} onFilterChange={setOwnerFilter} />
                        {currentView === 'board' ? (
                            <PipelineBoard 
                                {...commonProps} loading={loading} stages={appOptions.stages}
                                appOptions={appOptions} slaRules={rules.sla} autoActions={rules.auto}
                                templates={templates} stageRules={rules.stage} onQuickNote={() => {}}
                            />
                        ) : (
                            <LeadList 
                                {...commonProps} loading={loading} viewMode={currentView}
                                appOptions={appOptions} slaRules={rules.sla} autoActions={rules.auto}
                                templates={templates} stageRules={rules.stage} onQuickNote={() => {}}
                            />
                        )}
                      </>
                  );
              case 'settings':
                  return <SettingsView 
                            leads={leads} legends={legends} onUpdateLegends={setLegends}
                            stageRules={rules.stage} onUpdateStageRules={v => setRules({...rules, stage: v})}
                            slaRules={rules.sla} onUpdateSLARules={v => setRules({...rules, sla: v})}
                            autoActions={rules.auto} onUpdateAutoActions={v => setRules({...rules, auto: v})}
                            templates={templates} onUpdateTemplates={setTemplates}
                            currentSpreadsheetId={getSpreadsheetId()} onUpdateSpreadsheetId={(id) => { setSpreadsheetId(id); loadData(); }}
                            user={user} syncStatus={syncStatus} onResetLocalData={() => { setLeads([]); loadData(); }}
                            onSetImportedLeads={(l) => setLeads([...leads, ...l])} onViewImports={() => setCurrentView('intake')}
                            onEnterPMMode={() => setPmMode(true)}
                         />;
              case 'intake':
                  return <IntakeInbox user={user} existingLeads={leads} onImportSuccess={() => { loadData(); setToast({msg: 'Imported', type:'success'}); }} onLogin={loginToGoogle} />;
              case 'reports': return <ReportsView leads={leads} stages={appOptions.stages} legends={legends} />;
              case 'contacts': return <ContactsView {...commonProps} />;
              case 'accounts': return <AccountsView />;
              case 'stores': return <StoresView />;
              case 'products': return <ProductsView />;
              case 'orders': return <OrdersView />;
              default: return null;
          }
      })()}

      <AddLeadModal 
          isOpen={showAddModal} 
          onClose={() => setShowAddModal(false)} 
          onSave={async (l) => { const ok = await addLead(l as Lead); if(ok) { loadData(); setToast({msg:'Added', type:'success'}); } }} 
          appOptions={appOptions} 
      />
      <FilterPanel 
          isOpen={isFilterPanelOpen} onClose={() => setIsFilterPanelOpen(false)}
          appOptions={appOptions} filters={advancedFilters}
          onFilterChange={(k, v) => setAdvancedFilters(p => ({...p, [k]: v}))}
          onReset={() => setAdvancedFilters({ stage: 'All', owner: 'All', category: 'All', priority: 'All', source: 'All', city: '' })}
      />
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </Layout>
  );
};

export default App;
