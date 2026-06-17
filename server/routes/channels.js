import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET /api/channels
router.get('/', (req, res) => {
  try {
    const channels = db.prepare('SELECT * FROM channels ORDER BY created_at DESC').all();
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/channels
router.post('/', (req, res) => {
  try {
    const { youtube_channel_id, name } = req.body;

    // Validate inputs (e.g. malformed like !!broken!! or containing illegal characters)
    if (!youtube_channel_id || typeof youtube_channel_id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(youtube_channel_id)) {
      return res.status(400).json({ error: 'Invalid channel ID' });
    }

    // Duplication guard
    const existing = db.prepare('SELECT * FROM channels WHERE youtube_channel_id = ?').get(youtube_channel_id);
    if (existing) {
      return res.status(400).json({ error: 'Channel already connected' });
    }

    // Insert channel
    const finalName = name || `Channel ${youtube_channel_id}`;
    const stmt = db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)');
    const result = stmt.run(youtube_channel_id, finalName);
    
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
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const updates = [];
    const params = [];

    if (language !== undefined) {
      updates.push('language = ?');
      params.push(language);
    }
    if (niche !== undefined) {
      updates.push('niche = ?');
      params.push(niche);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (updates.length > 0) {
      params.push(channel.id);
      db.prepare(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedChannel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channel.id);
    res.json(updatedChannel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/channels/:idOrKey
router.delete('/:idOrKey', (req, res) => {
  try {
    const { idOrKey } = req.params;
    // Find the channel first to ensure existence or just delete it
    const stmt = db.prepare('DELETE FROM channels WHERE id = ? OR youtube_channel_id = ?');
    const result = stmt.run(idOrKey, idOrKey);
    
    // Status 200/204 is expected
    res.status(200).json({ success: true, changes: result.changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
