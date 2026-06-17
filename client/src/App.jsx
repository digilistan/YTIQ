import React, { useState } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { NicheExplorer } from './components/NicheExplorer';
import { VideoIdeas } from './components/VideoIdeas';
import { ScriptWriter } from './components/ScriptWriter';
import { SEOOptimizer } from './components/SEOOptimizer';
import { ThumbnailGenerator } from './components/ThumbnailGenerator';
import { ContentCalendar } from './components/ContentCalendar';
import { CompetitorTracker } from './components/CompetitorTracker';
import { SettingsModal } from './components/SettingsModal';
import { SetupWizard } from './components/SetupWizard';

function Shell() {
  const { settings, loading } = useSettings();
  const { toasts, toast, dismiss } = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeIdeaForScript, setActiveIdeaForScript] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center gap-3 text-slate-500 text-sm">
        <span className="spinner" />
        Loading YTIq…
      </div>
    );
  }

  const hasAiKey = !!settings.ai_api_key;

  if (!hasAiKey) {
    return (
      <>
        <SetupWizard toast={toast} />
        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} toast={toast} />;
      case 'niche':
        return <NicheExplorer toast={toast} />;
      case 'ideas':
        return (
          <VideoIdeas
            setActiveTab={setActiveTab}
            setActiveIdeaForScript={setActiveIdeaForScript}
            toast={toast}
          />
        );
      case 'scripts':
        return (
          <ScriptWriter
            activeIdeaForScript={activeIdeaForScript}
            toast={toast}
          />
        );
      case 'seo':
        return <SEOOptimizer toast={toast} />;
      case 'thumbnails':
        return <ThumbnailGenerator toast={toast} />;
      case 'calendar':
        return <ContentCalendar toast={toast} />;
      case 'competitors':
        return <CompetitorTracker toast={toast} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} toast={toast} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      <main className="flex-1 p-6 overflow-y-auto">
        {renderTab()}
      </main>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          toast={toast}
        />
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
