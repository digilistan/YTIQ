import db from './database.js';
import { fileURLToPath } from 'url';

export function runMigrations() {
  console.log('Running database migrations...');

  const migration = db.transaction(() => {
    // 1. Channels
    db.prepare(`
      CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        youtube_channel_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        niche TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 2. Channel Stats
    db.prepare(`
      CREATE TABLE IF NOT EXISTS channel_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        subscribers INTEGER,
        total_views INTEGER,
        video_count INTEGER,
        UNIQUE(channel_id, date)
      )
    `).run();

    // 3. Niches
    db.prepare(`
      CREATE TABLE IF NOT EXISTS niches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        topic TEXT NOT NULL,
        analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 4. Ideas
    db.prepare(`
      CREATE TABLE IF NOT EXISTS ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        niche_id INTEGER REFERENCES niches(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        ai_analysis TEXT,
        status TEXT DEFAULT 'idea',
        is_favorite BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 5. Scripts
    db.prepare(`
      CREATE TABLE IF NOT EXISTS scripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT DEFAULT 'en',
        word_count INTEGER,
        estimated_duration TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 6. SEO Data
    db.prepare(`
      CREATE TABLE IF NOT EXISTS seo_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
        original_title TEXT,
        optimized_titles TEXT,
        description TEXT,
        tags TEXT,
        hashtags TEXT,
        seo_score INTEGER,
        tips TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 7. Thumbnail Ideas
    db.prepare(`
      CREATE TABLE IF NOT EXISTS thumbnails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
        concepts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 8. Content Calendar
    db.prepare(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        title TEXT,
        scheduled_date DATE,
        status TEXT DEFAULT 'planned',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Add title column to calendar_events if it doesn't exist (migration for existing DBs)
    try {
      db.prepare('ALTER TABLE calendar_events ADD COLUMN title TEXT').run();
    } catch (_) {}

    // 9. Competitors
    db.prepare(`
      CREATE TABLE IF NOT EXISTS competitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        competitor_channel_id TEXT NOT NULL,
        competitor_name TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 10. Suggestions
    db.prepare(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        date DATE,
        content TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 11. App Settings
    db.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `).run();

    // Indexes for foreign keys to optimize performance
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_channel_stats_channel_id ON channel_stats(channel_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_niches_channel_id ON niches(channel_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ideas_channel_id ON ideas(channel_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ideas_niche_id ON ideas(niche_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_scripts_idea_id ON scripts(idea_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_scripts_channel_id ON scripts(channel_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_seo_data_idea_id ON seo_data(idea_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_thumbnails_idea_id ON thumbnails(idea_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_calendar_events_idea_id ON calendar_events(idea_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_calendar_events_channel_id ON calendar_events(channel_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_competitors_channel_id ON competitors(channel_id)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_suggestions_channel_id ON suggestions(channel_id)`).run();

    console.log('Database migrations completed successfully. All 11 tables and indexes are ready.');
  });

  migration();
}

// If this file is run directly using node
const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('migrations.js')
);

if (isMain) {
  try {
    runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    process.exit(1);
  }
}
