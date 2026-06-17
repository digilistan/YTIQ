import React, { useState, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
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

  const now = new Date();
  const [viewYear, setViewYear]   = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    if (!activeChannel) return;
    fetch(`/api/calendar/events?channel_id=${activeChannel.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [activeChannel]);

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells       = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const dateStr     = (d) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
  const todayStr    = new Date().toISOString().slice(0, 10);

  const handleDrop = async (e, d) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const idea = JSON.parse(raw);
      const ds   = dateStr(d);
      const res  = await fetch('/api/calendar/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_id: idea.id, scheduled_date: ds, channel_id: activeChannel?.id, status: 'planned' }),
      });
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

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">Plan and track your publishing schedule. Drag ideas onto dates.</p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="btn btn-ghost btn-sm"><ChevronLeft size={16} /></button>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-base)' }}>
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="btn btn-ghost btn-sm"><ChevronRight size={16} /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => (
            <div key={d} className="text-center py-1 section-label">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const ds         = dateStr(d);
            const dayEvents  = events.filter(ev => ev.scheduled_date === ds);
            const isToday    = ds === todayStr;

            return (
              <div key={ds} data-date={ds}
                onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, d)}
                className="min-h-[5rem] p-1.5 rounded-lg border transition"
                style={{
                  border: isToday ? '1px solid var(--accent-border)' : '1px solid var(--border)',
                  background: isToday ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                }}>
                <span className="text-xs font-semibold block mb-1"
                  style={{ color: isToday ? 'var(--accent-2)' : 'var(--text-muted)' }}>{d}</span>
                <div className="space-y-0.5">
                  {dayEvents.map(ev => {
                    const style = STATUS_STYLES[ev.status] || STATUS_STYLES.planned;
                    return (
                      <div key={ev.id} data-testid="calendar-event-card"
                        onDoubleClick={() => { setSelected(ev); setEventStatus(ev.status || 'planned'); setEventNotes(ev.notes || ''); }}
                        className="text-xs text-white px-1.5 py-0.5 rounded truncate cursor-pointer"
                        style={{ background: style.bg, opacity: 0.9 }}
                        title={ev.title}>
                        {ev.title || 'Untitled'}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

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
