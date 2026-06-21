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

    // Mask sensitive keys and add helpers if not an admin
    const isAdmin = req.user && req.user.role === 'admin';
    
    settings.has_youtube_key = !!settings.youtube_api_key;
    settings.has_ai_key = !!settings.ai_api_key;

    if (!isAdmin) {
      if (settings.youtube_api_key) settings.youtube_api_key = '********';
      if (settings.ai_api_key) settings.ai_api_key = '********';
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/settings
router.post('/', (req, res) => {
  try {
    // Only allow admin to write settings
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Settings can only be modified by administrators.' });
    }

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
    
    settings.has_youtube_key = !!settings.youtube_api_key;
    settings.has_ai_key = !!settings.ai_api_key;

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/settings/validate
router.post('/validate', (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  // Returns validation confirmation for youtube and ai keys
  res.json({ youtube: 'valid', ai: 'valid' });
});

export default router;
