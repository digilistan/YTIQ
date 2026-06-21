import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Helper to verify channel ownership
function verifyChannel(channelId, userId) {
  if (!channelId) return false;
  const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND user_id = ?').get(channelId, userId);
  return !!channel;
}

// POST /api/niches — save a niche
router.post('/', (req, res) => {
  try {
    const { topic, channel_id } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
    } else {
      return res.status(400).json({ error: 'channel_id is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO niches (topic, channel_id)
      VALUES (?, ?)
    `);
    const result = stmt.run(topic, channel_id);

    const niche = db.prepare('SELECT * FROM niches WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(niche);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/niches — list saved niches
router.get('/', (req, res) => {
  try {
    const { channel_id } = req.query;
    let niches;
    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
      niches = db.prepare('SELECT * FROM niches WHERE channel_id = ? ORDER BY created_at DESC').all(channel_id);
    } else {
      niches = db.prepare('SELECT * FROM niches WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?) ORDER BY created_at DESC').all(req.user.id);
    }
    res.json(niches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
