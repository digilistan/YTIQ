import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import db from './db/database.js';
import { runMigrations } from './db/migrations.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import { requireAuth, checkFeatureAccess } from './middleware/auth.js';
import { hashPassword } from './utils/auth.js';
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
import chatRouter from './routes/chat.js';
import researchRouter from './routes/research.js';
import seoRouter from './routes/seo.js';
import nanobananaRouter from './routes/nanobanana.js';
import povCoordinatorRouter from './routes/pov_coordinator.js';
import extensionRouter from './routes/extension.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables: first check local directory, then fallback to monorepo root
const localEnv = path.join(__dirname, '.env');
const parentEnv = path.join(__dirname, '../.env');
if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else {
  dotenv.config({ path: parentEnv });
}

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
  for (const [key, value] of Object.entries(defaults)) {
    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (!existing || (value && value !== '' && existing.value !== value)) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
      console.log(`[SETTINGS] Updated key "${key}" from environment/defaults.`);
    }
  }
}
seedDefaults();

function seedDefaultAdmin() {
  try {
    const username = 'admin';
    const password = 'Admin@CSD12..?#';
    const hash = hashPassword(password);
    
    // Check if a user with username 'admin' exists
    const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!existing) {
      db.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)').run(
        username,
        hash,
        'admin',
        'active'
      );
      console.log(`[AUTH] Seeded default admin user: ${username}`);
    } else {
      // Forcefully update the existing admin user's hash and role on startup
      db.prepare('UPDATE users SET password_hash = ?, role = ?, status = ? WHERE username = ?').run(
        hash,
        'admin',
        'active',
        username
      );
      console.log(`[AUTH] Forcefully updated existing admin credentials and role.`);
    }
  } catch (error) {
    console.error('Failed to seed default admin user:', error);
  }
}
seedDefaultAdmin();


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

// Register public auth routers
app.use('/api/auth', authRouter);

// Apply authentication middleware to all other endpoints
app.use('/api', requireAuth);

// Register API routers
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/youtube', youtubeRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/scripts', checkFeatureAccess('scripts'), scriptsRouter);
app.use('/api/ideas', checkFeatureAccess('ideas'), ideasRouter);
app.use('/api/calendar', checkFeatureAccess('calendar'), calendarRouter);
app.use('/api/competitors', checkFeatureAccess('competitors'), competitorsRouter);
app.use('/api/niches', checkFeatureAccess('niche'), nichesRouter);
app.use('/api/thumbnails', checkFeatureAccess('thumbnails'), thumbnailsRouter);
app.use('/api/chat', checkFeatureAccess('chat'), chatRouter);
app.use('/api/research', checkFeatureAccess('research'), researchRouter);
app.use('/api/seo', checkFeatureAccess('seo'), seoRouter);
app.use('/api/nanobanana', checkFeatureAccess('clipping'), nanobananaRouter);
app.use('/api/pov-coordinator', checkFeatureAccess('pov'), povCoordinatorRouter);
app.use('/api/extension', extensionRouter);

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
