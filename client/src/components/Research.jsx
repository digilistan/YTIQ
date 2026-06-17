import React, { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, Video, Zap, Users, Image, RefreshCw, ExternalLink, CheckSquare, Square } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const TABS = [
  { id: 'foryou',    label: 'For You',    icon: TrendingUp },
  { id: 'keywords',  label: 'Keywords',   icon: Search },
  { id: 'videos',    label: 'Videos',     icon: Video },
  { id: 'shorts',    label: 'Shorts',     icon: Zap },
  { id: 'channels',  label: 'Channels',   icon: Users },
  { id: 'thumbnails',label: 'Thumbnails', icon: Image },
];

function VolumeChangeChip({ value }) {
  if (!value) return null;
  const isPos = value.startsWith('+');
  return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: isPos ? 'var(--green-soft, rgba(34,197,94,0.1))' : 'rgba(239,68,68,0.1)',
        color: isPos ? 'var(--green, #22c55e)' : '#ef4444',
      }}>
      {value}
    </span>
  );
}

function CompetitionBadge({ level }) {
  const colors = { Low: 'badge-green', Medium: 'badge-amber', High: 'badge-red' };
  return <span className={`badge ${colors[level] || 'badge-accent'}`}>{level}</span>;
}

function MultiplierBadge({ value }) {
  if (!value) return null;
  const num = parseFloat(value);
  const color = num >= 10 ? '#22c55e' : num >= 5 ? '#f59e0b' : 'var(--accent)';
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {value}
    </span>
  );
}

function KeywordsTable({ keywords, loading }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (kw) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(kw) ? next.delete(kw) : next.add(kw);
      return next;
    });
  };

  if (loading) return <div className="flex justify-center py-12"><span className="spinner" /></div>;
  if (!keywords?.length) return <div className="empty-state py-12"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No keywords found.</p></div>;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Rising keywords</h3>
        {selected.size > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.size} selected</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <th className="w-8 px-3 py-2" />
              <th className="text-left px-3 py-2 font-medium section-label">Keyword</th>
              <th className="text-right px-3 py-2 font-medium section-label">Volume</th>
              <th className="text-right px-3 py-2 font-medium section-label">Change</th>
              <th className="text-center px-3 py-2 font-medium section-label">Competition</th>
              <th className="text-right px-3 py-2 font-medium section-label">CPM</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw, i) => (
              <tr key={i}
                onClick={() => toggle(kw.keyword)}
                className="cursor-pointer transition"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background: selected.has(kw.keyword) ? 'var(--accent-soft)' : undefined,
                }}
                onMouseEnter={e => { if (!selected.has(kw.keyword)) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected.has(kw.keyword) ? 'var(--accent-soft)' : ''; }}
              >
                <td className="px-3 py-2.5">
                  {selected.has(kw.keyword)
                    ? <CheckSquare size={14} style={{ color: 'var(--accent)' }} />
                    : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                </td>
                <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-base)' }}>{kw.keyword}</td>
                <td className="px-3 py-2.5 text-right" style={{ color: 'var(--text-muted)' }}>{kw.searchVolume}</td>
                <td className="px-3 py-2.5 text-right"><VolumeChangeChip value={kw.volumeChange} /></td>
                <td className="px-3 py-2.5 text-center"><CompetitionBadge level={kw.competition} /></td>
                <td className="px-3 py-2.5 text-right font-medium" style={{ color: 'var(--text-base)' }}>{kw.cpm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VideoCard({ video }) {
  const url = video.id ? `https://youtube.com/watch?v=${video.id}` : null;
  return (
    <div className="card overflow-hidden flex flex-col" style={{ minWidth: 220, maxWidth: 280 }}>
      <div className="relative" style={{ aspectRatio: '16/9', background: 'var(--bg-elevated)' }}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title}
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <Video size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <MultiplierBadge value={video.multiplier} />
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-base)' }}>{video.title}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{video.channel}</p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{video.views} views</span>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ channel }) {
  return (
    <div className="card p-4 flex gap-3 items-start">
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        {channel.thumbnail ? (
          <img src={channel.thumbnail} alt={channel.name} className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <Users size={16} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-base)' }}>{channel.name}</p>
        {channel.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{channel.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{channel.subscribers} subs</span>
          {channel.views && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{channel.views}</span>}
        </div>
      </div>
    </div>
  );
}

function ThumbnailCard({ item }) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-xs leading-snug" style={{ color: 'var(--text-base)' }}>{item.title}</p>
        <span className="text-xs font-bold shrink-0" style={{ color: 'var(--accent)' }}>{item.ctrEstimate} CTR</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.concept}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>{item.style}</span>
        {(item.colors || []).map(c => (
          <span key={c} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{c}</span>
        ))}
      </div>
    </div>
  );
}

