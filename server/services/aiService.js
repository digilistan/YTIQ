import db from '../db/database.js';

const DEFAULT_API_KEY = 'ak_20A7CH1mP1Fv14K4uR5xg4JN8mZ3d';
const DEFAULT_ENDPOINT = 'https://api.longcat.chat/openai/v1/chat/completions';
const DEFAULT_MODEL = 'LongCat-2.0-Preview';

/**
 * Read a setting from the database, falling back to a default value.
 */
function getSetting(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Check whether mock API mode is enabled.
 */
function isMockMode() {
  const val = getSetting('use_mock_api', '');
  return val === '1' || val === 'true' || val === true;
}

/**
 * Send a chat completion request to the AI endpoint.
 */
async function callAI(systemPrompt, userPrompt) {
  const apiKey = getSetting('ai_api_key', DEFAULT_API_KEY);
  const endpoint = getSetting('ai_endpoint', DEFAULT_ENDPOINT);
  const model = getSetting('ai_model', DEFAULT_MODEL);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI returned an empty response');
  }

  // Try to parse as JSON; if it fails, return the raw string
  try {
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from markdown code fences
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    return content;
  }
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const MOCK = {
  nicheAnalysis: (topic) => ({
    topic,
    score: 78,
    competition: 'Medium',
    searchVolume: 'High',
    trending: true,
    summary: `"${topic}" is a promising niche with moderate competition and strong search demand.`,
    opportunities: [
      'Tutorial-style content performs well',
      'Underserved audience in non-English markets',
      'Collaboration potential with micro-influencers'
    ],
    risks: [
      'Several large channels dominate top search results',
      'Seasonal fluctuations may impact viewership'
    ]
  }),

  videoIdeas: (niche) => [
    { title: `Top 10 ${niche} Tips for Beginners`, angle: 'Listicle', effort: 'Low' },
    { title: `${niche} Mistakes Everyone Makes`, angle: 'Contrarian', effort: 'Medium' },
    { title: `I Tried ${niche} for 30 Days`, angle: 'Challenge', effort: 'High' },
    { title: `${niche} vs. What People Think`, angle: 'Myth-busting', effort: 'Medium' },
    { title: `The Future of ${niche} in 2025`, angle: 'Trend analysis', effort: 'Low' }
  ],

  script: (title) => ({
    title,
    hook: `Have you ever wondered about ${title}? In this video, we break it all down.`,
    sections: [
      { heading: 'Introduction', content: 'Welcome back to the channel! Today we are diving deep into this topic.' },
      { heading: 'Main Point 1', content: 'Let us start with the most important thing you need to know...' },
      { heading: 'Main Point 2', content: 'Now here is where it gets really interesting...' },
      { heading: 'Call to Action', content: 'If you found this helpful, smash that like button and subscribe!' }
    ],
    estimatedDuration: '8-10 minutes',
    wordCount: 1200
  }),

  seo: (title) => ({
    originalTitle: title,
    optimizedTitles: [
      `${title} (You Won't Believe #3)`,
      `${title} | Complete Guide 2025`,
      `${title} - Everything You Need to Know`
    ],
    description: `In this video we cover everything about ${title}. Watch till the end for a surprise tip!`,
    tags: ['youtube', 'tutorial', 'guide', title.toLowerCase()],
    hashtags: ['#YouTube', '#ContentCreator', '#Growth'],
    seoScore: 82,
    tips: [
      'Include the main keyword in the first 60 characters of the title',
      'Add timestamps to the description for better engagement',
      'Use 3-5 relevant hashtags'
    ]
  }),

  thumbnailConcepts: (topic) => [
    { concept: 'Shocked face with bold text overlay', style: 'Reaction', colors: ['red', 'yellow'] },
    { concept: 'Before/After split comparison', style: 'Comparison', colors: ['blue', 'green'] },
    { concept: 'Clean minimal design with large text', style: 'Minimal', colors: ['white', 'black'] }
  ],

  angleAnalysis: (videoTitle) => `Consider approaching "${videoTitle}" from a contrarian angle. Instead of agreeing with the mainstream take, challenge common assumptions. This will boost engagement through debate in the comments.`
};

// ─── Exported Functions ─────────────────────────────────────────────────────────

export async function generateNicheAnalysis(topic) {
  if (isMockMode()) return MOCK.nicheAnalysis(topic);

  return callAI(
    'You are a YouTube niche analysis expert. Respond ONLY with valid JSON. Analyze the given topic for YouTube content creation potential.',
    `Analyze this YouTube niche/topic: "${topic}". Return a JSON object with these fields: topic (string), score (number 0-100), competition (Low/Medium/High), searchVolume (Low/Medium/High), trending (boolean), summary (string), opportunities (array of strings), risks (array of strings).`
  );
}

export async function generateVideoIdeas(niche) {
  if (isMockMode()) return MOCK.videoIdeas(niche);

  return callAI(
    'You are a creative YouTube strategist. Respond ONLY with a valid JSON array.',
    `Generate 5 unique YouTube video ideas for the niche: "${niche}". Return a JSON array of objects, each with: title (string), angle (string describing the creative angle), effort (Low/Medium/High).`
  );
}

export async function generateScript(ideaTitle) {
  if (isMockMode()) return MOCK.script(ideaTitle);

  return callAI(
    'You are a professional YouTube scriptwriter. Respond ONLY with valid JSON.',
    `Write a YouTube video script for: "${ideaTitle}". Return a JSON object with: title (string), hook (string - attention-grabbing opening), sections (array of {heading, content}), estimatedDuration (string), wordCount (number).`
  );
}

export async function generateSEO(title, description) {
  if (isMockMode()) return MOCK.seo(title);

  return callAI(
    'You are a YouTube SEO specialist. Respond ONLY with valid JSON.',
    `Optimize SEO for a YouTube video. Title: "${title}". Description: "${description || ''}". Return a JSON object with: originalTitle (string), optimizedTitles (array of 3 strings), description (optimized description string), tags (array of strings), hashtags (array of strings), seoScore (number 0-100), tips (array of actionable tips).`
  );
}

export async function generateThumbnailConcepts(topic) {
  if (isMockMode()) return MOCK.thumbnailConcepts(topic);

  return callAI(
    'You are a YouTube thumbnail design consultant. Respond ONLY with a valid JSON array.',
    `Generate 3 thumbnail concepts for a YouTube video about: "${topic}". Return a JSON array of objects, each with: concept (description string), style (string), colors (array of color strings).`
  );
}

export async function generateAngleAnalysis(videoTitle) {
  if (isMockMode()) return MOCK.angleAnalysis(videoTitle);

  return callAI(
    'You are a YouTube content strategy advisor. Respond with a concise paragraph of advice.',
    `Suggest the best creative angle for a YouTube video titled: "${videoTitle}". Consider what would maximize engagement, click-through rate, and watch time. Provide a single paragraph of actionable advice.`
  );
}
