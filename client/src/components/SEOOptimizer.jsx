import React, { useState } from 'react';
import { Sparkles, Copy, CheckCheck, AlertCircle } from 'lucide-react';

function CopyButton({ text, toast }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (toast) toast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
    >
      {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ScoreRing({ score }) {
  const color = score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round"
        />
      </svg>
      <span className="text-2xl font-bold text-slate-100 -mt-12">{score}</span>
      <span className="text-xs text-slate-500 mt-1">SEO Score</span>
    </div>
  );
}

export function SEOOptimizer({ toast }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleOptimize = async () => {
    if (!title.trim()) { toast('Enter a video title first.', 'warning'); return; }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const params = new URLSearchParams({ title: title.trim() });
      if (description.trim()) params.set('description', description.trim());
      const res = await fetch(`/api/ai/seo?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SEO analysis failed');
      setResults(data);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">SEO Optimizer</h1>
        <p className="text-sm text-slate-500 mt-0.5">Maximize your video's discoverability on YouTube.</p>
      </div>

      {/* Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Video Title</label>
          <input
            data-testid="seo-title-input"
            type="text"
            className="glass-input text-sm"
            placeholder="Your proposed video title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Description <span className="text-slate-700">(optional)</span></label>
          <textarea
            data-testid="seo-description-input"
            className="glass-input text-sm h-24 resize-none"
            placeholder="Draft description for context…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <button
          data-testid="seo-optimize-btn"
          onClick={handleOptimize}
          disabled={loading || !title.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {loading ? <span className="spinner" /> : <Sparkles size={14} />}
          {loading ? 'Analyzing…' : 'Optimize SEO'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={14} className="shrink-0" />{error}
        </div>
      )}

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Score */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center">
            <ScoreRing score={results.seoScore ?? 0} />
            {results.tips?.length > 0 && (
              <ul className="mt-4 space-y-1.5 w-full">
                {results.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-indigo-500 mt-0.5 shrink-0">→</span>{tip}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Optimized titles */}
            {results.optimizedTitles?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Optimized Titles</p>
                {results.optimizedTitles.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                    <p className="text-sm text-slate-200">{t}</p>
                    <CopyButton text={t} toast={toast} />
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {results.description && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Optimized Description</p>
                  <CopyButton text={results.description} toast={toast} />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{results.description}</p>
              </div>
            )}

            {/* Tags */}
            {results.tags?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tags</p>
                  <button
                    data-testid="copy-all-tags-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(results.tags.join(', '));
                      toast('Tags copied!', 'success');
                    }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    <Copy size={11} />Copy all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {results.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-300">{tag}</span>
                  ))}
                </div>
                {results.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {results.hashtags.map((h, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-400">{h}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !results && !error && (
        <div className="text-center py-16 text-slate-600">
          <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter a title and optimize for YouTube search.</p>
        </div>
      )}
    </div>
  );
}
