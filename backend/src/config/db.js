const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'solar.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

function saveDatabase() {
  // node:sqlite persists synchronously to the file on every statement; kept for compatibility.
}

function getDb() {
  return db;
}

function convertPlaceholders(sql) {
  return sql.replace(/\$\d+/g, '?');
}

function convertPgSyntax(sql) {
  return sql
    .replace(/NOW\(\)/g, "datetime('now')")
    .replace(/gen_random_uuid\(\)/g, `'${uuidv4()}'`)
    .replace(/NOW\(\) \+ INTERVAL\s+'(\d+) day'/, "datetime('now', '+$1 day')");
}

const TXN_RE = /^\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/i;

const pool = {
  async query(sql, params = []) {
    let finalSql = convertPlaceholders(sql);
    const upper = finalSql.trim().toUpperCase();
    params = params.map((p) => {
      if (p === undefined) return null;
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });

    try {
      finalSql = convertPgSyntax(finalSql);

      if (TXN_RE.test(finalSql)) {
        db.exec(finalSql);
        return { rows: [] };
      }

      if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('EXPLAIN')) {
        const rows = db.prepare(finalSql).all(...params);
        return { rows };
      }

      const stmt = db.prepare(finalSql);
      if (upper.includes('RETURNING')) {
        const rows = stmt.all(...params);
        const lastInsertRowid = db.prepare('SELECT last_insert_rowid() AS id').get().id;
        const changes = db.prepare('SELECT changes() AS n').get().n;
        return { rows, rowCount: changes, lastInsertRowid };
      }

      const res = stmt.run(...params);
      return { rows: [], rowCount: res.changes, lastInsertRowid: res.lastInsertRowid };
    } catch (err) {
      console.error('SQL Error:', err.message);
      console.error('SQL:', finalSql.slice(0, 300));
      console.error('Params:', JSON.stringify(params).slice(0, 300));
      throw err;
    }
  },

  async connect() {
    return {
      async query(sql, params = []) {
        return pool.query(sql, params);
      },
      beginTransaction: () => {
        db.exec('BEGIN');
      },
      commit: () => {
        db.exec('COMMIT');
      },
      rollback: () => {
        db.exec('ROLLBACK');
      },
      release: () => {},
    };
  },
};

module.exports = pool;
module.exports.getDb = getDb;
module.exports.saveDatabase = saveDatabase;