export function Research({ toast }) {
  const { activeChannel } = useSettings();
  const [activeTab, setActiveTab] = useState('foryou');
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (tab, q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (q) params.set('query', q);
      if (activeChannel?.id) params.set('channel_id', activeChannel.id);
      const res = await fetch(`/api/research?${params}`);
      if (!res.ok) throw new Error('Failed to fetch research data');
      const json = await res.json();
      setData(prev => ({ ...prev, [tab + (q ? ':' + q : '')]: json }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, activeChannel]);

  const cacheKey = activeTab + (query ? ':' + query : '');

  useEffect(() => {
    if (!data[cacheKey]) fetchData(activeTab, query);
  }, [activeTab, query, cacheKey]);

  const handleSearch = () => {
    const q = searchInput.trim();
    setQuery(q);
    const key = activeTab + (q ? ':' + q : '');
    setData(prev => ({ ...prev, [key]: undefined }));
  };

  const currentData = data[cacheKey] || {};

  const renderContent = () => {
    if (loading) return <div className="flex justify-center py-16"><span className="spinner" /></div>;

    if (activeTab === 'foryou') {
      return (
        <div className="space-y-6">
          {currentData.keywords?.length > 0 && (
            <KeywordsTable keywords={currentData.keywords} loading={false} />
          )}
          {currentData.videos?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Outlier videos for you</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {currentData.videos.map((v, i) => <VideoCard key={i} video={v} />)}
              </div>
            </div>
          )}
          {currentData.channels?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>Breakout channels for you</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentData.channels.map((c, i) => <ChannelCard key={i} channel={c} />)}
              </div>
            </div>
          )}
          {!currentData.keywords?.length && !currentData.videos?.length && !currentData.channels?.length && (
            <div className="empty-state py-16">
              <TrendingUp size={36} className="empty-state-icon" />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading personalized insights…</p>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'keywords') {
      return <KeywordsTable keywords={currentData.keywords} loading={false} />;
    }

    if (activeTab === 'videos' || activeTab === 'shorts') {
      const videos = currentData.videos || [];
      if (!videos.length) return (
        <div className="empty-state py-16">
          <Video size={36} className="empty-state-icon" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No videos found. Try a search term.</p>
        </div>
      );
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((v, i) => <VideoCard key={i} video={v} />)}
        </div>
      );
    }

    if (activeTab === 'channels') {
      const channels = currentData.channels || [];
      if (!channels.length) return (
        <div className="empty-state py-16">
          <Users size={36} className="empty-state-icon" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No channels found. Try a search term.</p>
        </div>
      );
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {channels.map((c, i) => <ChannelCard key={i} channel={c} />)}
        </div>
      );
    }

    if (activeTab === 'thumbnails') {
      const thumbnails = currentData.thumbnails || [];
      if (!thumbnails.length) return (
        <div className="empty-state py-16">
          <Image size={36} className="empty-state-icon" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No thumbnail concepts found. Try a search term.</p>
        </div>
      );
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {thumbnails.map((t, i) => <ThumbnailCard key={i} item={t} />)}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Research</h1>
          <p className="page-subtitle">Discover rising keywords, outlier videos, and breakout channels.</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="card p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input
              className="app-input pl-9"
              placeholder="Find an outlier video, keyword, or channel…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="btn btn-primary">Search</button>
          <button
            onClick={() => {
              setData(prev => ({ ...prev, [cacheKey]: undefined }));
              fetchData(activeTab, query);
            }}
            className="btn btn-ghost btn-sm"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tab-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
