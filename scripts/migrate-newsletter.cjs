const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { getPool } = require('../lib/newsletter-db.cjs');

async function migrate() {
  const pool = getPool();
  try {
    const sql = await readFile(join(__dirname, '../database/newsletter.sql'), 'utf8');
    await pool.query(sql);
    console.log('Newsletter tables are ready.');
  } finally {
    await pool.end();
  }
}

migrate().catch(() => {
  console.error('Newsletter migration failed. Check DATABASE_URL, network access, and database permissions.');
  process.exitCode = 1;
});
