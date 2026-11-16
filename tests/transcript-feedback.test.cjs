const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('YouTube links open in a separate tab with safe rel attributes', () => {
  const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  let linkCount = 0;

  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const links = [...html.matchAll(/<a\b[^>]*href="https:\/\/(?:www\.)?youtube\.com\/[^"]*"[^>]*>/gi)];

    for (const [link] of links) {
      linkCount += 1;
      assert.match(link, /target="_blank"/, `${page} YouTube link should open in a new tab`);
      const rel = link.match(/\brel="([^"]+)"/)?.[1].split(/\s+/) ?? [];
      assert.ok(rel.includes('noopener') && rel.includes('noreferrer'), `${page} YouTube link should use safe rel attributes`);
    }
  }

  assert.ok(linkCount > 0, 'expected to find public YouTube links');
});

test('header logo is modestly enlarged while the hover logo stays aligned', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

  assert.match(css, /\.brand-logo\s*\{[^}]*width:\s*132px/);
  assert.match(css, /\.site-header \.brand::after\s*\{[^}]*width:\s*132px/);
  assert.match(css, /\.brand-logo\s*\{[^}]*width:\s*106px[^}]*\}/);
  assert.match(css, /\.site-header \.brand::after\s*\{[^}]*width:\s*106px[^}]*\}/);
});
