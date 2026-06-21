import express from 'express';
import db from '../db/database.js';

const router = CalendarsRouter();
function CalendarsRouter() {
  const router = express.Router();

  // Helper to verify channel ownership
  function verifyChannel(channelId, userId) {
    if (!channelId) return false;
    const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND user_id = ?').get(channelId, userId);
    return !!channel;
  }

  // POST /api/calendar/events — create calendar event
  router.post('/events', (req, res) => {
    try {
      const { idea_id, scheduled_date, status, channel_id, title } = req.body;

      if (!scheduled_date) {
        return res.status(400).json({ error: 'scheduled_date is required' });
      }

      if (channel_id) {
        if (!verifyChannel(channel_id, req.user.id)) {
          return res.status(403).json({ error: 'Access denied: You do not own this channel' });
        }
      } else {
        return res.status(400).json({ error: 'channel_id is required' });
      }

      // If idea_id is provided but not in the DB (unsaved AI idea), use NULL to avoid FK violation
      let resolvedIdeaId = null;
      if (idea_id) {
        const exists = db.prepare('SELECT id FROM ideas WHERE id = ?').get(idea_id);
        resolvedIdeaId = exists ? idea_id : null;
      }

      const stmt = db.prepare(`
        INSERT INTO calendar_events (idea_id, channel_id, title, scheduled_date, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        resolvedIdeaId,
        channel_id,
        title || null,
        scheduled_date,
        status || 'planned'
      );

      const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/calendar/events/:id — update event
  router.post('/events/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, title } = req.body;

      const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!verifyChannel(event.channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }

      const updates = [];
      const params = [];

      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes);
      }
      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }

      if (updates.length > 0) {
        params.push(id);
        db.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }

      const updated = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/calendar/events — list events (optionally filtered by channel_id)
  router.get('/events', (req, res) => {
    try {
      const { channel_id } = req.query;
      let events;
      const baseQuery = `
        SELECT ce.*, COALESCE(ce.title, i.title) AS title
        FROM calendar_events ce
        LEFT JOIN ideas i ON ce.idea_id = i.id
      `;
      if (channel_id) {
        if (!verifyChannel(channel_id, req.user.id)) {
          return res.status(403).json({ error: 'Access denied: You do not own this channel' });
        }
        events = db.prepare(baseQuery + ' WHERE ce.channel_id = ? ORDER BY ce.scheduled_date ASC').all(channel_id);
      } else {
        events = db.prepare(baseQuery + ' WHERE ce.channel_id IN (SELECT id FROM channels WHERE user_id = ?) ORDER BY ce.scheduled_date ASC').all(req.user.id);
      }
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /api/calendar/events/:id — delete event
  router.delete('/events/:id', (req, res) => {
    try {
      const { id } = req.params;
      const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      if (!verifyChannel(event.channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
      db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

export default router;
