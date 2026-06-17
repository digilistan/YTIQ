import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import db from './db/database.js';
import { runMigrations } from './db/migrations.js';
import errorHandler from './middleware/errorHandler.js';
import settingsRouter from './routes/settings.js';
import channelsRouter from './routes/channels.js';
import youtubeRouter from './routes/youtube.js';
import suggestionsRouter from './routes/suggestions.js';
import aiRouter from './routes/ai.js';
import scriptsRouter from './routes/scripts.js';
import ideasRouter from './routes/ideas.js';
import calendarRouter from './routes/calendar.js';
import competitorsRouter from './routes/competitors.js';
import nichesRouter from './routes/niches.js';
import thumbnailsRouter from './routes/thumbnails.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from monorepo root .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());

// Run database migrations on startup
try {
  runMigrations();
} catch (error) {
  console.error('Failed to run migrations on startup:', error);
  process.exit(1);
}

// Seed default settings from .env
function seedDefaults() {
  const defaults = {
    youtube_api_key: process.env.YOUTUBE_API_KEY || '',
    ai_api_key: process.env.AI_API_KEY || '',
    ai_endpoint: process.env.AI_ENDPOINT || 'https://api.longcat.chat/openai/v1/chat/completions',
    ai_model: process.env.AI_MODEL || 'LongCat-2.0-Preview',
    use_mock_api: 'false'
  };
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run(key, value);
  }
}
seedDefaults();

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    // Verify SQLite connection is functional
    const result = db.prepare('SELECT 1 + 1 AS sum').get();
    
    if (result && result.sum === 2) {
      res.status(200).json({
        status: 'UP',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
      });
    } else {
      throw new Error('Database integrity check failed');
    }
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

if (process.env.NODE_ENV === 'test') {
  // Database verification endpoint
  app.get('/api/test-db', (req, res) => {
    const testKey = 'test_connection_key_' + Date.now();
    const testValue = 'test_connection_val_' + Math.random();

    try {
      // Insert a test key/value into the settings table
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(testKey, testValue);

      // Read it back
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(testKey);

      if (!row) {
        throw new Error('No row returned after inserting test settings key');
      }

      if (row.value !== testValue) {
        throw new Error(`Value mismatch: expected "${testValue}", got "${row.value}"`);
      }

      // Delete the key
      db.prepare('DELETE FROM settings WHERE key = ?').run(testKey);

      res.status(200).json({
        success: true,
        message: 'Database write-read-delete verification successful.',
        inserted: { key: testKey, value: testValue }
      });
    } catch (error) {
      // Attempt cleanup just in case
      try {
        db.prepare('DELETE FROM settings WHERE key = ?').run(testKey);
      } catch (_) {}

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Shutdown endpoint for clean teardown and releasing locks
  app.get('/api/shutdown', (req, res) => {
    try {
      if (db && typeof db.close === 'function') {
        db.close();
        console.log('Database connection closed via /api/shutdown');
      }
      res.status(200).json({
        success: true,
        message: 'Server shutting down gracefully...'
      });
      setTimeout(() => {
        process.exit(0);
      }, 200);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

// Register API routers
app.use('/api/settings', settingsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/scripts', scriptsRouter);
app.use('/api/ideas', ideasRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/niches', nichesRouter);
app.use('/api/thumbnails', thumbnailsRouter);

// Basic routing placeholder for other modules
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to YTIq API' });
});

// Centralized error handling
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});

export default app;
