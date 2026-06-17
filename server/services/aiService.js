import db from '../db/database.js';

const DEFAULT_ENDPOINT = 'https://api.longcat.chat/openai/v1/chat/completions';
const DEFAULT_MODEL = 'LongCat-2.0-Preview';

function getSetting(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

function isMockMode() {
  const val = getSetting('use_mock_api', '');
  return val === '1' || val === 'true' || val === true;
}

async function callAI(systemPrompt, userPrompt) {
  const apiKey = getSetting('ai_api_key', '');
  if (!apiKey) throw new Error('No AI API key configured. Add it in Settings.');

  const endpoint = getSetting('ai_endpoint', DEFAULT_ENDPOINT);
  const model = getSetting('ai_model', DEFAULT_MODEL);

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
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned an empty response');

  try { return JSON.parse(content); } catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) return JSON.parse(m[1].trim());
    return content;
  }
}

// ─── Mock Data (only used when use_mock_api = true) ──────────────────────────

const MOCK = {
  nicheAnalysis: (topic) => ({
    topic, score: 78, competition: 'Medium', searchVolume: 'High', trending: true,
    summary: `"${topic}" is a promising niche with moderate competition and strong search demand.`,
    opportunities: ['Tutorial-style content performs well', 'Underserved non-English markets', 'Collaboration with micro-influencers'],
    risks: ['Large channels dominate top results', 'Seasonal fluctuations may impact views'],
  }),
  videoIdeas: (niche) => [
    { title: `Top 10 ${niche} Tips for Beginners`, angle: 'Listicle', effort: 'Low' },
    { title: `${niche} Mistakes Everyone Makes`, angle: 'Contrarian', effort: 'Medium' },
    { title: `I Tried ${niche} for 30 Days`, angle: 'Challenge', effort: 'High' },
    { title: `${niche} vs. What People Think`, angle: 'Myth-busting', effort: 'Medium' },
    { title: `The Future of ${niche} in 2025`, angle: 'Trend analysis', effort: 'Low' },
  ],
  script: (title) => ({
    title,
    hook: `Have you ever wondered about ${title}? In this video, we break it all down.`,
    sections: [
      { heading: 'Introduction', content: 'Welcome back! Today we dive deep into this topic.' },
      { heading: 'Main Point 1', content: 'Let us start with the most important thing you need to know...' },
      { heading: 'Main Point 2', content: 'Now here is where it gets really interesting...' },
      { heading: 'Call to Action', content: 'If you found this helpful, smash that like button and subscribe!' },
    ],
    estimatedDuration: '8-10 minutes',
    wordCount: 1200,
  }),
  seo: (title) => ({
    originalTitle: title,
    optimizedTitles: [`${title} (Complete Guide)`, `${title} | Everything You Need`, `${title} - Step By Step`],
    description: `In this video we cover everything about ${title}. Watch till the end for a bonus tip!`,
    tags: ['youtube', 'tutorial', 'guide', title.toLowerCase()],
    hashtags: ['#YouTube', '#ContentCreator', '#Growth'],
    seoScore: 82,
    tips: ['Include main keyword in first 60 characters', 'Add timestamps for better engagement', 'Use 3-5 relevant hashtags'],
  }),
  thumbnailConcepts: (topic) => [
    { concept: 'Shocked face with bold text overlay', style: 'Reaction', colors: ['red', 'yellow'] },
    { concept: 'Before/After split comparison', style: 'Comparison', colors: ['blue', 'green'] },
    { concept: 'Clean minimal with large headline', style: 'Minimal', colors: ['white', 'black'] },
  ],
  angleAnalysis: (title) =>
    `Consider a contrarian angle for "${title}" — challenge common assumptions to drive engagement and debate in the comments.`,
  channelInsights: () => [],
};

// ─── Exports ─────────────────────────────────────────────────────────────────

export async function generateNicheAnalysis(topic) {
  if (isMockMode()) return MOCK.nicheAnalysis(topic);
  return callAI(
    'You are a YouTube niche analysis expert. Respond ONLY with valid JSON.',
    `Analyze this YouTube niche/topic: "${topic}". Return JSON with: topic (string), score (0-100), competition (Low/Medium/High), searchVolume (Low/Medium/High), trending (boolean), summary (string), opportunities (string[]), risks (string[]).`
  );
}

export async function generateVideoIdeas(niche) {
  if (isMockMode()) return MOCK.videoIdeas(niche);
  return callAI(
    'You are a creative YouTube strategist. Respond ONLY with a valid JSON array.',
    `Generate 5 unique YouTube video ideas for: "${niche}". Return a JSON array, each with: title (string), angle (string), effort (Low/Medium/High).`
  );
}

export async function generateScript(ideaTitle) {
  if (isMockMode()) return MOCK.script(ideaTitle);
  return callAI(
    'You are a professional YouTube scriptwriter. Respond ONLY with valid JSON.',
    `Write a YouTube video script for: "${ideaTitle}". Return JSON with: title, hook (string), sections (array of {heading, content}), estimatedDuration (string), wordCount (number).`
  );
}

export async function generateSEO(title, description) {
  if (isMockMode()) return MOCK.seo(title);
  return callAI(
    'You are a YouTube SEO specialist. Respond ONLY with valid JSON.',
    `Optimize SEO for: title="${title}", description="${description || ''}". Return JSON with: originalTitle, optimizedTitles (array of 3), description (string), tags (string[]), hashtags (string[]), seoScore (0-100), tips (string[]).`
  );
}

export async function generateThumbnailConcepts(topic) {
  if (isMockMode()) return MOCK.thumbnailConcepts(topic);
  return callAI(
    'You are a YouTube thumbnail design consultant. Respond ONLY with a valid JSON array.',
    `Generate 3 thumbnail concepts for: "${topic}". Return a JSON array, each with: concept (string), style (string), colors (string[]).`
  );
}

export async function generateAngleAnalysis(videoTitle) {
  if (isMockMode()) return MOCK.angleAnalysis(videoTitle);
  return callAI(
    'You are a YouTube content strategy advisor. Respond with a concise paragraph of advice.',
    `Suggest the best creative angle for a YouTube video titled: "${videoTitle}". Maximize engagement, CTR, and watch time. Provide one concise actionable paragraph.`
  );
}

export async function generateChannelInsights(channelName, statsRows) {
  if (isMockMode()) return [];

  const latest = statsRows[0];
  const oldest = statsRows[statsRows.length - 1];
  const daySpan = statsRows.length;

  const subGrowth = latest.subscribers - oldest.subscribers;
  const viewGrowth = latest.total_views - oldest.total_views;

  const summary = `Channel: ${channelName}. Data points: ${daySpan} syncs. Latest: ${latest.subscribers?.toLocaleString()} subs, ${latest.total_views?.toLocaleString()} total views, ${latest.video_count} videos. Growth over tracked period: ${subGrowth >= 0 ? '+' : ''}${subGrowth.toLocaleString()} subscribers, ${viewGrowth >= 0 ? '+' : ''}${viewGrowth.toLocaleString()} views.`;

  const result = await callAI(
    'You are a YouTube channel growth advisor. Respond ONLY with a valid JSON array of exactly 3 short strings.',
    `Based on this real channel data, give 3 concise, specific, actionable tips (each under 15 words) to help grow this channel. Stats: ${summary}. Return a JSON array of 3 strings.`
  );

  if (Array.isArray(result)) return result.slice(0, 3);
  return [];
}
