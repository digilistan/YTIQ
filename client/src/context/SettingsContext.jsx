import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [stats, setStats] = useState({ subscribers: 0, total_views: 0, video_count: 0, watch_time: 0 });
  const [topVideos, setTopVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data);
      return data;
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error('Failed to fetch channels');
      const data = await res.json();
      setChannels(data);
      
      // Select active channel if not set
      if (data.length > 0) {
        const savedId = localStorage.getItem('active_channel_id');
        const found = data.find(c => String(c.id) === savedId || c.youtube_channel_id === savedId);
        const initialActive = found || data[0];
        setActiveChannel(initialActive);
      }
      return data;
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      const data = await res.json();
      setSettings(data);
      return data;
    } catch (err) {
      console.error(err);
      setError(err.message);
      throw err;
    }
  };

  const validateSettings = async (payload) => {
    try {
      const res = await fetch('/api/settings/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Validation request failed');
      return await res.json();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const addChannel = async (youtube_channel_id, name) => {
    setError(null);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_channel_id, name })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to add channel');
      }
      const newChan = await res.json();
      setChannels(prev => [newChan, ...prev]);
      setActiveChannel(newChan);
      return newChan;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteChannel = async (idOrKey) => {
    setError(null);
    try {
      const res = await fetch(`/api/channels/${idOrKey}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete channel');
      
      setChannels(prev => {
        const filtered = prev.filter(c => String(c.id) !== String(idOrKey) && c.youtube_channel_id !== idOrKey);
        if (activeChannel && (String(activeChannel.id) === String(idOrKey) || activeChannel.youtube_channel_id === idOrKey)) {
          setActiveChannel(filtered.length > 0 ? filtered[0] : null);
        }
        return filtered;
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateChannelLanguage = async (channelId, language) => {
    setError(null);
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language })
      });
      if (!res.ok) throw new Error('Failed to update channel language');
      const updated = await res.json();
      setChannels(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (activeChannel && activeChannel.id === updated.id) {
        setActiveChannel(updated);
      }
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const syncChannelStats = async () => {
    if (!activeChannel) return;
    setSyncLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/sync?channelId=${activeChannel.youtube_channel_id}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Sync failed');
      }
      const data = await res.json();
      
      // Save stats back to database
      await fetch(`/api/channels/${activeChannel.id}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribers: data.subscribers,
          total_views: data.total_views,
          video_count: data.video_count
        })
      });

      setStats({
        subscribers: data.subscribers ?? 0,
        total_views: data.total_views ?? 0,
        video_count: data.video_count ?? 0,
        watch_time: data.watch_time ?? 0
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSyncLoading(false);
    }
  };

  const loadChannelStats = async (channel) => {
    if (!channel) return;
    try {
      let paramId = channel.youtube_channel_id;
      const res = await fetch(`/api/youtube/stats?channelId=${paramId}`);
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats({
        subscribers: data.subscribers ?? 0,
        total_views: data.total_views ?? 0,
        video_count: data.video_count ?? 0,
        watch_time: data.watch_time ?? 0
      });

      const tvRes = await fetch(`/api/youtube/top-videos?channelId=${channel.youtube_channel_id}`);
      if (tvRes.ok) {
        const tvData = await tvRes.json();
        setTopVideos(tvData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setSettings({});
      setChannels([]);
      setActiveChannel(null);
      setStats({ subscribers: 0, total_views: 0, video_count: 0, watch_time: 0 });
      setTopVideos([]);
      localStorage.removeItem('active_channel_id');
      setLoading(false);
      return;
    }

    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSettings(), fetchChannels()]);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeChannel) {
      localStorage.setItem('active_channel_id', activeChannel.id);
      loadChannelStats(activeChannel);
    } else {
      localStorage.removeItem('active_channel_id');
      setStats({ subscribers: 0, total_views: 0, video_count: 0, watch_time: 0 });
    }
  }, [activeChannel]);

  return (
    <SettingsContext.Provider value={{
      settings,
      channels,
      activeChannel,
      stats,
      topVideos,
      loading,
      syncLoading,
      error,
      setActiveChannel,
      updateSettings,
      validateSettings,
      addChannel,
      deleteChannel,
      updateChannelLanguage,
      syncChannelStats,
      setError
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
