
import React from 'react';
import { AppView } from '../types';

interface DashboardProps {
  onViewChange: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const modules = [
    {
      view: AppView.CHAT,
      title: 'Sohbet',
      desc: 'Gemini 3 Flash ile gelişmiş akıl yürütme.',
      icon: 'fa-message',
      color: 'bg-blue-500'
    },
    {
      view: AppView.VISUALS,
      title: 'Stüdyo',
      desc: 'Yüksek kaliteli resim ve videolar.',
      icon: 'fa-image',
      color: 'bg-purple-500'
    },
    {
      view: AppView.AUDIO,
      title: 'Ses',
      desc: 'Doğal ses sentezi motoru.',
      icon: 'fa-waveform',
      color: 'bg-emerald-500'
    },
    {
      view: AppView.LIVE,
      title: 'Canlı',
      desc: 'Gerçek zamanlı multimodal YZ.',
      icon: 'fa-bolt',
      color: 'bg-amber-500'
    }
  ];

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 pb-20 md:pb-8">
      <header className="mb-8 md:mb-12">
        <h1 className="text-2xl md:text-4xl font-bold mb-2">Modüler YZ</h1>
        <p className="text-slate-400 text-sm md:text-lg">Yeni nesil zeka her cihazda seninle.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {modules.map((m) => (
          <button
            key={m.view}
            onClick={() => onViewChange(m.view)}
            className="group glass-panel rounded-2xl p-6 text-left hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all duration-300 transform active:scale-95 md:hover:-translate-y-1"
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${m.color} flex items-center justify-center mb-4 md:mb-6 shadow-lg`}>
              <i className={`fa-solid ${m.icon} text-lg md:text-xl text-white`}></i>
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-2 group-hover:text-indigo-400">{m.title}</h3>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">{m.desc}</p>
          </button>
        ))}
      </div>

      <section className="mt-8 md:mt-16">
        <h2 className="text-xl md:text-2xl font-bold mb-6">Aktivite Özeti</h2>
        <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-slate-500 min-h-[150px]">
          <i className="fa-solid fa-chart-line text-3xl mb-4 opacity-20"></i>
          <p className="text-sm">Tüm modüller aktif ve senkronize.</p>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
