import React, { useState, useEffect } from 'react';
import {
  RefreshCw, Users, Eye, Film, Clock, AlertCircle, TrendingUp,
  Zap, Search, FileText, Sparkles, CalendarDays, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useSettings } from '../context/SettingsContext';

function fmt(n) {
  if (n == null || isNaN(Number(n))) return '0';
  const v = Number(n);
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toLocaleString();
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pct(curr, prev) {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
}

function StatCard({ label, value, icon: Icon, accentColor, delta }) {
  const positive = delta > 0;
  const negative = delta < 0;
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentColor + '1a' }}>
          <Icon size={14} style={{ color: accentColor }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums" style={{ color: accentColor }}>{value}</p>
        {delta !== null && (
          <div className="flex items-center gap-1 mt-1">
            {positive && <ArrowUpRight size={12} style={{ color: 'var(--green)' }} />}
            {negative && <ArrowDownRight size={12} style={{ color: 'var(--red)' }} />}
            <span className="text-xs font-medium" style={{ color: positive ? 'var(--green)' : negative ? 'var(--red)' : 'var(--text-muted)' }}>
              {positive ? '+' : ''}{delta}% vs last sync
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartEmpty({ onSync }) {
  return (
    <div className="empty-state" style={{ height: 180 }}>
      <TrendingUp size={32} className="empty-state-icon" />
      <p className="font-medium text-sm" style={{ color: 'var(--text-base)' }}>No history yet</p>
      <p className="text-xs max-w-xs" style={{ color: 'var(--text-2)' }}>Each time you sync, a real data point is saved. Sync a few times to see your growth chart.</p>
      {onSync && (
        <button onClick={onSync} className="btn btn-primary btn-sm mt-2">
          <RefreshCw size={12} /> Sync Now
        </button>
      )}
    </div>
  );
}

const CHART_RANGES = ['7d', '30d', 'All'];

function filterHistory(rows, range) {
  if (range === 'All') return rows;
  const days = range === '7d' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return rows.filter(r => new Date(r.date) >= cutoff);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="card p-3" style={{ minWidth: 140 }}>
      <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-base)' }}>{fmtDate(label)}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

export function Dashboard({ setActiveTab, toast }) {
  const { settings, activeChannel, stats, syncLoading, syncChannelStats } = useSettings();

  const [history, setHistory] = useState([]);
  const [chartRange, setChartRange] = useState('All');
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const hasYouTubeKey = !!settings.youtube_api_key;

  useEffect(() => {
    if (!activeChannel?.id) { setHistory([]); return; }
    fetch(`/api/channels/${activeChannel.id}/stats/history`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [activeChannel?.id, stats]);

  useEffect(() => {
    if (!activeChannel?.id || history.length === 0) { setInsights([]); return; }
    setInsightsLoading(true);
    fetch(`/api/ai/channel-insights?channel_id=${activeChannel.id}`)
      .then(r => r.ok ? r.json() : { tips: [] })
      .then(d => setInsights(Array.isArray(d.tips) ? d.tips : []))
      .catch(() => {})
      .finally(() => setInsightsLoading(false));
  }, [activeChannel?.id, history.length]);

  const handleSync = async () => {
    if (!hasYouTubeKey) { toast('Add a YouTube API key in Settings before syncing.', 'warning'); return; }
    try {
      await syncChannelStats();
      toast('Channel stats updated!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const visibleHistory = filterHistory(history, chartRange);

  const latest = history[history.length - 1];
  const prev   = history[history.length - 2];

  const subDelta  = latest && prev ? pct(latest.subscribers, prev.subscribers) : null;
  const viewDelta = latest && prev ? pct(latest.total_views, prev.total_views) : null;
  const vidDelta  = latest && prev ? pct(latest.video_count, prev.video_count) : null;

  const quickActions = [
    { label: 'Explore Niches', icon: Search,      tab: 'niche',      color: 'var(--accent)' },
    { label: 'Generate Ideas', icon: Zap,          tab: 'ideas',      color: 'var(--violet)' },
    { label: 'Write Script',   icon: FileText,     tab: 'scripts',    color: 'var(--sky)' },
    { label: 'Optimize SEO',   icon: Sparkles,     tab: 'seo',        color: 'var(--green)' },
    { label: 'Calendar',       icon: CalendarDays, tab: 'calendar',   color: 'var(--amber)' },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {activeChannel ? `Analytics for ${activeChannel.name}` : 'Add a channel to view analytics'}
          </p>
        </div>
        {activeChannel && (
          <button onClick={handleSync} disabled={syncLoading} className="btn btn-primary">
            <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} />
            {syncLoading ? 'Syncing…' : 'Sync Stats'}
          </button>
        )}
      </div>

      {/* Notices */}
      {!hasYouTubeKey && (
        <div className="notice notice-amber">
          <AlertCircle size={14} className="shrink-0" />
          <span>Add your <strong>YouTube API key</strong> in Settings to sync real channel stats.</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Subscribers" value={fmt(stats.subscribers)}
          icon={Users} accentColor="var(--accent)" delta={subDelta}
        />
        <StatCard
          label="Total Views" value={fmt(stats.total_views)}
          icon={Eye} accentColor="var(--violet)" delta={viewDelta}
        />
        <StatCard
          label="Videos" value={fmt(stats.video_count)}
          icon={Film} accentColor="var(--sky)" delta={vidDelta}
        />
        <StatCard
          label="Watch Time" value={fmt(stats.watch_time) + ' hrs'}
          icon={Clock} accentColor="var(--green)" delta={null}
        />
      </div>

      {/* Charts Row */}
      <div className={`grid grid-cols-1 gap-5 ${history.length >= 2 && insights.length > 0 ? 'lg:grid-cols-3' : ''}`}>
        {/* Subscriber Growth — takes 2 cols */}
        <div className={`card p-5 ${history.length >= 2 && insights.length > 0 ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Subscriber Growth</h2>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>· real data</span>
            </div>
            <div className="tab-bar">
              {CHART_RANGES.map(r => (
                <button key={r} className={`tab-item ${chartRange === r ? 'active' : ''}`} onClick={() => setChartRange(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {visibleHistory.length < 2 ? (
            <ChartEmpty onSync={activeChannel ? handleSync : null} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={visibleHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="subscribers" name="Subscribers"
                  stroke="var(--accent)" fill="url(#subGrad)" strokeWidth={2} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Insights — only shown when there is history data */}
        {(insightsLoading || insights.length > 0) && history.length >= 2 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} style={{ color: 'var(--amber)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>AI Insights</h2>
            </div>
            {insightsLoading ? (
              <div className="space-y-2.5">
                {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {insights.map((tip, i) => (
                  <div key={i} className="flex gap-2.5 p-3 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>
                      {i + 1}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{tip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Views Chart */}
      {visibleHistory.length >= 2 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Eye size={15} style={{ color: 'var(--violet)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Total Views Over Time</h2>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>· real data</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={visibleHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_views" name="Total Views" fill="var(--violet)" opacity={0.75} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-base)' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {quickActions.map(({ label, icon: Icon, tab, color }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                <Icon size={17} style={{ color }} />
              </div>
              <span className="text-xs font-medium text-center leading-snug" style={{ color: 'var(--text-2)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
