/**
 * Resolves any YouTube channel input (UC... ID, @handle, full URL) to
 * { channelId, channelTitle, thumbnailUrl } using YouTube Data API v3.
 *
 * Accepted formats:
 *   UC...                   — channel ID passed through directly
 *   @handle                 — resolves via forHandle
 *   handle                  — resolves via forHandle then forUsername
 *   https://youtube.com/@handle
 *   https://youtube.com/channel/UC...
 *   https://youtube.com/user/username  (legacy)
 *   https://youtube.com/c/customname   (legacy)
 */
import { callYoutubeApi } from './youtubeApi.js';

export async function resolveChannelId(input, apiKey) {
  if (!input || typeof input !== 'string') throw new Error('Channel input is required');

  const raw = input.trim();
  let handle = null;
  let channelId = null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const path = url.pathname.replace(/\/$/, '');
      const segments = path.split('/').filter(Boolean);

      if (path.startsWith('/@')) {
        handle = decodeURIComponent(path.slice(2).split('/')[0]);
      } else if (segments[0] === 'channel' && segments[1]) {
        channelId = segments[1];
      } else if (segments[0] === 'user' && segments[1]) {
        handle = decodeURIComponent(segments[1]);
      } else if (segments[0] === 'c' && segments[1]) {
        handle = decodeURIComponent(segments[1]);
      } else if (segments[0]) {
        handle = decodeURIComponent(segments[0]);
      }
    } catch {
      throw new Error('Invalid URL. Provide a valid YouTube channel URL.');
    }
  } else if (raw.startsWith('@')) {
    handle = raw.slice(1);
  } else if (/^UC[\w-]{20,}$/.test(raw)) {
    channelId = raw;
  } else {
    handle = raw;
  }

  const BASE = 'https://www.googleapis.com/youtube/v3/channels';
  const key = encodeURIComponent(apiKey);

  let body;
  if (channelId) {
    body = await callYoutubeApi(`${BASE}?part=snippet&id=${encodeURIComponent(channelId)}&key=${key}`, 30);
  } else {
    body = await callYoutubeApi(`${BASE}?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${key}`, 30);
    if (!body.items || body.items.length === 0) {
      body = await callYoutubeApi(`${BASE}?part=snippet&forUsername=${encodeURIComponent(handle)}&key=${key}`, 30);
    }
  }

  if (!body.items || body.items.length === 0) {
    throw new Error(`No YouTube channel found for "${raw}". Try the full URL or UC... channel ID.`);
  }

  const ch = body.items[0];
  return {
    channelId: ch.id,
    channelTitle: ch.snippet.title,
    thumbnailUrl: ch.snippet.thumbnails?.default?.url || null,
  };
}
