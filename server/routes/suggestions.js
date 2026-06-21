import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Helper to verify channel ownership
function verifyChannel(channelId, userId) {
  if (!channelId) return false;
  const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND user_id = ?').get(channelId, userId);
  return !!channel;
}

// GET /api/suggestions
router.get('/', (req, res) => {
  try {
    const { channel_id } = req.query;
    let suggestions;
    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
      suggestions = db.prepare('SELECT * FROM suggestions WHERE channel_id = ? ORDER BY created_at DESC').all(channel_id);
    } else {
      suggestions = db.prepare('SELECT * FROM suggestions WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?) ORDER BY created_at DESC').all(req.user.id);
    }
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
