import db from '../db/database.js';

/**
 * Normalizes a URL for caching by removing the API key.
 * This prevents saving sensitive keys in the DB.
 */
function getCacheKey(urlString) {
  try {
    const url = new URL(urlString);
    url.searchParams.delete('key');
    // Sort parameters to ensure consistent keys regardless of order
    url.searchParams.sort();
    return url.toString();
  } catch {
    return urlString;
  }
}

/**
 * Resolves the YouTube API quota unit cost based on the endpoint path.
 * - Search consumes 100 units.
 * - Read endpoints (channels, videos) consume 1 unit.
 */
function getQuotaCost(urlString) {
  try {
    const url = new URL(urlString);
    if (url.pathname.includes('/search')) {
      return 100;
    }
    return 1;
  } catch {
    return 1;
  }
}

/**
 * Fetches from the YouTube Data API v3 with SQLite-based caching and daily quota enforcement.
 *
 * @param {string} url - The full YouTube API URL (including the key param)
 * @param {number} cacheTtlDays - Time to live in days
 * @returns {Promise<object>} - Parsed response payload
 */
export async function callYoutubeApi(url, cacheTtlDays = 7) {
  const cacheKey = getCacheKey(url);
  const cost = getQuotaCost(url);

  // 1. Try to serve from cache
  try {
    const cached = db.prepare(
      'SELECT response, created_at FROM youtube_api_cache WHERE url = ?'
    ).get(cacheKey);

    if (cached) {
      const ageMs = Date.now() - new Date(cached.created_at).getTime();
      const maxAgeMs = cacheTtlDays * 24 * 60 * 60 * 1000;
      if (ageMs < maxAgeMs) {
        console.log(`[YouTube API Cache HIT] Serving from cache: ${cacheKey}`);
        return JSON.parse(cached.response);
      }
    }
  } catch (err) {
    console.error('[YouTube API Cache] Error reading cache:', err);
  }

  // 2. Check daily quota limits (2,000 units per day)
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfTodayIso = startOfToday.toISOString();

  try {
    const logSum = db.prepare(
      'SELECT SUM(quota_cost) as total FROM youtube_api_calls_log WHERE called_at >= ?'
    ).get(startOfTodayIso);
    const todayTotal = logSum?.total || 0;

    if (todayTotal + cost > 2000) {
      const errorMsg = `YouTube API daily quota limit exceeded. Current usage: ${todayTotal} units. Cost of this action: ${cost} units. Daily limit: 2,000 units.`;
      console.warn(`[YouTube API Blocked] ${errorMsg}`);
      throw new Error(errorMsg);
    }
  } catch (err) {
    if (err.message.includes('quota limit exceeded')) {
      throw err;
    }
    console.error('[YouTube API Quota] Error checking log total:', err);
  }

  // 3. Perform the actual fetch request
  console.log(`[YouTube API Cache MISS] Requesting YouTube API: ${cacheKey} (cost: ${cost} units)`);
  
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.error?.message || `YouTube API error (${response.status})`);
  }

  // 4. Log the call and cost
  try {
    const urlObj = new URL(url);
    db.prepare(
      'INSERT INTO youtube_api_calls_log (endpoint, quota_cost) VALUES (?, ?)'
    ).run(urlObj.pathname, cost);
  } catch (err) {
    console.error('[YouTube API Log] Failed to insert log entry:', err);
  }

  // 5. Store in Cache
  try {
    db.prepare(`
      INSERT OR REPLACE INTO youtube_api_cache (url, response, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(cacheKey, JSON.stringify(body));
  } catch (err) {
    console.error('[YouTube API Cache] Failed to write cache entry:', err);
  }

  return body;
}
