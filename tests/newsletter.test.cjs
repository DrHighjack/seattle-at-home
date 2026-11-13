const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/newsletter.js');

const env = {
  NEWSLETTER_ORIGIN: 'https://seattle.example',
  NEWSLETTER_RATE_LIMIT_SECRET: 'test-only-secret',
};
const payload = {
  email: '  EMILY+TEST@example.com ',
  consent: true,
  consentVersion: '2026-10-30-v1',
  website: '',
};

function fixture({ attempts = 1, fail = false, config = env } = {}) {
  const queries = [];
  const logs = [];
  const db = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (fail) throw new Error('private database credentials must not be logged');
      return { rows: [{ attempts }] };
    },
  };
  const handler = createHandler({
    database: () => db,
    env: config,
    log: (event) => logs.push(event),
  });
  return {
    queries,
    logs,
    async request({ body = payload, method = 'POST', headers = {} } = {}) {
      const req = {
        method,
        body,
        headers: {
          origin: env.NEWSLETTER_ORIGIN,
          'content-type': 'application/json',
          'x-vercel-forwarded-for': '192.0.2.1',
          ...headers,
        },
      };
      const res = {
        headers: {},
        setHeader(key, value) { this.headers[key] = value; },
        status(code) { this.code = code; return this; },
        json(data) { this.body = data; return this; },
      };
      await handler(req, res);
      return res;
    },
  };
}

test('valid signup normalizes email and uses parameterized inserts after rate limiting', async () => {
  const f = fixture();
  const res = await f.request();
  assert.equal(res.code, 200);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(f.queries.length, 3);
  assert.match(f.queries[0].sql, /newsletter_rate_limits/);
  assert.match(f.queries[0].values[0], /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(f.queries).includes('192.0.2.1'), false);
  assert.match(f.queries[2].sql, /ON CONFLICT \(email\) DO NOTHING/);
  assert.deepEqual(f.queries[2].values, ['emily+test@example.com', '2026-10-30-v1', 'homepage']);
  assert.equal(f.queries[2].sql.includes('emily+test'), false);
});

test('JSON string bodies and IPv6 client addresses are supported', async () => {
  const f = fixture();
  const res = await f.request({
    body: JSON.stringify(payload),
    headers: { 'x-vercel-forwarded-for': '2001:db8::1' },
  });
  assert.equal(res.code, 200);
});

test('only POST is accepted', async () => {
  const f = fixture();
  const res = await f.request({ method: 'GET' });
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, 'POST');
  assert.equal(f.queries.length, 0);
});

test('missing configuration returns an explicit unavailable response', async () => {
  const f = fixture({ config: {} });
  assert.equal((await f.request()).code, 503);
  assert.deepEqual(f.logs, ['newsletter_configuration_missing']);
  assert.equal(f.queries.length, 0);
});

test('cross-origin submissions are rejected', async () => {
  const f = fixture();
  assert.equal((await f.request({ headers: { origin: 'https://other.example' } })).code, 403);
  assert.equal(f.queries.length, 0);
});

test('JSON content type is required', async () => {
  const f = fixture();
  assert.equal((await f.request({ headers: { 'content-type': 'text/plain' } })).code, 415);
  assert.equal(f.queries.length, 0);
});

test('invalid input, absent consent, outdated consent and bot field do not write', async () => {
  for (const body of [
    '{',
    null,
    [],
    {},
    { ...payload, email: 'not-an-email' },
    { ...payload, email: `${'a'.repeat(250)}@example.com` },
    { ...payload, consent: false },
    { ...payload, consent: 'true' },
    { ...payload, consentVersion: 'old' },
    { ...payload, website: 'bot.example' },
  ]) {
    const f = fixture();
    assert.equal((await f.request({ body })).code, 400);
    assert.equal(f.queries.length, 0);
  }
});

test('oversized bodies are rejected', async () => {
  const f = fixture();
  assert.equal((await f.request({ body: 'a'.repeat(4097) })).code, 413);
  assert.equal(f.queries.length, 0);
});

test('missing trusted IP header is unavailable, not a bypass', async () => {
  const f = fixture();
  assert.equal((await f.request({ headers: { 'x-vercel-forwarded-for': undefined } })).code, 503);
  assert.equal(f.queries.length, 0);
});

test('sixth attempt is limited without writing subscriber data', async () => {
  const f = fixture({ attempts: 6 });
  const res = await f.request();
  assert.equal(res.code, 429);
  assert.equal(res.headers['Retry-After'], '900');
  assert.equal(f.queries.length, 1);
});

test('failed database writes never report success or expose secrets', async () => {
  const f = fixture({ fail: true });
  const res = await f.request();
  assert.equal(res.code, 503);
  assert.deepEqual(f.logs, ['newsletter_database_write_failed']);
  assert.equal(JSON.stringify({ res, logs: f.logs }).includes('private database credentials'), false);
});

test('a subscriber insert failure after successful rate checks still reports failure', async () => {
  let count = 0;
  const handler = createHandler({
    env,
    log: () => {},
    database: () => ({
      async query() {
        count += 1;
        if (count === 3) throw new Error('write failed');
        return { rows: [{ attempts: 1 }] };
      },
    }),
  });
  const response = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; },
  };
  await handler({
    method: 'POST',
    headers: {
      origin: env.NEWSLETTER_ORIGIN,
      'content-type': 'application/json',
      'x-vercel-forwarded-for': '192.0.2.1',
    },
    body: payload,
  }, response);
  assert.equal(response.code, 503);
});
