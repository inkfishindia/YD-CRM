import React from 'react';
import { Plus, RefreshCw, WifiOff, LogIn, Filter, Search, List, Sun, Kanban, BarChart3, Settings } from 'lucide-react';
import { Button } from './ui/Button';
import { GoogleUser, AppOptions } from '../types';

interface HeaderProps {
  onAddClick: () => void;
  onRefresh: () => void;
  onLogin: () => void;
  onLogout: () => void;
  user: GoogleUser | null;
  loading: boolean;
  syncStatus: 'success' | 'error';
  currentView: 'board' | 'list' | 'tasks' | 'reports' | 'settings';
  onViewChange: (view: 'board' | 'list' | 'tasks' | 'reports' | 'settings') => void;
  
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
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm transition-all">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Logo & View Switcher */}
        <div className="flex items-center gap-4 shrink-0">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight hidden md:block">YDS Leads</h1>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight md:hidden">YDS</h1>
            
            <div className="hidden md:flex bg-gray-100 rounded-lg p-1 gap-1 overflow-x-auto no-scrollbar max-w-[300px] sm:max-w-none">
                 <button 
                  onClick={() => onViewChange('tasks')}
                  className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${currentView === 'tasks' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Shortcut: D"
                >
                  <Sun size={14} /> <span className="hidden lg:inline">My Day</span>
                </button>
                <button 
                  onClick={() => onViewChange('list')}
                  className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${currentView === 'list' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Shortcut: T"
                >
                  <List size={14} /> <span className="hidden lg:inline">Table</span>
                </button>
                <button 
                  onClick={() => onViewChange('board')}
                  className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${currentView === 'board' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Shortcut: P"
                >
                  <Kanban size={14} /> <span className="hidden lg:inline">Pipeline</span>
                </button>
                <button 
                  onClick={() => onViewChange('reports')}
                  className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${currentView === 'reports' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <BarChart3 size={14} /> <span className="hidden lg:inline">Reports</span>
                </button>
            </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-1 justify-end">
             <div className="max-w-[250px] w-full hidden md:block relative shrink-0">
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

            {/* Filter Toggle */}
            <button 
              onClick={onToggleFilterPanel}
              className={`h-9 px-3 flex items-center justify-center gap-2 rounded-lg border transition-all ${isFilterActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              title="Toggle Filters"
            >
               <Filter size={16} />
               <span className="hidden lg:inline text-xs font-bold">Filters</span>
               {isFilterActive && (
                 <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
               )}
            </button>

            {/* Sync Status */}
            <div className="flex items-center justify-center w-8 h-8" title={syncStatus === 'success' ? "Live" : "Offline"}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              ) : syncStatus === 'error' ? (
                <WifiOff size={16} className="text-red-500" />
              ) : (
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Data"
              className="hidden sm:flex"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
            
            {/* Settings Button */}
            <Button
              variant={currentView === 'settings' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onViewChange('settings')}
              title="Settings"
              className="hidden md:flex"
            >
              <Settings size={18} />
            </Button>

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