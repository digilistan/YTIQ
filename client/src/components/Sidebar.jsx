import React from 'react';
import {
  LayoutDashboard, Search, Lightbulb, FileText, Sparkles,
  ImageIcon, CalendarDays, TrendingUp, Settings, Scissors,
  Sun, Moon, ChevronDown,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'niche',       label: 'Niche Explorer',  icon: Search },
  { id: 'ideas',       label: 'Video Ideas',     icon: Lightbulb },
  { id: 'scripts',     label: 'Script Writer',   icon: FileText },
  { id: 'seo',         label: 'SEO Optimizer',   icon: Sparkles },
  { id: 'thumbnails',  label: 'Thumbnails',      icon: ImageIcon },
  { id: 'calendar',    label: 'Calendar',        icon: CalendarDays },
  { id: 'competitors', label: 'Competitors',     icon: TrendingUp },
];

export function Sidebar({ activeTab, setActiveTab, onSettingsOpen }) {
  const { channels, activeChannel, setActiveChannel } = useSettings();
  const { theme, toggle } = useTheme();

  return (
    <aside
      className="shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto"
      style={{ width: 'var(--sidebar-w)', background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <span className="text-white font-black text-sm leading-none">Y</span>
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-base)' }}>YTIq</span>
          <span
            className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)', border: '1px solid var(--accent-border)' }}
          >Pro</span>
        </div>
      </div>

      {/* Channel switcher */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="section-label mb-2">Active channel</p>
        {channels.length === 0 ? (
          <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No channels yet</p>
        ) : (
          <div className="relative">
            <select
              className="w-full appearance-none text-xs rounded-lg px-2.5 py-2 pr-7 cursor-pointer"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-base)',
                outline: 'none',
              }}
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
            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="nav-item"
              style={active ? {
                background: 'var(--accent-soft)',
                color: 'var(--accent-2)',
                borderLeft: '2px solid var(--accent)',
                marginLeft: '-2px',
                fontWeight: 500,
              } : {}}
            >
              <Icon size={15} className="shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}

        {/* Clipping — coming soon */}
        <div className="tooltip-wrapper">
          <button
            className="nav-item w-full cursor-not-allowed"
            style={{ opacity: 0.45 }}
            disabled
            aria-disabled="true"
          >
            <Scissors size={15} className="shrink-0" />
            <span>Clipping</span>
            <span
              className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '0.65rem' }}
            >Soon</span>
          </button>
          <div className="tooltip" style={{ left: '110%', bottom: 'auto', top: '50%', transform: 'translateY(-50%)' }}>
            Coming soon
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="nav-item w-full"
        >
          {theme === 'dark'
            ? <><Sun size={15} className="shrink-0" /><span>Light Mode</span></>
            : <><Moon size={15} className="shrink-0" /><span>Dark Mode</span></>
          }
        </button>

        {/* Settings */}
        <button onClick={onSettingsOpen} className="nav-item w-full">
          <Settings size={15} className="shrink-0" />
          <span>Settings</span>
        </button>

        <div className="px-3 pt-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Muzammil Ali · Digilistan</p>
        </div>
      </div>
    </aside>
  );
}
