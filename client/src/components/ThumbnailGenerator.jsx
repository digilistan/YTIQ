import React, { useState } from 'react';
import { ImageIcon, Sparkles, AlertCircle } from 'lucide-react';

const STYLE_COLORS = {
  Reaction:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Comparison: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Minimal:    'bg-slate-700/50 text-slate-300 border-slate-600',
  Tutorial:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Challenge:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

function ColorDot({ color }) {
  const CSS_COLORS = {
    red: '#ef4444', yellow: '#eab308', blue: '#3b82f6', green: '#22c55e',
    white: '#f1f5f9', black: '#0f172a', orange: '#f97316', purple: '#a855f7',
    pink: '#ec4899', gray: '#94a3b8',
  };
  const hex = CSS_COLORS[color?.toLowerCase()] ?? '#94a3b8';
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-white/10 shrink-0"
      style={{ background: hex }}
      title={color}
    />
  );
}

export function ThumbnailGenerator({ toast }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast('Enter a video topic first.', 'warning'); return; }
    setLoading(true);
    setError(null);
    setConcepts([]);
    try {
      const res = await fetch(`/api/ai/thumbnails?topic=${encodeURIComponent(topic.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setConcepts(data.concepts || []);
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
        <h1 className="text-2xl font-bold text-slate-100">Thumbnail Concepts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Get AI-generated thumbnail design briefs for your video.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-3">
        <div className="relative flex-1">
          <ImageIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            data-testid="thumbnail-topic-input"
            type="text"
            className="glass-input pl-9 text-sm"
            placeholder="e.g. React performance tips, morning routine, travel hack…"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          />
        </div>
        <button
          data-testid="generate-thumbnails-btn"
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shrink-0"
        >
          {loading ? <span className="spinner" /> : <Sparkles size={14} />}
          {loading ? 'Generating…' : 'Generate Concepts'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={14} className="shrink-0" />{error}
        </div>
      )}

      {concepts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {concepts.map((c, i) => (
            <div
              key={i}
              data-testid="thumbnail-concept-card"
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition"
            >
              {/* Visual mockup area */}
              <div className="h-36 bg-slate-950 flex items-center justify-center relative">
                <div className="flex gap-1.5 absolute bottom-3 right-3">
                  {(c.colors || []).slice(0, 5).map((col, j) => (
                    <ColorDot key={j} color={col} />
                  ))}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${STYLE_COLORS[c.style] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {c.style}
                </span>
              </div>
              <div className="p-4 space-y-1.5">
                <p className="text-sm text-slate-200 leading-snug">{c.concept}</p>
                <p className="text-xs text-slate-500">Style: {c.style}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && concepts.length === 0 && !error && (
        <div className="text-center py-16 text-slate-600">
          <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter your video topic to generate thumbnail design concepts.</p>
        </div>
      )}
    </div>
  );
}
