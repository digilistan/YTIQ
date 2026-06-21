import express from 'express';
import db from '../db/database.js';
import { NICHE_KNOWLEDGE_PROMPT } from '../services/nicheKnowledge.js';
import { callYoutubeApi } from '../utils/youtubeApi.js';
import { queueAICall } from '../services/aiService.js';

const router = express.Router();

const DEFAULT_ENDPOINT = 'https://api.longcat.chat/openai/v1/chat/completions';
const DEFAULT_MODEL = 'LongCat-2.0-Preview';

function getSetting(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

/**
 * Helper to analyze the user's message in the background
 * and automatically extract permanent facts about their niche, goals, style, etc.
 */
async function autoExtractMemory(userMessage, apiKey, endpoint, model, userId) {
  try {
    const systemPrompt = `You are a memory processor for a YouTube advisor AI. 
Analyze the user's message and extract any new permanent facts, preferences, goals, or settings about the user, their channel, or their content strategy.
Write each fact as a short, concise, single-sentence statement (e.g., "User's channel name is Muzammil", "User targets budget-conscious students", "User prefers faceless videos").
Only extract facts that are stated as truth by the user. Do not extract temporary questions.
Respond ONLY with a valid JSON array of strings, e.g., ["fact 1", "fact 2"]. If no new permanent facts are found, return [].`;

    const content = await queueAICall(async () => {
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
            { role: 'user', content: userMessage },
          ],
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) throw new Error(`Memory extraction failed with status: ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content;
    });

    if (content) {
      let facts = [];
      try {
        facts = JSON.parse(content);
      } catch {
        const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) facts = JSON.parse(m[1].trim());
      }
        if (Array.isArray(facts)) {
          for (const fact of facts) {
            if (typeof fact === 'string' && fact.trim()) {
              const cleanedFact = fact.trim();
              // Prevent duplicates per user
              const exists = db.prepare('SELECT 1 FROM chat_memory WHERE fact = ? AND user_id = ?').get(cleanedFact, userId);
              if (!exists) {
                db.prepare('INSERT INTO chat_memory (fact, user_id) VALUES (?, ?)').run(cleanedFact, userId);
                console.log(`[AI Chat Memory] Automatically saved fact: "${cleanedFact}" for user ${userId}`);
              }
            }
          }
        }
      }
  } catch (err) {
    console.error('[AI Chat Memory] Auto extraction failed:', err);
  }
}

// GET /api/chat/sessions - Get list of sessions
router.get('/sessions', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chat/sessions/:id - Get session messages
router.get('/sessions/:id', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found or access denied' });

    const messages = db.prepare('SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ session, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chat/sessions/:id - Delete a session
router.delete('/sessions/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Session not found or access denied' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/chat/sessions/:id - Update session title
router.put('/sessions/:id', (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const result = db.prepare('UPDATE chat_sessions SET title = ? WHERE id = ? AND user_id = ?').run(title.trim(), req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found or access denied' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chat/memory - Get all long term memory facts
router.get('/memory', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM chat_memory WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/memory - Manually add a memory fact
router.post('/memory', (req, res) => {
  try {
    const { fact } = req.body;
    if (!fact || !fact.trim()) {
      return res.status(400).json({ error: 'Fact is required' });
    }
    const result = db.prepare('INSERT INTO chat_memory (fact, user_id) VALUES (?, ?)').run(fact.trim(), req.user.id);
    const newMemory = db.prepare('SELECT * FROM chat_memory WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newMemory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/chat/memory/:id - Delete a memory fact
router.delete('/memory/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM chat_memory WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Memory fact not found or access denied' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat - Main endpoint (supports implicitly saving/starting sessions)
router.post('/', async (req, res) => {
  try {
    const { messages = [], channel_id, session_id, scrape_youtube } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const apiKey = getSetting('ai_api_key', '');
    if (!apiKey) {
      return res.status(400).json({ error: 'No AI API key configured. Add it in Settings.' });
    }

    const endpoint = getSetting('ai_endpoint', DEFAULT_ENDPOINT);
    const model = getSetting('ai_model', DEFAULT_MODEL);

    let activeSessionId = session_id;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || typeof lastMsg.content !== 'string') {
      return res.status(400).json({ error: 'Last message must have content string' });
    }
    const latestUserMessage = lastMsg.content;

    // 1. Manage session/message persistence
    try {
      if (!activeSessionId) {
        // Create new session implicitly
        const title = latestUserMessage.slice(0, 35) + (latestUserMessage.length > 35 ? '...' : '');
        const sessResult = db.prepare('INSERT INTO chat_sessions (title, user_id) VALUES (?, ?)').run(title, req.user.id);
        activeSessionId = sessResult.lastInsertRowid;
      } else {
        // Verify session belongs to user
        const session = db.prepare('SELECT 1 FROM chat_sessions WHERE id = ? AND user_id = ?').get(activeSessionId, req.user.id);
        if (!session) {
          return res.status(403).json({ error: 'Access denied to this chat session' });
        }
      }

      // Save user message to DB
      db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
        .run(activeSessionId, 'user', latestUserMessage);
    } catch (dbErr) {
      console.error('[AI Chat] DB message save error:', dbErr);
    }

    // 2. Fetch context (Memory + Channel data)
    let memoryContext = '';
    try {
      const memoryRows = db.prepare('SELECT fact FROM chat_memory WHERE user_id = ?').all(req.user.id);
      if (memoryRows.length > 0) {
        memoryContext = `
## LONG-TERM USER PREFERENCES & MEMORY
(Use these facts/preferences to personalize your advice. Always respect them):
${memoryRows.map(r => `- ${r.fact}`).join('\n')}
`;
      }
    } catch (_) {}

    let channelContext = '';
    if (channel_id) {
      try {
        const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?').get(channel_id, req.user.id);
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

    let ytContext = '';
    if (scrape_youtube) {
      const ytKey = getSetting('youtube_api_key', '');
      if (ytKey) {
        try {
          let searchQueries = [];
          // Extract search query locally (runs in 0ms, saving an LLM call)
          const localQuery = (() => {
            let cleaned = latestUserMessage.trim();
            const quoteMatch = cleaned.match(/"([^"]+)"/) || cleaned.match(/'([^']+)'/);
            if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim()) {
              return quoteMatch[1].trim();
            }
            cleaned = cleaned.replace(/^(please\s+)?(search\s+for|find\s+videos\s+about|look\s+up\s+on\s+youtube|look\s+up|youtube\s+search\s+for|show\s+me\s+videos\s+about|videos\s+about|videos\s+of|search\s+youtube\s+for|search\s+)\s*/i, '');
            cleaned = cleaned.replace(/[?.!]+$/, '');
            return cleaned.slice(0, 80).trim();
          })();

          if (localQuery) {
            searchQueries = [localQuery];
          }

          if (searchQueries.length > 0 && searchQueries[0]) {
            const targetQuery = searchQueries[0];
            console.log(`[YouTube Scraper] Executing YouTube search for: "${targetQuery}"`);

            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(targetQuery)}&type=video&maxResults=5&key=${encodeURIComponent(ytKey)}`;
            const searchData = await callYoutubeApi(searchUrl, 7); // Cache search list for 7 days
            
            const items = searchData.items || [];
            const videoIds = items.map(item => item.id?.videoId).filter(Boolean);

            let videoDetails = [];
            if (videoIds.length > 0) {
              const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${encodeURIComponent(videoIds.join(','))}&key=${encodeURIComponent(ytKey)}`;
              const detailsData = await callYoutubeApi(detailsUrl, 7); // Cache video details for 7 days
              videoDetails = (detailsData.items || []).map(v => ({
                title: v.snippet?.title || 'N/A',
                channel: v.snippet?.channelTitle || 'N/A',
                views: parseInt(v.statistics?.viewCount || '0', 10),
                publishedAt: v.snippet?.publishedAt || '',
                id: v.id
              }));
            }

            if (videoDetails.length > 0) {
              ytContext = `
## LIVE YOUTUBE SEARCH DATA FOR QUERY: "${targetQuery}"
(Here are the actual live search results fetched from YouTube. Use these findings to enrich your advice and provide factual statistics to the user):
`;
              videoDetails.forEach((v, index) => {
                ytContext += `${index + 1}. **"${v.title}"** by channel *${v.channel}*
   - Views: ${v.views.toLocaleString()} views
   - Published: ${v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : 'N/A'}
   - Link: https://youtube.com/watch?v=${v.id}
`;
              });
              ytContext += `\n`;
            }
          }
        } catch (scrapErr) {
          console.error('[YouTube Scraper] Error during scraping:', scrapErr);
        }
      }
    }

    const systemPrompt = NICHE_KNOWLEDGE_PROMPT + memoryContext + channelContext + ytContext;

    // 3. Request LLM response
    const content = await queueAICall(async () => {
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
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`AI API error (${response.status}): ${body}`);
      }

      const data = await response.json();
      const c = data.choices?.[0]?.message?.content;
      if (!c) {
        throw new Error('AI returned an empty response');
      }
      return c;
    });

    // 4. Save AI reply to DB
    try {
      db.prepare('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)')
        .run(activeSessionId, 'assistant', content);
      
      db.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(activeSessionId);
    } catch (dbErr) {
      console.error('[AI Chat] DB reply save error:', dbErr);
    }

    // 5. Fire off asynchronous memory extraction (no await so it doesn't block the client)
    autoExtractMemory(latestUserMessage, apiKey, endpoint, model, req.user.id);

    res.json({ reply: content, session_id: activeSessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
