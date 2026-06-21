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

async function tryRepairTruncatedJSON(jsonString) {
  let str = jsonString.trim();
  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  
  if (startIdx === -1) return null;
  str = str.slice(startIdx);

  for (let i = str.length; i > 0; i--) {
    let candidate = str.slice(0, i).trim();
    if (candidate.endsWith(',') || candidate.endsWith(':') || candidate.endsWith('[') || candidate.endsWith('{')) {
      candidate = candidate.slice(0, -1).trim();
    }
    
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;
    
    for (let j = 0; j < candidate.length; j++) {
      const char = candidate[j];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }
    
    if (inString) {
      candidate += '"';
    }
    
    let closing = '';
    for (let b = 0; b < openBrackets; b++) closing += ']';
    for (let b = 0; b < openBraces; b++) closing += '}';
    
    try {
      return JSON.parse(candidate + closing);
    } catch (_) {}
  }
  return null;
}

function preProcessJSON(str) {
  let cleaned = str;

  // Pattern for all possible JSON keys used in our AI responses
  const keysPattern = '(title|hook|sections|heading|content|estimatedDuration|wordCount|topic|score|competition|searchVolume|trending|summary|opportunities|risks|angle|effort|originalTitle|optimizedTitles|description|tags|hashtags|seoScore|tips|concept|style|colors|factCheck|status|findings|corrections)';

  // Case 1: Missing closing quote on key name followed by colon and quote (e.g. "hook: "value")
  const r1 = new RegExp('"' + keysPattern + '\\s*:\\s*"', 'g');
  cleaned = cleaned.replace(r1, '"$1": "');

  // Case 2: Missing colon and missing opening quote of value (e.g. "content "value")
  const r2 = new RegExp('"' + keysPattern + '\\s*"\\s*([a-zA-Z0-9])', 'g');
  cleaned = cleaned.replace(r2, '"$1": "$2');

  // Case 3: "key " : "value"
  const r3 = new RegExp('"' + keysPattern + '\\s*"\\s*:\\s*"', 'g');
  cleaned = cleaned.replace(r3, '"$1": "');
  
  // Case 4: Missing closing quote on array key followed by colon and bracket (e.g. "sections: [)
  const r4 = new RegExp('"' + keysPattern + '\\s*:\\s*\\[', 'g');
  cleaned = cleaned.replace(r4, '"$1": [');

  // Case 5: Missing colon on array key (e.g. "sections" [ or "sections " [)
  const r5 = new RegExp('"' + keysPattern + '\\s*"\\s*\\[', 'g');
  cleaned = cleaned.replace(r5, '"$1": [');

  return cleaned;
}

let aiQueuePromise = Promise.resolve();

export async function queueAICall(fn) {
  const currentPromise = aiQueuePromise;
  let resolveQueue;
  aiQueuePromise = new Promise((resolve) => {
    resolveQueue = resolve;
  });
  try {
    await currentPromise;
  } catch (err) {
    // Ignore error of previous promise in the queue
  }
  try {
    const result = await fn();
    resolveQueue();
    return result;
  } catch (err) {
    resolveQueue();
    throw err;
  }
}

export async function callAI(systemPrompt, userPrompt) {
  return queueAICall(async () => {
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
        max_tokens: 4096, // Guarantee large token capacity for scripts
      }),
      signal: AbortSignal.timeout(300000)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`AI API error (${response.status}): ${body}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI returned an empty response');
    return content;
  }).then(async (content) => {
    let cleanContent = content.trim();

  // Pre-process common key-value formatting anomalies before parsing
  const promptLower = (systemPrompt + ' ' + userPrompt).toLowerCase();
  if (promptLower.includes('json') || promptLower.includes('array')) {
    cleanContent = preProcessJSON(cleanContent);
  }

  // Try direct parsing first
  try {
    return JSON.parse(cleanContent);
  } catch (directErr) {
    // If direct parse fails, look for markdown code blocks first
    const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = cleanContent.match(markdownRegex);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (matchErr) {
        console.error('[AI Parser] Failed to parse JSON inside markdown block:', matchErr);
      }
    }

    // Try finding the outermost boundaries of JSON object or array
    const firstBrace = cleanContent.indexOf('{');
    const firstBracket = cleanContent.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = cleanContent.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = cleanContent.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonCandidate = cleanContent.slice(startIdx, endIdx + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (boundaryErr) {
        console.error('[AI Parser] Boundary extraction parse failed:', boundaryErr);
      }
    }

    // Try to repair a potentially truncated JSON response
    const promptCombinedLower = systemPrompt.toLowerCase() + userPrompt.toLowerCase();
    if (promptCombinedLower.includes('json') || promptCombinedLower.includes('array')) {
      const repaired = await tryRepairTruncatedJSON(cleanContent);
      if (repaired) {
        console.log('[AI Parser] Successfully repaired and parsed truncated JSON response');
        return repaired;
      }
      
      throw new Error('AI response could not be parsed into a valid JSON object. Please try again.');
    }

    // Fallback for purely text responses (like analyze-angle)
    return content;
  }
});
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
    estimatedDuration: '15 minutes',
    wordCount: 2100,
    factCheck: {
      status: 'Verified',
      findings: ['All factual claims match publicly available information.'],
      corrections: []
    }
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
    'You are an elite YouTube channel growth advisor trained on the Romayroh niche framework. Respond ONLY with valid JSON.',
    `Analyze this YouTube niche/topic: "${topic}". Return JSON with: topic (string), score (0-100), competition (Low/Medium/High), searchVolume (Low/Medium/High), trending (boolean), summary (string - MUST classify this niche as either a "Trend Niche" or "Evergreen Niche" and explain the implications for upload frequency/pacing), opportunities (string[]), risks (string[]).`
  );
}

export async function generateVideoIdeas(niche) {
  if (isMockMode()) return MOCK.videoIdeas(niche);
  return callAI(
    'You are a creative YouTube strategist specialized in copying competitor outliers and designing curiosity gap titles. Respond ONLY with a valid JSON array.',
    `Generate 5 YouTube video ideas for: "${niche}". Model these ideas on recent competitor outlier videos (successful concepts/formats that outperformed averages). Each idea title must have a high click-through-rate curiosity gap. Return a JSON array, each with: title (string), angle (string), effort (Low/Medium/High).`
  );
}

export async function generateScript(ideaTitle) {
  if (isMockMode()) return MOCK.script(ideaTitle);
  return callAI(
    'You are a professional YouTube scriptwriter. Respond ONLY with valid JSON. Write highly retaining scripts.',
    `Write a YouTube video script for: "${ideaTitle}". Target a 15-minute standard length (around 2,100 words) and assume a target audience age around 30. Structure the script with a hook (first 30s) and body sections. Conduct a self-corrective fact-check on your draft (flagging any misleading claims, fake stats, or clickbait mismatches). Return JSON with: title, hook (string), sections (array of {heading, content}), estimatedDuration (string - e.g. "15 minutes"), wordCount (number), factCheck (object with status: "Verified"|"Warning"|"Misleading", findings: string[], corrections: string[]).`
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
