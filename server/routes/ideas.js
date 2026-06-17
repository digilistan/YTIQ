import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// POST /api/ideas — save an idea
router.post('/', (req, res) => {
  try {
    const { title, channel_id, niche_id, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO ideas (title, channel_id, niche_id, description)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      title,
      channel_id || null,
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

    db.prepare('UPDATE ideas SET status = ? WHERE id = ?').run(status, id);

    const updated = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
