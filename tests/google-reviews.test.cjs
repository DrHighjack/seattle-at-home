const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const section = html.match(/<section id="google-reviews"[\s\S]*?<\/section>/)?.[0];

test('the homepage presents a dated Google review snapshot', () => {
  assert.ok(section, 'missing Google reviews section');
  assert.match(section, /aria-labelledby="google-reviews-heading"/);
  assert.match(section, /<h2 id="google-reviews-heading"/);
  assert.match(section, /Here’s what others are saying\./);
  assert.match(section, /<p class="eyebrow">Google reviews<\/p>/);
  assert.match(section, /<span class="google-reviews-value">4\.9<\/span>/);
  assert.match(section, /out of 5 · 55 reviews/);
  assert.match(section, /Rating and review count as of November 11, 2026/);
  assert.match(section, /class="google-reviews-stars" aria-hidden="true"/);
  assert.match(section, /<blockquote class="google-review-quote">[\s\S]*Emily made every step feel warm, exciting, and manageable\.[\s\S]*Amy Schwab · 5-star Google review[\s\S]*<\/blockquote>/);
  assert.ok(section.includes('href="stories.html"'));
  assert.doesNotMatch(section, /<iframe|<script/);
});

test('the review button links to Emily’s verified Google Maps profile', () => {
  assert.ok(section, 'missing Google reviews section');
  const link = section.match(/<a class="button google-reviews-button"[^>]+>/)?.[0];
  assert.ok(link, 'missing Google reviews link');
  const href = link.match(/href="([^"]+)"/)?.[1];
  assert.ok(href, 'missing review link destination');
  const url = new URL(href);
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps');
  assert.equal(url.searchParams.get('cid'), '11839028694367354155');
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="noopener noreferrer"/);
  assert.match(link, /aria-label="Read Google reviews \(opens in a new tab\)"/);
});

test('client quote placeholders use Amy’s verified review without invented transaction details', () => {
  for (const file of ['sell.html', 'story.html']) {
    const page = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(page.includes('“Emily made every step feel warm, exciting, and manageable.”'));
    assert.ok(page.includes('Amy Schwab'));
    assert.ok(page.includes('5-star Google review'));
    assert.ok(page.includes('https://www.google.com/maps?cid=11839028694367354155'));
    assert.doesNotMatch(page, /\[CLIENT QUOTE[^\]]*\]|\[CLIENT FIRST NAME\]/);
  }
  const seller = fs.readFileSync(path.join(root, 'sell.html'), 'utf8');
  const testimonial = seller.match(/<div class="source-138">[\s\S]*?<\/section>/)?.[0];
  assert.ok(testimonial);
  assert.doesNotMatch(testimonial, /\[AREA\]|\[MONTH YEAR\]|18 days|multiple offers|story\.html|Watch the listing video/);
  assert.ok(fs.readFileSync(path.join(root, 'story.html'), 'utf8')
    .includes('An independent client review, not a testimonial for this draft story.'));
});
