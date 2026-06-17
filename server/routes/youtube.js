import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET /api/youtube/stats
router.get('/stats', (req, res) => {
  try {
    const { channelId } = req.query;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const channel = db.prepare(`
      SELECT * FROM channels 
      WHERE id = ? 
      OR youtube_channel_id = ? 
      OR REPLACE(name, ' ', '') = ?
    `).get(channelId, channelId, channelId);

    if (!channel) {
      return res.json({ subscribers: 0, total_views: 0, video_count: 0, watch_time: 0 });
    }

    const stats = db.prepare(`
      SELECT * FROM channel_stats 
      WHERE channel_id = ? 
      ORDER BY date DESC LIMIT 1
    `).get(channel.id);

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

// GET /api/youtube/sync
router.get('/sync', (req, res) => {
  try {
    const { channelId } = req.query;
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const channel = db.prepare(`
      SELECT * FROM channels 
      WHERE id = ? 
      OR youtube_channel_id = ? 
      OR REPLACE(name, ' ', '') = ?
    `).get(channelId, channelId, channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({
      subscribers: 1000,
      total_views: 5000,
      video_count: 10,
      watch_time: 200
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
