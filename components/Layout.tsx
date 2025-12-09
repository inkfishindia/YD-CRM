
import React, { useState } from 'react';
import { 
  LayoutDashboard, Kanban, ListTodo, Inbox, 
  Users, Building2, Store, Package, ShoppingCart, 
  BarChart3, Settings, Menu, X, Plus, Search, LogOut, Terminal 
} from 'lucide-react';
import { Button } from './ui/Button';
import { GoogleUser } from '../types';

export type ViewState = 'board' | 'list' | 'tasks' | 'intake' | 'contacts' | 'accounts' | 'stores' | 'products' | 'orders' | 'reports' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  user: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onAddLead: () => void;
  syncStatus: 'success' | 'error';
  isSyncing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleFilter: () => void;
  isFilterActive: boolean;
  onOpenPM: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children, currentView, onViewChange, user, onLogin, onLogout, onAddLead,
  syncStatus, isSyncing, searchQuery, onSearchChange, onToggleFilter, isFilterActive, onOpenPM
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Navigation Config ---
  const PRIMARY_NAV = [
    { id: 'board', label: 'Pipeline', icon: Kanban },
    { id: 'tasks', label: 'My Day', icon: ListTodo },
    { id: 'intake', label: 'Inbox', icon: Inbox },
  ];

  const MODULE_NAV = [
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'accounts', label: 'Accounts', icon: Building2 },
    { id: 'stores', label: 'Stores', icon: Store },
    { id: 'products', label: 'Catalog', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
  ];

  const UTILITY_NAV = [
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const NavItem = ({ item, isMobile = false }: { item: any, isMobile?: boolean }) => {
    const isActive = currentView === item.id;
    return (
      <button
        onClick={() => { onViewChange(item.id as ViewState); if (isMobile) setMobileMenuOpen(false); }}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full
          ${isActive 
            ? 'bg-blue-50 text-blue-700' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
        `}
      >
        <item.icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0 z-20">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3 shadow-sm">
            Y
          </div>
          <span className="font-bold text-gray-800 text-lg tracking-tight">YDS CRM</span>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Core</p>
            {PRIMARY_NAV.map(item => <NavItem key={item.id} item={item} />)}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Modules</p>
            {MODULE_NAV.map(item => <NavItem key={item.id} item={item} />)}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">System</p>
            {UTILITY_NAV.map(item => <NavItem key={item.id} item={item} />)}
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-700 truncate">{user.name}</p>
                <button onClick={onLogout} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <LogOut size={10} /> Logout
                </button>
              </div>
            </div>
          ) : (
            <Button onClick={onLogin} variant="outline" className="w-full">Sign In with Google</Button>
          )}
          {user && user.email.includes('admin') && ( // Simple auth check mock
             <button onClick={onOpenPM} className="mt-3 w-full flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 py-1">
                 <Terminal size={12}/> System Admin
             </button>
          )}
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f5] relative">
        
        {/* Top Header (Desktop & Mobile) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-gray-500" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>

            {/* Global Search */}
            <div className="relative max-w-md w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Search leads, companies..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 rounded-lg text-sm transition-all"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold ${syncStatus === 'error' ? 'bg-red-50 text-red-600' : 'text-green-600'}`}>
               <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
               {isSyncing ? 'Syncing...' : syncStatus === 'error' ? 'Offline' : 'Live'}
            </div>

            {/* Add Button */}
            <Button onClick={onAddLead} icon={<Plus size={18} />} className="hidden md:flex shadow-sm">
              Add Lead
            </Button>
            
            {/* Filter Toggle */}
            <button 
              onClick={onToggleFilter}
              className={`p-2 rounded-lg border transition-all ${isFilterActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}
            >
              <ListTodo size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </main>

        {/* --- MOBILE BOTTOM NAV --- */}
        <div className="md:hidden h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 shrink-0 z-20 pb-safe">
           <button onClick={() => onViewChange('board')} className={`flex flex-col items-center gap-1 p-2 ${currentView === 'board' ? 'text-blue-600' : 'text-gray-400'}`}>
              <Kanban size={20} />
              <span className="text-[10px] font-medium">Board</span>
           </button>
           <button onClick={() => onViewChange('tasks')} className={`flex flex-col items-center gap-1 p-2 ${currentView === 'tasks' ? 'text-blue-600' : 'text-gray-400'}`}>
              <ListTodo size={20} />
              <span className="text-[10px] font-medium">My Day</span>
           </button>
           
           {/* FAB (Floating Action Button) Wrapper */}
           <div className="relative -top-5">
             <button onClick={onAddLead} className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform">
               <Plus size={24} />
             </button>
           </div>

           <button onClick={() => onViewChange('intake')} className={`flex flex-col items-center gap-1 p-2 ${currentView === 'intake' ? 'text-blue-600' : 'text-gray-400'}`}>
              <Inbox size={20} />
              <span className="text-[10px] font-medium">Inbox</span>
           </button>
           <button onClick={() => setMobileMenuOpen(true)} className={`flex flex-col items-center gap-1 p-2 ${['settings', 'contacts'].includes(currentView) ? 'text-blue-600' : 'text-gray-400'}`}>
              <Menu size={20} />
              <span className="text-[10px] font-medium">Menu</span>
           </button>
        </div>
      </div>

      {/* --- MOBILE DRAWER MENU --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-3/4 bg-white shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <span className="font-bold text-lg text-gray-800">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)}><X size={24} className="text-gray-400"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
               <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Modules</p>
                  {MODULE_NAV.map(item => <NavItem key={item.id} item={item} isMobile />)}
               </div>
               <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">System</p>
                  {UTILITY_NAV.map(item => <NavItem key={item.id} item={item} isMobile />)}
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
               {user ? (
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={user.picture} className="w-8 h-8 rounded-full"/>
                        <span className="text-sm font-bold truncate max-w-[120px]">{user.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={onLogout} className="text-red-500">Logout</Button>
                 </div>
               ) : (
                 <Button onClick={onLogin} className="w-full">Sign In</Button>
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
