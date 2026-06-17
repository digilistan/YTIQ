import React, { useState, useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_COLORS = {
  planned:  'bg-indigo-600',
  scripted: 'bg-violet-600',
  filming:  'bg-amber-600',
  done:     'bg-emerald-600',
};

function pad(n) { return String(n).padStart(2, '0'); }

export function ContentCalendar({ toast }) {
  const { activeChannel } = useSettings();
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [eventStatus, setEventStatus] = useState('planned');
  const [eventNotes, setEventNotes] = useState('');
  const [saving, setSaving] = useState(false);

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

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) => `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;

  const handleDrop = async (e, d) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const idea = JSON.parse(raw);
      const ds = dateStr(d);
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_id: idea.id, scheduled_date: ds, channel_id: activeChannel?.id, status: 'planned' })
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: eventStatus, notes: eventNotes })
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Content Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">Plan and track your publishing schedule.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">‹</button>
          <h2 className="text-base font-semibold text-slate-200">{MONTHS[viewMonth]} {viewYear}</h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-600 uppercase py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const ds = dateStr(d);
            const dayEvents = events.filter(ev => ev.scheduled_date === ds);
            const isToday = new Date().toISOString().slice(0, 10) === ds;

            return (
              <div
                key={ds}
                data-date={ds}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, d)}
                className={`min-h-20 p-1.5 rounded-lg border transition ${
                  isToday ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
                }`}
              >
                <span className={`text-xs font-semibold block mb-1 ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>{d}</span>
                <div className="space-y-0.5">
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      data-testid="calendar-event-card"
                      onDoubleClick={() => {
                        setSelected(ev);
                        setEventStatus(ev.status || 'planned');
                        setEventNotes(ev.notes || '');
                      }}
                      className={`text-xs text-white px-1.5 py-0.5 rounded truncate cursor-pointer ${STATUS_COLORS[ev.status] ?? 'bg-indigo-600'}`}
                      title={ev.title}
                    >
                      {ev.title || 'Untitled'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-1">
          {Object.entries(STATUS_COLORS).map(([status, cls]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
              <span className="text-xs text-slate-500 capitalize">{status}</span>
            </div>
          ))}
          <span className="text-xs text-slate-600 ml-auto">Double-click an event to edit</span>
        </div>
      </div>

      {/* Event detail modal */}
      {selected && (
        <div data-testid="event-detail-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">{selected.title || 'Untitled Event'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selected.scheduled_date}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 transition">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Status</label>
              <select
                data-testid="event-status-select"
                className="glass-input text-sm"
                value={eventStatus}
                onChange={e => setEventStatus(e.target.value)}
              >
                <option value="planned">Planned</option>
                <option value="scripted">Scripted</option>
                <option value="filming">Filming</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Notes</label>
              <textarea
                id="event-notes-input"
                className="glass-input text-sm h-24 resize-none"
                value={eventNotes}
                onChange={e => setEventNotes(e.target.value)}
                placeholder="Add notes…"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveEvent}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                {saving ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : null}
                {saving ? 'Saving…' : 'Save Event'}
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
