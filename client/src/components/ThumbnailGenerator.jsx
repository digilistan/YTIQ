import React, { useState } from 'react';
import { ImageIcon, Sparkles, AlertTriangle, Palette } from 'lucide-react';

const CSS_COLORS = {
  red: '#ef4444', yellow: '#eab308', blue: '#3b82f6', green: '#22c55e',
  white: '#f1f5f9', black: '#0f172a', orange: '#f97316', purple: '#a855f7',
  pink: '#ec4899', gray: '#94a3b8', cyan: '#06b6d4', teal: '#14b8a6',
};

function ColorDot({ color }) {
  const hex = CSS_COLORS[color?.toLowerCase()] ?? '#94a3b8';
  return (
    <span className="inline-block w-4 h-4 rounded-full border-2 shrink-0"
      style={{ background: hex, borderColor: 'var(--bg-elevated)' }} title={color} />
  );
}

const STYLE_COLORS = {
  Reaction:   { bg: 'var(--red-soft)',    text: 'var(--red)',    border: 'var(--red-border)'    },
  Comparison: { bg: 'var(--sky-soft)',    text: 'var(--sky)',    border: 'transparent'          },
  Minimal:    { bg: 'var(--bg-elevated)', text: 'var(--text-2)', border: 'var(--border)'         },
  Tutorial:   { bg: 'var(--amber-soft)',  text: 'var(--amber)',  border: 'var(--amber-border)'   },
  Challenge:  { bg: 'var(--violet-soft)', text: 'var(--violet)', border: 'transparent'           },
};

export function ThumbnailGenerator({ toast }) {
  const [topic, setTopic]     = useState('');
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [error, setError]     = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast('Enter a video topic first.', 'warning'); return; }
    setLoading(true); setError(null); setConcepts([]);
    try {
      const res  = await fetch(`/api/ai/thumbnails?topic=${encodeURIComponent(topic.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setConcepts(data.concepts || []);
    } catch (err) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thumbnail Concepts</h1>
          <p className="page-subtitle">Get AI-generated thumbnail design briefs for your video.</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input data-testid="thumbnail-topic-input" className="app-input pl-9"
              placeholder="e.g. React performance tips, morning routine, travel hack…"
              value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          </div>
          <button data-testid="generate-thumbnails-btn" onClick={handleGenerate}
            disabled={loading || !topic.trim()} className="btn btn-primary">
            {loading ? <><span className="spinner" />Generating…</> : <><Sparkles size={14} />Generate</>}
          </button>
        </div>
      </div>

      {error && <div className="notice notice-red"><AlertTriangle size={13} />{error}</div>}

      {concepts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {concepts.map((c, i) => {
            const styleInfo = STYLE_COLORS[c.style] || {};
            return (
              <div key={i} data-testid="thumbnail-concept-card"
                className="card overflow-hidden flex flex-col">
                {/* Visual preview area */}
                <div className="h-40 flex flex-col items-center justify-center gap-3 relative p-4"
                  style={{ background: 'var(--bg-elevated)' }}>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                    style={{ background: styleInfo.bg, color: styleInfo.text, borderColor: styleInfo.border }}>
                    {c.style || 'Custom'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Palette size={11} style={{ color: 'var(--text-muted)' }} />
                    {(c.colors || []).slice(0, 6).map((col, j) => (
                      <ColorDot key={j} color={col} />
                    ))}
                  </div>
                </div>

                <div className="p-4 flex-1">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-base)' }}>{c.concept}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    Style: <span style={{ color: styleInfo.text || 'var(--text-2)' }}>{c.style}</span>
                  </p>
                  {c.colors?.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Colors: {c.colors.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && concepts.length === 0 && !error && (
        <div className="empty-state">
          <ImageIcon size={36} className="empty-state-icon" />
          <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No concepts yet</p>
          <p className="text-xs">Enter your video topic to generate 3 AI thumbnail design concepts.</p>
        </div>
      )}
    </div>
  );
}
