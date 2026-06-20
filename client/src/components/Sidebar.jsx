import React, { useState } from 'react';
import {
  LayoutDashboard, Search, Lightbulb, FileText, Sparkles,
  ImageIcon, CalendarDays, TrendingUp, Settings, Scissors,
  Sun, Moon, ChevronDown, PanelLeftClose, PanelLeftOpen,
  MessageSquare, FlaskConical, GraduationCap, Video, LogOut,
  Puzzle, Lock
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'chat',        label: 'AI Chat',         icon: MessageSquare },
  { id: 'research',    label: 'Research',        icon: FlaskConical },
  { id: 'niche',       label: 'Niche Explorer',  icon: Search },
  { id: 'ideas',       label: 'Video Ideas',     icon: Lightbulb },
  { id: 'scripts',     label: 'Script Writer',   icon: FileText },
  { id: 'seo',         label: 'SEO Optimizer',   icon: Sparkles },
  { id: 'thumbnails',  label: 'Thumbnails',      icon: ImageIcon },
  { id: 'clipping',    label: 'Video Clipper',   icon: Scissors },
  { id: 'pov',         label: 'POV Studio',      icon: Video },
  { id: 'calendar',    label: 'Calendar',        icon: CalendarDays },
  { id: 'coaching',    label: 'Coaching',        icon: GraduationCap },
  { id: 'competitors', label: 'Competitors',     icon: TrendingUp },
  { id: 'extension',   label: 'Extension Setup', icon: Puzzle },
];

export function Sidebar({ activeTab, setActiveTab, onSettingsOpen, collapsed, onCollapse }) {
  const { logout, isAdmin, user } = useAuth();
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
        <img
          src="./logo.png"
          alt="CSD Logo"
          className="w-7 h-7 rounded-md shrink-0 object-cover"
        />
        {!collapsed && (
          <>
            <span className="font-bold text-base tracking-tight flex-1 truncate" style={{ color: 'var(--text-base)' }}>CSD</span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)', border: '1px solid var(--accent-border)' }}>Suite</span>
          </>
        )}
        <button
          onClick={onCollapse}
          className="btn btn-ghost btn-sm shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ margin: collapsed ? 'auto' : 0 }}
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
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto animate-fade-in">
        {(() => {
          let restricted = [];
          try {
            restricted = user?.restricted_features ? (typeof user.restricted_features === 'string' ? JSON.parse(user.restricted_features) : user.restricted_features) : [];
          } catch (_) {}
          if (!Array.isArray(restricted)) {
            restricted = [];
          }
          return NAV.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const isLocked = restricted.includes(id);
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={collapsed ? (isLocked ? `${label} (Locked)` : label) : undefined}
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
                <div className="relative flex items-center justify-center shrink-0">
                  <Icon size={15} />
                  {isLocked && collapsed && (
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full p-0.5" style={{ border: '1px solid var(--bg-surface)' }}>
                      <Lock size={6} className="text-slate-950 font-bold" />
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <span className="flex-1 text-left truncate flex items-center justify-between gap-2">
                    <span>{label}</span>
                    {isLocked && <Lock size={11} className="text-amber-500 shrink-0" />}
                  </span>
                )}
              </button>
            );
          });
        })()}
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
        <button onClick={logout} className="nav-item w-full" title={collapsed ? 'Sign Out' : undefined}
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <LogOut size={15} className="shrink-0" style={{ color: 'var(--red)' }} />
          {!collapsed && <span style={{ color: 'var(--red)' }}>Sign Out</span>}
        </button>
        {!collapsed && (
          <div className="px-3 pt-2">
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user ? `${user.username} · Digilistan` : 'Digilistan'}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
