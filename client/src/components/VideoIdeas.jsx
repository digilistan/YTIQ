import React, { useState } from 'react';
import { Lightbulb, Sparkles, Star, ArrowRight, AlertTriangle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const EFFORT = {
  Low:    { cls: 'badge-green',  label: 'Low effort'    },
  Medium: { cls: 'badge-amber',  label: 'Medium effort' },
  High:   { cls: 'badge-red',    label: 'High effort'   },
};

export function VideoIdeas({ setActiveTab, setActiveIdeaForScript, toast }) {
  const { activeChannel } = useSettings();
  const [niche, setNiche]   = useState('');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas]   = useState([]);
  const [error, setError]   = useState(null);

  const handleGenerate = async () => {
    if (!niche.trim()) { toast('Enter a niche topic first.', 'warning'); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/ai/ideas?niche=${encodeURIComponent(niche.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setIdeas(data.ideas || []);
    } catch (err) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleFavorite = async (idea, index) => {
    if (!idea.id) return;
    const updated = [...ideas];
    updated[index] = { ...idea, is_favorite: idea.is_favorite ? 0 : 1 };
    setIdeas(updated);
    try { await fetch(`/api/ideas/${idea.id}/favorite`, { method: 'POST' }); }
    catch { toast('Could not update favorite.', 'error'); }
  };

  const handleWriteScript = (idea) => {
    if (setActiveIdeaForScript) setActiveIdeaForScript(idea);
    setActiveTab('scripts');
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Video Ideas</h1>
          <p className="page-subtitle">Generate compelling video ideas for any niche.</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Lightbulb size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input data-testid="idea-niche-input" className="app-input pl-9"
              placeholder="e.g. personal finance, web development, cooking for beginners…"
              value={niche} onChange={e => setNiche(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          </div>
          <button data-testid="generate-ideas-btn" onClick={handleGenerate}
            disabled={loading || !niche.trim()} className="btn btn-primary">
            {loading ? <><span className="spinner" />Generating…</> : <><Sparkles size={14} />Generate</>}
          </button>
        </div>
      </div>

      {error && <div className="notice notice-red"><AlertTriangle size={13} />{error}</div>}

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea, i) => (
            <div key={idea.id ?? i} data-testid="idea-card" className="card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-base)' }}>{idea.title}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{idea.angle}</p>
                </div>
                <button data-testid="idea-star-btn" onClick={() => handleFavorite(idea, i)}
                  className="shrink-0 transition"
                  style={{ color: idea.is_favorite ? 'var(--amber)' : 'var(--text-muted)' }}>
                  <Star size={16} fill={idea.is_favorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-auto">
                {idea.effort && (
                  <span className={`badge ${EFFORT[idea.effort]?.cls || 'badge-accent'}`}>
                    {EFFORT[idea.effort]?.label || idea.effort}
                  </span>
                )}
                <button data-testid="create-script-btn" onClick={() => handleWriteScript(idea)}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium transition"
                  style={{ color: 'var(--accent)' }}>
                  Write Script <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && ideas.length === 0 && !error && (
        <div className="empty-state">
          <Lightbulb size={36} className="empty-state-icon" />
          <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No ideas yet</p>
          <p className="text-xs">Enter a niche topic and click Generate to get 5 AI-crafted video ideas.</p>
        </div>
      )}
    </div>
  );
}
