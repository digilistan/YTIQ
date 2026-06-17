import React, { useState, useEffect } from 'react';
import { X, Settings, Eye, EyeOff, Plus, Trash2, Save, ToggleLeft, ToggleRight, CheckCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="section-label">{label}</label>
      {children}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, testId, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input data-testid={testId} type={show ? 'text' : 'password'} className="app-input pr-10"
        value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition" tabIndex={-1}
        style={{ color: 'var(--text-muted)' }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export function SettingsModal({ onClose, toast }) {
  const { settings, channels, activeChannel, updateSettings, addChannel, deleteChannel, setActiveChannel } = useSettings();

  const [ytKey, setYtKey]         = useState(settings.youtube_api_key || '');
  const [aiKey, setAiKey]         = useState(settings.ai_api_key || '');
  const [aiEndpoint, setAiEp]     = useState(settings.ai_endpoint || 'https://api.longcat.chat/openai/v1/chat/completions');
  const [aiModel, setAiModel]     = useState(settings.ai_model || 'LongCat-2.0-Preview');
  const [useMock, setUseMock]     = useState(settings.use_mock_api === true || settings.use_mock_api === 'true');
  const [saving, setSaving]       = useState(false);

  const [newChId, setNewChId]     = useState('');
  const [newChName, setNewChName] = useState('');
  const [addingCh, setAddingCh]   = useState(false);

  useEffect(() => {
    setYtKey(settings.youtube_api_key || '');
    setAiKey(settings.ai_api_key || '');
    setAiEp(settings.ai_endpoint || 'https://api.longcat.chat/openai/v1/chat/completions');
    setAiModel(settings.ai_model || 'LongCat-2.0-Preview');
    setUseMock(settings.use_mock_api === true || settings.use_mock_api === 'true');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ youtube_api_key: ytKey, ai_api_key: aiKey, ai_endpoint: aiEndpoint, ai_model: aiModel, use_mock_api: useMock ? 'true' : 'false' });
      toast('Settings saved!', 'success');
    } catch (err) { toast('Failed to save: ' + err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if (!newChId.trim()) return;
    setAddingCh(true);
    try {
      await addChannel(newChId.trim(), newChName.trim() || undefined);
      setNewChId(''); setNewChName('');
      toast('Channel added!', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setAddingCh(false); }
  };

  const handleDeleteChannel = async (ch) => {
    try { await deleteChannel(ch.id); toast(`"${ch.name}" removed.`, 'success'); }
    catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
              <Settings size={15} style={{ color: 'var(--accent-2)' }} />
            </div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-base)' }}>Settings</h2>
          </div>
          <button aria-label="Close" onClick={onClose} className="btn btn-ghost btn-sm"><X size={15} /></button>
        </div>

        <div className="p-6 space-y-8">
          {/* AI Configuration */}
          <section className="space-y-4">
            <h3 className="section-label" style={{ color: 'var(--accent-2)' }}>AI Configuration</h3>
            <Field label="AI API Key">
              <PasswordInput testId="ai-api-key-input" value={aiKey} onChange={e => setAiKey(e.target.value)}
                placeholder="Your LongCat / OpenAI-compatible API key…" autoComplete="off" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="API Endpoint">
                <input name="ai_endpoint" className="app-input" value={aiEndpoint} onChange={e => setAiEp(e.target.value)}
                  placeholder="https://api.longcat.chat/openai/v1/chat/completions" />
              </Field>
              <Field label="Model">
                <input name="ai_model" className="app-input" value={aiModel} onChange={e => setAiModel(e.target.value)}
                  placeholder="LongCat-2.0-Preview" />
              </Field>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>Mock API Mode</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Use canned responses for testing without consuming API credits</p>
              </div>
              <button data-testid="api-mock-toggle" aria-checked={useMock} onClick={() => setUseMock(v => !v)}
                className="transition" style={{ color: useMock ? 'var(--accent)' : 'var(--text-muted)' }}>
                {useMock ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </section>

          {/* YouTube Configuration */}
          <section className="space-y-4">
            <h3 className="section-label" style={{ color: 'var(--accent-2)' }}>YouTube Configuration</h3>
            <Field label="YouTube Data API v3 Key">
              <PasswordInput testId="youtube-api-key-input" value={ytKey} onChange={e => setYtKey(e.target.value)}
                placeholder="AIzaSy…" autoComplete="off" />
            </Field>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Get a key at{' '}
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>Google Cloud Console</a>{' '}
              — enable the YouTube Data API v3. Also unlocks @handle resolution when adding channels.
            </p>
          </section>

          {/* Channel Management */}
          <section className="space-y-4">
            <h3 className="section-label" style={{ color: 'var(--accent-2)' }}>Channel Management</h3>
            <div className="space-y-2">
              {channels.length === 0 ? (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No channels connected yet.</p>
              ) : channels.map(ch => (
                <div key={ch.id} className="flex items-center justify-between p-3.5 rounded-xl"
                  style={{
                    border: `1px solid ${activeChannel?.id === ch.id ? 'var(--accent-border)' : 'var(--border)'}`,
                    background: activeChannel?.id === ch.id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                  }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>{ch.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ch.youtube_channel_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeChannel?.id === ch.id ? (
                      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent-2)' }}>
                        <CheckCircle size={11} />Active
                      </span>
                    ) : (
                      <button onClick={() => setActiveChannel(ch)}
                        className="text-xs font-medium px-2 py-1 rounded transition"
                        style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>
                        Activate
                      </button>
                    )}
                    <button data-testid="delete-channel-btn" onClick={() => handleDeleteChannel(ch)}
                      className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddChannel} className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="section-label">Connect New Channel</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input data-testid="add-channel-input" className="app-input"
                  placeholder="@handle, UC… ID, or YouTube URL"
                  value={newChId} onChange={e => setNewChId(e.target.value)} />
                <input className="app-input"
                  placeholder="Display name (auto-filled with API key)"
                  value={newChName} onChange={e => setNewChName(e.target.value)} />
              </div>
              <button data-testid="add-channel-btn" type="submit" disabled={addingCh || !newChId.trim()}
                className="btn btn-secondary">
                <Plus size={13} />{addingCh ? 'Adding…' : 'Add Channel'}
              </button>
            </form>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Digilistan · YTIq v1.0</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              <Save size={13} />{saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
