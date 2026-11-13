const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('the rotating glow skill is installed for the project', () => {
  const skill = fs.readFileSync(
    path.join(root, '.agents/skills/rotating-glow-border/SKILL.md'),
    'utf8',
  );
  assert.match(skill, /^---\s*\nname: rotating-glow-border\s*\ndescription:/);
  assert.match(skill, /prefers-reduced-motion/);
});

test('all pages load the appropriate cache-busted shared stylesheet', () => {
  const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  assert.ok(pages.length > 0, 'no HTML pages found');
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(html.includes('styles.css?v=seller-questions-1'), `${page} missing updated stylesheet`);
  }
});

test('glow borders preserve static, reduced-motion and disabled fallbacks', () => {
  assert.match(css, /@property --glow-border-angle\s*\{\s*syntax:\s*'<angle>';\s*initial-value:\s*0deg;\s*inherits:\s*false;/);
  assert.match(css, /@keyframes rotate-glow-border\s*\{\s*from\s*\{\s*--glow-border-angle:\s*0deg;\s*\}\s*to\s*\{\s*--glow-border-angle:\s*360deg;/);
  assert.match(css, /conic-gradient\(from var\(--glow-border-angle, 0deg\)/);
  assert.match(css, /:where\(button, \.button, \.source-button/);
  assert.match(css, /pointer-events:\s*none;\s*animation:\s*rotate-glow-border 4s linear infinite/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*, \*::before, \*::after\s*\{[^}]*animation:\s*none !important/s);
  assert.match(css, /:where\(button, a, \.editor-import\):is\(:disabled, \[aria-disabled="true"\], \.leaflet-disabled\)::after\s*\{\s*animation-play-state:\s*paused;/);
  assert.match(css, /@media \(forced-colors: active\)/);
});

test('enabled button glow becomes three times wider on hover', () => {
  const idleRing = css.match(/border:\s*(\d+)px solid transparent;\s*border-radius:\s*inherit;\s*background:\s*conic-gradient/);
  const idleHalo = css.match(/box-shadow:\s*0 0 (\d+)px rgba\(84, 223, 217, \.34\)/);
  const hoverBlock = css.match(/@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*:where\(button, \.button, \.source-button[\s\S]*?\n  \}/)?.[0];
  assert.ok(idleRing, 'default glow border width not found');
  assert.ok(idleHalo, 'default glow halo not found');
  assert.ok(hoverBlock, 'fine-pointer hover rules not found');
  const hoverRing = hoverBlock.match(/:hover::after\s*\{\s*inset:\s*(-?\d+)px;\s*border-width:\s*(\d+)px;/);
  const hoverHalo = hoverBlock.match(/:hover::before\s*\{\s*box-shadow:\s*0 0 (\d+)px/);
  assert.ok(hoverRing, 'hover glow border width not found');
  assert.ok(hoverHalo, 'hover halo not found');
  assert.equal(Number(hoverRing[2]), Number(idleRing[1]) * 3);
  // Hover ring grows outward only: its inner edge stays on the button's 2px outer border edge.
  assert.equal(Number(hoverRing[1]), -(Number(hoverRing[2]) + Number(idleRing[1])));
  assert.equal(Number(hoverHalo[1]), Number(idleHalo[1]) * 3);
  assert.match(hoverBlock, /:not\(:disabled\):not\(\[aria-disabled="true"\]\):not\(\.leaflet-disabled\):hover::after/);
});

test('glow rings cover the native button border instead of sitting inside it', () => {
  assert.match(css, /inset:\s*-2px;\s*border:\s*2px solid transparent;/);
  assert.match(css, /inset:\s*-2px;\s*border-radius:\s*inherit;\s*box-shadow:\s*0 0 8px/);
  const importRule = css.match(/\.editor-import\s*\{[^}]*\}/)?.[0];
  assert.ok(importRule, 'missing editor import styling');
  assert.doesNotMatch(importRule, /overflow:\s*hidden/);
});
