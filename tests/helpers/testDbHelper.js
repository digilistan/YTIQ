const Database = require('../../server/node_modules/better-sqlite3');
const path = require('path');

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Test DB helper can only be used when NODE_ENV is set to "test"');
}

const dbName = 'ytiq_test.db';
const dbPath = path.join(__dirname, `../../server/db/${dbName}`);

let db = null;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function clearDatabase() {
  const currentDb = getDb();
  
  // Order of deletion to respect foreign key constraints
  const tables = [
    'settings',
    'suggestions',
    'competitors',
    'calendar_events',
    'thumbnails',
    'seo_data',
    'scripts',
    'ideas',
    'niches',
    'channel_stats',
    'channels'
  ];

  const deleteTx = currentDb.transaction(() => {
    for (const table of tables) {
      // Check if table exists before deleting (in case migrations haven't run yet)
      const tableExists = currentDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (tableExists) {
        currentDb.prepare(`DELETE FROM ${table}`).run();
      }
    }
  });

  deleteTx();
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDb,
  clearDatabase,
  close
};
