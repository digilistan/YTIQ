import express from 'express';
import db from '../db/database.js';
import { resolveChannelId } from '../utils/resolveChannel.js';
import { callYoutubeApi } from '../utils/youtubeApi.js';

const router = express.Router();

function getSetting(key, fallback = '') {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

// GET /api/youtube/stats — load cached (most recent) stats from DB
router.get('/stats', (req, res) => {
  try {
    const { channelId } = req.query;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });

    const channel = db.prepare(
      'SELECT * FROM channels WHERE (id = ? OR youtube_channel_id = ?) AND user_id = ?'
    ).get(channelId, channelId, req.user.id);

    if (!channel) return res.json({ subscribers: 0, total_views: 0, video_count: 0, watch_time: 0 });

    const stats = db.prepare(
      'SELECT * FROM channel_stats WHERE channel_id = ? ORDER BY date DESC LIMIT 1'
    ).get(channel.id);

    res.json({
      subscribers: stats?.subscribers ?? 0,
      total_views: stats?.total_views ?? 0,
      video_count: stats?.video_count ?? 0,
      watch_time: 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/youtube/sync — call real YouTube Data API v3
router.get('/sync', async (req, res) => {
  try {
    const { channelId } = req.query;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });

    const apiKey = getSetting('youtube_api_key', '');
    if (!apiKey) {
      return res.status(400).json({
        error: 'No YouTube API key configured. Add your key in Settings → YouTube Configuration.'
      });
    }

    // Resolve any format (UC ID, @handle, URL) to a real UC channel ID
    let resolvedId = channelId;
    const isUcId = /^UC[A-Za-z0-9_-]{22}$/.test(channelId);
    if (!isUcId) {
      try {
        const resolved = await resolveChannelId(channelId, apiKey);
        resolvedId = resolved.channelId;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(resolvedId)}&key=${encodeURIComponent(apiKey)}`;
    const ytBody = await callYoutubeApi(url, 1);

    if (!ytBody.items || ytBody.items.length === 0) {
      return res.status(404).json({ error: `Channel not found. Verify the channel ID or @handle.` });
    }

    const stats = ytBody.items[0].statistics;
    res.json({
      subscribers: parseInt(stats.subscriberCount || '0', 10),
      total_views: parseInt(stats.viewCount || '0', 10),
      video_count: parseInt(stats.videoCount || '0', 10),
      watch_time: 0,
      source: 'youtube',
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/youtube/top-videos
router.get('/top-videos', (req, res) => res.json([]));

// GET /api/youtube/api-usage
router.get('/api-usage', (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayIso = startOfToday.toISOString();

    const logSum = db.prepare(
      'SELECT SUM(quota_cost) as total FROM youtube_api_calls_log WHERE called_at >= ?'
    ).get(startOfTodayIso);
    const todayTotal = logSum?.total || 0;

    res.json({
      used: todayTotal,
      limit: 2000
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
