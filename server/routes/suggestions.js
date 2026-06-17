import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET /api/suggestions
router.get('/', (req, res) => {
  try {
    const suggestions = db.prepare('SELECT * FROM suggestions ORDER BY created_at DESC').all();
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
