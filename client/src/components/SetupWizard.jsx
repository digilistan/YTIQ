import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Database } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

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

export function SetupWizard({ toast }) {
  const { updateSettings, validateSettings } = useSettings();
  const [ytKey, setYtKey] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!aiKey.trim()) { setError('An AI API key is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      await updateSettings({
        youtube_api_key: ytKey.trim(),
        ai_api_key: aiKey.trim(),
        ai_endpoint: 'https://api.longcat.chat/openai/v1/chat/completions',
        ai_model: 'LongCat-2.0-Preview',
        use_mock_api: 'false'
      });
      setDone(true);
      toast('API keys saved! You\'re all set.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 mb-2">
            <span className="text-white font-black text-xl">Y</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Welcome to YTIq</h1>
          <p className="text-sm text-slate-500">Connect your accounts to get started.</p>
        </div>

        {/* Wizard card */}
        <div data-testid="wizard-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
          {done ? (
            <div data-testid="validation-success-badge" className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <ShieldCheck size={22} className="text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-slate-100">You're all set!</p>
              <p className="text-sm text-slate-500">Reload the page to start using YTIq.</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
              >
                Open Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">
                  LongCat AI API Key <span className="text-indigo-400">*</span>
                </label>
                <PasswordInput
                  testId="ai-api-key-input"
                  value={aiKey}
                  onChange={e => setAiKey(e.target.value)}
                  placeholder="Your LongCat API key…"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">
                  YouTube Data API Key <span className="text-slate-600">(optional)</span>
                </label>
                <PasswordInput
                  testId="youtube-api-key-input"
                  value={ytKey}
                  onChange={e => setYtKey(e.target.value)}
                  placeholder="AIzaSy… (for channel stats sync)"
                  autoComplete="off"
                />
                <p className="text-xs text-slate-600">You can add this later in Settings.</p>
              </div>

              {error && (
                <div className="text-sm text-rose-400 bg-rose-500/8 border border-rose-500/20 rounded-lg px-3 py-2.5">
                  {error}
                </div>
              )}

              <button
                data-testid="validate-connections-btn"
                type="submit"
                disabled={loading || !aiKey.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-semibold transition"
              >
                {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : <ShieldCheck size={15} />}
                {loading ? 'Saving…' : 'Save & Get Started'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600">
          All keys are stored locally in your database. We never transmit them.
        </p>
      </div>
    </div>
  );
}
