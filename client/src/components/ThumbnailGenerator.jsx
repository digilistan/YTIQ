import React, { useState, useEffect } from 'react';
import { ImageIcon, Sparkles, AlertTriangle, Palette, Save, Trash2, Eye, Download, Maximize2, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

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

function getImageUrl(mediaItem) {
  if (!mediaItem) return '';
  if (typeof mediaItem === 'string') {
    if (mediaItem.startsWith('data:') || mediaItem.startsWith('http')) {
      return mediaItem;
    }
    return `data:image/png;base64,${mediaItem}`;
  }
  const bytes = mediaItem?.image?.generatedImage?.imageBytes || 
                mediaItem?.generatedImage?.imageBytes ||
                mediaItem?.imageBytes ||
                mediaItem?.image?.generatedImage?.encodedImage ||
                mediaItem?.encodedImage;
  if (bytes) {
    return `data:image/png;base64,${bytes}`;
  }
  const url = mediaItem?.image?.generatedImage?.fifeUrl ||
              mediaItem?.image?.generatedImage?.uri ||
              mediaItem?.generatedImage?.uri ||
              mediaItem?.uri ||
              mediaItem?.url ||
              mediaItem?.image?.url;
  if (url) {
    return url;
  }
  return '';
}

export function ThumbnailGenerator({ toast }) {
  const { activeChannel } = useSettings();
  const [topic, setTopic]     = useState('');
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState([]);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [history, setHistory] = useState([]);
  const [extensionActive, setExtensionActive] = useState(false);
  const [renderingIndex, setRenderingIndex] = useState(null);
  const [renderStatus, setRenderStatus] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewConcept, setPreviewConcept] = useState(null);

  const handleDownload = async (imageUrl, conceptText) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail-${conceptText.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast('Download started!', 'success');
    } catch (e) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.target = '_blank';
      a.download = 'thumbnail.png';
      a.click();
      toast('Opened image to save', 'info');
    }
  };

  const fetchHistory = async () => {
    if (!activeChannel?.id) {
      setHistory([]);
      return;
    }
    try {
      const res = await fetch(`/api/thumbnails?channel_id=${activeChannel.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchHistory();
  }, [activeChannel?.id]);

  useEffect(() => {
    const checkExtension = async () => {
      try {
        const res = await fetch('/api/nanobanana/health');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok' && data.pipe_alive) {
            setExtensionActive(true);
            return;
          }
        }
        setExtensionActive(false);
      } catch (_) {
        setExtensionActive(false);
      }
    };
    checkExtension();
    const interval = setInterval(checkExtension, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRenderImage = async (concept, index) => {
    if (renderingIndex !== null) return;
    setRenderingIndex(index);
    setRenderStatus('Submitting job...');
    try {
      const res = await fetch('/api/nanobanana/generate?async=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `highly clickable youtube thumbnail, ${concept.concept}, style ${concept.style}, colors ${concept.colors?.join(' and ')}`,
          aspect_ratio: 'landscape',
          count: 3
        })
      });
      if (!res.ok) {
        throw new Error('Failed to start render job');
      }
      const data = await res.json();
      const jobId = data.job_id;
      if (!jobId) {
        throw new Error('No job ID returned from host');
      }
      
      setRenderStatus('Queueing generation in Google Flow...');
      
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 120) {
          clearInterval(pollInterval);
          setRenderingIndex(null);
          toast('Rendering timed out.', 'error');
          return;
        }
        try {
          const pollRes = await fetch(`/api/nanobanana/jobs/${jobId}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === 'done') {
               clearInterval(pollInterval);
               const mediaArray = pollData.result.media;
               if (mediaArray && mediaArray.length > 0) {
                 setConcepts(prev => {
                   const next = [...prev];
                   next[index] = { 
                     ...next[index], 
                     renderedImages: mediaArray, 
                     selectedImageIndex: 0,
                     renderedImage: mediaArray[0]
                   };
                   return next;
                 });
                 toast(`Rendered ${mediaArray.length} options!`, 'success');
               } else {
                 toast('No image returned from renderer.', 'error');
               }
               setRenderingIndex(null);
            } else if (pollData.status === 'running') {
              setRenderStatus('Generating image in Google Flow...');
            } else if (pollData.status === 'error') {
              clearInterval(pollInterval);
              setRenderingIndex(null);
              toast(`Rendering failed: ${pollData.error || 'Unknown error'}`, 'error');
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);
    } catch (error) {
      setRenderingIndex(null);
      toast(error.message || 'Render request failed', 'error');
    }
  };

  const handleSave = async () => {
    if (concepts.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        channel_id: activeChannel?.id,
        concepts: concepts
      };
      const res = await fetch('/api/thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast('Thumbnail concepts saved!', 'success');
        fetchHistory();
      } else {
        toast('Failed to save thumbnail concepts.', 'error');
      }
    } catch {
      toast('Failed to save thumbnail concepts.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadConcepts = (record) => {
    setConcepts(record.concepts || []);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/thumbnails/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        toast('Thumbnail concepts removed.', 'success');
      } else {
        toast('Failed to delete thumbnail concepts.', 'error');
      }
    } catch {
      toast('Failed to delete thumbnail concepts.', 'error');
    }
  };

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
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-1.5 rounded-full shadow-sm">
          <span className={`inline-block w-2 h-2 rounded-full ${extensionActive ? 'bg-[var(--green)]' : 'bg-[var(--text-muted)] animate-pulse'}`} />
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: extensionActive ? 'var(--text-base)' : 'var(--text-muted)' }}>
            {extensionActive ? 'NANOBANANA ACTIVE' : 'NANOBANANA OFFLINE'}
          </span>
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
        <div className="space-y-4">
          {!extensionActive && (
            <div className="notice notice-amber text-xs flex items-center gap-2">
              <AlertTriangle size={13} className="shrink-0" />
              <span>
                To generate original images, open Chrome and activate the <strong>NanoBanana Chrome Extension</strong> side panel at <code>labs.google/fx/tools/flow</code>.
              </span>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn btn-secondary">
              <Save size={13} /> {saving ? 'Saving...' : 'Save Concept Brief'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {concepts.map((c, i) => {
              const styleInfo = STYLE_COLORS[c.style] || {};
              return (
                <div key={i} data-testid="thumbnail-concept-card"
                  className="card overflow-hidden flex flex-col">
                  {/* Visual preview area */}
                  <div className="h-40 flex flex-col items-center justify-center gap-3 relative p-4 overflow-hidden group"
                    style={{ background: 'var(--bg-elevated)' }}>
                    {c.renderedImages && c.renderedImages.length > 0 ? (
                      <>
                        <img 
                          src={getImageUrl(c.renderedImages[c.selectedImageIndex || 0] || c.renderedImage)} 
                          alt="Rendered thumbnail" 
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                        
                        {/* Hover Actions Overlay */}
                        <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2.5 z-10 backdrop-blur-[2px]">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const imgUrl = getImageUrl(c.renderedImages[c.selectedImageIndex || 0] || c.renderedImage);
                              setPreviewImage(imgUrl);
                              setPreviewConcept(c);
                            }}
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 shadow-lg hover:scale-110 active:scale-95"
                            title="Preview image"
                          >
                            <Maximize2 size={15} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const imgUrl = getImageUrl(c.renderedImages[c.selectedImageIndex || 0] || c.renderedImage);
                              handleDownload(imgUrl, c.concept);
                            }}
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/20 shadow-lg hover:scale-110 active:scale-95"
                            title="Download image"
                          >
                            <Download size={15} />
                          </button>
                        </div>

                        {c.renderedImages.length > 1 && (
                          <div className="absolute bottom-2 left-2 flex gap-1 z-20 bg-slate-950/75 p-1 rounded-lg backdrop-blur-md border border-white/10 shadow-lg">
                            {c.renderedImages.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConcepts(prev => {
                                    const next = [...prev];
                                    next[i] = { ...next[i], selectedImageIndex: idx };
                                    return next;
                                  });
                                }}
                                className={`rounded text-[10px] font-black flex items-center justify-center transition ${
                                  (c.selectedImageIndex || 0) === idx 
                                    ? 'bg-[var(--accent)] text-white' 
                                    : 'bg-white/20 text-white/80 hover:bg-white/40'
                                }`}
                                style={{ width: 18, height: 18 }}
                              >
                                {idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : renderingIndex === i ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--bg-card)]/85 backdrop-blur-sm z-10 p-3 text-center">
                        <span className="spinner animate-spin" />
                        <span className="text-[9px] font-medium text-[var(--text-2)] animate-pulse leading-snug">{renderStatus}</span>
                      </div>
                    ) : (
                      <>
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
                        {extensionActive && renderingIndex === null && (
                          <button
                            onClick={() => handleRenderImage(c, i)}
                            className="absolute bottom-2 right-2 btn btn-primary text-[10px] py-1 px-2.5 rounded flex items-center gap-1 shadow-md hover:-translate-y-0.5 transition-all"
                            style={{ height: 24, borderRadius: 6, fontWeight: 700 }}
                          >
                            <Sparkles size={10} /> Render
                          </button>
                        )}
                      </>
                    )}
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
        </div>
      )}

      {!loading && concepts.length === 0 && !error && (
        <div className="empty-state">
          <ImageIcon size={36} className="empty-state-icon" />
          <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No concepts yet</p>
          <p className="text-xs">Enter your video topic to generate 3 AI thumbnail design concepts.</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ImageIcon size={14} style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Concept History</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map(item => {
              const firstConcept = item.concepts?.[0]?.concept || 'Thumbnail Concepts Brief';
              return (
                <div key={item.id} className="card p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent)] transition"
                  onClick={() => handleLoadConcepts(item)}>
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-base)' }}>{firstConcept}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {item.concepts?.length || 0} concepts · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="btn btn-ghost btn-sm text-[var(--red)] hover:bg-[var(--red-soft)]">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[9999] fade-in p-4"
          onClick={() => { setPreviewImage(null); setPreviewConcept(null); }}>
          <div className="relative max-w-4xl w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button 
              onClick={() => { setPreviewImage(null); setPreviewConcept(null); }}
              className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-slate-900/50 hover:bg-slate-900/80 text-white flex items-center justify-center transition border border-white/10"
            >
              <X size={15} />
            </button>

            {/* Image Container */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[75vh]">
              <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
            </div>

            {/* Info Panel */}
            {previewConcept && (
              <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg-elevated)]">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--accent)]">Thumbnail Design Concept</span>
                    <h3 className="text-base font-semibold leading-snug mt-1" style={{ color: 'var(--text-base)' }}>
                      {previewConcept.concept}
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-[var(--border)]">
                    <p className="text-xs flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Design Style:</span>
                      <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-[var(--bg-card)] border border-[var(--border)]" style={{ color: STYLE_COLORS[previewConcept.style]?.text }}>
                        {previewConcept.style}
                      </span>
                    </p>
                    <p className="text-xs flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Target Colors:</span>
                      <span className="font-semibold" style={{ color: 'var(--text-base)' }}>
                        {previewConcept.colors?.join(', ')}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--border)] mt-6">
                  <button 
                    onClick={() => handleDownload(previewImage, previewConcept.concept)}
                    className="w-full btn btn-primary flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Download Thumbnail
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
