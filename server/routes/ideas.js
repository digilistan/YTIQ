import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Helper to verify channel ownership
function verifyChannel(channelId, userId) {
  if (!channelId) return false;
  const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND user_id = ?').get(channelId, userId);
  return !!channel;
}

// POST /api/ideas — save an idea
router.post('/', (req, res) => {
  try {
    const { title, channel_id, niche_id, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
    } else {
      return res.status(400).json({ error: 'channel_id is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO ideas (title, channel_id, niche_id, description)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      title,
      channel_id,
      niche_id || null,
      description || null
    );

    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(idea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ideas/:id/favorite — toggle is_favorite
router.post('/:id/favorite', (req, res) => {
  try {
    const { id } = req.params;
    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    if (!verifyChannel(idea.channel_id, req.user.id)) {
      return res.status(403).json({ error: 'Access denied: You do not own this channel' });
    }

    const newFavorite = idea.is_favorite ? 0 : 1;
    db.prepare('UPDATE ideas SET is_favorite = ? WHERE id = ?').run(newFavorite, id);

    const updated = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ideas/:id/status — update status
router.post('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    if (!verifyChannel(idea.channel_id, req.user.id)) {
      return res.status(403).json({ error: 'Access denied: You do not own this channel' });
    }

    db.prepare('UPDATE ideas SET status = ? WHERE id = ?').run(status, id);

    const updated = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ideas - list ideas, optional filter by channel_id
router.get('/', (req, res) => {
  try {
    const { channel_id } = req.query;
    let ideas;
    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
      ideas = db.prepare('SELECT * FROM ideas WHERE channel_id = ? ORDER BY created_at DESC').all(channel_id);
    } else {
      ideas = db.prepare('SELECT * FROM ideas WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?) ORDER BY created_at DESC').all(req.user.id);
    }
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/ideas/:id - delete an idea
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const idea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    if (!verifyChannel(idea.channel_id, req.user.id)) {
      return res.status(403).json({ error: 'Access denied: You do not own this channel' });
    }
    db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
