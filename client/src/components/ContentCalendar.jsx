import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_STYLES = {
  planned:  { bg: 'var(--accent)',  label: 'Planned'  },
  scripted: { bg: 'var(--violet)',  label: 'Scripted' },
  filming:  { bg: 'var(--amber)',   label: 'Filming'  },
  done:     { bg: 'var(--green)',   label: 'Done'     },
};

function pad(n) { return String(n).padStart(2, '0'); }

export function ContentCalendar({ toast }) {
  const { activeChannel } = useSettings();
  const [events, setEvents]           = useState([]);
  const [selected, setSelected]       = useState(null);
  const [eventStatus, setEventStatus] = useState('planned');
  const [eventNotes, setEventNotes]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [viewMode, setViewMode]       = useState('monthly');

  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (!activeChannel) return;
    fetch(`/api/calendar/events?channel_id=${activeChannel.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [activeChannel]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const dateStr  = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  /* ---- Monthly grid ---- */
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthCells  = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  /* ---- Weekly grid ---- */
  const getWeekDays = (offset = 0) => {
    const base = new Date();
    base.setDate(base.getDate() - base.getDay() + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), str: d.toISOString().slice(0, 10) };
    });
  };
  const weekDays = getWeekDays(weekOffset);

  const handleDrop = async (e, ds) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    let idea;
    try { idea = JSON.parse(raw); } catch { toast('Failed to schedule event.', 'error'); return; }
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_id: idea.id || null, title: idea.title, scheduled_date: ds, channel_id: activeChannel?.id, status: 'planned' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Failed to schedule event.', 'error');
        return;
      }
      const newEv = await res.json();
      setEvents(prev => [...prev, { ...newEv, title: idea.title, scheduled_date: ds }]);
      toast(`"${idea.title}" scheduled for ${ds}`, 'success');
    } catch { toast('Failed to schedule event.', 'error'); }
  };

  const handleSaveEvent = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/api/calendar/events/${selected.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: eventStatus, notes: eventNotes }),
      });
      setEvents(prev => prev.map(ev => ev.id === selected.id ? { ...ev, status: eventStatus, notes: eventNotes } : ev));
      toast('Event updated.', 'success');
      setSelected(null);
    } catch { toast('Failed to update event.', 'error'); }
    finally { setSaving(false); }
  };

  const DayCell = ({ ds, dayNum, label, compact = false }) => {
    const dayEvents = events.filter(ev => ev.scheduled_date === ds);
    const isToday   = ds === todayStr;
    const MAX_SHOW  = compact ? 1 : 2;
    const extra     = dayEvents.length - MAX_SHOW;

    return (
      <div onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, ds)}
        className="rounded-lg border transition"
        style={{
          minHeight: compact ? '5rem' : '6.5rem',
          padding: '6px',
          border: `1px solid ${isToday ? 'var(--accent-border)' : 'var(--border)'}`,
          background: isToday ? 'var(--accent-soft)' : 'var(--bg-elevated)',
        }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color: isToday ? 'var(--accent-2)' : 'var(--text-muted)' }}>
            {compact ? `${dayNum}` : dayNum}
          </span>
          {label && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>}
        </div>
        <div className="space-y-0.5">
          {dayEvents.slice(0, MAX_SHOW).map(ev => {
            const s = STATUS_STYLES[ev.status] || STATUS_STYLES.planned;
            return (
              <div key={ev.id} data-testid="calendar-event-card"
                onDoubleClick={() => { setSelected(ev); setEventStatus(ev.status || 'planned'); setEventNotes(ev.notes || ''); }}
                className="text-xs text-white px-1.5 py-0.5 rounded truncate cursor-pointer"
                style={{ background: s.bg }} title={ev.title}>
                {ev.title || 'Untitled'}
              </div>
            );
          })}
          {extra > 0 && (
            <div className="text-xs px-1.5 py-0.5 rounded text-center cursor-pointer"
              style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              +{extra} more
            </div>
          )}
          {dayEvents.length === 0 && (
            <div className="text-xs italic" style={{ color: 'var(--text-muted)', opacity: 0.5 }}></div>
          )}
        </div>
      </div>
    );
  };

  const prevNav = () => {
    if (viewMode === 'monthly') {
      if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
      else setViewMonth(m => m - 1);
    } else {
      setWeekOffset(o => o - 1);
    }
  };
  const nextNav = () => {
    if (viewMode === 'monthly') {
      if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
      else setViewMonth(m => m + 1);
    } else {
      setWeekOffset(o => o + 1);
    }
  };

  const navLabel = viewMode === 'monthly'
    ? `${MONTHS[viewMonth]} ${viewYear}`
    : `Week of ${new Date(weekDays[0].str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <div className="space-y-5 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">Plan and track your publishing schedule. Drag ideas onto dates.</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={prevNav} className="btn btn-ghost btn-sm"><ChevronLeft size={16} /></button>
          <h2 className="font-semibold text-sm flex-1 text-center" style={{ color: 'var(--text-base)' }}>{navLabel}</h2>
          <button onClick={nextNav} className="btn btn-ghost btn-sm"><ChevronRight size={16} /></button>
          <div className="tab-bar">
            <button className={`tab-item ${viewMode === 'monthly' ? 'active' : ''}`} onClick={() => setViewMode('monthly')}>Monthly</button>
            <button className={`tab-item ${viewMode === 'weekly' ? 'active' : ''}`} onClick={() => setViewMode('weekly')}>Weekly</button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => (
            <div key={d} className="text-center py-1 section-label">{d}</div>
          ))}
        </div>

        {/* Monthly grid */}
        {viewMode === 'monthly' && (
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;
              const ds = dateStr(viewYear, viewMonth, d);
              return <DayCell key={ds} ds={ds} dayNum={d} compact />;
            })}
          </div>
        )}

        {/* Weekly grid */}
        {viewMode === 'weekly' && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <DayCell key={day.str} ds={day.str} dayNum={day.d}
                label={DAYS[new Date(day.str + 'T12:00:00').getDay()]} />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap pt-1">
          {Object.entries(STATUS_STYLES).map(([status, { bg, label }]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: bg }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>Double-click to edit</span>
        </div>
      </div>

      {/* Event modal */}
      {selected && (
        <div data-testid="event-detail-modal" className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="modal-box w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>{selected.title || 'Untitled Event'}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.scheduled_date}</p>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm"><X size={15} /></button>
            </div>
            <div className="space-y-1.5">
              <label className="section-label">Status</label>
              <select data-testid="event-status-select" className="app-input"
                value={eventStatus} onChange={e => setEventStatus(e.target.value)}>
                <option value="planned">Planned</option>
                <option value="scripted">Scripted</option>
                <option value="filming">Filming</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="section-label">Notes</label>
              <textarea id="event-notes-input" className="app-input h-24 resize-none"
                value={eventNotes} onChange={e => setEventNotes(e.target.value)} placeholder="Add notes…" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveEvent} disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <span className="spinner" /> : null}{saving ? 'Saving…' : 'Save Event'}
              </button>
              <button onClick={() => setSelected(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
