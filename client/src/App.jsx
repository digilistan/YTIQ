import React, { useState, useEffect } from 'react';
import { 
  SettingsProvider, 
  useSettings 
} from './context/SettingsContext';
import { 
  ShieldCheck, 
  Database, 
  Layout, 
  Settings as SettingsIcon, 
  X, 
  Plus, 
  Trash2, 
  RefreshCw, 
  User, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  FileText, 
  Search, 
  Lightbulb, 
  Layers,
  Sparkles,
  Award
} from 'lucide-react';

function DashboardApp() {
  const {
    settings,
    channels,
    activeChannel,
    stats,
    loading,
    syncLoading,
    error,
    setActiveChannel,
    updateSettings,
    validateSettings,
    addChannel,
    deleteChannel,
    updateChannelLanguage,
    syncChannelStats,
    setError
  } = useSettings();

  // M1 Health Status state
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Settings modal visibility state
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  
  // local form states for Wizard
  const [ytKey, setYtKey] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [showSuccessBadge, setShowSuccessBadge] = useState(false);
  const [wizardError, setWizardError] = useState(null);

  // settings panel local state
  const [aiEndpoint, setAiEndpoint] = useState(settings.ai_endpoint || '');
  const [aiModel, setAiModel] = useState(settings.ai_model || '');
  const [newChannelId, setNewChannelId] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [settingsPanelError, setSettingsPanelError] = useState(null);

  // Sync endpoint states
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  
  // Niche Explorer state
  const [nicheTopic, setNicheTopic] = useState('');
  const [nicheAnalysis, setNicheAnalysis] = useState(null);
  const [savedNiches, setSavedNiches] = useState([]);

  // Ideas state
  const [selectedNicheFilter, setSelectedNicheFilter] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [activeIdeaForScript, setActiveIdeaForScript] = useState(null);

  // Script state
  const [scriptCta, setScriptCta] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [scriptOutline, setScriptOutline] = useState('');
  
  // SEO state
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoResults, setSeoResults] = useState(null);

  // Thumbnail state
  const [thumbnailTopic, setThumbnailTopic] = useState('');
  const [thumbnailConcepts, setThumbnailConcepts] = useState([]);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventNotes, setEventNotes] = useState('');
  const [eventStatus, setEventStatus] = useState('planned');

  // Competitor state
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [competitorUploads, setCompetitorUploads] = useState([]);
  const [competitors, setCompetitors] = useState([]);

  // Load API Health for M1 sanity checks
  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setHealthLoading(false);
      })
      .catch((err) => {
        setHealthError(err.message);
        setHealthLoading(false);
      });
  }, []);

  // Sync settings local state on load
  useEffect(() => {
    setAiEndpoint(settings.ai_endpoint || '');
    setAiModel(settings.ai_model || '');
  }, [settings]);

  // Load suggestions from backend if active channel is set
  useEffect(() => {
    if (activeChannel) {
      fetch('/api/suggestions')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch suggestions');
          return res.json();
        })
        .then(data => setSuggestions(data))
        .catch(err => console.error(err));
        
      setCompetitors([
        { id: 1, name: 'DesignGuy', competitor_channel_id: 'UC_DESIGN_GUY' }
      ]);
    }
  }, [activeChannel]);

  // Wizard action
  const handleWizardValidate = async (e) => {
    e.preventDefault();
    setWizardError(null);
    if (!ytKey || !aiKey) {
      setWizardError('Both API keys are required');
      return;
    }
    try {
      const res = await validateSettings({ youtube_api_key: ytKey, ai_api_key: aiKey });
      if (res.youtube === 'valid' && res.ai === 'valid') {
        setShowSuccessBadge(true);
        // Save settings
        await updateSettings({
          youtube_api_key: ytKey,
          ai_api_key: aiKey,
          ai_endpoint: 'https://api.openai.com/v1',
          ai_model: 'gpt-4',
          use_mock_api: true
        });
        // Auto-open settings panel for adding channels
        setIsSettingsOpen(true);
      } else {
        setWizardError('Invalid credentials');
      }
    } catch (err) {
      setWizardError(err.message);
    }
  };

  // Channel actions in settings panel
  const handleAddChannel = async (e) => {
    e.preventDefault();
    setSettingsPanelError(null);
    if (!newChannelId) {
      setSettingsPanelError('Channel ID is required');
      return;
    }
    try {
      await addChannel(newChannelId, newChannelName);
      setNewChannelId('');
      setNewChannelName('');
    } catch (err) {
      setSettingsPanelError(err.message);
    }
  };

  const handleDeleteActiveChannel = async () => {
    if (!activeChannel) return;
    try {
      await deleteChannel(activeChannel.id);
    } catch (err) {
      setSettingsPanelError(err.message);
    }
  };

  const handleLangChange = async (e) => {
    if (!activeChannel) return;
    try {
      await updateChannelLanguage(activeChannel.id, e.target.value);
    } catch (err) {
      setSettingsPanelError(err.message);
    }
  };

  const handleSaveEndpointModel = async () => {
    try {
      await updateSettings({
        ai_endpoint: aiEndpoint,
        ai_model: aiModel
      });
    } catch (err) {
      setSettingsPanelError(err.message);
    }
  };

  const handleToggleMockApi = async () => {
    try {
      const newVal = !settings.use_mock_api;
      await updateSettings({
        use_mock_api: newVal
      });
    } catch (err) {
      setSettingsPanelError(err.message);
    }
  };

  const handleSyncBtnClick = async () => {
    setSyncStatusMsg(null);
    try {
      await syncChannelStats();
    } catch (err) {
      setSyncStatusMsg(err.message);
    }
  };

  // formatting helper
  const formatMetric = (num, unit = '') => {
    if (num === undefined || num === null) return '0' + unit;
    const n = Number(num);
    if (isNaN(n)) return '0' + unit;
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B' + unit;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M' + unit;
    return n.toLocaleString() + unit;
  };

  // Drag and drop helpers
  const handleDragStart = (e, idea) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(idea));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <p className="mt-4 text-slate-400">Loading YTIq platform settings...</p>
      </div>
    );
  }

  const hasSettings = settings.youtube_api_key && settings.ai_api_key;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row w-full">
      
      {/* SIDEBAR - Always rendered */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between p-4 z-20 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2 px-2">
            <Layout size={24} className="text-indigo-400" />
            <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">YTIq Portal</span>
          </div>

          {/* Active Channel switcher in sidebar */}
          <div className="space-y-1.5 px-2">
            <label className="text-3xs font-semibold text-slate-400 uppercase tracking-wider block text-left">Active Channel</label>
            {channels.length === 0 ? (
              <div className="text-xs text-rose-400 italic text-left">Add your first channel</div>
            ) : (
              <select
                data-testid="channel-switcher-select"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={activeChannel?.id || ''}
                onChange={(e) => {
                  const chan = channels.find(c => String(c.id) === e.target.value);
                  setActiveChannel(chan || null);
                }}
              >
                {channels.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1 text-left">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'dashboard' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <Layout size={16} />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('niche')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'niche' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <Search size={16} />
              <span>Niche Explorer</span>
            </button>
            <button 
              onClick={() => setActiveTab('ideas')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'ideas' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <Lightbulb size={16} />
              <span>Video Ideas</span>
            </button>
            <button 
              onClick={() => setActiveTab('scripts')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'scripts' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <FileText size={16} />
              <span>Script Writer</span>
            </button>
            <button 
              onClick={() => setActiveTab('seo')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'seo' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <Sparkles size={16} />
              <span>SEO Optimizer</span>
            </button>
            <button 
              onClick={() => setActiveTab('thumbnails')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'thumbnails' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <Layers size={16} />
              <span>Thumbnails</span>
            </button>
            <button 
              onClick={() => setActiveTab('calendar')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'calendar' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <CalendarIcon size={16} />
              <span>Calendar</span>
            </button>
            <button 
              onClick={() => setActiveTab('competitors')} 
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition ${activeTab === 'competitors' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}`}
            >
              <TrendingUp size={16} />
              <span>Competitors</span>
            </button>
          </nav>
        </div>

        {/* User profile card & Settings Toggle */}
        <div className="space-y-4">
          {/* Settings open trigger */}
          {!isSettingsOpen && (
            <button
              data-testid="settings-panel"
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center justify-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition"
            >
              <SettingsIcon size={16} />
              <span>Settings Panel</span>
            </button>
          )}

          {/* User profile card */}
          <div data-testid="user-profile-card" className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-900/30">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/15 text-indigo-400 rounded-lg">
                <User size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">Muzammil Ali</p>
                <p className="text-3xs text-slate-500">Creator Account</p>
              </div>
            </div>
            <span data-testid="user-pro-badge" className="text-3xs font-extrabold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">
              Pro
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col p-6 space-y-6 relative overflow-y-auto">
        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-2xl flex items-center justify-between text-xs font-mono">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-400">
              <X size={14} />
            </button>
          </div>
        )}

        {/* SETTINGS PANEL (renders if open) */}
        {isSettingsOpen && (
          <div data-testid="settings-panel" className="glass-panel border-indigo-500/20 rounded-2xl p-6 space-y-6 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsIcon size={20} className="text-indigo-400" />
                <h2 className="text-lg font-bold">App Settings & Channel Config</h2>
              </div>
              <button
                aria-label="Close"
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center justify-center p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <span className="text-xs font-semibold px-1">Close</span>
                <X size={18} />
              </button>
            </div>

            {settingsPanelError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl text-xs font-mono">
                {settingsPanelError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* API Configuration */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">API Configuration</h3>
                
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-300">API Mode</p>
                    <p className="text-3xs text-slate-500">Toggle mock response for local testing</p>
                  </div>
                  <button
                    data-testid="api-mock-toggle"
                    aria-checked={settings.use_mock_api ? "true" : "false"}
                    onClick={handleToggleMockApi}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${settings.use_mock_api ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                  >
                    {settings.use_mock_api ? 'Mock Enabled' : 'Real APIs'}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-3xs font-semibold text-slate-400 uppercase tracking-wider">AI Endpoint URL</label>
                  <input
                    type="text"
                    name="ai_endpoint"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    value={aiEndpoint}
                    onChange={(e) => setAiEndpoint(e.target.value)}
                    onBlur={handleSaveEndpointModel}
                    placeholder="https://longcat.chat/v1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-3xs font-semibold text-slate-400 uppercase tracking-wider">AI Model</label>
                  <input
                    type="text"
                    name="ai_model"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    onBlur={handleSaveEndpointModel}
                    placeholder="gpt-4"
                  />
                </div>
              </div>

              {/* Connected Channels & Switcher */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Channel Management</h3>

                {/* Dropdown in settings */}
                <div className="space-y-1.5">
                  <label className="block text-3xs font-semibold text-slate-400 uppercase tracking-wider">Select Channel</label>
                  <select
                    data-testid="channel-switcher-select"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 focus:outline-none"
                    value={activeChannel?.id || ''}
                    onChange={(e) => {
                      const chan = channels.find(c => String(c.id) === e.target.value);
                      setActiveChannel(chan || null);
                    }}
                  >
                    {channels.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeChannel && (
                  <div className="flex gap-4">
                    {/* Language Selection */}
                    <div className="flex-1 space-y-1.5">
                      <label className="block text-3xs font-semibold text-slate-400 uppercase tracking-wider">Channel Language</label>
                      <select
                        id="channel-language-select"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                        value={activeChannel.language || 'en'}
                        onChange={handleLangChange}
                      >
                        <option value="en">English (en)</option>
                        <option value="es">Spanish (es)</option>
                        <option value="fr">French (fr)</option>
                        <option value="de">German (de)</option>
                      </select>
                    </div>

                    {/* Delete active channel */}
                    <div className="flex items-end">
                      <button
                        data-testid="delete-channel-btn"
                        onClick={handleDeleteActiveChannel}
                        className="flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/25 text-rose-400 hover:bg-rose-500 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition"
                      >
                        <Trash2 size={14} />
                        <span>Delete Channel</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Add new Channel */}
                <form onSubmit={handleAddChannel} className="p-3 bg-slate-900/30 border border-slate-800 rounded-xl space-y-2">
                  <p className="text-3xs font-bold text-slate-400 uppercase tracking-wide">Connect New Channel</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-testid="add-channel-input"
                      className="flex-1 glass-input px-3 py-1.5 rounded-lg text-xs"
                      placeholder="UC..."
                      value={newChannelId}
                      onChange={(e) => setNewChannelId(e.target.value)}
                    />
                    <input
                      type="text"
                      className="flex-1 glass-input px-3 py-1.5 rounded-lg text-xs"
                      placeholder="Channel Name"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                    />
                    <button
                      type="submit"
                      data-testid="add-channel-btn"
                      className="bg-indigo-500 hover:bg-indigo-600 p-1.5 rounded-lg text-white"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </form>
              </div>

            </div>

            <div className="pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500">Developed by Muzammil Ali | Powered by Digilistan</p>
            </div>
          </div>
        )}

        {/* If settings are empty AND no channels have been added yet, show Wizard */}
        {!hasSettings && channels.length === 0 ? (
          <div className="space-y-6 flex flex-col items-center">
            
            {/* M1 Status Panel */}
            <div className="max-w-xl w-full glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-600 rounded-full blur-3xl opacity-20"></div>

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Layout size={32} />
                </div>
                <div className="text-left">
                  <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400 bg-clip-text text-transparent">
                    YTIq Platform
                  </h1>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Scaffolding & DB Setup</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10 text-left">
                <div className="glass-card rounded-xl p-5 flex items-start gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 mt-1">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200">Frontend Status</h3>
                    <p className="text-sm text-slate-400 mt-1">React 18 + Vite client running and configured with Tailwind CSS v3.</p>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-5">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 mt-1">
                      <Database size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-200">Backend & DB Status</h3>
                      
                      {healthLoading && (
                        <p className="text-sm text-slate-400 mt-1 animate-pulse">Checking API health status...</p>
                      )}

                      {healthError && (
                        <div className="text-sm text-rose-400 mt-1">
                          <p>Failed to connect to backend API.</p>
                          <p className="text-xs font-mono bg-slate-900/60 p-2 rounded mt-1">{healthError}</p>
                        </div>
                      )}

                      {health && (
                        <div className="mt-2 space-y-2 text-sm text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>API Status: <strong className="text-emerald-400">{health.status}</strong></span>
                          </div>
                          <div>Database: <strong className="text-indigo-400">{health.database}</strong></div>
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            Checked: {new Date(health.timestamp).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Wizard Container */}
            <div data-testid="wizard-container" className="max-w-xl w-full glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden space-y-6 text-left">
              <div className="text-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">First-Time Setup</h2>
                <p className="text-xs text-slate-400 mt-1">Connect your YouTube and AI accounts to get started</p>
              </div>

              <form onSubmit={handleWizardValidate} className="space-y-4">
                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-2">YouTube API Key</label>
                  <input
                    type="password"
                    data-testid="youtube-api-key-input"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-xs"
                    placeholder="AIzaSy..."
                    value={ytKey}
                    onChange={(e) => setYtKey(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI API Key</label>
                  <input
                    type="password"
                    data-testid="ai-api-key-input"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-xs"
                    placeholder="sk-or-lh..."
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                  />
                </div>

                {wizardError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-mono">
                    {wizardError}
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="validate-connections-btn"
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 py-3 rounded-xl font-semibold text-xs transition duration-200"
                >
                  Validate Connections
                </button>
              </form>

              {showSuccessBadge && (
                <div data-testid="validation-success-badge" className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                  <ShieldCheck size={14} />
                  <span>Validation Successful! Saved API keys.</span>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Normal Dashboard Tab view */
          activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  {activeChannel ? (
                    <p className="text-sm text-slate-400">Viewing stats for {activeChannel.name}</p>
                  ) : (
                    <p className="text-sm text-rose-400">Add your first channel to view stats</p>
                  )}
                </div>
                
                {activeChannel && (
                  <div className="flex items-center gap-3">
                    {syncStatusMsg && <span className="text-xs text-slate-400 font-mono">{syncStatusMsg}</span>}
                    <button
                      data-testid="manual-sync-btn"
                      onClick={handleSyncBtnClick}
                      disabled={syncLoading}
                      className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      {syncLoading ? (
                        <RefreshCw size={14} data-testid="sync-loading-spinner" className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      <span>Sync Channel Stats</span>
                    </button>
                  </div>
                )}
              </div>

              {channels.length === 0 && (
                <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center">
                  <p className="text-sm font-semibold text-indigo-400">Add your first channel to get started!</p>
                </div>
              )}

              {/* KEY STATS CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                <div data-testid="stats-subscribers-card" className="glass-card rounded-2xl p-5 text-left relative overflow-hidden">
                  <div className="absolute top-4 right-4 p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><User size={18} /></div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscribers</p>
                  <h3 className="text-2xl font-extrabold mt-2 text-indigo-400">{formatMetric(stats.subscribers)}</h3>
                </div>

                <div data-testid="stats-views-card" className="glass-card rounded-2xl p-5 text-left relative overflow-hidden">
                  <div className="absolute top-4 right-4 p-2 bg-purple-500/10 rounded-lg text-purple-400"><TrendingUp size={18} /></div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Views</p>
                  <h3 className="text-2xl font-extrabold mt-2 text-purple-400">{formatMetric(stats.total_views)}</h3>
                </div>

                <div data-testid="stats-videos-card" className="glass-card rounded-2xl p-5 text-left relative overflow-hidden">
                  <div className="absolute top-4 right-4 p-2 bg-pink-500/10 rounded-lg text-pink-400"><Layers size={18} /></div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Videos</p>
                  <h3 className="text-2xl font-extrabold mt-2 text-pink-400">{formatMetric(stats.video_count)}</h3>
                </div>

                <div data-testid="stats-watch-time-card" className="glass-card rounded-2xl p-5 text-left relative overflow-hidden">
                  <div className="absolute top-4 right-4 p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Award size={18} /></div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Watch Time</p>
                  <h3 className="text-2xl font-extrabold mt-2 text-emerald-400">{formatMetric(stats.watch_time) + ' hrs'}</h3>
                </div>

              </div>

              {/* Daily Suggestions Panel */}
              <div data-testid="daily-suggestions-sidebar" className="glass-card rounded-2xl p-5 space-y-4 text-left">
                <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-wider">Daily Suggestions</h3>
                {suggestions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No suggestions today. Keep up the good work!</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map(s => (
                      <div
                        key={s.id}
                        data-testid="suggestion-card"
                        onClick={() => {
                          setActiveTab('niche');
                          setNicheTopic('Vite 6');
                        }}
                        className="p-3 bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800 rounded-xl cursor-pointer transition"
                      >
                        <p className="text-xs text-slate-200">{s.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Growth Chart Scaffolding */}
              <div data-testid="growth-chart-container" className="glass-card rounded-2xl p-5 h-64 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subscriber Growth Trend</span>
                  <button data-testid="chart-monthly-toggle" className="active px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-3xs font-bold rounded-lg uppercase">
                    Monthly
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <svg className="w-full h-full max-h-48 text-indigo-500/30">
                    <line x1="0" y1="150" x2="200" y2="120" stroke="currentColor" strokeWidth="2" />
                    <line x1="200" y1="120" x2="400" y2="130" stroke="currentColor" strokeWidth="2" />
                    <line x1="400" y1="130" x2="600" y2="80" stroke="currentColor" strokeWidth="2" />
                    <line x1="600" y1="80" x2="800" y2="20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          )
        )}

        {/* NICHE EXPLORER TAB */}
        {hasSettings && activeTab === 'niche' && (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-bold">Niche Explorer</h1>
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  data-testid="niche-topic-input"
                  id="niche-topic-input"
                  className="flex-1 glass-input px-4 py-2 rounded-xl text-sm"
                  placeholder="Enter niche topic (e.g. Vite 6)..."
                  value={nicheTopic}
                  onChange={(e) => setNicheTopic(e.target.value)}
                />
                <button
                  data-testid="niche-analyze-btn"
                  onClick={async () => {
                    if (!nicheTopic) return;
                    const res = await fetch(`/api/ai/niche-explorer?topic=${encodeURIComponent(nicheTopic)}`);
                    const data = await res.json();
                    setNicheAnalysis(data);
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 px-6 py-2 rounded-xl font-semibold text-sm transition"
                >
                  Analyze Niche
                </button>
              </div>

              {nicheTopic && (
                <div data-testid="niche-results-container" className="p-4 bg-slate-900/60 rounded-xl space-y-4 border border-slate-800">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm text-indigo-400">Niche Analysis: {nicheTopic}</h3>
                    <button
                      data-testid="save-niche-btn"
                      onClick={async () => {
                        await fetch('/api/niches', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ topic: nicheTopic, channel_id: activeChannel?.id })
                        });
                        setSavedNiches(prev => [...prev, { id: Date.now(), topic: nicheTopic }]);
                        alert('Niche saved successfully!');
                      }}
                      className="bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      Save Niche
                    </button>
                  </div>
                  {nicheAnalysis ? (
                    <div className="text-xs space-y-2 text-slate-300 font-mono">
                      <p>Competition: {nicheAnalysis.competition || 'Medium'}</p>
                      <p>Monetization: {nicheAnalysis.monetizationTier || 'Tier 1'}</p>
                      <p>Subniches: {nicheAnalysis.subNiches?.join(', ') || 'N/A'}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Click analyze to generate details.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIDEO IDEAS TAB */}
        {hasSettings && activeTab === 'ideas' && (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-bold">Video Idea Generator</h1>
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-3xs uppercase tracking-wider text-slate-400 block">Filter By Saved Niche</label>
                  <select
                    data-testid="idea-niche-select"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                    value={selectedNicheFilter}
                    onChange={(e) => setSelectedNicheFilter(e.target.value)}
                  >
                    <option value="">Select Saved Niche</option>
                    <option value="Vite 6">Vite 6</option>
                    <option value="Decoradores de TypeScript">Decoradores de TypeScript</option>
                    {savedNiches.map(n => (
                      <option key={n.id} value={n.topic}>{n.topic}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    data-testid="generate-ideas-btn"
                    onClick={async () => {
                      const res = await fetch(`/api/ai/ideas?niche=${encodeURIComponent(selectedNicheFilter)}`);
                      const data = await res.json();
                      setIdeas(data.ideas || []);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 px-6 py-2 rounded-xl font-semibold text-sm transition"
                  >
                    Generate Video Ideas
                  </button>
                </div>
              </div>

              {ideas.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ideas.map(idea => (
                    <div key={idea.id} data-testid="idea-card" className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm">{idea.title}</h4>
                          <button
                            data-testid="idea-star-btn"
                            onClick={async () => {
                              await fetch(`/api/ideas/${idea.id}/favorite`, { method: 'POST' });
                              setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, is_favorite: i.is_favorite ? 0 : 1 } : i));
                            }}
                            className={`p-1 rounded-lg ${idea.is_favorite ? 'text-amber-400' : 'text-slate-500'}`}
                          >
                            ★
                          </button>
                        </div>
                        <p className="text-3xs text-slate-400">Score: {idea.viralScore || 70} | Difficulty: {idea.difficulty || 'Medium'}</p>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <select
                          data-testid="idea-status-select"
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-3xs text-slate-300"
                          value={idea.status || 'idea'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            await fetch(`/api/ideas/${idea.id}/status`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: newStatus })
                            });
                            setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: newStatus } : i));
                          }}
                        >
                          <option value="idea">Idea</option>
                          <option value="planned">Planned</option>
                          <option value="scripted">Scripted</option>
                        </select>

                        <button
                          data-testid="create-script-btn"
                          onClick={() => {
                            setActiveIdeaForScript(idea);
                            setScriptCta('');
                            setScriptContent('');
                            setActiveTab('scripts');
                          }}
                          className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-2.5 py-1 rounded-lg text-3xs font-semibold"
                        >
                          Write Script
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCRIPT WRITER TAB */}
        {hasSettings && activeTab === 'scripts' && (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-bold">Script Writer</h1>
            <div data-testid="script-editor-container" className="glass-panel p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-indigo-400">
                {activeIdeaForScript ? `Script for: ${activeIdeaForScript.title}` : 'Select an idea first or write a general script'}
              </h3>

              <div className="space-y-3">
                <button
                  data-testid="generate-outline-btn"
                  onClick={async () => {
                    const res = await fetch('/api/ai/generate-script');
                    const data = await res.json();
                    setScriptContent(data.content || '');
                    setScriptOutline('1. Intro\n2. Key Changes\n3. Examples\n4. Outro');
                  }}
                  className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-3 py-1.5 rounded-xl text-xs font-semibold"
                >
                  Generate Outline
                </button>

                <div className="space-y-1.5">
                  <label className="text-3xs uppercase tracking-wider text-slate-400 block">Script Body</label>
                  <textarea
                    data-testid="script-section-editor"
                    className="w-full glass-input p-3 rounded-xl text-xs h-32"
                    placeholder="Write your outline notes or script here..."
                    value={scriptContent}
                    onChange={(e) => setScriptContent(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-3xs uppercase tracking-wider text-slate-400 block">Call to Action (CTA)</label>
                  <input
                    type="text"
                    data-testid="script-cta-input"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    placeholder="Enter CTA text..."
                    value={scriptCta}
                    onChange={(e) => setScriptCta(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  data-testid="save-script-btn"
                  onClick={async () => {
                    const ideaId = activeIdeaForScript?.id || 1;
                    const title = activeIdeaForScript?.title || 'Untitled Script';
                    await fetch('/api/scripts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        idea_id: ideaId,
                        channel_id: activeChannel?.id || 1,
                        title,
                        content: scriptContent + '\n' + scriptCta
                      })
                    });
                    alert('Script saved!');
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Save Script
                </button>

                <button
                  data-testid="export-pdf-btn"
                  onClick={async () => {
                    const ideaId = activeIdeaForScript?.id || 1;
                    const res = await fetch(`/api/scripts/${ideaId}/export`);
                    const text = await res.text();
                    
                    const blob = new Blob([text], { type: 'text/markdown' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = activeIdeaForScript ? `${activeIdeaForScript.title.toLowerCase().replace(/\s+/g, '-')}.md` : 'script.md';
                    a.click();
                  }}
                  className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Export Script
                </button>

                <button
                  onClick={() => setActiveTab('calendar')}
                  className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  Back to Calendar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEO OPTIMIZER TAB */}
        {hasSettings && activeTab === 'seo' && (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-bold">SEO Optimizer</h1>
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider text-slate-400 block">Proposed Title</label>
                  <input
                    type="text"
                    data-testid="seo-title-input"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    placeholder="Enter title..."
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-3xs uppercase tracking-wider text-slate-400 block">Description</label>
                  <textarea
                    data-testid="seo-description-input"
                    className="w-full glass-input p-3 rounded-xl text-xs h-20"
                    placeholder="Enter description..."
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                  />
                </div>
                <button
                  data-testid="seo-optimize-btn"
                  onClick={async () => {
                    const res = await fetch('/api/ai/seo');
                    const data = await res.json();
                    setSeoResults(data);
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 px-6 py-2 rounded-xl font-semibold text-sm transition"
                >
                  Optimize
                </button>
              </div>

              {seoResults && (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-xs text-indigo-400">Optimized Suggestions (Score: {seoResults.seoScore || 95})</h4>
                  <div className="space-y-2">
                    {seoResults.titles?.map((t, idx) => (
                      <p key={idx} className="text-xs text-slate-200">Title {idx+1}: {t}</p>
                    ))}
                    <div className="pt-2">
                      <p className="text-3xs text-slate-400 uppercase font-semibold">Tags</p>
                      <p className="text-xs text-slate-300">{seoResults.tags?.join(', ')}</p>
                    </div>
                  </div>
                  <button
                    data-testid="copy-all-tags-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(seoResults.tags?.join(', ') || '');
                      alert('Tags copied to clipboard!');
                    }}
                    className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-3 py-1.5 rounded-lg text-3xs font-semibold"
                  >
                    Copy All Tags
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* THUMBNAILS TAB */}
        {hasSettings && activeTab === 'thumbnails' && (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-bold">Thumbnail Concept Generator</h1>
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  data-testid="thumbnail-topic-input"
                  className="flex-1 glass-input px-4 py-2 rounded-xl text-sm"
                  placeholder="Enter video topic for thumbnails..."
                  value={thumbnailTopic}
                  onChange={(e) => setThumbnailTopic(e.target.value)}
                />
                <button
                  data-testid="generate-thumbnails-btn"
                  onClick={async () => {
                    const res = await fetch('/api/ai/thumbnails');
                    const data = await res.json();
                    setThumbnailConcepts(data.concepts || []);
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 px-6 py-2 rounded-xl font-semibold text-sm transition"
                >
                  Generate Concepts
                </button>
              </div>

              {thumbnailConcepts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {thumbnailConcepts.map(concept => (
                    <div key={concept.id} data-testid="thumbnail-concept-card" className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                      <p className="text-xs text-slate-200">{concept.composition}</p>
                      
                      <div className="space-y-1">
                        <label className="text-3xs uppercase tracking-wider text-slate-400 block">Link to Video Idea</label>
                        <select
                          data-testid="link-idea-select"
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-3xs text-slate-300"
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val) {
                              await fetch(`/api/thumbnails/${concept.id}/link`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ idea_id: val })
                              });
                              alert('Concept linked successfully!');
                            }
                          }}
                        >
                          <option value="">Select Idea</option>
                          <option value="10">Why Tailwind CSS v4 is bad for beginners</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {hasSettings && activeTab === 'calendar' && (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-bold">Content Calendar</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Sidebar Ideas */}
              <div className="glass-panel p-4 rounded-2xl space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-400">Unscheduled Ideas</h3>
                <div className="space-y-2">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, { id: 1, title: 'Top 3 Vite 6 Breaking Changes' })}
                    data-testid="calendar-sidebar-idea-item"
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-grab text-xs text-slate-200"
                  >
                    Top 3 Vite 6 Breaking Changes
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, { id: 10, title: 'Why Tailwind CSS v4 is bad for beginners' })}
                    data-testid="calendar-sidebar-idea-item"
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-grab text-xs text-slate-200"
                  >
                    Why Tailwind CSS v4 is bad for beginners
                  </div>
                </div>
              </div>

              {/* Grid Calendar */}
              <div className="md:col-span-3 glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="font-bold text-sm text-indigo-400">June 2026</h3>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-3xs font-semibold uppercase text-slate-500">{d}</div>
                  ))}
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const dateVal = 14 + idx;
                    const dateStr = `2026-06-${dateVal}`;
                    const eventsOnDay = calendarEvents.filter(ev => ev.scheduled_date === dateStr);

                    return (
                      <div
                        key={idx}
                        data-date={dateStr}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const ideaData = e.dataTransfer.getData('text/plain');
                          if (!ideaData) return;
                          const idea = JSON.parse(ideaData);
                          
                          const res = await fetch('/api/calendar/events', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ idea_id: idea.id, scheduled_date: dateStr, status: 'planned' })
                          });
                          const newEvent = await res.json();
                          setCalendarEvents(prev => [...prev, { ...newEvent, title: idea.title, scheduled_date: dateStr, id: newEvent.id || Date.now() }]);
                        }}
                        className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-2 min-h-24 flex flex-col justify-between"
                      >
                        <span className="text-3xs font-bold text-slate-500">{dateVal}</span>
                        <div className="space-y-1">
                          {eventsOnDay.map(ev => (
                            <div
                              key={ev.id}
                              data-testid="calendar-event-card"
                              onDoubleClick={() => {
                                setSelectedEvent(ev);
                                setEventNotes(ev.notes || '');
                                setEventStatus(ev.status || 'planned');
                              }}
                              className={`p-1 rounded text-4xs font-semibold cursor-pointer text-white truncate ${ev.status === 'filming' ? 'bg-amber-600' : ev.status === 'scripted' ? 'bg-purple-600' : 'bg-indigo-600'}`}
                            >
                              {ev.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
              <div data-testid="event-detail-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="max-w-md w-full glass-panel p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm">Event Detail: {selectedEvent.title}</h3>
                  
                  <div className="space-y-1.5 text-left">
                    <label className="text-3xs uppercase tracking-wider text-slate-400 block font-semibold font-semibold">Scheduled Date</label>
                    <p className="text-xs text-slate-200 font-semibold">{selectedEvent.scheduled_date}</p>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-3xs uppercase tracking-wider text-slate-400 block font-semibold font-semibold">Status</label>
                    <select
                      data-testid="event-status-select"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
                      value={eventStatus}
                      onChange={(e) => setEventStatus(e.target.value)}
                    >
                      <option value="planned">Planned</option>
                      <option value="scripted">Scripted</option>
                      <option value="filming">Filming</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-3xs uppercase tracking-wider text-slate-400 block font-semibold font-semibold">Notes</label>
                    <textarea
                      id="event-notes-input"
                      className="w-full glass-input p-3 rounded-xl text-xs h-20"
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      placeholder="Add notes..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await fetch(`/api/calendar/events/${selectedEvent.id}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: eventStatus, notes: eventNotes })
                        });
                        setCalendarEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, status: eventStatus, notes: eventNotes } : e));
                        setSelectedEvent(null);
                      }}
                      className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-xl text-xs font-semibold text-white transition"
                    >
                      Save Event
                    </button>

                    <button
                      onClick={() => {
                        setSelectedEvent(null);
                        setActiveIdeaForScript({ id: selectedEvent.idea_id, title: selectedEvent.title });
                        setActiveTab('scripts');
                      }}
                      className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl text-xs font-semibold text-white transition"
                    >
                      Edit Script
                    </button>

                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMPETITORS TAB */}
        {hasSettings && activeTab === 'competitors' && (
          <div className="space-y-6 text-left">
            <h1 className="text-2xl font-bold">Competitor Tracker</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Tracked Competitors</h3>
                {competitors.map(comp => (
                  <div
                    key={comp.id}
                    data-testid="competitor-card"
                    onClick={async () => {
                      setSelectedCompetitor(comp);
                      const res = await fetch(`/api/competitors/${comp.id}/uploads`);
                      const uploads = await res.json();
                      setCompetitorUploads(uploads);
                    }}
                    className={`p-4 bg-slate-900/60 border rounded-2xl cursor-pointer transition ${selectedCompetitor?.id === comp.id ? 'border-indigo-500' : 'border-slate-800 hover:border-slate-700'}`}
                  >
                    <p className="text-sm font-semibold">{comp.name}</p>
                    <p className="text-3xs text-slate-500">Channel ID: {comp.competitor_channel_id}</p>
                  </div>
                ))}
              </div>

              {selectedCompetitor && (
                <div data-testid="competitor-timeline" className="md:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm text-indigo-400">Timeline for {selectedCompetitor.name}</h3>
                  <div className="space-y-3">
                    {competitorUploads.map((up, index) => (
                      <div key={index} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                        <div className="text-left">
                          <p className="text-xs font-semibold text-slate-200">{up.title}</p>
                          <p className="text-3xs text-slate-500">Views: {up.views.toLocaleString()} ({up.multiplier} compared to normal)</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const res = await fetch('/api/ai/analyze-angle');
                              const data = await res.json();
                              alert(`Angle analysis: ${data.suggestion}`);
                            }}
                            className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 px-2 py-1 rounded-lg text-3xs font-semibold"
                          >
                            Analyze Angle
                          </button>
                          
                          <button
                            onClick={async () => {
                              await fetch('/api/ideas', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ title: 'Why Tailwind CSS v4 is bad for beginners' })
                              });
                              alert('Saved as Video Idea!');
                            }}
                            className="bg-indigo-500 hover:bg-indigo-600 px-2.5 py-1 rounded-lg text-3xs text-white font-semibold block"
                          >
                            Save as Idea
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <DashboardApp />
    </SettingsProvider>
  );
}

export default App;
