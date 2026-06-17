import express from 'express';
import db from '../db/database.js';
import { resolveChannelId } from '../utils/resolveChannel.js';

const router = express.Router();

function getSetting(key, fallback = '') {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

// GET /api/competitors
router.get('/', (req, res) => {
  try {
    const competitors = db.prepare('SELECT * FROM competitors ORDER BY created_at DESC').all();
    res.json(competitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/competitors — resolve @handle/URL then insert
router.post('/', async (req, res) => {
  try {
    const { channel_id, competitor_channel_id, competitor_name, notes } = req.body;
    if (!competitor_channel_id) {
      return res.status(400).json({ error: 'Channel ID, @username, or YouTube URL is required' });
    }

    const apiKey = getSetting('youtube_api_key', '');
    let resolvedId = competitor_channel_id.trim();
    let resolvedName = competitor_name?.trim() || null;

    const isUcId = /^UC[A-Za-z0-9_-]{22}$/.test(resolvedId);

    if (apiKey) {
      try {
        const resolved = await resolveChannelId(resolvedId, apiKey);
        resolvedId = resolved.channelId;
        if (!resolvedName) resolvedName = resolved.channelTitle;
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    } else if (!isUcId) {
      return res.status(400).json({
        error: 'A YouTube API key is required to resolve @handles and URLs. Add one in Settings, or enter a raw UC… channel ID.',
      });
    }

    const existing = db.prepare('SELECT id FROM competitors WHERE competitor_channel_id = ?').get(resolvedId);
    if (existing) {
      return res.status(400).json({ error: 'This competitor is already being tracked.' });
    }

    const result = db.prepare(`
      INSERT INTO competitors (channel_id, competitor_channel_id, competitor_name, notes)
      VALUES (?, ?, ?, ?)
    `).run(channel_id || null, resolvedId, resolvedName || resolvedId, notes || null);

    const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(competitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/competitors/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM competitors WHERE id = ?').run(req.params.id);
    res.json({ success: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/competitors/:id/uploads — real YouTube Data API
router.get('/:id/uploads', async (req, res) => {
  try {
    const { id } = req.params;
    const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(id);
    if (!competitor) return res.status(404).json({ error: 'Competitor not found' });

    const apiKey = getSetting('youtube_api_key', '');
    if (!apiKey) {
      return res.status(400).json({
        error: 'No YouTube API key configured. Add one in Settings to fetch real video data.'
      });
    }

    const channelId = competitor.competitor_channel_id;
    if (!channelId.startsWith('UC')) {
      return res.status(400).json({
        error: 'Channel not resolved to a UC ID. Try removing and re-adding this competitor.'
      });
    }

    // Uploads playlist = swap "UC" prefix with "UU"
    const uploadsPlaylistId = 'UU' + channelId.slice(2);
    const key = encodeURIComponent(apiKey);

    // Step 1: Get latest 10 uploads
    const plRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${key}`
    );
    const plBody = await plRes.json();

    if (!plRes.ok) {
      const msg = plBody?.error?.message || `YouTube API error (${plRes.status})`;
      return res.status(400).json({ error: msg });
    }

    if (!plBody.items || plBody.items.length === 0) {
      return res.json([]);
    }

    const videoIds = plBody.items
      .map(item => item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) return res.json([]);

    // Step 2: Get statistics + snippet for each video
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(',')}&key=${key}`
    );
    const statsBody = await statsRes.json();

    if (!statsRes.ok || !statsBody.items) return res.json([]);

    const videos = statsBody.items.map(video => ({
      videoId: video.id,
      title: video.snippet?.title || 'Unknown',
      thumbnail: video.snippet?.thumbnails?.medium?.url || null,
      publishedAt: video.snippet?.publishedAt || null,
      views: parseInt(video.statistics?.viewCount || '0', 10),
      likes: parseInt(video.statistics?.likeCount || '0', 10),
      comments: parseInt(video.statistics?.commentCount || '0', 10),
    }));

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
