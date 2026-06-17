import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbName = process.env.NODE_ENV === 'test' ? 'ytiq_test.db' : 'ytiq.db';
const dbPath = path.join(__dirname, dbName);

const db = new Database(dbPath, { verbose: console.log });

// Enable Foreign Key constraints
db.pragma('foreign_keys = ON');

// Enable WAL journal mode for performance and concurrency
db.pragma('journal_mode = WAL');

export default db;
