import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// POST /api/niches — save a niche
router.post('/', (req, res) => {
  try {
    const { topic, channel_id } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO niches (topic, channel_id)
      VALUES (?, ?)
    `);
    const result = stmt.run(topic, channel_id || null);

    const niche = db.prepare('SELECT * FROM niches WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(niche);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/niches — list saved niches
router.get('/', (req, res) => {
  try {
    const niches = db.prepare('SELECT * FROM niches ORDER BY created_at DESC').all();
    res.json(niches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
