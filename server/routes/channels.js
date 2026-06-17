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

// GET /api/channels
router.get('/', (req, res) => {
  try {
    const channels = db.prepare('SELECT * FROM channels ORDER BY created_at DESC').all();
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/channels — accepts UC ID, @handle, or full YouTube URL
router.post('/', async (req, res) => {
  try {
    const { youtube_channel_id, name } = req.body;
    if (!youtube_channel_id) {
      return res.status(400).json({ error: 'Channel ID, @username, or YouTube URL is required' });
    }

    const apiKey = getSetting('youtube_api_key', '');
    let resolvedId = youtube_channel_id.trim();
    let resolvedName = name?.trim() || null;

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

    const existing = db.prepare('SELECT * FROM channels WHERE youtube_channel_id = ?').get(resolvedId);
    if (existing) return res.status(400).json({ error: 'Channel already connected' });

    const finalName = resolvedName || `Channel ${resolvedId}`;
    const result = db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)').run(resolvedId, finalName);
    const newChannel = db.prepare('SELECT * FROM channels WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newChannel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/channels/:idOrKey
router.put('/:idOrKey', (req, res) => {
  try {
    const { idOrKey } = req.params;
    const { language, niche, name } = req.body;
    const channel = db.prepare('SELECT * FROM channels WHERE id = ? OR youtube_channel_id = ?').get(idOrKey, idOrKey);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const updates = [], params = [];
    if (language !== undefined) { updates.push('language = ?'); params.push(language); }
    if (niche !== undefined) { updates.push('niche = ?'); params.push(niche); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }

    if (updates.length > 0) {
      params.push(channel.id);
      db.prepare(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(channel.id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/channels/:id/stats — save synced stats (one row per day, upsert)
router.post('/:id/stats', (req, res) => {
  try {
    const { id } = req.params;
    const { subscribers, total_views, video_count } = req.body;
    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO channel_stats (channel_id, date, subscribers, total_views, video_count)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(channel_id, date) DO UPDATE SET
        subscribers  = excluded.subscribers,
        total_views  = excluded.total_views,
        video_count  = excluded.video_count
    `).run(channel.id, today, subscribers ?? 0, total_views ?? 0, video_count ?? 0);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/channels/:id/stats/history — all historical rows for charts
router.get('/:id/stats/history', (req, res) => {
  try {
    const { id } = req.params;
    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const rows = db.prepare(
      'SELECT date, subscribers, total_views, video_count FROM channel_stats WHERE channel_id = ? ORDER BY date ASC'
    ).all(channel.id);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/channels/:idOrKey
router.delete('/:idOrKey', (req, res) => {
  try {
    const { idOrKey } = req.params;
    const result = db.prepare('DELETE FROM channels WHERE id = ? OR youtube_channel_id = ?').run(idOrKey, idOrKey);
    res.status(200).json({ success: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
