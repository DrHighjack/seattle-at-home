const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { createHandler } = require('../api/newsletter.js');

test('Postgres persistence, duplicate handling, consent and rate limits', {
  skip: !process.env.NEWSLETTER_TEST_DATABASE_URL && 'Set NEWSLETTER_TEST_DATABASE_URL to an isolated test database',
}, async () => {
  const client = new Client({ connectionString: process.env.NEWSLETTER_TEST_DATABASE_URL });
  await client.connect();
  const schema = `newsletter_test_${randomUUID().replaceAll('-', '')}`;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const sql = await readFile(join(__dirname, '../database/newsletter.sql'), 'utf8');
    await client.query(sql);
    await client.query(sql);
    const handler = createHandler({
      database: () => client,
      env: {
        NEWSLETTER_ORIGIN: 'https://seattle.example',
        NEWSLETTER_RATE_LIMIT_SECRET: 'integration-test-secret',
      },
      log: (event) => assert.fail(event),
    });
    const send = async (email) => {
      const res = {
        setHeader() {},
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; },
      };
      await handler({
        method: 'POST',
        headers: {
          origin: 'https://seattle.example',
          'content-type': 'application/json',
          'x-vercel-forwarded-for': '192.0.2.3',
        },
        body: { email, consent: true, consentVersion: '2026-10-30-v1', website: '' },
      }, res);
      return res;
    };
    assert.equal((await send(' TEST@example.com ')).code, 200);
    assert.equal((await send('test@example.com')).code, 200);
    const rows = await client.query('SELECT * FROM newsletter_subscribers');
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].email, 'test@example.com');
    assert.equal(rows.rows[0].consent_version, '2026-10-30-v1');
    assert.equal(rows.rows[0].source, 'homepage');
    assert.ok(rows.rows[0].subscribed_at instanceof Date);
    const reader = new Client({ connectionString: process.env.NEWSLETTER_TEST_DATABASE_URL });
    await reader.connect();
    try {
      const saved = await reader.query(`SELECT email FROM "${schema}".newsletter_subscribers`);
      assert.deepEqual(saved.rows, [{ email: 'test@example.com' }]);
    } finally {
      await reader.end();
    }
    await client.query('UPDATE newsletter_subscribers SET unsubscribed_at = now()');
    assert.equal((await send('test@example.com')).code, 200);
    const unsubscribed = await client.query('SELECT unsubscribed_at FROM newsletter_subscribers');
    assert.ok(unsubscribed.rows[0].unsubscribed_at);
    await send('test@example.com');
    await send('test@example.com');
    assert.equal((await send('other@example.com')).code, 429);
    assert.equal((await client.query('SELECT * FROM newsletter_subscribers')).rowCount, 1);
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
