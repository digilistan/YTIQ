import React, { useState, useEffect } from 'react';
import { Lightbulb, Sparkles, Star, ArrowRight, AlertTriangle, BookMarked, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const EFFORT = {
  Low:    { cls: 'badge-green',  label: 'Low effort'    },
  Medium: { cls: 'badge-amber',  label: 'Medium effort' },
  High:   { cls: 'badge-red',    label: 'High effort'   },
};

const TABS = [
  { id: 'generated', label: 'Generated' },
  { id: 'saved',     label: 'Saved'     },
  { id: 'dismissed', label: 'Dismissed' },
];

export function VideoIdeas({ setActiveTab, setActiveIdeaForScript, toast }) {
  const { activeChannel } = useSettings();
  const [activeSection, setActiveSection] = useState('generated');
  const [niche, setNiche]     = useState('');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas]     = useState([]);
  const [savedIdeas, setSavedIdeas] = useState([]);
  const [dismissed, setDismissed]   = useState([]);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (activeSection === 'saved') fetchSaved();
  }, [activeSection]);

  const fetchSaved = async () => {
    try {
      const res = await fetch('/api/ideas');
      const d   = await res.json();
      setSavedIdeas(Array.isArray(d) ? d : []);
    } catch { setSavedIdeas([]); }
  };

  const handleGenerate = async () => {
    if (!niche.trim()) { toast('Enter a niche topic first.', 'warning'); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/ai/ideas?niche=${encodeURIComponent(niche.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setIdeas(data.ideas || []);
      setActiveSection('generated');
    } catch (err) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleFavorite = async (idea, index, isSavedList = false) => {
    if (!idea.id) return;
    if (isSavedList) {
      const updated = [...savedIdeas];
      updated[index] = { ...idea, is_favorite: idea.is_favorite ? 0 : 1 };
      setSavedIdeas(updated);
    } else {
      const updated = [...ideas];
      updated[index] = { ...idea, is_favorite: idea.is_favorite ? 0 : 1 };
      setIdeas(updated);
    }
    try { await fetch(`/api/ideas/${idea.id}/favorite`, { method: 'POST' }); }
    catch { toast('Could not update favorite.', 'error'); }
  };

  const handleSave = async (idea, index) => {
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: idea.title, angle: idea.angle, effort: idea.effort, channel_id: activeChannel?.id }),
      });
      const saved = await res.json();
      const updated = [...ideas];
      updated[index] = { ...idea, id: saved.id };
      setIdeas(updated);
      toast('Idea saved!', 'success');
    } catch { toast('Failed to save idea.', 'error'); }
  };

  const handleDismiss = (idea) => {
    setDismissed(prev => [idea, ...prev.filter(d => d.title !== idea.title)]);
    setIdeas(prev => prev.filter(i => i.title !== idea.title));
  };

  const handleRestoreDismissed = (idea) => {
    setDismissed(prev => prev.filter(d => d.title !== idea.title));
    setIdeas(prev => [...prev, idea]);
    setActiveSection('generated');
  };

  const handleWriteScript = (idea) => {
    if (setActiveIdeaForScript) setActiveIdeaForScript(idea);
    setActiveTab('scripts');
  };

  const IdeaCard = ({ idea, index, isSavedList = false }) => (
    <div
      data-testid="idea-card"
      className="card p-4 flex flex-col gap-3"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', JSON.stringify(idea));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      style={{ cursor: 'grab' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-base)' }}>{idea.title}</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{idea.angle}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isSavedList && !idea.id && (
            <button onClick={() => handleSave(idea, index)} className="btn btn-ghost btn-sm" title="Save idea">
              <BookMarked size={13} />
            </button>
          )}
          {idea.id && (
            <button onClick={() => handleFavorite(idea, index, isSavedList)} className="btn btn-ghost btn-sm"
              style={{ color: idea.is_favorite ? 'var(--amber)' : 'var(--text-muted)' }}>
              <Star size={14} fill={idea.is_favorite ? 'currentColor' : 'none'} />
            </button>
          )}
          {!isSavedList && (
            <button onClick={() => handleDismiss(idea)} className="btn btn-ghost btn-sm" title="Dismiss">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-auto">
        {idea.effort && <span className={`badge ${EFFORT[idea.effort]?.cls || 'badge-accent'}`}>{EFFORT[idea.effort]?.label || idea.effort}</span>}
        <button data-testid="create-script-btn" onClick={() => handleWriteScript(idea)}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium transition"
          style={{ color: 'var(--accent)' }}>
          Write Script <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Video Ideas</h1>
          <p className="page-subtitle">Generate and manage compelling video ideas for any niche.</p>
        </div>
      </div>

      {/* Generate input */}
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

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-item ${activeSection === t.id ? 'active' : ''}`}
            onClick={() => setActiveSection(t.id)}>
            {t.label}
            {t.id === 'generated' && ideas.length > 0 && (
              <span className="ml-1.5 badge badge-accent" style={{ fontSize: '0.65rem', padding: '0 5px' }}>{ideas.length}</span>
            )}
            {t.id === 'saved' && savedIdeas.length > 0 && (
              <span className="ml-1.5 badge badge-green" style={{ fontSize: '0.65rem', padding: '0 5px' }}>{savedIdeas.length}</span>
            )}
            {t.id === 'dismissed' && dismissed.length > 0 && (
              <span className="ml-1.5 badge badge-red" style={{ fontSize: '0.65rem', padding: '0 5px' }}>{dismissed.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Generated */}
      {activeSection === 'generated' && (
        ideas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map((idea, i) => <IdeaCard key={idea.id ?? `g-${i}`} idea={idea} index={i} />)}
          </div>
        ) : (
          <div className="empty-state">
            <Lightbulb size={36} className="empty-state-icon" />
            <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No ideas yet</p>
            <p className="text-xs">Enter a niche topic above and click Generate.</p>
          </div>
        )
      )}

      {/* Saved */}
      {activeSection === 'saved' && (
        savedIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedIdeas.map((idea, i) => <IdeaCard key={idea.id} idea={idea} index={i} isSavedList />)}
          </div>
        ) : (
          <div className="empty-state">
            <BookMarked size={36} className="empty-state-icon" />
            <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No saved ideas</p>
            <p className="text-xs">Generate ideas and click the bookmark icon to save them here.</p>
          </div>
        )
      )}

      {/* Dismissed */}
      {activeSection === 'dismissed' && (
        dismissed.length > 0 ? (
          <div className="space-y-3">
            {dismissed.map((idea, i) => (
              <div key={i} className="card p-4 flex items-center justify-between gap-3"
                style={{ opacity: 0.65 }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-base)' }}>{idea.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{idea.angle}</p>
                </div>
                <button onClick={() => handleRestoreDismissed(idea)} className="btn btn-secondary btn-sm shrink-0">
                  Restore
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <X size={36} className="empty-state-icon" />
            <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>Nothing dismissed</p>
            <p className="text-xs">Ideas you dismiss will appear here so you can restore them later.</p>
          </div>
        )
      )}
    </div>
  );
}
