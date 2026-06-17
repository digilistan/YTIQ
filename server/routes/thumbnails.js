import express from 'express';
import db from '../db/database.js';

const router = express.Router();

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

    db.prepare('UPDATE thumbnails SET idea_id = ? WHERE id = ?').run(idea_id, id);

    const updated = db.prepare('SELECT * FROM thumbnails WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
