import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Helper to verify channel ownership
function verifyChannel(channelId, userId) {
  if (!channelId) return false;
  const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND user_id = ?').get(channelId, userId);
  return !!channel;
}

// POST /api/thumbnails/:id/link — link a thumbnail concept to an idea_id
router.post('/:id/link', (req, res) => {
  try {
    const { id } = req.params;
    const { idea_id } = req.body;

    if (!idea_id) {
      return res.status(400).json({ error: 'idea_id is required' });
    }

    const thumbnail = db.prepare('SELECT * FROM thumbnails WHERE id = ?').get(id);
    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    if (!verifyChannel(thumbnail.channel_id, req.user.id)) {
      return res.status(403).json({ error: 'Access denied: You do not own this channel' });
    }

    db.prepare('UPDATE thumbnails SET idea_id = ? WHERE id = ?').run(idea_id, id);

    const updated = db.prepare('SELECT * FROM thumbnails WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/thumbnails - save thumbnail concepts
router.post('/', (req, res) => {
  try {
    const { channel_id, idea_id, concepts } = req.body;
    if (!concepts) {
      return res.status(400).json({ error: 'concepts are required' });
    }
    
    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
    } else {
      return res.status(400).json({ error: 'channel_id is required' });
    }

    const conceptsStr = typeof concepts === 'string' ? concepts : JSON.stringify(concepts);

    const stmt = db.prepare(`
      INSERT INTO thumbnails (channel_id, idea_id, concepts)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(channel_id, idea_id || null, conceptsStr);

    const thumbnail = db.prepare('SELECT * FROM thumbnails WHERE id = ?').get(result.lastInsertRowid);
    try {
      thumbnail.concepts = JSON.parse(thumbnail.concepts);
    } catch (_) {}
    res.status(201).json(thumbnail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/thumbnails - get saved thumbnail concepts for a channel
router.get('/', (req, res) => {
  try {
    const { channel_id } = req.query;
    let thumbnails;
    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
      thumbnails = db.prepare('SELECT * FROM thumbnails WHERE channel_id = ? ORDER BY created_at DESC').all(channel_id);
    } else {
      thumbnails = db.prepare('SELECT * FROM thumbnails WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?) ORDER BY created_at DESC').all(req.user.id);
    }
    
    const parsed = thumbnails.map(t => {
      try {
        return { ...t, concepts: JSON.parse(t.concepts) };
      } catch (_) {
        return t;
      }
    });
    
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/thumbnails/:id - delete a thumbnail record
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const thumbnail = db.prepare('SELECT * FROM thumbnails WHERE id = ?').get(id);
    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail concepts not found' });
    }
    if (!verifyChannel(thumbnail.channel_id, req.user.id)) {
      return res.status(403).json({ error: 'Access denied: You do not own this channel' });
    }
    db.prepare('DELETE FROM thumbnails WHERE id = ?').run(id);
    res.json({ success: true, message: 'Thumbnail concepts deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
