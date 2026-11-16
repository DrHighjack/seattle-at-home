const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('seller questions include all supplied answers and production attribution', () => {
  const html = read('sell.html');
  const section = html.match(/<section id="faqs"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, 'missing seller questions section');
  assert.match(section, /aria-labelledby="seller-questions-heading"/);
  assert.match(section, /id="seller-questions-heading"[^>]*>Questions Sellers Ask Me</);
  const questions = [...section.matchAll(/<summary>(.*?)<\/summary>/g)].map((match) => match[1]);
  assert.deepEqual(questions, [
    'How long have you been in real estate, and how many homes have you sold?',
    'How quickly do your listings sell?',
    'What is your commission?',
    'How will you market my home?',
    'How do you decide on a list price?',
    'Is there a best time of year to sell?',
    'Will I work with you directly, and how will you keep me updated?',
  ]);
  for (const text of [
    "I've been a broker since 2023 and a real estate investor since 2012",
    "I've closed 40 transactions totaling $38.5M, including 13 listings",
    '15 of those transactions closed in the last 12 months',
    'The median is 8 days on market',
    "every listing I've had has sold in under 30 days",
    'My listing commission is between 3.5% and 4%',
    "I'll host at least two the first weekend",
    'the last 2–3 months, not 6',
    'December or April, every listing gets my full effort.',
    'a weekly report on showings and buyer feedback',
    'A little about me',
    'building passive income through property changed my life',
    "I'm a full-time agent.",
    'Ready to talk about selling your home?',
    'Production figures from NWMLS, July 2022 – November 2026. Listings include co-listings.',
  ]) assert.ok(section.includes(text), `missing supplied copy: ${text}`);
  assert.equal((section.match(/<li>/g) || []).length, 5);
  assert.equal((section.match(/href="mailto:Emily@SeattleAtHome.com"/g) || []).length, 2);
  assert.equal((section.match(/href="tel:\+14255878838"/g) || []).length, 2);
  assert.match(section, /<details class="faq-item" open>/);
  assert.doesNotMatch(section, /EMILY TO CONFIRM|data-video-placeholder/);
});

test('placeholder video slots and stand-in playback are removed sitewide', () => {
  for (const file of fs.readdirSync(root).filter((file) => file.endsWith('.html'))) {
    assert.doesNotMatch(read(file), /data-video-placeholder|class="video-placeholder"|\[VIDEO:|\[VIDEO TITLE\]|\[FEATURED VIDEO TITLE\]|\[LENGTH\]/, file);
  }
  const app = read('app.js');
  assert.doesNotMatch(app, /sampleVideoOrder|data-video-placeholder|sample-video|reel-placeholder/);
  for (const file of ['index.html', 'videos.html']) {
    assert.match(read(file), /<video controls playsinline preload="none" poster="youtube\/video-1.jpg"/);
  }
  assert.match(app, /video\.src = reel\.video/);
});
