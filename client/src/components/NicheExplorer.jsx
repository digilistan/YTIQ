import React, { useState } from 'react';
import { Search, Bookmark, TrendingUp, BarChart2, AlertCircle, CheckCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

function ScoreBar({ value }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-300 w-7 text-right">{value}</span>
    </div>
  );
}

const COMP_COLOR = { Low: 'text-emerald-400', Medium: 'text-amber-400', High: 'text-rose-400' };

export function NicheExplorer({ toast }) {
  const { activeChannel } = useSettings();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [savedNiches, setSavedNiches] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleAnalyze = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/ai/niche-explorer?topic=${encodeURIComponent(topic.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      await fetch('/api/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: analysis.topic, channel_id: activeChannel?.id })
      });
      setSavedNiches(prev => [analysis.topic, ...prev.filter(n => n !== analysis.topic)]);
      toast('Niche saved successfully!', 'success');
    } catch {
      toast('Failed to save niche.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isSaved = analysis && savedNiches.includes(analysis.topic);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Niche Explorer</h1>
        <p className="text-sm text-slate-500 mt-0.5">Discover YouTube niche potential with AI analysis.</p>
      </div>

      {/* Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              data-testid="niche-topic-input"
              id="niche-topic-input"
              type="text"
              className="glass-input pl-9 text-sm"
              placeholder="e.g. Vite 6, AI productivity, budgeting for students…"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            />
          </div>
          <button
            data-testid="niche-analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || !topic.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shrink-0"
          >
            {loading ? <span className="spinner" /> : <Search size={14} />}
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div data-testid="niche-results-container" className="space-y-4">
          {/* Header card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{analysis.topic}</h2>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed max-w-2xl">{analysis.summary}</p>
              </div>
              <button
                data-testid="save-niche-btn"
                onClick={handleSave}
                disabled={saving || isSaved}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isSaved
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {isSaved ? <CheckCircle size={13} /> : <Bookmark size={13} />}
                {isSaved ? 'Saved' : 'Save Niche'}
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <BarChart2 size={13} /> Opportunity Score
              </p>
              <ScoreBar value={analysis.score ?? 0} />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Competition</p>
              <p className={`text-xl font-bold ${COMP_COLOR[analysis.competition] ?? 'text-slate-300'}`}>{analysis.competition ?? '—'}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Search Volume</p>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className={analysis.trending ? 'text-emerald-400' : 'text-slate-600'} />
                <p className="text-xl font-bold text-slate-200">{analysis.searchVolume ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Opportunities / Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.opportunities?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Opportunities</p>
                <ul className="space-y-1.5">
                  {analysis.opportunities.map((o, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.risks?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Risks</p>
                <ul className="space-y-1.5">
                  {analysis.risks.map((r, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5 shrink-0">⚠</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
