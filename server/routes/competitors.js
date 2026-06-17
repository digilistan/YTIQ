import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET /api/competitors — list all competitors
router.get('/', (req, res) => {
  try {
    const competitors = db.prepare('SELECT * FROM competitors ORDER BY created_at DESC').all();
    res.json(competitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/competitors — add competitor
router.post('/', (req, res) => {
  try {
    const { channel_id, competitor_channel_id, competitor_name, notes } = req.body;

    if (!competitor_channel_id) {
      return res.status(400).json({ error: 'competitor_channel_id is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO competitors (channel_id, competitor_channel_id, competitor_name, notes)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      channel_id || null,
      competitor_channel_id,
      competitor_name || null,
      notes || null
    );

    const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(competitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/competitors/:id/uploads — mock recent uploads
router.get('/:id/uploads', (req, res) => {
  try {
    const { id } = req.params;
    const competitor = db.prepare('SELECT * FROM competitors WHERE id = ?').get(id);

    if (!competitor) {
      return res.status(404).json({ error: 'Competitor not found' });
    }

    const name = competitor.competitor_name || 'Competitor';

    // Return mock recent uploads data
    const uploads = [
      { title: `${name} - Latest Strategy Video`, views: 125000, multiplier: 2.4 },
      { title: `${name} - Tutorial Deep Dive`, views: 89000, multiplier: 1.7 },
      { title: `${name} - Industry News Recap`, views: 203000, multiplier: 3.8 },
      { title: `${name} - Behind the Scenes`, views: 45000, multiplier: 0.9 },
      { title: `${name} - Community Q&A`, views: 67000, multiplier: 1.3 }
    ];

    res.json(uploads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
