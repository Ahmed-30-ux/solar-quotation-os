const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'solar.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at ${DB_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(BACKUP_DIR, `solar-${stamp}.db`);

try {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const snapshot = db.serialize();
  fs.writeFileSync(dest, snapshot);
  db.close();
  console.log(`Backup written: ${dest} (${snapshot.byteLength} bytes)`);
} catch (err) {
  // Fallback: plain file copy
  fs.copyFileSync(DB_PATH, dest);
  console.log(`Backup written (copy fallback): ${dest}`);
}