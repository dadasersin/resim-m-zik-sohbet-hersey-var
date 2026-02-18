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
    { id: AppView.AUDIO, label: 'Ses', icon: 'fa-music' },
    { id: AppView.LIVE, label: 'Canlı', icon: 'fa-bolt' },
    { id: AppView.SETTINGS, label: 'Ayar', icon: 'fa-gear' },
  ];

  const getStatusColor = () => {
    switch(syncStatus) {
      case 'syncing': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
      case 'success': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]';
      case 'error': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      default: return 'bg-slate-500';
    }
  };

  const isApiActive = !!process.env.API_KEY && process.env.API_KEY.length > 5;

  return (
    <>
      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col glass-panel border-r border-slate-800 h-full shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <i className="fa-solid fa-cube text-white text-lg"></i>
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">MODÜLER</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                activeView === item.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center transition-transform group-hover:scale-110`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-slate-800 bg-slate-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <i className="fa-solid fa-plug-circle-bolt text-indigo-400"></i>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-300 truncate">SİSTEM DURUMU</p>
              <div className="flex items-center gap-2 mt-1">
                 <div className={`w-2 h-2 rounded-full ${isApiActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                 <p className={`text-[9px] font-black uppercase tracking-widest ${isApiActive ? 'text-green-500' : 'text-red-500'}`}>
                   {isApiActive ? 'API AKTİF' : 'ANAHTAR YOK'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBİL ALT MENÜ (SADECE MOBİLDE) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-18 bg-slate-950/80 backdrop-blur-2xl border-t border-slate-800 z-50 flex items-center justify-around px-2 pb-safe">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full py-3 transition-all ${
              activeView === item.id ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeView === item.id ? 'bg-indigo-500/10' : ''}`}>
              <i className={`fa-solid ${item.icon} text-lg`}></i>
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;