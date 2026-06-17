import React from 'react';
import {
  LayoutDashboard, Search, Lightbulb, FileText, Sparkles,
  ImageIcon, CalendarDays, TrendingUp, Settings, ChevronRight
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'niche',       label: 'Niche Explorer', icon: Search },
  { id: 'ideas',       label: 'Video Ideas',    icon: Lightbulb },
  { id: 'scripts',     label: 'Script Writer',  icon: FileText },
  { id: 'seo',         label: 'SEO Optimizer',  icon: Sparkles },
  { id: 'thumbnails',  label: 'Thumbnails',     icon: ImageIcon },
  { id: 'calendar',    label: 'Calendar',       icon: CalendarDays },
  { id: 'competitors', label: 'Competitors',    icon: TrendingUp },
];

export function Sidebar({ activeTab, setActiveTab, onSettingsOpen }) {
  const { settings, channels, activeChannel, setActiveChannel } = useSettings();

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm">Y</span>
          </div>
          <span className="font-bold text-base text-slate-100 tracking-tight">YTIq</span>
          <span className="ml-auto text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded-md">Pro</span>
        </div>
      </div>

      {/* Channel switcher */}
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-xs font-medium text-slate-500 mb-1.5">Active channel</p>
        {channels.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No channels yet</p>
        ) : (
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
            value={activeChannel?.id || ''}
            onChange={e => {
              const ch = channels.find(c => String(c.id) === e.target.value);
              setActiveChannel(ch || null);
            }}
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left ${
                active
                  ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-1">
        <button
          onClick={onSettingsOpen}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition"
        >
          <Settings size={15} className="shrink-0" />
          <span>Settings</span>
        </button>
        <div className="px-3 pt-2">
          <p className="text-xs text-slate-600">Muzammil Ali · Digilistan</p>
        </div>
      </div>
    </aside>
  );
}
