import express from 'express';
import db from '../db/database.js';
import { NICHE_KNOWLEDGE_PROMPT } from '../services/nicheKnowledge.js';

const router = express.Router();

const DEFAULT_ENDPOINT = 'https://api.longcat.chat/openai/v1/chat/completions';
const DEFAULT_MODEL = 'LongCat-2.0-Preview';

function getSetting(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { messages = [], channel_id } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const apiKey = getSetting('ai_api_key', '');
    if (!apiKey) {
      return res.status(400).json({ error: 'No AI API key configured. Add it in Settings.' });
    }

    const endpoint = getSetting('ai_endpoint', DEFAULT_ENDPOINT);
    const model = getSetting('ai_model', DEFAULT_MODEL);

    let channelContext = '';
    if (channel_id) {
      try {
        const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channel_id);
        if (channel) {
          const stats = db.prepare(
            'SELECT * FROM channel_stats WHERE channel_id = ? ORDER BY date DESC LIMIT 5'
          ).all(channel_id);
          const latestStats = stats[0];
          const oldest = stats[stats.length - 1];
          const subGrowth = latestStats && oldest ? latestStats.subscribers - oldest.subscribers : 0;

          channelContext = `
## USER'S CHANNEL DATA (use this to personalize your advice)
- Channel Name: ${channel.name}
- Niche: ${channel.niche || 'Not set'}
- Language: ${channel.language || 'en'}
${latestStats ? `- Current Subscribers: ${latestStats.subscribers?.toLocaleString() || 'N/A'}
- Total Views: ${latestStats.total_views?.toLocaleString() || 'N/A'}
- Video Count: ${latestStats.video_count || 'N/A'}
- Subscriber growth (last tracked period): ${subGrowth >= 0 ? '+' : ''}${subGrowth.toLocaleString()}` : '- No stats synced yet'}
`;
        }
      } catch (_) {}
    }

    const systemPrompt = NICHE_KNOWLEDGE_PROMPT + channelContext;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(500).json({ error: `AI API error (${response.status}): ${body}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'AI returned an empty response' });
    }

    res.json({ reply: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
