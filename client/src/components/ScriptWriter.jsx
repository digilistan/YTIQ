import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, FileDown, Save, Download, AlertTriangle, Clock, Hash } from 'lucide-react';
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
  doc.text('YTIq Script', M, 18);
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

export function ScriptWriter({ activeIdeaForScript, toast }) {
  const { activeChannel } = useSettings();
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(false);
  const [script, setScript]   = useState(null);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (activeIdeaForScript?.title) setTitle(activeIdeaForScript.title);
  }, [activeIdeaForScript]);

  const handleGenerate = async () => {
    if (!title.trim()) { toast('Enter a video title first.', 'warning'); return; }
    setLoading(true); setError(null); setScript(null);
    try {
      const res  = await fetch(`/api/ai/generate-script?title=${encodeURIComponent(title.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Script generation failed');
      setScript(data);
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
          content: [script.hook, ...(script.sections || []).map(s => `${s.heading}\n${s.content}`)].join('\n\n'),
          channel_id: activeChannel?.id,
          idea_id: activeIdeaForScript?.id,
        }),
      });
      toast('Script saved!', 'success');
    } catch { toast('Failed to save script.', 'error'); }
    finally { setSaving(false); }
  };

  const handleExportPDF = async () => {
    if (!script) return;
    setExporting(true);
    try { await exportPDF(script); toast('PDF exported!', 'success'); }
    catch (err) { toast('PDF export failed: ' + err.message, 'error'); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Script Writer</h1>
          <p className="page-subtitle">Generate a full AI-written video script from a title.</p>
        </div>
      </div>

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
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button data-testid="save-script-btn" onClick={handleSave} disabled={saving} className="btn btn-secondary">
              <Save size={13} />{saving ? 'Saving…' : 'Save'}
            </button>
            <button data-testid="export-pdf-btn" onClick={handleExportPDF} disabled={exporting} className="btn btn-primary">
              {exporting ? <span className="spinner" /> : <FileDown size={13} />}
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <button data-testid="export-md-btn" onClick={() => { exportMarkdown(script); toast('Markdown exported!', 'success'); }}
              className="btn btn-secondary">
              <Download size={13} />Markdown
            </button>
            <div className="ml-auto flex items-center gap-4">
              {script.estimatedDuration && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={11} />{script.estimatedDuration}
                </span>
              )}
              {script.wordCount && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Hash size={11} />{script.wordCount?.toLocaleString()} words
                </span>
              )}
            </div>
          </div>

          {/* Script content */}
          <div className="card divide-y" style={{ borderColor: 'var(--border)' }}>
            <div className="p-5">
              <p className="section-label mb-1">Title</p>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-base)' }}>{script.title}</h2>
            </div>

            {script.hook && (
              <div className="p-5">
                <p className="section-label mb-2" style={{ color: 'var(--amber)' }}>Hook</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{script.hook}</p>
              </div>
            )}

            {(script.sections || []).map((sec, i) => (
              <div key={i} className="p-5">
                <p className="section-label mb-2" style={{ color: 'var(--accent-2)' }}>{sec.heading}</p>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-2)' }}>{sec.content}</p>
              </div>
            ))}
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
    </div>
  );
}
