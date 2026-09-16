require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. See backend/.env.example');
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(BACKUP_DIR, `solar-${stamp}.sql`);

try {
  execSync(`pg_dump --dbname="${DATABASE_URL}" --no-owner --no-privileges --format=plain > "${dest}"`, { stdio: 'inherit' });
  const size = fs.statSync(dest).size;
  console.log(`Backup written: ${dest} (${size} bytes)`);
} catch (err) {
  if (err.code === 'ENOENT' || /not recognized|not found/i.test(err.message || '')) {
    console.log('pg_dump not found. Install PostgreSQL client tools to use this script.');
    console.log('Production backups on Neon are automatic (point-in-time restore, 7 days on free tier).');
    process.exit(0);
  }
  console.error('Backup failed:', err.message);
  process.exit(1);
}