import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// POST /api/scripts — save a script
router.post('/', (req, res) => {
  try {
    const { idea_id, channel_id, title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
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
      channel_id || null,
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

    const markdown = `# ${script.title}\n\n${script.content}\n\n---\n*Word count: ${script.word_count} | Estimated duration: ${script.estimated_duration}*\n`;

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
