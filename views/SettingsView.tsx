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
    
    // API Anahtarı durumunu kontrol et
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
      alert("Bu özellik sadece desteklenen platformlarda (Google AI Studio vb.) çalışır.");
    }
  };

  const handleSave = () => {
    if (settings.enabled && (!settings.token || !settings.repo)) {
      alert('Lütfen GitHub Token ve Repository bilgilerini eksiksiz girin.');
      return;
    }
    
    localStorage.setItem('sync_settings', JSON.stringify(settings));
    
    if (settings.enabled) {
      onSyncNow();
      alert('Ayarlar kaydedildi ve senkronizasyon başlatıldı.');
    } else {
      alert('Ayarlar kaydedildi.');
    }
  };

  const hasMasterKey = !!process.env.API_KEY;

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-950 pb-24">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
             <i className="fa-solid fa-sliders text-indigo-500"></i>
             Sistem Ayarları
          </h1>
          <p className="text-slate-400">Platform özelliklerini ve veri güvenliğini yönetin.</p>
        </header>

        {/* Master API Key Status Info - WHERE TO ENTER API KEY EXPLANATION */}
        <section className="glass-panel p-6 rounded-3xl border border-slate-800 bg-indigo-500/5 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg ${hasMasterKey ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              <i className={`fa-solid ${hasMasterKey ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Ana API Anahtarı Durumu</h3>
              <p className="text-sm text-slate-300 mb-3">
                Uygulamanın çalışması için gerekli olan ana anahtar <strong>{hasMasterKey ? 'Algılandı' : 'Eksik'}</strong>.
              </p>
              
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-xs space-y-3">
                <p className="text-slate-400 font-medium flex items-center gap-2">
                  <i className="fa-solid fa-info-circle text-indigo-400"></i>
                  API anahtarını nereye girmelisiniz?
                </p>
                <ul className="space-y-2 text-slate-500">
                  <li className="flex gap-2">
                    <span className="text-indigo-400 font-bold">1. Render.com:</span> 
                    Dashboard &rarr; Environment Variables sekmesinden <code>API_KEY</code> isminde ekleyin.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-indigo-400 font-bold">2. Yerel (Local):</span> 
                    Proje ana dizinine <code>.env</code> dosyası oluşturup <code>API_KEY=anahtarınız</code> yazın.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Model Yetkilendirmesi */}
        <section className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 text-2xl border border-indigo-500/20">
                    <i className="fa-solid fa-key"></i>
                 </div>
                 <div>
                    <h3 className="font-bold text-lg">Gelişmiş Model Yetkilendirmesi</h3>
                    <p className="text-xs text-slate-500 max-w-sm">Veo Video ve Gemini Pro modelleri için (sadece desteklenen ortamlarda) ek yetkilendirme sağlar.</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${hasVeoKey ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {hasVeoKey ? 'Yetkilendirildi' : 'Yetki Bekleniyor'}
                 </div>
                 {isAiStudioEnv && (
                   <button 
                    onClick={handleOpenKeyPicker}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg"
                   >
                     API ANAHTARI SEÇ
                   </button>
                 )}
              </div>
           </div>
           {!isAiStudioEnv && (
             <p className="mt-4 text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded-lg border border-slate-800/50 italic">
               * "API Anahtarı Seç" butonu şu anki ortamınızda pasif. Lütfen yukarıdaki <strong>Ana API Anahtarı</strong> talimatlarını izleyin.
             </p>
           )}
        </section>

        {/* GitHub Senkronizasyonu */}
        <div className="space-y-6">
          <section className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                  <i className="fa-brands fa-github text-2xl text-white"></i>
                </div>
                <div>
                  <h3 className="font-bold text-lg">GitHub Otomatik Yedekleme</h3>
                  <p className="text-xs text-slate-500">Tüm verilerinizi (Sohbet, Stüdyo) depoya kaydeder.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.enabled}
                  onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
                />
                <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-400 after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white shadow-inner"></div>
              </label>
            </div>

            <div className={`space-y-6 transition-all duration-300 ${!settings.enabled && 'opacity-40 grayscale pointer-events-none'}`}>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Personal Access Token (Repo Yetkili)</label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"></i>
                  <input 
                    type="password"
                    value={settings.token}
                    onChange={(e) => setSettings({...settings, token: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                    placeholder="ghp_xxxxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Repository (kullanıcı/depo)</label>
                  <input 
                    type="text"
                    value={settings.repo}
                    onChange={(e) => setSettings({...settings, repo: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                    placeholder="kullanici/repo"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Dosya Adı</label>
                  <input 
                    type="text"
                    value={settings.path}
                    onChange={(e) => setSettings({...settings, path: e.target.value})}
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm focus:border-indigo-500 focus:outline-none transition-all"
                    placeholder="yedek.json"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={handleSave}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-cloud-arrow-up"></i>
                Ayarları Kaydet ve Başlat
              </button>
            </div>
          </section>

          <section className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/30">
            <h3 className="font-bold text-slate-300 mb-6 flex items-center gap-2">
              <i className="fa-solid fa-circle-info text-indigo-400"></i>
              Senkronizasyon Durumu
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                 <p className="text-xs text-slate-500 mb-1">Son Senkronizasyon</p>
                 <p className="text-sm font-mono text-indigo-400">
                   {settings.lastSync ? new Date(settings.lastSync).toLocaleString() : 'Hiç yapılmadı'}
                 </p>
              </div>
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                 <p className="text-xs text-slate-500 mb-1">Yedekleme Sıklığı</p>
                 <p className="text-sm font-bold text-slate-300">Her 2 Dakikada Bir</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;