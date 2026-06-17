import express from 'express';
import db from '../db/database.js';

const router = express.Router();

function getSetting(key, fallback = '') {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

// GET /api/youtube/stats — load cached stats from DB
router.get('/stats', (req, res) => {
  try {
    const { channelId } = req.query;
    if (!channelId) return res.status(400).json({ error: 'channelId is required' });

    const channel = db.prepare(
      'SELECT * FROM channels WHERE id = ? OR youtube_channel_id = ? OR REPLACE(name, \' \', \'\') = ?'
    ).get(channelId, channelId, channelId);

    if (!channel) return res.json({ subscribers: 0, total_views: 0, video_count: 0, watch_time: 0 });

    const stats = db.prepare(
      'SELECT * FROM channel_stats WHERE channel_id = ? ORDER BY date DESC LIMIT 1'
    ).get(channel.id);

    res.json({
      subscribers: stats?.subscribers ?? 0,
      total_views: stats?.total_views ?? 0,
      video_count: stats?.video_count ?? 0,
      watch_time: stats?.watch_time ?? 0
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

    const isMock = getSetting('use_mock_api', 'false');
    if (isMock === 'true' || isMock === '1') {
      return res.json({
        subscribers: 1000,
        total_views: 5000,
        video_count: 10,
        watch_time: 0,
        source: 'mock'
      });
    }

    const apiKey = getSetting('youtube_api_key', '');
    if (!apiKey) {
      return res.status(400).json({
        error: 'No YouTube API key configured. Add your key in Settings → YouTube Configuration.'
      });
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
    const ytRes = await fetch(url);
    const ytBody = await ytRes.json();

    if (!ytRes.ok) {
      const msg = ytBody?.error?.message || `YouTube API error (${ytRes.status})`;
      return res.status(400).json({ error: msg });
    }

    if (!ytBody.items || ytBody.items.length === 0) {
      return res.status(404).json({
        error: `Channel "${channelId}" not found. Verify the channel ID (it should start with "UC").`
      });
    }

    const stats = ytBody.items[0].statistics;
    res.json({
      subscribers: parseInt(stats.subscriberCount || '0', 10),
      total_views: parseInt(stats.viewCount || '0', 10),
      video_count: parseInt(stats.videoCount || '0', 10),
      watch_time: 0,
      source: 'youtube'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/youtube/top-videos
router.get('/top-videos', (req, res) => {
  res.json([]);
});

export default router;
