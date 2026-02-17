
import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Sidebar';
import Dashboard from './views/Dashboard';
import ChatView from './views/ChatView';
import VisualsView from './views/VisualsView';
import AudioView from './views/AudioView';
import LiveView from './views/LiveView';
import SettingsView from './views/SettingsView';
import { AppView, SyncSettings } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // GitHub Senkronizasyon Fonksiyonu
  const performGitHubSync = useCallback(async () => {
    const settingsStr = localStorage.getItem('sync_settings');
    if (!settingsStr) return;

    const settings: SyncSettings = JSON.parse(settingsStr);
    if (!settings.enabled || !settings.token || !settings.repo) return;

    setSyncStatus('syncing');
    try {
      const dataToSync = {
        chat: JSON.parse(localStorage.getItem('chat_history') || '[]'),
        visuals: JSON.parse(localStorage.getItem('visual_assets') || '[]'),
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        lastAction: activeView
      };

      const content = btoa(unescape(encodeURIComponent(JSON.stringify(dataToSync, null, 2))));
      const apiUrl = `https://api.github.com/repos/${settings.repo}/contents/${settings.path || 'backup.json'}`;
      
      const getFile = await fetch(apiUrl, {
        headers: { 'Authorization': `token ${settings.token}` }
      });
      
      let sha = '';
      if (getFile.ok) {
        const fileData = await getFile.json();
        sha = fileData.sha;
      }

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${settings.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Auto-sync: ${new Date().toLocaleString()}`,
          content: content,
          sha: sha || undefined
        })
      });

      if (!response.ok) throw new Error('GitHub API Hatası');
      
      setSyncStatus('success');
      settings.lastSync = Date.now();
      localStorage.setItem('sync_settings', JSON.stringify(settings));
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [activeView]);

  useEffect(() => {
    const interval = setInterval(() => {
      performGitHubSync();
    }, 120000);
    return () => clearInterval(interval);
  }, [performGitHubSync]);

  const renderView = () => {
    switch (activeView) {
      case AppView.DASHBOARD: return <Dashboard onViewChange={setActiveView} />;
      case AppView.CHAT: return <ChatView />;
      case AppView.VISUALS: return <VisualsView />;
      case AppView.AUDIO: return <AudioView />;
      case AppView.LIVE: return <LiveView />;
      case AppView.SETTINGS: return <SettingsView onSyncNow={performGitHubSync} />;
      default: return <Dashboard onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-950 overflow-hidden text-slate-100 font-sans selection:bg-indigo-500/30">
      <Navigation 
        activeView={activeView} 
        onViewChange={setActiveView} 
        syncStatus={syncStatus}
        onManualSync={performGitHubSync}
      />
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
