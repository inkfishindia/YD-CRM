
import React from 'react';
import { Plus, RefreshCw, WifiOff, LogIn, Filter, Search, Sun, BarChart3, Settings, Import, Users, Building2, Store, Package, ShoppingCart, GitMerge, Inbox, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { GoogleUser } from '../types';

interface HeaderProps {
  onAddClick: () => void;
  onRefresh: () => void;
  onLogin: () => void;
  onLogout: () => void;
  user: GoogleUser | null;
  loading: boolean;
  syncStatus: 'success' | 'error';
  
  // Revised View Logic - Includes all ViewState types from App.tsx
  currentView: 'contacts' | 'accounts' | 'flows' | 'stores' | 'products' | 'orders' | 'reports' | 'settings' | 'board' | 'list' | 'tasks' | 'intake';
  onViewChange: (view: any) => void;
  
  // Search
  searchQuery: string;
  onSearchChange: (q: string) => void;
  
  // Filter Toggle
  isFilterActive: boolean;
  onToggleFilterPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onAddClick, 
  onRefresh, 
  onLogin,
  onLogout,
  user,
  loading, 
  syncStatus,
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  isFilterActive,
  onToggleFilterPanel
}) => {
  
  const NavButton = ({ id, label, icon: Icon, colorClass = "text-gray-500" }: any) => {
      const isActive = currentView === id || (id === 'flows' && ['board', 'list', 'tasks'].includes(currentView as any));
      
      return (
        <button 
          onClick={() => onViewChange(id)}
          className={`
            px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap
            ${isActive 
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
            }
          `}
        >
          <Icon size={16} className={isActive ? 'text-blue-500' : colorClass} /> 
          <span className="hidden xl:inline">{label}</span>
        </button>
      );
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm transition-all">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Logo & Module Switcher */}
        <div className="flex items-center gap-4 shrink-0">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden md:block">YDS Leads</h1>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight md:hidden">YDS</h1>
            
            <div className="hidden md:flex bg-gray-100/80 p-1 rounded-lg gap-0.5 overflow-x-auto no-scrollbar max-w-[600px]">
                <NavButton id="intake" label="Inbox" icon={Inbox} colorClass="text-orange-600" />
                <div className="w-px bg-gray-300 h-4 self-center mx-1"></div>
                <NavButton id="contacts" label="Contacts" icon={Users} />
                <NavButton id="accounts" label="Accounts" icon={Building2} />
                <div className="w-px bg-gray-300 h-4 self-center mx-1"></div>
                <NavButton id="flows" label="Flows" icon={GitMerge} colorClass="text-indigo-500" />
                <div className="w-px bg-gray-300 h-4 self-center mx-1"></div>
                <NavButton id="stores" label="Stores" icon={Store} />
                <NavButton id="products" label="Catalog" icon={Package} />
                <NavButton id="orders" label="Orders" icon={ShoppingCart} />
            </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-1 justify-end">
             <div className="max-w-[200px] w-full hidden lg:block relative shrink-0">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  id="global-search"
                  type="text" 
                  placeholder="Search (Press /)"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 h-9 text-sm rounded-lg border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
            </div>

            {/* Admin & Utils */}
            <div className="flex bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                <button 
                  onClick={() => onViewChange('reports')}
                  className={`p-1.5 rounded-md transition-all ${currentView === 'reports' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Reports"
                >
                  <BarChart3 size={16} />
                </button>
                 <button 
                  onClick={() => onViewChange('settings')}
                  className={`p-1.5 rounded-md transition-all ${currentView === 'settings' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
            </div>

            {/* Filter Toggle */}
            <button 
              onClick={onToggleFilterPanel}
              className={`h-9 px-3 flex items-center justify-center gap-2 rounded-lg border transition-all ${isFilterActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              title="Toggle Filters"
            >
               <Filter size={16} />
               {isFilterActive && (
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
               )}
            </button>

            {/* Sync Status - ENHANCED */}
            <div className="flex items-center">
              {loading ? (
                <div className="flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="hidden sm:inline">Syncing...</span>
                </div>
              ) : syncStatus === 'error' ? (
                <button onClick={onRefresh} className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">
                    <WifiOff size={14} />
                    <span>Sync Error</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-green-600 px-2 py-1.5 rounded-lg text-xs font-bold border border-transparent hover:bg-green-50 hover:border-green-100 transition-all cursor-default" title="System Operational">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="hidden lg:inline">Live</span>
                </div>
              )}
            </div>

            {/* Refresh Button (Only if not loading/error to avoid clutter) */}
            {syncStatus === 'success' && !loading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                title="Refresh Data"
                className="hidden sm:flex text-gray-400 hover:text-gray-600"
              >
                <RefreshCw size={18} />
              </Button>
            )}

            {user ? (
              <div className="flex items-center gap-2 ml-1">
                 {user.picture ? (
                   <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer" onClick={onLogout} title="Logout" />
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold cursor-pointer" onClick={onLogout} title="Logout">
                     {user.name[0]}
                   </div>
                 )}
                 <Button
                    onClick={onAddClick}
                    icon={<Plus size={18} />}
                    size="sm"
                    className="ml-1 hidden sm:flex"
                    title="Shortcut: N"
                  >
                    Add
                  </Button>
              </div>
            ) : (
               <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={onLogin} icon={<LogIn size={16} />}>
                   <span className="hidden sm:inline">Login</span>
                   <span className="sm:hidden">Login</span>
                 </Button>
               </div>
            )}
        </div>
      </div>
      
      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-2">
         <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 h-9 text-sm rounded-lg border-gray-200 bg-white text-gray-900 focus:ring-blue-500"
            />
         </div>
      </div>
    </header>
  );
};
