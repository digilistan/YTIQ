import db from './database.js';
import { fileURLToPath } from 'url';

export function runMigrations() {
  console.log('Running database migrations...');

  const migration = db.transaction(() => {
    // 0. Users
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'blocked')),
        restricted_features TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active_at DATETIME
      )
    `).run();

    try {
      db.prepare("ALTER TABLE users ADD COLUMN restricted_features TEXT DEFAULT '[]'").run();
    } catch (_) {}

    // Recovery block for channels_old (in case previous migration failed due to FK checks)
    let channelsOldExists = false;
    try {
      const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='channels_old'").get();
      if (check) channelsOldExists = true;
    } catch (_) {}

    if (channelsOldExists) {
      try {
        db.pragma('foreign_keys = OFF');
        const countCheck = db.prepare('SELECT COUNT(*) AS count FROM channels').get();
        if (countCheck && countCheck.count === 0) {
          db.prepare(`
            INSERT INTO channels (id, youtube_channel_id, name, language, niche, created_at, user_id)
            SELECT id, youtube_channel_id, name, language, niche, created_at, 1 FROM channels_old
          `).run();
          console.log('[MIGRATION] Successfully recovered channels from channels_old');
        }
        db.prepare('DROP TABLE channels_old').run();
      } catch (recoveryErr) {
        console.error('[MIGRATION] Failed to recover from channels_old:', recoveryErr);
      } finally {
        db.pragma('foreign_keys = ON');
      }
    }

    // 1. Channels
    // Check if the channels table already has user_id
    let hasUserId = false;
    try {
      const info = db.prepare('PRAGMA table_info(channels)').all();
      hasUserId = info.some(column => column.name === 'user_id');
    } catch (_) {}

    if (!hasUserId) {
      // Check if table exists to see if we need to migrate it
      let tableExists = false;
      try {
        const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='channels'").get();
        if (check) tableExists = true;
      } catch (_) {}

      if (tableExists) {
        // Rename and recreate to add column and drop old UNIQUE constraint on youtube_channel_id
        db.pragma('foreign_keys = OFF');
        try {
          db.prepare('ALTER TABLE channels RENAME TO channels_old').run();
          
          db.prepare(`
            CREATE TABLE channels (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              youtube_channel_id TEXT NOT NULL,
              name TEXT NOT NULL,
              language TEXT DEFAULT 'en',
              niche TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE(user_id, youtube_channel_id)
            )
          `).run();

          // Copy existing channels and associate with default admin (ID 1)
          db.prepare(`
            INSERT INTO channels (id, youtube_channel_id, name, language, niche, created_at, user_id)
            SELECT id, youtube_channel_id, name, language, niche, created_at, 1 FROM channels_old
          `).run();
          db.prepare('DROP TABLE channels_old').run();
        } catch (copyErr) {
          console.error('Failed to copy channels during migration:', copyErr);
        } finally {
          db.pragma('foreign_keys = ON');
        }
      } else {
        // New database setup
        db.prepare(`
          CREATE TABLE channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            youtube_channel_id TEXT NOT NULL,
            name TEXT NOT NULL,
            language TEXT DEFAULT 'en',
            niche TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, youtube_channel_id)
          )
        `).run();
      }
    }

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
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
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

    // Migrate channel_id for existing databases
    try {
      db.prepare('ALTER TABLE seo_data ADD COLUMN channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE').run();
    } catch (_) {}

    // 7. Thumbnail Ideas
    db.prepare(`
      CREATE TABLE IF NOT EXISTS thumbnails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
        channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
        concepts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Migrate channel_id for existing databases
    try {
      db.prepare('ALTER TABLE thumbnails ADD COLUMN channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE').run();
    } catch (_) {}

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

    // 12. YouTube API Cache
    db.prepare(`
      CREATE TABLE IF NOT EXISTS youtube_api_cache (
        url TEXT PRIMARY KEY,
        response TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 13. YouTube API Calls Log
    db.prepare(`
      CREATE TABLE IF NOT EXISTS youtube_api_calls_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        quota_cost INTEGER NOT NULL,
        called_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 14. Chat Sessions
    db.prepare(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    try {
      db.prepare("ALTER TABLE chat_sessions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE").run();
    } catch (_) {}
    try {
      db.prepare("UPDATE chat_sessions SET user_id = 1 WHERE user_id IS NULL").run();
    } catch (_) {}

    // 15. Chat Messages
    db.prepare(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 16. Chat Memory
    db.prepare(`
      CREATE TABLE IF NOT EXISTS chat_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        fact TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    try {
      db.prepare("ALTER TABLE chat_memory ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE").run();
    } catch (_) {}
    try {
      db.prepare("UPDATE chat_memory SET user_id = 1 WHERE user_id IS NULL").run();
    } catch (_) {}

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
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)`).run();

    console.log('Database migrations completed successfully. All 16 tables and indexes are ready.');
  });

  migration();

  // Repair channels_old foreign key references if any exist
  try {
    const tableDefinitions = {
      channel_stats: `
        CREATE TABLE channel_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          subscribers INTEGER,
          total_views INTEGER,
          video_count INTEGER,
          UNIQUE(channel_id, date)
        )
      `,
      niches: `
        CREATE TABLE niches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          topic TEXT NOT NULL,
          analysis TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      ideas: `
        CREATE TABLE ideas (
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
      `,
      scripts: `
        CREATE TABLE scripts (
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
      `,
      seo_data: `
        CREATE TABLE seo_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          original_title TEXT,
          optimized_titles TEXT,
          description TEXT,
          tags TEXT,
          hashtags TEXT,
          seo_score INTEGER,
          tips TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      thumbnails: `
        CREATE TABLE thumbnails (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          concepts TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      calendar_events: `
        CREATE TABLE calendar_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          title TEXT,
          scheduled_date DATE,
          status TEXT DEFAULT 'planned',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      competitors: `
        CREATE TABLE competitors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          competitor_channel_id TEXT NOT NULL,
          competitor_name TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
      suggestions: `
        CREATE TABLE suggestions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
          date DATE,
          content TEXT,
          is_read BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    };

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    
    // Check if any table needs repair first
    let needsAnyRepair = false;
    for (const t of tables) {
      try {
        const fks = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all();
        if (fks.some(fk => fk.table === 'channels_old')) {
          needsAnyRepair = true;
          break;
        }
      } catch (_) {}
    }

    if (needsAnyRepair) {
      console.log('[MIGRATION] Found invalid foreign key references to channels_old. Starting database repair...');
      db.pragma('foreign_keys = OFF');
      
      const repairTransaction = db.transaction(() => {
        for (const t of tables) {
          try {
            const fks = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all();
            if (fks.some(fk => fk.table === 'channels_old')) {
              console.log(`[MIGRATION] Repairing table "${t.name}"...`);
              const definition = tableDefinitions[t.name];
              if (definition) {
                db.prepare(`ALTER TABLE ${t.name} RENAME TO ${t.name}_temp`).run();
                db.prepare(definition).run();
                const colsInfo = db.prepare(`PRAGMA table_info(${t.name})`).all();
                const cols = colsInfo.map(c => c.name).join(', ');
                db.prepare(`INSERT INTO ${t.name} (${cols}) SELECT ${cols} FROM ${t.name}_temp`).run();
                db.prepare(`DROP TABLE ${t.name}_temp`).run();
                console.log(`[MIGRATION] Table "${t.name}" successfully repaired.`);
              }
            }
          } catch (tErr) {
            console.error(`[MIGRATION] Failed to repair table "${t.name}":`, tErr);
            throw tErr; // Rollback transaction on failure
          }
        }
      });
      
      repairTransaction();
      console.log('[MIGRATION] Database repair completed successfully.');
    }
  } catch (repairErr) {
    console.error('[MIGRATION] Error running database repair:', repairErr);
  } finally {
    db.pragma('foreign_keys = ON');
  }
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
