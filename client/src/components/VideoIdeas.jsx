import React, { useState } from 'react';
import { Lightbulb, Sparkles, Star, ArrowRight, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const EFFORT_COLOR = { Low: 'text-emerald-400 bg-emerald-500/10', Medium: 'text-amber-400 bg-amber-500/10', High: 'text-rose-400 bg-rose-500/10' };

export function VideoIdeas({ setActiveTab, setActiveIdeaForScript, toast }) {
  const { activeChannel } = useSettings();
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!niche.trim()) { toast('Enter a niche topic first.', 'warning'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/ideas?niche=${encodeURIComponent(niche.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setIdeas(data.ideas || []);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (idea, index) => {
    if (!idea.id) return;
    const updated = [...ideas];
    updated[index] = { ...idea, is_favorite: idea.is_favorite ? 0 : 1 };
    setIdeas(updated);
    try {
      await fetch(`/api/ideas/${idea.id}/favorite`, { method: 'POST' });
    } catch { toast('Could not update favorite.', 'error'); }
  };

  const handleWriteScript = (idea) => {
    if (setActiveIdeaForScript) setActiveIdeaForScript(idea);
    setActiveTab('scripts');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Video Ideas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate compelling video ideas for any niche.</p>
      </div>

      {/* Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-3">
        <div className="relative flex-1">
          <Lightbulb size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            data-testid="idea-niche-input"
            type="text"
            className="glass-input pl-9 text-sm"
            placeholder="e.g. personal finance, web development, cooking for beginners…"
            value={niche}
            onChange={e => setNiche(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          />
        </div>
        <button
          data-testid="generate-ideas-btn"
          onClick={handleGenerate}
          disabled={loading || !niche.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shrink-0"
        >
          {loading ? <span className="spinner" /> : <Sparkles size={14} />}
          {loading ? 'Generating…' : 'Generate Ideas'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={14} className="shrink-0" />{error}
        </div>
      )}

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea, i) => (
            <div
              key={idea.id ?? i}
              data-testid="idea-card"
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100 leading-snug">{idea.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{idea.angle}</p>
                </div>
                <button
                  data-testid="idea-star-btn"
                  onClick={() => handleFavorite(idea, i)}
                  className={`shrink-0 transition ${idea.is_favorite ? 'text-amber-400' : 'text-slate-700 hover:text-slate-400'}`}
                >
                  <Star size={16} fill={idea.is_favorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-auto">
                {idea.effort && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${EFFORT_COLOR[idea.effort] ?? 'text-slate-400 bg-slate-800'}`}>
                    {idea.effort} effort
                  </span>
                )}
                <button
                  data-testid="create-script-btn"
                  onClick={() => handleWriteScript(idea)}
                  className="ml-auto flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
                >
                  Write Script <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && ideas.length === 0 && !error && (
        <div className="text-center py-16 text-slate-600">
          <Lightbulb size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter a niche above and click Generate to get video ideas.</p>
        </div>
      )}
    </div>
  );
}
