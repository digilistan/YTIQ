import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Download, FileDown, Save, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

function exportMarkdown(script) {
  const lines = [
    `# ${script.title}`,
    '',
    `**Hook:** ${script.hook}`,
    '',
    ...(script.sections || []).flatMap(s => [`## ${s.heading}`, '', s.content, '']),
    `---`,
    `Estimated duration: ${script.estimatedDuration || 'N/A'} · Word count: ${script.wordCount || 'N/A'}`
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${script.title.toLowerCase().replace(/\s+/g, '-')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportPDF(script) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const addText = (text, opts = {}) => {
    const { size = 11, bold = false, color = [51, 65, 85], lineH = 6, maxW = CONTENT_W } = opts;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), maxW);
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); y = MARGIN; }
      doc.text(line, MARGIN, y);
      y += lineH;
    });
    return y;
  };

  const gap = (h = 4) => { y += h; };

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('YTIq Script', MARGIN, 18);

  y = 38;
  addText(script.title, { size: 16, bold: true, color: [30, 41, 59] });
  gap(3);

  if (script.hook) {
    addText('HOOK', { size: 8, bold: true, color: [99, 102, 241] });
    gap(1);
    addText(script.hook, { size: 11, color: [51, 65, 85] });
    gap(5);
  }

  (script.sections || []).forEach(sec => {
    addText(sec.heading, { size: 12, bold: true, color: [30, 41, 59] });
    gap(1.5);
    addText(sec.content, { size: 10, color: [71, 85, 105] });
    gap(5);
  });

  gap(3);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  gap(3);
  addText(`Est. duration: ${script.estimatedDuration || 'N/A'}   ·   Word count: ${script.wordCount || 'N/A'}`, {
    size: 9, color: [148, 163, 184]
  });

  doc.save(`${script.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export function ScriptWriter({ activeIdeaForScript, toast }) {
  const { activeChannel } = useSettings();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (activeIdeaForScript?.title) setTitle(activeIdeaForScript.title);
  }, [activeIdeaForScript]);

  const handleGenerate = async () => {
    if (!title.trim()) { toast('Enter a video title first.', 'warning'); return; }
    setLoading(true);
    setError(null);
    setScript(null);
    try {
      const res = await fetch(`/api/ai/generate-script?title=${encodeURIComponent(title.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Script generation failed');
      setScript(data);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!script) return;
    setSaving(true);
    try {
      await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: script.title,
          content: [script.hook, ...(script.sections || []).map(s => `${s.heading}\n${s.content}`)].join('\n\n'),
          channel_id: activeChannel?.id,
          idea_id: activeIdeaForScript?.id
        })
      });
      toast('Script saved successfully!', 'success');
    } catch {
      toast('Failed to save script.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!script) return;
    setExporting(true);
    try {
      await exportPDF(script);
      toast('PDF exported!', 'success');
    } catch (err) {
      toast('PDF export failed: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportMD = () => {
    if (!script) return;
    exportMarkdown(script);
    toast('Markdown exported!', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Script Writer</h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate a full video script from a title.</p>
      </div>

      {/* Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Video Title</label>
        <div className="flex gap-3">
          <input
            data-testid="script-title-input"
            type="text"
            className="glass-input text-sm flex-1"
            placeholder="e.g. Top 5 Vite 6 Features You Need to Know"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          />
          <button
            data-testid="generate-script-btn"
            onClick={handleGenerate}
            disabled={loading || !title.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shrink-0"
          >
            {loading ? <span className="spinner" /> : <Sparkles size={14} />}
            {loading ? 'Writing…' : 'Generate Script'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={14} className="shrink-0" />{error}
        </div>
      )}

      {/* Script output */}
      {script && (
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              data-testid="save-script-btn"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Save size={13} />{saving ? 'Saving…' : 'Save'}
            </button>
            <button
              data-testid="export-pdf-btn"
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {exporting ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : <FileDown size={13} />}
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <button
              data-testid="export-md-btn"
              onClick={handleExportMD}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Download size={13} />Export Markdown
            </button>
          </div>

          {/* Script content */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
            {/* Header */}
            <div className="p-5">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Title</p>
              <h2 className="text-lg font-bold text-slate-100">{script.title}</h2>
              <div className="flex gap-4 mt-2">
                {script.estimatedDuration && (
                  <span className="text-xs text-slate-500">{script.estimatedDuration}</span>
                )}
                {script.wordCount && (
                  <span className="text-xs text-slate-500">{script.wordCount.toLocaleString()} words</span>
                )}
              </div>
            </div>

            {/* Hook */}
            {script.hook && (
              <div className="p-5">
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">Hook</p>
                <p className="text-sm text-slate-300 leading-relaxed">{script.hook}</p>
              </div>
            )}

            {/* Sections */}
            {(script.sections || []).map((sec, i) => (
              <div key={i} className="p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{sec.heading}</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{sec.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !script && !error && (
        <div className="text-center py-16 text-slate-600">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Enter a title and generate a full AI-written script.</p>
        </div>
      )}
    </div>
  );
}
