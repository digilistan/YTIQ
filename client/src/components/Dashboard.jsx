import React, { useState, useEffect } from 'react';
import { RefreshCw, Users, Eye, Film, Clock, AlertCircle, TrendingUp, Lightbulb } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

function StatCard({ label, value, icon: Icon, color, testId }) {
  return (
    <div data-testid={testId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-lg ${color.bg}`}>
          <Icon size={14} className={color.text} />
        </div>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${color.text}`}>{value}</p>
    </div>
  );
}

function fmt(n) {
  if (n == null || isNaN(Number(n))) return '0';
  const v = Number(n);
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toLocaleString();
}

export function Dashboard({ setActiveTab, toast }) {
  const { settings, activeChannel, stats, syncLoading, syncChannelStats, setError } = useSettings();
  const [suggestions, setSuggestions] = useState([]);
  const [syncMsg, setSyncMsg] = useState(null);

  useEffect(() => {
    if (!activeChannel) return;
    fetch('/api/suggestions')
      .then(r => r.ok ? r.json() : [])
      .then(d => setSuggestions(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [activeChannel]);

  const handleSync = async () => {
    setSyncMsg(null);
    if (!settings.youtube_api_key) {
      toast('Add a YouTube API key in Settings before syncing.', 'warning');
      return;
    }
    try {
      await syncChannelStats();
      toast('Channel stats updated successfully.', 'success');
    } catch (err) {
      setSyncMsg(err.message);
      toast(err.message, 'error');
    }
  };

  const hasYouTubeKey = !!settings.youtube_api_key;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeChannel ? `Stats for ${activeChannel.name}` : 'Add a channel to view analytics'}
          </p>
        </div>
        {activeChannel && (
          <button
            data-testid="manual-sync-btn"
            onClick={handleSync}
            disabled={syncLoading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition shrink-0"
          >
            <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} data-testid={syncLoading ? 'sync-loading-spinner' : undefined} />
            {syncLoading ? 'Syncing…' : 'Sync Stats'}
          </button>
        )}
      </div>

      {/* No YouTube key notice */}
      {!hasYouTubeKey && (
        <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
          <AlertCircle size={15} className="shrink-0 text-amber-400" />
          <span>Add your <strong>YouTube API key</strong> in Settings to sync real channel stats.</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          testId="stats-subscribers-card"
          label="Subscribers"
          value={fmt(stats.subscribers)}
          icon={Users}
          color={{ bg: 'bg-indigo-500/10', text: 'text-indigo-400' }}
        />
        <StatCard
          testId="stats-views-card"
          label="Total Views"
          value={fmt(stats.total_views)}
          icon={Eye}
          color={{ bg: 'bg-violet-500/10', text: 'text-violet-400' }}
        />
        <StatCard
          testId="stats-videos-card"
          label="Videos"
          value={fmt(stats.video_count)}
          icon={Film}
          color={{ bg: 'bg-sky-500/10', text: 'text-sky-400' }}
        />
        <StatCard
          testId="stats-watch-time-card"
          label="Watch Time"
          value={fmt(stats.watch_time) + ' hrs'}
          icon={Clock}
          color={{ bg: 'bg-emerald-500/10', text: 'text-emerald-400' }}
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Suggestions */}
        <div data-testid="daily-suggestions-sidebar" className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={15} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-200">Daily Suggestions</h2>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-slate-600 italic">No suggestions yet. Keep creating!</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map(s => (
                <div
                  key={s.id}
                  data-testid="suggestion-card"
                  className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-300 cursor-pointer hover:border-slate-700 transition"
                >
                  {s.content}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Growth trend placeholder */}
        <div data-testid="growth-chart-container" className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">Growth Trend</h2>
            </div>
            <button data-testid="chart-monthly-toggle" className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Monthly
            </button>
          </div>
          <div className="flex items-end gap-1.5 h-28">
            {[40, 55, 48, 62, 58, 75, 70, 85, 78, 92, 88, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/35 rounded-t transition cursor-default"
                style={{ height: `${h}%` }}
                title={`Month ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-slate-600">Jan</span>
            <span className="text-xs text-slate-600">Dec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
