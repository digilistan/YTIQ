import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Helper to verify channel ownership
function verifyChannel(channelId, userId) {
  if (!channelId) return false;
  const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND user_id = ?').get(channelId, userId);
  return !!channel;
}

// POST /api/scripts — save a script
router.post('/', (req, res) => {
  try {
    const { idea_id, channel_id, title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
    } else {
      return res.status(400).json({ error: 'channel_id is required' });
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    // Rough estimate: ~150 words per minute of spoken content
    const minutes = Math.round(wordCount / 150);
    const estimatedDuration = `${minutes} min`;

    const stmt = db.prepare(`
      INSERT INTO scripts (idea_id, channel_id, title, content, word_count, estimated_duration)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      idea_id || null,
      channel_id,
      title,
      content,
      wordCount,
      estimatedDuration
    );

    const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(script);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scripts/:id/export — export script as markdown
router.get('/:id/export', (req, res) => {
  try {
    const { id } = req.params;
    const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id);

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    if (!verifyChannel(script.channel_id, req.user.id)) {
      return res.status(403).json({ error: 'Access denied: You do not own this channel' });
    }

    let bodyMarkdown = '';
    try {
      const parsed = JSON.parse(script.content);
      if (parsed.hook) {
        bodyMarkdown += `**Hook:** ${parsed.hook}\n\n`;
      }
      if (Array.isArray(parsed.sections)) {
        parsed.sections.forEach(s => {
          bodyMarkdown += `## ${s.heading}\n\n${s.content}\n\n`;
        });
      } else {
        bodyMarkdown += `${script.content}\n\n`;
      }
    } catch (_) {
      bodyMarkdown = `${script.content}\n\n`;
    }

    const markdown = `# ${script.title}\n\n${bodyMarkdown}---\n*Word count: ${script.word_count} | Estimated duration: ${script.estimated_duration}*\n`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/scripts - load all saved scripts for a channel
router.get('/', (req, res) => {
  try {
    const { channel_id } = req.query;
    let scripts;
    if (channel_id) {
      if (!verifyChannel(channel_id, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: You do not own this channel' });
      }
      scripts = db.prepare('SELECT * FROM scripts WHERE channel_id = ? ORDER BY created_at DESC').all(channel_id);
    } else {
      scripts = db.prepare('SELECT * FROM scripts WHERE channel_id IN (SELECT id FROM channels WHERE user_id = ?) ORDER BY created_at DESC').all(req.user.id);
    }
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/scripts/:id - delete a script
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const script = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    if (!verifyChannel(script.channel_id, req.user.id)) {
      return res.status(403).json({ error: 'Access denied: You do not own this channel' });
    }
    db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
    res.json({ success: true, message: 'Script deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
