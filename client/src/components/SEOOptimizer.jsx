import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, CheckCheck, AlertTriangle, Save, Trash2 } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useSettings } from '../context/SettingsContext';

function CopyBtn({ text, toast }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (toast) toast('Copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handle} className="btn btn-ghost btn-sm"
      style={{ color: copied ? 'var(--green)' : 'var(--text-muted)' }}>
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ScoreGauge({ score }) {
  const fill = score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
  const data = [{ value: score, fill }];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="88%"
            data={data} startAngle={90} endAngle={90 - (score / 100) * 360} barSize={10}>
            <RadialBar dataKey="value" cornerRadius={5} background={{ fill: 'var(--bg-elevated)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color: fill }}>{score}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>SEO Score</span>
        </div>
      </div>
    </div>
  );
}

export function SEOOptimizer({ toast }) {
  const { activeChannel } = useSettings();
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState(null);
  const [error, setError]         = useState(null);
  const [saving, setSaving]       = useState(false);
  const [history, setHistory]     = useState([]);

  const fetchHistory = async () => {
    if (!activeChannel?.id) {
      setHistory([]);
      return;
    }
    try {
      const res = await fetch(`/api/seo?channel_id=${activeChannel.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchHistory();
  }, [activeChannel?.id]);

  const handleSave = async () => {
    if (!results) return;
    setSaving(true);
    try {
      const payload = {
        channel_id: activeChannel?.id,
        original_title: results.originalTitle || title,
        optimized_titles: results.optimizedTitles,
        description: results.description,
        tags: results.tags,
        hashtags: results.hashtags,
        seo_score: results.seoScore,
        tips: results.tips
      };
      const res = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast('SEO results saved!', 'success');
        fetchHistory();
      } else {
        toast('Failed to save SEO results.', 'error');
      }
    } catch {
      toast('Failed to save SEO results.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSEO = (record) => {
    setResults({
      originalTitle: record.original_title,
      optimizedTitles: record.optimized_titles,
      description: record.description,
      tags: record.tags,
      hashtags: record.hashtags,
      seoScore: record.seo_score,
      tips: record.tips
    });
    setTitle(record.original_title);
    setDesc(record.description || '');
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/seo/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        toast('SEO record removed.', 'success');
      } else {
        toast('Failed to delete SEO record.', 'error');
      }
    } catch {
      toast('Failed to delete SEO record.', 'error');
    }
  };

  const handleOptimize = async () => {
    if (!title.trim()) { toast('Enter a video title first.', 'warning'); return; }
    setLoading(true); setError(null); setResults(null);
    try {
      const params = new URLSearchParams({ title: title.trim() });
      if (description.trim()) params.set('description', description.trim());
      const res  = await fetch(`/api/ai/seo?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SEO analysis failed');
      setResults(data);
    } catch (err) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">SEO Optimizer</h1>
          <p className="page-subtitle">Maximize your video's discoverability on YouTube.</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="section-label">Video Title</label>
          <input data-testid="seo-title-input" className="app-input"
            placeholder="Your proposed video title…"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="section-label">Description <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
          <textarea data-testid="seo-description-input" className="app-input h-24 resize-none"
            placeholder="Draft description for context…"
            value={description} onChange={e => setDesc(e.target.value)} />
        </div>
        <button data-testid="seo-optimize-btn" onClick={handleOptimize}
          disabled={loading || !title.trim()} className="btn btn-primary">
          {loading ? <><span className="spinner" />Analyzing…</> : <><Sparkles size={14} />Optimize SEO</>}
        </button>
      </div>

      {error && <div className="notice notice-red"><AlertTriangle size={13} />{error}</div>}

      {results && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn btn-secondary">
              <Save size={13} /> {saving ? 'Saving...' : 'Save SEO Results'}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Score + tips */}
            <div className="card p-5 flex flex-col items-center gap-4">
              <ScoreGauge score={results.seoScore ?? 0} />
              {results.tips?.length > 0 && (
                <ul className="space-y-2 w-full">
                  {results.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 700, marginTop: 1 }}>→</span>{tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Results */}
            <div className="lg:col-span-2 space-y-4">
              {results.optimizedTitles?.length > 0 && (
                <div className="card p-4 space-y-3">
                  <p className="section-label">Optimized Titles</p>
                  {results.optimizedTitles.map((t, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <p className="text-sm flex-1" style={{ color: 'var(--text-base)' }}>{t}</p>
                      <CopyBtn text={t} toast={toast} />
                    </div>
                  ))}
                </div>
              )}

              {results.description && (
                <div className="card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="section-label">Optimized Description</p>
                    <CopyBtn text={results.description} toast={toast} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{results.description}</p>
                </div>
              )}

              {results.tags?.length > 0 && (
                <div className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="section-label">Tags & Hashtags</p>
                    <button data-testid="copy-all-tags-btn" className="btn btn-ghost btn-sm"
                      onClick={() => { navigator.clipboard.writeText(results.tags.join(', ')); toast('Tags copied!', 'success'); }}>
                      <Copy size={11} />Copy all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.tags.map((tag, i) => (
                      <span key={i} className="chip">{tag}</span>
                    ))}
                  </div>
                  {results.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {results.hashtags.map((h, i) => (
                        <span key={i} className="badge badge-accent">{h}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !results && !error && (
        <div className="empty-state">
          <Sparkles size={36} className="empty-state-icon" />
          <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No results yet</p>
          <p className="text-xs">Enter a title to optimize your video for YouTube search.</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Optimization History</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map(item => (
              <div key={item.id} className="card p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent)] transition"
                onClick={() => handleLoadSEO(item)}>
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-base)' }}>{item.original_title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Score: <span className="font-semibold" style={{
                      color: item.seo_score >= 70 ? 'var(--green)' : item.seo_score >= 50 ? 'var(--amber)' : 'var(--red)'
                    }}>{item.seo_score}</span>
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="btn btn-ghost btn-sm text-[var(--red)] hover:bg-[var(--red-soft)]">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
