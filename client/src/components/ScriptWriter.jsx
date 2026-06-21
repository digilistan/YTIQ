import React, { useState, useEffect, useRef } from 'react';
import { FileText, Sparkles, FileDown, Save, Download, AlertTriangle, Clock, Hash, ChevronRight, Trash2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

function exportMarkdown(script) {
  const lines = [
    `# ${script.title}`, '',
    `**Hook:** ${script.hook}`, '',
    ...(script.sections || []).flatMap(s => [`## ${s.heading}`, '', s.content, '']),
    `---`, `Est. duration: ${script.estimatedDuration || 'N/A'} · Words: ${script.wordCount || 'N/A'}`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${script.title.toLowerCase().replace(/\s+/g, '-')}.md`; a.click();
  URL.revokeObjectURL(url);
}

async function exportPDF(script) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, M = 18, CW = W - M * 2;
  let y = M;
  const addText = (text, opts = {}) => {
    const { size = 11, bold = false, color = [51, 65, 85], lh = 6, maxW = CW } = opts;
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.splitTextToSize(String(text || ''), maxW).forEach(line => {
      if (y > 270) { doc.addPage(); y = M; }
      doc.text(line, M, y); y += lh;
    });
  };
  const gap = (h = 4) => { y += h; };

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('CSD Script', M, 18);
  y = 38;
  addText(script.title, { size: 16, bold: true, color: [30, 41, 59] }); gap(3);
  if (script.hook) {
    addText('HOOK', { size: 8, bold: true, color: [99, 102, 241] }); gap(1);
    addText(script.hook, { size: 11, color: [51, 65, 85] }); gap(5);
  }
  (script.sections || []).forEach(sec => {
    addText(sec.heading, { size: 12, bold: true, color: [30, 41, 59] }); gap(1.5);
    addText(sec.content, { size: 10, color: [71, 85, 105] }); gap(5);
  });
  gap(3); doc.setDrawColor(226, 232, 240); doc.line(M, y, W - M, y); gap(3);
  addText(`Est. duration: ${script.estimatedDuration || 'N/A'}  ·  Word count: ${script.wordCount || 'N/A'}`, { size: 9, color: [148, 163, 184] });
  doc.save(`${script.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

const OUTLINE_ITEMS = (script) => [
  { id: 'title', label: 'Title' },
  ...(script.hook ? [{ id: 'hook', label: 'Hook' }] : []),
  ...(script.sections || []).map((s, i) => ({ id: `sec-${i}`, label: s.heading })),
  ...(script.factCheck ? [{ id: 'factcheck', label: 'Fact-Check' }] : []),
];

export function ScriptWriter({ activeIdeaForScript, toast }) {
  const { activeChannel } = useSettings();
  const [title, setTitle]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [script, setScript]     = useState(null);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeSection, setActiveSection] = useState('title');
  const [savedScripts, setSavedScripts] = useState([]);
  const contentRef = useRef(null);

  const fetchHistory = async () => {
    if (!activeChannel?.id) {
      setSavedScripts([]);
      return;
    }
    try {
      const res = await fetch(`/api/scripts?channel_id=${activeChannel.id}`);
      if (res.ok) {
        const data = await res.json();
        setSavedScripts(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (activeIdeaForScript?.title) setTitle(activeIdeaForScript.title);
  }, [activeIdeaForScript]);

  useEffect(() => {
    fetchHistory();
  }, [activeChannel?.id]);

  const handleLoadScript = (savedScript) => {
    try {
      const parsed = JSON.parse(savedScript.content);
      setScript(parsed);
      setTitle(parsed.title || savedScript.title);
    } catch (_) {
      // Fallback if content was saved as plain text
      setScript({
        title: savedScript.title,
        hook: '',
        sections: [{ heading: 'Content', content: savedScript.content }],
        estimatedDuration: savedScript.estimated_duration || 'N/A',
        wordCount: savedScript.word_count || 0
      });
      setTitle(savedScript.title);
    }
    setActiveSection('title');
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedScripts(prev => prev.filter(s => s.id !== id));
        toast('Script deleted.', 'success');
      } else {
        toast('Failed to delete script.', 'error');
      }
    } catch {
      toast('Failed to delete script.', 'error');
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) { toast('Enter a video title first.', 'warning'); return; }
    setLoading(true); setError(null); setScript(null); setActiveSection('title');
    try {
      const res  = await fetch(`/api/ai/generate-script?title=${encodeURIComponent(title.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Script generation failed');
      
      let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch {
          // Fallback structure for raw text scripts
          parsedData = {
            title: title,
            hook: "Intro Hook",
            sections: [
              { heading: "Script Content", content: data }
            ],
            estimatedDuration: "Estimated 2-3 mins",
            wordCount: data.split(/\s+/).filter(Boolean).length
          };
        }
      }

      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('AI returned an invalid script format.');
      }

      setScript(parsedData);
    } catch (err) { setError(err.message); toast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!script) return;
    setSaving(true);
    try {
      await fetch('/api/scripts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: script.title,
          content: JSON.stringify(script),
          channel_id: activeChannel?.id,
          idea_id: activeIdeaForScript?.id,
        }),
      });
      toast('Script saved!', 'success');
      fetchHistory();
    } catch { toast('Failed to save script.', 'error'); }
    finally { setSaving(false); }
  };

  const scrollTo = (id) => {
    setActiveSection(id);
    if (!contentRef.current) return;
    const el = contentRef.current.querySelector(`[data-section="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const outline = script ? OUTLINE_ITEMS(script) : [];

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Script Writer</h1>
          <p className="page-subtitle">Generate a full AI-written video script from a title.</p>
        </div>
      </div>

      {/* Input */}
      <div className="card p-5 space-y-3">
        <label className="section-label">Video Title</label>
        <div className="flex gap-2">
          <input data-testid="script-title-input" className="app-input flex-1"
            placeholder="e.g. Top 5 Productivity Hacks Using AI in 2025"
            value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
          <button data-testid="generate-script-btn" onClick={handleGenerate}
            disabled={loading || !title.trim()} className="btn btn-primary">
            {loading ? <><span className="spinner" />Writing…</> : <><Sparkles size={14} />Generate</>}
          </button>
        </div>
      </div>

      {error && <div className="notice notice-red"><AlertTriangle size={13} />{error}</div>}

      {script && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Left: Outline panel */}
          <div className="lg:col-span-1">
            <div className="card p-4 sticky top-6 space-y-1">
              <p className="section-label mb-3">Outline</p>
              {outline.map(item => (
                <button key={item.id} onClick={() => scrollTo(item.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center gap-2"
                  style={{
                    background: activeSection === item.id ? 'var(--accent-soft)' : 'transparent',
                    color: activeSection === item.id ? 'var(--accent-2)' : 'var(--text-2)',
                    fontWeight: activeSection === item.id ? 600 : 400,
                  }}>
                  <ChevronRight size={11} style={{ opacity: activeSection === item.id ? 1 : 0.4 }} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}

              <div className="pt-3 space-y-1.5 border-t mt-3" style={{ borderColor: 'var(--border)' }}>
                {script.estimatedDuration && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={11} />{script.estimatedDuration}
                  </div>
                )}
                {script.wordCount && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Hash size={11} />{script.wordCount?.toLocaleString()} words
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Script content + action bar */}
          <div className="lg:col-span-3 space-y-4">
            {/* Action bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button data-testid="save-script-btn" onClick={handleSave} disabled={saving} className="btn btn-secondary">
                <Save size={13} />{saving ? 'Saving…' : 'Save'}
              </button>
              <button data-testid="export-pdf-btn" onClick={async () => {
                setExporting(true);
                try { await exportPDF(script); toast('PDF exported!', 'success'); }
                catch (err) { toast('PDF export failed: ' + err.message, 'error'); }
                finally { setExporting(false); }
              }} disabled={exporting} className="btn btn-primary">
                {exporting ? <span className="spinner" /> : <FileDown size={13} />}
                {exporting ? 'Exporting…' : 'Export PDF'}
              </button>
              <button data-testid="export-md-btn" onClick={() => { exportMarkdown(script); toast('Markdown exported!', 'success'); }}
                className="btn btn-secondary">
                <Download size={13} />Markdown
              </button>
            </div>

            {/* Script body */}
            <div ref={contentRef} className="card divide-y" style={{ borderColor: 'var(--border)' }}>
              <div data-section="title" className="p-5">
                <p className="section-label mb-1">Title</p>
                <h2 className="font-bold text-base" style={{ color: 'var(--text-base)' }}>{script.title}</h2>
              </div>
              {script.hook && (
                <div data-section="hook" className="p-5">
                  <p className="section-label mb-2" style={{ color: 'var(--amber)' }}>Hook</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{script.hook}</p>
                </div>
              )}
              {(script.sections || []).map((sec, i) => (
                <div key={i} data-section={`sec-${i}`} className="p-5">
                  <p className="section-label mb-2" style={{ color: 'var(--accent-2)' }}>{sec.heading}</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-2)' }}>{sec.content}</p>
                </div>
              ))}
              {script.factCheck && (
                <div data-section="factcheck" className="p-5 space-y-4">
                  <p className="section-label mb-2" style={{ color: 'var(--rose)' }}>Sensei Fact-Check Report</p>
                  <div className={`notice ${
                    script.factCheck.status === 'Verified' 
                      ? 'notice-green' 
                      : script.factCheck.status === 'Warning'
                      ? 'notice-amber'
                      : 'notice-red'
                  } flex gap-2.5 items-start p-4 rounded-xl`}>
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider mb-1" style={{ color: 'inherit' }}>
                        Scan Status: {script.factCheck.status || 'Warning'}
                      </h4>
                      <p className="text-xs opacity-90" style={{ color: 'inherit' }}>
                        {script.factCheck.status === 'Verified' 
                          ? 'This script has been scanned and verified. All details match factual data.' 
                          : 'Potential clickbait inaccuracies or misleading claims were detected during draft review.'}
                      </p>
                    </div>
                  </div>
                  
                  {script.factCheck.findings && script.factCheck.findings.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-semibold text-[var(--text-base)]">Scan Findings:</h5>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-muted)]">
                        {script.factCheck.findings.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {script.factCheck.corrections && script.factCheck.corrections.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <h5 className="text-xs font-semibold text-[var(--text-base)]">Actionable Corrections:</h5>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-muted)]">
                        {script.factCheck.corrections.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !script && !error && (
        <div className="empty-state">
          <FileText size={36} className="empty-state-icon" />
          <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No script yet</p>
          <p className="text-xs">Enter a video title and generate a full AI-written script with hook and sections.</p>
        </div>
      )}

      {savedScripts.length > 0 && (
        <div className="space-y-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: 'var(--accent)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Saved Scripts</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedScripts.map(s => (
              <div key={s.id} className="card p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent)] transition"
                onClick={() => handleLoadScript(s)}>
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-base)' }}>{s.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {s.estimated_duration ? `${s.estimated_duration} · ` : ''}{s.word_count ? `${s.word_count} words` : '0 words'}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="btn btn-ghost btn-sm text-[var(--red)] hover:bg-[var(--red-soft)]">
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
