import React, { useState, useEffect } from 'react';
import { X, Settings, Eye, EyeOff, Plus, Trash2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, testId, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        data-testid={testId}
        type={show ? 'text' : 'password'}
        className="glass-input text-sm pr-10"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
        tabIndex={-1}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export function SettingsModal({ onClose, toast }) {
  const { settings, channels, activeChannel, updateSettings, addChannel, deleteChannel, setActiveChannel } = useSettings();

  const [ytKey, setYtKey] = useState(settings.youtube_api_key || '');
  const [aiKey, setAiKey] = useState(settings.ai_api_key || '');
  const [aiEndpoint, setAiEndpoint] = useState(settings.ai_endpoint || 'https://api.longcat.chat/openai/v1/chat/completions');
  const [aiModel, setAiModel] = useState(settings.ai_model || 'LongCat-2.0-Preview');
  const [useMock, setUseMock] = useState(settings.use_mock_api === true || settings.use_mock_api === 'true');
  const [saving, setSaving] = useState(false);

  const [newChId, setNewChId] = useState('');
  const [newChName, setNewChName] = useState('');
  const [addingCh, setAddingCh] = useState(false);

  useEffect(() => {
    setYtKey(settings.youtube_api_key || '');
    setAiKey(settings.ai_api_key || '');
    setAiEndpoint(settings.ai_endpoint || 'https://api.longcat.chat/openai/v1/chat/completions');
    setAiModel(settings.ai_model || 'LongCat-2.0-Preview');
    setUseMock(settings.use_mock_api === true || settings.use_mock_api === 'true');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        youtube_api_key: ytKey,
        ai_api_key: aiKey,
        ai_endpoint: aiEndpoint,
        ai_model: aiModel,
        use_mock_api: useMock ? 'true' : 'false'
      });
      toast('Settings saved!', 'success');
    } catch (err) {
      toast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if (!newChId.trim()) return;
    setAddingCh(true);
    try {
      await addChannel(newChId.trim(), newChName.trim() || newChId.trim());
      setNewChId('');
      setNewChName('');
      toast('Channel added!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAddingCh(false);
    }
  };

  const handleDeleteChannel = async (ch) => {
    try {
      await deleteChannel(ch.id);
      toast(`"${ch.name}" removed.`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Settings size={15} className="text-indigo-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-100">Settings</h2>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* AI Configuration */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">AI Configuration</h3>

            <Field label="AI API Key">
              <PasswordInput
                testId="ai-api-key-input"
                value={aiKey}
                onChange={e => setAiKey(e.target.value)}
                placeholder="Your LongCat API key…"
                autoComplete="off"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="API Endpoint">
                <input
                  name="ai_endpoint"
                  type="text"
                  className="glass-input text-sm"
                  value={aiEndpoint}
                  onChange={e => setAiEndpoint(e.target.value)}
                  placeholder="https://api.longcat.chat/openai/v1/chat/completions"
                />
              </Field>
              <Field label="Model">
                <input
                  name="ai_model"
                  type="text"
                  className="glass-input text-sm"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                  placeholder="LongCat-2.0-Preview"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-950/50 border border-slate-800 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-300">Mock API Mode</p>
                <p className="text-xs text-slate-500 mt-0.5">Use canned responses instead of real API calls (for testing)</p>
              </div>
              <button
                data-testid="api-mock-toggle"
                aria-checked={useMock}
                onClick={() => setUseMock(v => !v)}
                className={`p-1 rounded-lg transition ${useMock ? 'text-indigo-400' : 'text-slate-600'}`}
              >
                {useMock ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </section>

          {/* YouTube Configuration */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">YouTube Configuration</h3>
            <Field label="YouTube Data API Key">
              <PasswordInput
                testId="youtube-api-key-input"
                value={ytKey}
                onChange={e => setYtKey(e.target.value)}
                placeholder="AIzaSy…"
                autoComplete="off"
              />
            </Field>
            <p className="text-xs text-slate-600">
              Get a key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google Cloud Console</a> with YouTube Data API v3 enabled.
            </p>
          </section>

          {/* Channel Management */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Channel Management</h3>

            {/* Channel list */}
            <div className="space-y-2">
              {channels.length === 0 ? (
                <p className="text-sm text-slate-600 italic">No channels connected yet.</p>
              ) : (
                channels.map(ch => (
                  <div key={ch.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${activeChannel?.id === ch.id ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-800 bg-slate-950/40'}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{ch.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ch.youtube_channel_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeChannel?.id !== ch.id && (
                        <button
                          onClick={() => setActiveChannel(ch)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition px-2 py-1"
                        >
                          Activate
                        </button>
                      )}
                      {activeChannel?.id === ch.id && (
                        <span className="text-xs text-indigo-400 px-2 py-1">Active</span>
                      )}
                      <button
                        data-testid="delete-channel-btn"
                        onClick={() => handleDeleteChannel(ch)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add channel form */}
            <form onSubmit={handleAddChannel} className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Connect New Channel</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  data-testid="add-channel-input"
                  type="text"
                  className="glass-input text-sm"
                  placeholder="Channel ID (UCxxx…)"
                  value={newChId}
                  onChange={e => setNewChId(e.target.value)}
                />
                <input
                  type="text"
                  className="glass-input text-sm"
                  placeholder="Display name (optional)"
                  value={newChName}
                  onChange={e => setNewChName(e.target.value)}
                />
              </div>
              <button
                data-testid="add-channel-btn"
                type="submit"
                disabled={addingCh || !newChId.trim()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Plus size={13} />{addingCh ? 'Adding…' : 'Add Channel'}
              </button>
            </form>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30">
          <p className="text-xs text-slate-600">Digilistan · YTIq v1.0</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              <Save size={13} />{saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
