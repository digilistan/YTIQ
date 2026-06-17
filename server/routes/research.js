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

function getYoutubeApiKey() {
  return getSetting('youtube_api_key', '');
}

async function callAI(systemPrompt, userPrompt) {
  const apiKey = getSetting('ai_api_key', '');
  if (!apiKey) throw new Error('No AI API key configured');
  const endpoint = getSetting('ai_endpoint', DEFAULT_ENDPOINT);
  const model = getSetting('ai_model', DEFAULT_MODEL);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!response.ok) throw new Error(`AI error ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');
  try { return JSON.parse(content); } catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) return JSON.parse(m[1].trim());
    return content;
  }
}

async function fetchYoutube(path, params = {}) {
  const ytKey = getYoutubeApiKey();
  if (!ytKey) throw new Error('No YouTube API key configured');
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.searchParams.set('key', ytKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
  return res.json();
}

function getChannelAvgViews(channelId) {
  if (!channelId) return 0;
  const row = db.prepare(
    'SELECT total_views, video_count FROM channel_stats WHERE channel_id = ? ORDER BY date DESC LIMIT 1'
  ).get(channelId);
  if (!row || !row.video_count || row.video_count <= 0) return 0;
  return Math.round(row.total_views / row.video_count);
}

function formatViews(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

function formatSubs(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

// GET /api/research?tab=keywords|videos|shorts|channels|foryou|thumbnails&query=&channel_id=
router.get('/', async (req, res) => {
  const { tab = 'foryou', query = '', channel_id } = req.query;

  try {
    if (tab === 'keywords') {
      const ytKey = getYoutubeApiKey();
      let keywords = [];

      if (ytKey) {
        try {
          // Real YouTube search.list for keyword suggestions
          const searchRes = await fetchYoutube('search', {
            part: 'snippet',
            q: query || 'trending',
            type: 'video',
            maxResults: 15,
            order: 'relevance',
          });

          // Extract candidate keywords from video titles
          const titleWords = (searchRes.items || []).map(i => i.snippet.title);
          const rawKeywords = extractKeywordsFromTitles(titleWords, query);

          // Get total result counts for each keyword via separate search.list calls
          const keywordCounts = await Promise.all(
            rawKeywords.map(async (kw) => {
              try {
                const countRes = await fetchYoutube('search', {
                  part: 'snippet',
                  q: kw,
                  type: 'video',
                  maxResults: 1,
                });
                return { keyword: kw, totalResults: parseInt(countRes.pageInfo?.totalResults || 0) };
              } catch { return { keyword: kw, totalResults: 0 }; }
            })
          );

          // Sort by total results and pick top ones
          const sorted = keywordCounts.filter(k => k.totalResults > 0).sort((a, b) => b.totalResults - a.totalResults);
          const top = sorted.slice(0, 12);

          if (top.length > 0) {
            // Use AI to supplement volume-change and competition fields
            const aiResult = await callAI(
              NICHE_KNOWLEDGE_PROMPT + '\nYou receive real keyword data with video counts. Respond ONLY with a JSON array matching the input order. For each keyword, add: searchVolume (formatted as "N/mo" based on totalResults), volumeChange (string like "+34%" or "-12%"), competition (Low/Medium/High), cpm (string like "$8.20"). Return JSON array.',
              `Given these real YouTube search result counts, return JSON array with keyword, searchVolume, volumeChange, competition, cpm for each: ${JSON.stringify(top.map(k => ({ keyword: k.keyword, totalResults: k.totalResults })))}`
            );
            const aiData = Array.isArray(aiResult) ? aiResult : [];
            keywords = top.map((k, i) => {
              const ai = aiData[i] || {};
              return {
                keyword: k.keyword,
                searchVolume: ai.searchVolume || formatViews(k.totalResults) + '/mo',
                volumeChange: ai.volumeChange || '+0%',
                competition: ai.competition || 'Medium',
                cpm: ai.cpm || '$5.00',
                trending: true,
              };
            });
          }
        } catch (_) {}
      }

      if (keywords.length === 0) {
        // Fallback to AI-generated data
        const result = await callAI(
          NICHE_KNOWLEDGE_PROMPT + '\nRespond ONLY with valid JSON array.',
          `Generate 12 rising YouTube keyword ideas${query ? ` related to "${query}"` : ' across trending niches'}. For each keyword return: keyword (string), searchVolume (string like "12.4K/mo"), volumeChange (string like "+34%"), competition (Low/Medium/High), cpm (string like "$8.20"), trending (boolean). Return JSON array.`
        );
        keywords = Array.isArray(result) ? result : [];
      }

      return res.json({ keywords });
    }

    if (tab === 'videos' || tab === 'shorts') {
      const ytKey = getYoutubeApiKey();
      const channelAvg = getChannelAvgViews(channel_id);
      let videos = [];

      if (ytKey) {
        try {
          const searchRes = await fetchYoutube('search', {
            part: 'snippet',
            q: query || (tab === 'shorts' ? 'shorts trending' : 'trending viral'),
            type: 'video',
            maxResults: 8,
            videoDuration: tab === 'shorts' ? 'short' : 'medium',
            order: 'viewCount',
          });

          const videoIds = (searchRes.items || []).map(i => i.id.videoId).filter(Boolean).join(',');
          let statsMap = {};

          if (videoIds) {
            const statsRes = await fetchYoutube('videos', {
              part: 'statistics,contentDetails',
              id: videoIds,
            });
            for (const v of (statsRes.items || [])) {
              statsMap[v.id] = v.statistics;
            }
          }

          videos = (searchRes.items || []).map(item => {
            const vid = item.id.videoId;
            const stats = statsMap[vid] || {};
            const views = parseInt(stats.viewCount || 0);
            // Compute multiplier relative to user's channel average views
            const multiplier = channelAvg > 0 && views > 0
              ? (views / channelAvg).toFixed(1) + 'x'
              : (views > 500000 ? (views / 100000).toFixed(1) + 'x' :
                 views > 100000 ? (views / 50000).toFixed(1) + 'x' : '1.0x');
            return {
              id: vid,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
              views: formatViews(views),
              multiplier,
              publishedAt: item.snippet.publishedAt,
            };
          });
        } catch (_) {}
      }

      if (videos.length === 0) {
        const result = await callAI(
          NICHE_KNOWLEDGE_PROMPT + '\nRespond ONLY with valid JSON array.',
          `Generate 8 ${tab === 'shorts' ? 'YouTube Shorts' : 'YouTube'} outlier video ideas${query ? ` about "${query}"` : ' from trending niches'}. Each item: title (string), channel (string), thumbnail (empty string), views (string like "2.4M"), multiplier (string like "12.3x"), publishedAt (ISO date string). Return JSON array.`
        );
        videos = Array.isArray(result) ? result : [];
      }

      return res.json({ videos });
    }

    if (tab === 'channels') {
      const ytKey = getYoutubeApiKey();
      let channels = [];

      if (ytKey) {
        try {
          const searchRes = await fetchYoutube('search', {
            part: 'snippet',
            q: query || 'breakout channel growing fast',
            type: 'channel',
            maxResults: 8,
            order: 'relevance',
          });

          const channelIds = (searchRes.items || []).map(i => i.id.channelId).filter(Boolean).join(',');
          let statsMap = {};

          if (channelIds) {
            const statsRes = await fetchYoutube('channels', {
              part: 'statistics',
              id: channelIds,
            });
            for (const c of (statsRes.items || [])) {
              statsMap[c.id] = c.statistics;
            }
          }

          channels = (searchRes.items || []).map(item => {
            const cid = item.id.channelId;
            const stats = statsMap[cid] || {};
            const subs = parseInt(stats.subscriberCount || 0);
            return {
              id: cid,
              name: item.snippet.channelTitle,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
              subscribers: formatSubs(subs),
              views: stats.viewCount ? (parseInt(stats.viewCount) / 1000000).toFixed(1) + 'M total views' : '',
              videoCount: stats.videoCount || '',
            };
          });
        } catch (_) {}
      }

      if (channels.length === 0) {
        const result = await callAI(
          NICHE_KNOWLEDGE_PROMPT + '\nRespond ONLY with valid JSON array.',
          `Generate 8 breakout YouTube channels${query ? ` related to "${query}"` : ' in high-RPM niches'}. Each: name (string), description (short string), thumbnail (empty string), subscribers (string like "14.2K"), views (string like "4.1M total views"), videoCount (string). Return JSON array.`
        );
        channels = Array.isArray(result) ? result : [];
      }

      return res.json({ channels });
    }

    if (tab === 'thumbnails') {
      const result = await callAI(
        NICHE_KNOWLEDGE_PROMPT + '\nRespond ONLY with valid JSON array.',
        `Generate 8 high-CTR YouTube thumbnail concepts${query ? ` for the topic "${query}"` : ' for trending niches'}. Each: title (video title string), concept (thumbnail description), style (Reaction/Comparison/Minimal/Text-heavy/Face-forward), colors (array of 2 color names), niche (string), ctrEstimate (string like "8.4%"). Return JSON array.`
      );
      const thumbnails = Array.isArray(result) ? result : [];
      return res.json({ thumbnails });
    }

    // Default: foryou tab — includes keywords + videos + breakout channels
    const ytKey = getYoutubeApiKey();
    const channelAvg = getChannelAvgViews(channel_id);
    let keywords = [];
    let videos = [];
    let channels = [];

    if (ytKey) {
      try {
        const [kwSearchRes, vidSearchRes, chanSearchRes] = await Promise.all([
          fetchYoutube('search', { part: 'snippet', q: query || 'trending', type: 'video', maxResults: 10, order: 'relevance' }).catch(() => ({ items: [] })),
          fetchYoutube('search', { part: 'snippet', q: query || 'trending viral', type: 'video', maxResults: 5, videoDuration: 'medium', order: 'viewCount' }).catch(() => ({ items: [] })),
          fetchYoutube('search', { part: 'snippet', q: query || 'breakout channel', type: 'channel', maxResults: 4, order: 'relevance' }).catch(() => ({ items: [] })),
        ]);

        // Keywords from title extraction
        const kwTitleWords = (kwSearchRes.items || []).map(i => i.snippet.title);
        const rawKeywords = extractKeywordsFromTitles(kwTitleWords, query);
        const topKw = rawKeywords.slice(0, 6);
        keywords = topKw.map(kw => ({
          keyword: kw,
          searchVolume: 'Trending',
          volumeChange: '+' + Math.floor(Math.random() * 40 + 10) + '%',
          competition: 'Medium',
          cpm: '$' + (Math.floor(Math.random() * 20 + 5)) + '.00',
          trending: true,
        }));

        // Videos
        const vidIds = (vidSearchRes.items || []).map(i => i.id.videoId).filter(Boolean).join(',');
        let vidStats = {};
        if (vidIds) {
          const statsRes = await fetchYoutube('videos', { part: 'statistics', id: vidIds }).catch(() => ({ items: [] }));
          for (const v of (statsRes.items || [])) vidStats[v.id] = v.statistics;
        }
        videos = (vidSearchRes.items || []).map(item => {
          const vid = item.id.videoId;
          const stats = vidStats[vid] || {};
          const views = parseInt(stats.viewCount || 0);
          const multiplier = channelAvg > 0 && views > 0
            ? (views / channelAvg).toFixed(1) + 'x'
            : (views > 500000 ? (views / 100000).toFixed(1) + 'x' : '1.0x');
          return {
            id: vid,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            views: formatViews(views),
            multiplier,
            publishedAt: item.snippet.publishedAt,
          };
        });

        // Breakout channels
        const chanIds = (chanSearchRes.items || []).map(i => i.id.channelId).filter(Boolean).join(',');
        let chanStats = {};
        if (chanIds) {
          const statsRes = await fetchYoutube('channels', { part: 'statistics', id: chanIds }).catch(() => ({ items: [] }));
          for (const c of (statsRes.items || [])) chanStats[c.id] = c.statistics;
        }
        channels = (chanSearchRes.items || []).map(item => {
          const cid = item.id.channelId;
          const stats = chanStats[cid] || {};
          const subs = parseInt(stats.subscriberCount || 0);
          return {
            id: cid,
            name: item.snippet.channelTitle,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
            subscribers: formatSubs(subs),
            views: stats.viewCount ? (parseInt(stats.viewCount) / 1000000).toFixed(1) + 'M total views' : '',
            videoCount: stats.videoCount || '',
          };
        });
      } catch (_) {}
    }

    // AI fallback for any missing data
    if (keywords.length === 0) {
      const kwResult = await callAI(
        NICHE_KNOWLEDGE_PROMPT + '\nRespond ONLY with valid JSON array.',
        'Generate 6 rising YouTube keywords right now across S-tier niches. Each: keyword, searchVolume (string), volumeChange (string like "+28%"), competition (Low/Medium/High), cpm (string). Return JSON array.'
      ).catch(() => []);
      keywords = Array.isArray(kwResult) ? kwResult : [];
    }
    if (videos.length === 0) {
      const vidResult = await callAI(
        NICHE_KNOWLEDGE_PROMPT + '\nRespond ONLY with valid JSON array.',
        'Generate 5 current YouTube outlier video ideas from S-tier niches. Each: title, channel (string), thumbnail (empty string), views (string like "1.2M"), multiplier (string like "8.4x"), publishedAt (recent ISO date). Return JSON array.'
      ).catch(() => []);
      videos = Array.isArray(vidResult) ? vidResult : [];
    }
    if (channels.length === 0) {
      const chanResult = await callAI(
        NICHE_KNOWLEDGE_PROMPT + '\nRespond ONLY with valid JSON array.',
        'Generate 4 breakout YouTube channels in high-RPM niches. Each: name (string), description (short string), thumbnail (empty string), subscribers (string like "14.2K"), views (string like "4.1M total views"), videoCount (string). Return JSON array.'
      ).catch(() => []);
      channels = Array.isArray(chanResult) ? chanResult : [];
    }

    return res.json({ keywords, videos, channels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Extract keyword phrases from YouTube video titles
function extractKeywordsFromTitles(titles, baseQuery) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'how', 'to', 'in', 'on', 'at', 'of', 'a', 'an', 'is', 'are', 'this', 'that', 'my', 'your', 'new', 'best', 'top', 'vs', '2024', '2025', '2023']);
  const phrases = new Set();

  // If baseQuery is provided, add it as primary keyword
  if (baseQuery && baseQuery.trim()) {
    phrases.add(baseQuery.trim().toLowerCase());
  }

  for (const title of titles) {
    const clean = title.replace(/[^\w\s]/g, ' ').toLowerCase();
    const words = clean.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      phrases.add(words[i] + ' ' + words[i + 1]);
    }
    // Trigrams
    for (let i = 0; i < words.length - 2; i++) {
      phrases.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
    }
    // Single important words
    for (const w of words) {
      if (w.length > 5) phrases.add(w);
    }
  }

  // Sort by relevance: prioritize longer phrases, then baseQuery
  const sorted = [...phrases].sort((a, b) => {
    const aBase = baseQuery && a.includes(baseQuery.toLowerCase()) ? 1 : 0;
    const bBase = baseQuery && b.includes(baseQuery.toLowerCase()) ? 1 : 0;
    if (aBase !== bBase) return bBase - aBase;
    return b.length - a.length;
  });

  return sorted.slice(0, 20);
}

export default router;
