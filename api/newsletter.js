const { createHmac } = require('node:crypto');
const { isIP } = require('node:net');
const { getPool } = require('../lib/newsletter-db.cjs');

const CONSENT_VERSION = '2026-10-30-v1';
const MAX_BODY_BYTES = 4096;

function createHandler({ database = getPool, env = process.env, log = console.error } = {}) {
  return async function newsletter(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const reply = (status, message) => res.status(status).json({ message });

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(405, 'Use the newsletter signup form to subscribe.');
    }

    if (!env.NEWSLETTER_ORIGIN || !env.NEWSLETTER_RATE_LIMIT_SECRET) {
      log('newsletter_configuration_missing');
      return reply(503, 'Newsletter signup is not available yet. Please try again later.');
    }
    if (req.headers.origin !== env.NEWSLETTER_ORIGIN) {
      return reply(403, 'Please submit the newsletter form from this website.');
    }
    if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      return reply(415, 'Please use the newsletter signup form.');
    }

    let data = req.body;
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) {
        return reply(413, 'Your signup is too large. Enter just your email and consent.');
      }
      if (typeof data === 'string') data = JSON.parse(data);
    } catch {
      return reply(400, 'The signup could not be read. Please try again.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return reply(400, 'Please enter an email and confirm newsletter consent.');
    }

    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(400, 'Please enter a valid email address.');
    }
    if (data.consent !== true || data.consentVersion !== CONSENT_VERSION) {
      return reply(400, 'Please confirm newsletter consent. Refresh the page if needed.');
    }
    if (data.website !== '') {
      return reply(400, 'The signup could not be accepted. Please reload and try again.');
    }

    // Vercel supplies this trusted header; do not use client-controlled x-forwarded-for.
    const address = req.headers['x-vercel-forwarded-for'];
    if (typeof address !== 'string' || !isIP(address.trim())) {
      log('newsletter_client_address_missing');
      return reply(503, 'Newsletter signup is temporarily unavailable. Please try again later.');
    }
    const key = createHmac('sha256', env.NEWSLETTER_RATE_LIMIT_SECRET)
      .update(address.trim())
      .digest('hex');

    try {
      const db = database();
      const limit = await db.query(
        `INSERT INTO newsletter_rate_limits (client_key, window_start, attempts)
         VALUES ($1, date_bin('15 minutes', now(), TIMESTAMPTZ '2020-01-01'), 1)
         ON CONFLICT (client_key, window_start)
         DO UPDATE SET attempts = newsletter_rate_limits.attempts + 1
         RETURNING attempts`,
        [key],
      );
      if (limit.rows[0].attempts > 5) {
        res.setHeader('Retry-After', '900');
        return reply(429, 'Too many signup attempts. Please wait 15 minutes and try again.');
      }
      await db.query(
        `DELETE FROM newsletter_rate_limits WHERE window_start < now() - INTERVAL '1 day'`,
      );
      await db.query(
        `INSERT INTO newsletter_subscribers (email, consent_version, source)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        [email, CONSENT_VERSION, 'homepage'],
      );
      return reply(200, 'Thank you—your newsletter signup has been received.');
    } catch {
      log('newsletter_database_write_failed');
      return reply(503, 'We could not save your signup. Please try again later.');
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
