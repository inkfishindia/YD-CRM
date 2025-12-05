
import React from 'react';
import { Kanban, List, CheckSquare, BarChart3, Settings, Import } from 'lucide-react';

interface BottomNavProps {
  currentView: 'board' | 'list' | 'tasks' | 'reports' | 'settings' | 'fetch';
  onViewChange: (view: 'board' | 'list' | 'tasks' | 'reports' | 'settings' | 'fetch') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'board', label: 'Board', icon: Kanban },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'list', label: 'List', icon: List },
    { id: 'fetch', label: 'Fetch', icon: Import }, // NEW
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Config', icon: Settings },
  ] as const;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-4 py-2 safe-area-bottom">
      <div className="flex justify-between items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              currentView === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <item.icon size={20} className={currentView === item.id ? 'fill-blue-100' : ''} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
