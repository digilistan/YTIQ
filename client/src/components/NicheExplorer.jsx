import React, { useState, useEffect } from 'react';
import { Search, Bookmark, CheckCircle, AlertTriangle, Trash2, BarChart2, TrendingUp } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useSettings } from '../context/SettingsContext';

function ScoreRing({ score }) {
  const fill = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)';
  const data = [{ value: score, fill }];
  return (
    <div className="relative" style={{ width: 112, height: 112 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="88%"
          data={data} startAngle={90} endAngle={90 - (score / 100) * 360} barSize={10}>
          <RadialBar dataKey="value" cornerRadius={5} background={{ fill: 'var(--bg-elevated)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color: 'var(--text-base)' }}>{score}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ 100</span>
      </div>
    </div>
  );
}

const COMP_BADGE = { Low: 'badge-green', Medium: 'badge-amber', High: 'badge-red' };
const VOL_BADGE  = { Low: 'badge-sky',   Medium: 'badge-accent', High: 'badge-violet' };

export function NicheExplorer({ toast }) {
  const { activeChannel } = useSettings();
  const [topic, setTopic]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError]       = useState(null);
  const [saved, setSaved]       = useState([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    fetch('/api/niches')
      .then(r => r.ok ? r.json() : [])
      .then(d => setSaved(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!topic.trim()) return;
    setLoading(true); setError(null); setAnalysis(null);
    try {
      const res  = await fetch(`/api/ai/niche-explorer?topic=${encodeURIComponent(topic.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data);
    } catch (err) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      await fetch('/api/niches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: analysis.topic, analysis: JSON.stringify(analysis), channel_id: activeChannel?.id }),
      });
      const r2 = await fetch('/api/niches');
      if (r2.ok) setSaved(await r2.json());
      toast('Niche saved!', 'success');
    } catch { toast('Failed to save.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/niches/${id}`, { method: 'DELETE' });
      setSaved(prev => prev.filter(n => n.id !== id));
      toast('Removed.', 'success');
    } catch { toast('Failed to remove.', 'error'); }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Niche Explorer</h1>
          <p className="page-subtitle">Analyze YouTube niches with AI-powered opportunity scoring.</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input data-testid="niche-topic-input" className="app-input pl-9"
              placeholder="e.g. personal finance, AI tools, fitness for beginners…"
              value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
          </div>
          <button data-testid="niche-analyze-btn" onClick={handleAnalyze}
            disabled={loading || !topic.trim()} className="btn btn-primary">
            {loading ? <><span className="spinner" />Analyzing…</> : <><Search size={14} />Analyze</>}
          </button>
        </div>
      </div>

      {error && <div className="notice notice-red"><AlertTriangle size={13} />{error}</div>}

      {analysis && (
        <div data-testid="niche-results-container" className="card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <ScoreRing score={analysis.score ?? 0} />
              <span className="section-label">Opportunity</span>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="font-bold text-lg capitalize" style={{ color: 'var(--text-base)' }}>{analysis.topic}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analysis.competition && <span className={`badge ${COMP_BADGE[analysis.competition] || 'badge-amber'}`}>{analysis.competition} Competition</span>}
                  {analysis.searchVolume && <span className={`badge ${VOL_BADGE[analysis.searchVolume]  || 'badge-accent'}`}>{analysis.searchVolume} Volume</span>}
                  {analysis.trending     && <span className="badge badge-green">🔥 Trending</span>}
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{analysis.summary}</p>
              <button data-testid="save-niche-btn" onClick={handleSave} disabled={saving} className="btn btn-secondary btn-sm">
                <Bookmark size={13} />{saving ? 'Saving…' : 'Save Niche'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'var(--green-soft)', border: '1px solid var(--green-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={13} style={{ color: 'var(--green)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--green)' }}>Opportunities</span>
              </div>
              {(analysis.opportunities || []).map((o, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--green)', marginRight: 6, fontWeight: 700 }}>✓</span>{o}
                </p>
              ))}
            </div>
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: 'var(--red-soft)', border: '1px solid var(--red-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={13} style={{ color: 'var(--red)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--red)' }}>Risks</span>
              </div>
              {(analysis.risks || []).map((r, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--red)', marginRight: 6, fontWeight: 700 }}>⚠</span>{r}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && !analysis && !error && (
        <div className="empty-state">
          <BarChart2 size={36} className="empty-state-icon" />
          <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>Enter a niche topic above</p>
          <p className="text-xs">Get an AI-powered score, competition level, opportunities and risks.</p>
        </div>
      )}

      {saved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Saved Niches</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {saved.map(n => {
              let parsed = null;
              try { parsed = n.analysis ? JSON.parse(n.analysis) : null; } catch {}
              return (
                <div key={n.id} className="card p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm capitalize" style={{ color: 'var(--text-base)' }}>{n.topic}</p>
                    {parsed?.score != null && (
                      <span className={`badge mt-1 ${parsed.score >= 70 ? 'badge-green' : parsed.score >= 45 ? 'badge-amber' : 'badge-red'}`}>
                        Score {parsed.score}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(n.id)} className="btn btn-ghost btn-sm">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
