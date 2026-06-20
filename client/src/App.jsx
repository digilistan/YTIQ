import React, { useState, useEffect } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { Chat } from './components/Chat';
import { Research } from './components/Research';
import { Coaching } from './components/Coaching';
import { Clipper } from './components/Clipper';
import { POVStudio } from './components/POVStudio';
import { Login } from './components/Login';
import { Lockout } from './components/Lockout';
import { AdminPanel } from './components/AdminPanel';
import { FeatureLockedTab } from './components/FeatureLockedTab';
import { ExtensionSetup } from './components/ExtensionSetup';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = e => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function Shell() {
  const { settings, loading } = useSettings();
  const { isAuthenticated, isBlocked, isAdmin, user, loading: authLoading } = useAuth();
  const { toasts, toast, dismiss } = useToast();
  const isLg = useMediaQuery('(min-width: 1024px)');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [activeIdeaForScript, setActiveIdeaForScript] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLg) setSidebarCollapsed(true);
    else setSidebarCollapsed(false);
  }, [isLg]);

  // Secret keyboard listener: Ctrl+Shift + typing D-I-G-I
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    let lastKeys = [];
    let timeout;

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'control' || key === 'shift') return;

        lastKeys.push(key);
        if (lastKeys.length > 4) {
          lastKeys.shift();
        }

        const sequence = lastKeys.join('');
        if (sequence === 'digi') {
          setAdminPanelOpen(v => !v);
          toast('Administration Control Center unlocked!', 'success');
          lastKeys = [];
        }

        clearTimeout(timeout);
        timeout = setTimeout(() => {
          lastKeys = [];
        }, 2500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [isAuthenticated, isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-sm"
        style={{ background: 'var(--bg-base)', color: 'var(--text-2)' }}>
        <span className="spinner" />Loading Creator Suite…
      </div>
    );
  }

  if (isBlocked) {
    return (
      <>
        <Lockout />
        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </>
    );
  }

  if (!settings.has_ai_key && !settings.ai_api_key) {
    if (isAdmin) {
      return (
        <>
          <SetupWizard toast={toast} />
          <ToastContainer toasts={toasts} dismiss={dismiss} />
        </>
      );
    } else {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" 
          style={{ background: 'var(--bg-base)', fontFamily: 'Inter, sans-serif' }}>
          <div className="backdrop-blur-xl border rounded-3xl p-8 space-y-6 shadow-2xl text-center max-w-sm"
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderColor: 'rgba(51, 65, 85, 0.5)'
            }}>
            <h2 className="text-xl font-bold text-slate-100">CSD Creator Suite</h2>
            <p className="text-sm text-slate-400">The system is initializing. Please contact your administrator to activate the service.</p>
            <p className="text-xs text-indigo-400 font-medium">Support: Muzammil Ali (+923204808223)</p>
          </div>
        </div>
      );
    }
  }

  let restricted = [];
  try {
    restricted = user?.restricted_features ? (typeof user.restricted_features === 'string' ? JSON.parse(user.restricted_features) : user.restricted_features) : [];
  } catch (_) {}
  if (!Array.isArray(restricted)) {
    restricted = [];
  }
  const isLocked = restricted.includes(activeTab);

  const renderTab = () => {
    if (isLocked) {
      return <FeatureLockedTab featureName={activeTab} />;
    }

    switch (activeTab) {
      case 'dashboard':   return <Dashboard setActiveTab={setActiveTab} toast={toast} />;
      case 'chat':        return <Chat toast={toast} />;
      case 'research':    return <Research toast={toast} />;
      case 'niche':       return <NicheExplorer toast={toast} />;
      case 'ideas':       return <VideoIdeas setActiveTab={setActiveTab} setActiveIdeaForScript={setActiveIdeaForScript} toast={toast} />;
      case 'scripts':     return <ScriptWriter activeIdeaForScript={activeIdeaForScript} toast={toast} />;
      case 'seo':         return <SEOOptimizer toast={toast} />;
      case 'thumbnails':  return <ThumbnailGenerator toast={toast} />;
      case 'clipping':    return <Clipper toast={toast} />;
      case 'pov':         return <POVStudio toast={toast} />;
      case 'calendar':    return <ContentCalendar toast={toast} />;
      case 'competitors': return <CompetitorTracker toast={toast} />;
      case 'coaching':    return <Coaching toast={toast} />;
      case 'extension':   return <ExtensionSetup toast={toast} />;
      default:            return <Dashboard setActiveTab={setActiveTab} toast={toast} />;
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSettingsOpen={() => setSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(v => !v)}
      />
      <main className="flex-1 overflow-y-auto p-6 min-w-0">
        <div className="max-w-6xl mx-auto">
          {renderTab()}
        </div>
      </main>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} toast={toast} />}
      {adminPanelOpen && <AdminPanel onClose={() => setAdminPanelOpen(false)} toast={toast} />}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Shell />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
