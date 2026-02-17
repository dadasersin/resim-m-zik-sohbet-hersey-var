
import React from 'react';
import { AppView } from '../types';

interface NavigationProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  onManualSync: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange, syncStatus, onManualSync }) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Panel', icon: 'fa-house' },
    { id: AppView.CHAT, label: 'Sohbet', icon: 'fa-message' },
    { id: AppView.VISUALS, label: 'Stüdyo', icon: 'fa-wand-magic-sparkles' },
    { id: AppView.AUDIO, label: 'Ses & Remix', icon: 'fa-music' },
    { id: AppView.LIVE, label: 'Canlı', icon: 'fa-bolt' },
    { id: AppView.SETTINGS, label: 'Ayarlar', icon: 'fa-gear' },
  ];

  const getStatusColor = () => {
    switch(syncStatus) {
      case 'syncing': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <>
      <aside className="hidden md:flex w-64 flex-col glass-panel border-r border-slate-800 h-full">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <i className="fa-solid fa-cube text-white"></i>
            </div>
            <span className="font-bold text-lg tracking-tight">MODÜLER YZ</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeView === item.id
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600 flex items-center justify-center">
              <i className="fa-solid fa-user text-slate-400 text-xs"></i>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">Geliştirici</p>
              <div className="flex items-center gap-1.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()} animate-pulse`}></div>
                 <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-widest">
                   {process.env.API_KEY ? 'API AKTİF' : 'KEY BEKLENİYOR'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-50 flex items-center justify-around px-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${
              activeView === item.id ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg`}></i>
            <span className="text-[9px] font-bold uppercase">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
