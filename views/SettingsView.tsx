import React, { useState, useEffect } from 'react';
import { SyncSettings } from '../types';

interface SettingsProps {
  onSyncNow: () => void;
}

const SettingsView: React.FC<SettingsProps> = ({ onSyncNow }) => {
  const [settings, setSettings] = useState<SyncSettings>({
    enabled: false,
    token: '',
    repo: '',
    path: 'moduler-ai-backup.json'
  });
  const [hasVeoKey, setHasVeoKey] = useState(false);
  const [isAiStudioEnv, setIsAiStudioEnv] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sync_settings');
    if (saved) setSettings(JSON.parse(saved));
    
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        setIsAiStudioEnv(true);
        if (typeof aiStudio.hasSelectedApiKey === 'function') {
          const has = await aiStudio.hasSelectedApiKey();
          setHasVeoKey(has);
        }
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyPicker = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio?.openSelectKey) {
      await aiStudio.openSelectKey();
      setHasVeoKey(true);
    } else {
      alert("Bu özellik sadece Google AI Studio gibi özel platformlarda çalışır.");
    }
  };

  const handleSave = () => {
    if (settings.enabled && (!settings.token || !settings.repo)) {
      alert('Lütfen GitHub bilgilerini eksiksiz girin.');
      return;
    }
    localStorage.setItem('sync_settings', JSON.stringify(settings));
    if (settings.enabled) onSyncNow();
    alert('Ayarlar kaydedildi.');
  };

  const masterApiKey = process.env.API_KEY;
  const isApiActive = masterApiKey && masterApiKey.length > 5;

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 pb-24">
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
             <i className="fa-solid fa-sliders text-indigo-500"></i>
             Sistem Ayarları
          </h1>
          <p className="text-slate-400 text-sm">Platform özelliklerini ve veri güvenliğini yönetin.</p>
        </header>

        {/* OTOMATİK API ALGILAMA PANELİ */}
        <section className={`glass-panel p-5 md:p-6 rounded-3xl border transition-all duration-500 ${isApiActive ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg shrink-0 ${isApiActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <i className={`fa-solid ${isApiActive ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
            </div>
            <div className="flex-1 space-y-3 w-full">
              <div>
                <h3 className="font-bold text-lg mb-1">
                  Sistem API Durumu: {isApiActive ? <span className="text-green-400">AKTİF</span> : <span className="text-red-400">BEKLENİYOR</span>}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isApiActive 
                    ? "Ana API anahtarı başarıyla algılandı. Tüm yapay zeka özellikleri kullanıma hazır." 
                    : "Uygulamanın çalışması için anahtar girişi gereklidir. Aşağıdaki yöntemlerden birini kullanın:"}
                </p>
              </div>
              
              {!isApiActive && (
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-[11px] md:text-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold">1. RENDER</span>
                    <p className="text-slate-300">Render Paneli <i className="fa-solid fa-arrow-right mx-1 text-[8px] text-slate-600"></i> Environment Variables <i className="fa-solid fa-arrow-right mx-1 text-[8px] text-slate-600"></i> <b>API_KEY</b> isminde ekleyin.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">2. LOCAL</span>
                    <p className="text-slate-300">Bilgisayarınızda proje klasörüne <b>.env</b> dosyası açıp <code>API_KEY=anahtarınız</code> yazın.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* VEO VE ÖZEL MODELLER İÇİN YETKİ BUTONU */}
        <section className="glass-panel p-5 md:p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 text-xl border border-indigo-500/20">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                 </div>
                 <div>
                    <h3 className="font-bold text-base md:text-lg">Veo & Gelişmiş Modeller</h3>
                    <p className="text-[10px] md:text-xs text-slate-500">Video üretimi için Google Cloud yetkilendirmesi.</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 self-end md:self-auto">
                 <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${hasVeoKey ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {hasVeoKey ? 'Yetki Verildi' : 'Yetki Bekleniyor'}
                 </div>
                 {isAiStudioEnv && (
                   <button 
                    onClick={handleOpenKeyPicker}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold transition shadow-lg"
                   >
                     ANAHTAR SEÇ
                   </button>
                 )}
              </div>
           </div>
           {!isAiStudioEnv && (
             <div className="mt-4 text-[10px] text-slate-500 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 italic flex gap-2">
               <i className="fa-solid fa-info-circle text-indigo-500 mt-0.5"></i>
               <span>Bu butonu göremiyorsanız endişelenmeyin; Render üzerinden <b>API_KEY</b> girdiyseniz sistem zaten çalışacaktır. Bu buton sadece geliştirme ortamları içindir.</span>
             </div>
           )}
        </section>

        {/* GITHUB YEDEKLEME */}
        <div className="space-y-6">
          <section className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <i className="fa-brands fa-github text-xl text-white"></i>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Bulut Yedekleme</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">GitHub Sync</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer scale-90 md:scale-100">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.enabled}
                  onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
                />
                <div className="w-14 h-7 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className={`space-y-5 transition-all duration-300 ${!settings.enabled && 'opacity-30 grayscale pointer-events-none'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">GitHub Token</label>
                  <input 
                    type="password"
                    value={settings.token}
                    onChange={(e) => setSettings({...settings, token: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                    placeholder="ghp_xxxx..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Repo (user/repo)</label>
                  <input 
                    type="text"
                    value={settings.repo}
                    onChange={(e) => setSettings({...settings, repo: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm focus:border-indigo-500 outline-none"
                    placeholder="kullanici/depo"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95"
            >
              DEĞİŞİKLİKLERİ KAYDET
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;