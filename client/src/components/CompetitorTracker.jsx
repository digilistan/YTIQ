import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Trash2, Zap, Bookmark, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export function CompetitorTracker({ toast }) {
  const { activeChannel } = useSettings();
  const [competitors, setCompetitors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [angleLoading, setAngleLoading] = useState(null);
  const [angles, setAngles] = useState({});
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch('/api/competitors')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCompetitors(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleSelect = async (comp) => {
    setSelected(comp);
    setUploads([]);
    setAngles({});
    setUploadsLoading(true);
    try {
      const res = await fetch(`/api/competitors/${comp.id}/uploads`);
      const data = await res.json();
      setUploads(Array.isArray(data) ? data : []);
    } catch { toast('Failed to load uploads.', 'error'); }
    finally { setUploadsLoading(false); }
  };

  const handleAnalyzeAngle = async (upload, index) => {
    setAngleLoading(index);
    try {
      const res = await fetch(`/api/ai/analyze-angle?title=${encodeURIComponent(upload.title)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAngles(prev => ({ ...prev, [index]: data.suggestion }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAngleLoading(null);
    }
  };

  const handleSaveAsIdea = async (upload) => {
    try {
      await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: upload.title, channel_id: activeChannel?.id })
      });
      toast('Saved as a Video Idea!', 'success');
    } catch { toast('Failed to save idea.', 'error'); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newId.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_channel_id: newId.trim(),
          competitor_name: newName.trim() || newId.trim(),
          channel_id: activeChannel?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setCompetitors(prev => [data, ...prev]);
      setNewId(''); setNewName('');
      toast('Competitor added!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Competitor Tracker</h1>
        <p className="text-sm text-slate-500 mt-0.5">Monitor top videos from competing channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sidebar list */}
        <div className="space-y-4">
          {/* Add competitor */}
          <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Track New Competitor</p>
            <input
              type="text"
              className="glass-input text-sm"
              placeholder="Channel ID (UCxxx…)"
              value={newId}
              onChange={e => setNewId(e.target.value)}
            />
            <input
              type="text"
              className="glass-input text-sm"
              placeholder="Display name (optional)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <button
              type="submit"
              disabled={adding || !newId.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition w-full justify-center"
            >
              <Plus size={13} />{adding ? 'Adding…' : 'Add'}
            </button>
          </form>

          {/* Competitor list */}
          <div className="space-y-2">
            {competitors.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">No competitors tracked yet.</p>
            ) : (
              competitors.map(c => (
                <button
                  key={c.id}
                  data-testid="competitor-card"
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left p-3.5 rounded-xl border transition ${
                    selected?.id === c.id
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{c.competitor_name || c.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{c.competitor_channel_id}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Upload timeline */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl h-full flex items-center justify-center py-24">
              <div className="text-center text-slate-600">
                <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a competitor to view their top videos.</p>
              </div>
            </div>
          ) : (
            <div data-testid="competitor-timeline" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-base font-semibold text-slate-200">
                Top Videos — <span className="text-indigo-400">{selected.competitor_name || selected.name}</span>
              </h2>

              {uploadsLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center text-slate-500 text-sm">
                  <span className="spinner" /> Loading…
                </div>
              ) : uploads.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">No uploads found.</p>
              ) : (
                <div className="space-y-3">
                  {uploads.map((up, i) => (
                    <div key={i} className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{up.title}</p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-slate-500">{up.views?.toLocaleString()} views</span>
                            <span className={`text-xs font-semibold ${up.multiplier >= 2 ? 'text-emerald-400' : up.multiplier >= 1 ? 'text-slate-400' : 'text-rose-400'}`}>
                              {up.multiplier}× avg
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleAnalyzeAngle(up, i)}
                            disabled={angleLoading === i}
                            className="flex items-center gap-1.5 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            {angleLoading === i ? <span className="spinner" style={{ width: 11, height: 11 }} /> : <Zap size={11} />}
                            Analyze
                          </button>
                          <button
                            onClick={() => handleSaveAsIdea(up)}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                          >
                            <Bookmark size={11} />Save Idea
                          </button>
                        </div>
                      </div>
                      {angles[i] && (
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 leading-relaxed">
                          <span className="text-indigo-400 font-semibold">Angle: </span>{angles[i]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
