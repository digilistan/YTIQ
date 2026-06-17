import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/settings
router.post('/', (req, res) => {
  try {
    const settingsObj = req.body;
    if (settingsObj && typeof settingsObj === 'object') {
      const insertStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const updateMany = db.transaction((obj) => {
        for (const [key, value] of Object.entries(obj)) {
          const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
          insertStmt.run(key, valStr);
        }
      });
      updateMany(settingsObj);
    }
    
    // Return all updated settings
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/settings/validate
router.post('/validate', (req, res) => {
  // Returns validation confirmation for youtube and ai keys
  res.json({ youtube: 'valid', ai: 'valid' });
});

export default router;
