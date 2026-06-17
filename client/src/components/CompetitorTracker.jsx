import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Trash2, Zap, Bookmark, AlertTriangle, ExternalLink, Eye, ThumbsUp, MessageSquare } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

function fmt(n) {
  if (n == null) return '0';
  const v = Number(n);
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toLocaleString();
}

function fmtDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CompetitorTracker({ toast }) {
  const { activeChannel } = useSettings();
  const [competitors, setCompetitors] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [uploads, setUploads]         = useState([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadsError, setUploadsError]     = useState(null);
  const [angleLoading, setAngleLoading]     = useState(null);
  const [angles, setAngles]           = useState({});
  const [newId, setNewId]             = useState('');
  const [newName, setNewName]         = useState('');
  const [adding, setAdding]           = useState(false);

  useEffect(() => {
    fetch('/api/competitors')
      .then(r => r.ok ? r.json() : [])
      .then(d => setCompetitors(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleSelect = async (comp) => {
    setSelected(comp); setUploads([]); setAngles({}); setUploadsError(null);
    setUploadsLoading(true);
    try {
      const res = await fetch(`/api/competitors/${comp.id}/uploads`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load uploads');
      setUploads(Array.isArray(data) ? data : []);
    } catch (err) { setUploadsError(err.message); }
    finally { setUploadsLoading(false); }
  };

  const handleAnalyzeAngle = async (upload, index) => {
    setAngleLoading(index);
    try {
      const res  = await fetch(`/api/ai/analyze-angle?title=${encodeURIComponent(upload.title)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAngles(prev => ({ ...prev, [index]: data.suggestion }));
    } catch (err) { toast(err.message, 'error'); }
    finally { setAngleLoading(null); }
  };

  const handleSaveAsIdea = async (upload) => {
    try {
      await fetch('/api/ideas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: upload.title, channel_id: activeChannel?.id }),
      });
      toast('Saved as a Video Idea!', 'success');
    } catch { toast('Failed to save idea.', 'error'); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/competitors/${id}`, { method: 'DELETE' });
      setCompetitors(prev => prev.filter(c => c.id !== id));
      if (selected?.id === id) { setSelected(null); setUploads([]); }
      toast('Competitor removed.', 'success');
    } catch { toast('Failed to remove.', 'error'); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newId.trim()) return;
    setAdding(true);
    try {
      const res  = await fetch('/api/competitors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_channel_id: newId.trim(),
          competitor_name: newName.trim() || undefined,
          channel_id: activeChannel?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setCompetitors(prev => [data, ...prev]);
      setNewId(''); setNewName('');
      toast('Competitor added!', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setAdding(false); }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Competitor Tracker</h1>
          <p className="page-subtitle">Monitor top videos from competing channels in real time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left panel */}
        <div className="space-y-4">
          <form onSubmit={handleAdd} className="card p-4 space-y-2.5">
            <p className="section-label">Track New Competitor</p>
            <input className="app-input" placeholder="@username, channel ID, or YouTube URL"
              value={newId} onChange={e => setNewId(e.target.value)} />
            <input className="app-input" placeholder="Display name (auto-detected with API key)"
              value={newName} onChange={e => setNewName(e.target.value)} />
            <button type="submit" disabled={adding || !newId.trim()} className="btn btn-primary w-full justify-center">
              <Plus size={13} />{adding ? 'Adding…' : 'Add Competitor'}
            </button>
          </form>

          <div className="space-y-2">
            {competitors.length === 0 ? (
              <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
                <TrendingUp size={24} className="empty-state-icon" />
                <p className="text-xs">No competitors tracked yet.</p>
              </div>
            ) : (
              competitors.map(c => (
                <button key={c.id} data-testid="competitor-card" onClick={() => handleSelect(c)}
                  className="w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-2"
                  style={{
                    background: selected?.id === c.id ? 'var(--accent-soft)' : 'var(--bg-card)',
                    border: `1px solid ${selected?.id === c.id ? 'var(--accent-border)' : 'var(--border)'}`,
                  }}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: selected?.id === c.id ? 'var(--accent-2)' : 'var(--text-base)' }}>
                      {c.competitor_name || c.name}
                    </p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.competitor_channel_id}</p>
                  </div>
                  <button onClick={e => handleDelete(c.id, e)} className="btn btn-ghost btn-sm shrink-0">
                    <Trash2 size={12} />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card h-full flex items-center justify-center" style={{ minHeight: 300 }}>
              <div className="empty-state">
                <TrendingUp size={32} className="empty-state-icon" />
                <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No competitor selected</p>
                <p className="text-xs">Add a competitor and click on it to see their latest uploads.</p>
              </div>
            </div>
          ) : (
            <div data-testid="competitor-timeline" className="card p-5 space-y-4">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>
                Latest Uploads — <span style={{ color: 'var(--accent-2)' }}>{selected.competitor_name || selected.name}</span>
              </h2>

              {uploadsLoading ? (
                <div className="flex items-center gap-2 justify-center py-12 text-sm" style={{ color: 'var(--text-2)' }}>
                  <span className="spinner" />Loading real upload data…
                </div>
              ) : uploadsError ? (
                <div className="notice notice-amber"><AlertTriangle size={13} />{uploadsError}</div>
              ) : uploads.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 24, paddingBottom: 24 }}>
                  <p className="text-xs">No uploads found. Check the channel ID or add a YouTube API key in Settings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploads.map((up, i) => (
                    <div key={up.videoId || i} className="rounded-xl p-4 space-y-3"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start gap-3">
                        {up.thumbnail && (
                          <img src={up.thumbnail} alt={up.title} className="w-24 h-14 object-cover rounded-lg shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-base)' }}>{up.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtDate(up.publishedAt)}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-2)' }}>
                              <Eye size={11} />{fmt(up.views)}
                            </span>
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-2)' }}>
                              <ThumbsUp size={11} />{fmt(up.likes)}
                            </span>
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-2)' }}>
                              <MessageSquare size={11} />{fmt(up.comments)}
                            </span>
                            {up.videoId && (
                              <a href={`https://youtube.com/watch?v=${up.videoId}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs ml-auto" style={{ color: 'var(--accent)' }}>
                                Watch <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handleAnalyzeAngle(up, i)} disabled={angleLoading === i}
                          className="btn btn-sm" style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)', border: '1px solid var(--accent-border)' }}>
                          {angleLoading === i ? <span className="spinner" style={{ width: 11, height: 11 }} /> : <Zap size={11} />}
                          AI Angle
                        </button>
                        <button onClick={() => handleSaveAsIdea(up)} className="btn btn-secondary btn-sm">
                          <Bookmark size={11} />Save as Idea
                        </button>
                      </div>

                      {angles[i] && (
                        <div className="rounded-lg p-3 text-xs leading-relaxed"
                          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                          <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>AI Angle: </span>
                          <span style={{ color: 'var(--text-2)' }}>{angles[i]}</span>
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
