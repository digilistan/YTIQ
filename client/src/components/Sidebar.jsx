import React, { useState } from 'react';
import {
  LayoutDashboard, Search, Lightbulb, FileText, Sparkles,
  ImageIcon, CalendarDays, TrendingUp, Settings, Scissors,
  Sun, Moon, ChevronDown, PanelLeftClose, PanelLeftOpen,
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

export function Sidebar({ activeTab, setActiveTab, onSettingsOpen, collapsed, onCollapse }) {
  const { channels, activeChannel, setActiveChannel } = useSettings();
  const { theme, toggle } = useTheme();

  const w = collapsed ? 56 : 240;

  return (
    <aside
      className="shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden transition-all duration-200"
      style={{ width: w, minWidth: w, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo row */}
      <div className="px-3 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', minHeight: 52 }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <span className="text-white font-black text-sm leading-none">Y</span>
        </div>
        {!collapsed && (
          <>
            <span className="font-bold text-base tracking-tight flex-1 truncate" style={{ color: 'var(--text-base)' }}>YTIq</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)', border: '1px solid var(--accent-border)' }}>Pro</span>
          </>
        )}
        <button
          onClick={onCollapse}
          className="btn btn-ghost btn-sm shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ marginLeft: collapsed ? 'auto' : 0 }}
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Channel switcher */}
      {!collapsed && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="section-label mb-2">Active channel</p>
          {channels.length === 0 ? (
            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No channels yet</p>
          ) : (
            <div className="relative">
              <select
                className="w-full appearance-none text-xs rounded-lg px-2.5 py-2 pr-7 cursor-pointer"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-base)', outline: 'none' }}
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
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={collapsed ? label : undefined}
              className="nav-item w-full"
              style={active ? {
                background: 'var(--accent-soft)',
                color: 'var(--accent-2)',
                borderLeft: collapsed ? 'none' : '2px solid var(--accent)',
                marginLeft: collapsed ? 0 : '-2px',
                fontWeight: 500,
                justifyContent: collapsed ? 'center' : 'flex-start',
              } : { justifyContent: collapsed ? 'center' : 'flex-start' }}
            >
              <Icon size={15} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}

        {/* Clipping — coming soon */}
        <button
          className="nav-item w-full cursor-not-allowed"
          style={{ opacity: 0.45, justifyContent: collapsed ? 'center' : 'flex-start' }}
          disabled aria-disabled="true"
          title={collapsed ? 'Clipping (Coming soon)' : undefined}
        >
          <Scissors size={15} className="shrink-0" />
          {!collapsed && (
            <>
              <span>Clipping</span>
              <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                Soon
              </span>
            </>
          )}
        </button>
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={toggle} className="nav-item w-full" title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          {theme === 'dark'
            ? <><Sun size={15} className="shrink-0" />{!collapsed && <span>Light Mode</span>}</>
            : <><Moon size={15} className="shrink-0" />{!collapsed && <span>Dark Mode</span>}</>}
        </button>
        <button onClick={onSettingsOpen} className="nav-item w-full" title={collapsed ? 'Settings' : undefined}
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Settings size={15} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        {!collapsed && (
          <div className="px-3 pt-2">
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>Muzammil Ali · Digilistan</p>
          </div>
        )}
      </div>
    </aside>
  );
}
