const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('about page includes Emily’s supplied background and personal details', () => {
  const html = read('about.html');
  for (const text of [
    'a real estate investor since 2012 and a broker since 2023',
    'I reply the same day or within 24 hours',
    'If I don’t know the answer, I’ll find it and follow up.',
    'work, cooking for the week, family time, and as much beach volleyball as possible',
    'A London Fog or a matcha chai.',
    'I used to pole vault and have visited 37 countries.',
    'corporate HR and business management, plus an MBA from Gonzaga University',
    '<li class="source-136">Broker since 2023</li>',
    '<li class="source-137">MBA, Gonzaga University</li>',
  ]) assert.ok(html.includes(text), `missing about detail: ${text}`);

  assert.doesNotMatch(html, /\[(RESPONSE TIME|FAVORITE SEATTLE SPOT|WHAT I DO ON WEEKENDS|COFFEE ORDER|FUN FACT|PREVIOUS CAREER OR CHAPTER|DESIGNATION OR CERTIFICATION|MEMBERSHIP:[^\]]+)\]/);
});

test('about page separates Emily’s specialties from referral-only property types', () => {
  const section = read('about.html').match(/<section id="about-specialties"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, 'missing specialties section');
  assert.match(section, /aria-labelledby="about-specialties-heading"/);
  assert.match(section, /If I don’t know how to do something, or it isn’t my specialty, I’ll refer you to someone who can help/);
  assert.match(section, /For raw land, manufactured homes, and rural or agricultural properties, I have great local connections I can refer you to/);

  const list = section.match(/<ul class="source-170">([\s\S]*?)<\/ul>/)?.[1];
  assert.ok(list, 'missing specialties list');
  const specialties = [...list.matchAll(/<li class="source-171">[\s\S]*?<\/span>([^<]+)<\/li>/g)]
    .map((match) => match[1]);
  assert.deepEqual(specialties, [
    'Investors',
    'First-time home buyers',
    'Business owners',
    'New construction',
    'Relocations',
    'Probate',
    'Estate sales',
    'ADU/DADU development',
    'Short sales',
    'Property management',
    'Downsizing',
  ]);
  assert.doesNotMatch(list, /raw land|manufactured homes|rural|agricultural/i);
});

test('public broker-history references use the latest supplied dates', () => {
  for (const file of ['index.html', 'about.html', 'sell.html']) {
    const html = read(file);
    assert.doesNotMatch(html, /Licensed since 2022|licensed for 5 years/i, file);
  }
  for (const file of ['index.html', 'about.html']) {
    assert.ok(read(file).includes('<span class="source-20">2023</span><span>Broker since</span>'), file);
  }
  assert.match(read('sell.html'), /broker since 2023 and a real estate investor since 2012/);
});
