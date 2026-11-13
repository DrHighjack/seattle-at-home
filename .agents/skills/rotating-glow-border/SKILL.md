---
name: rotating-glow-border
description: >
  Animated conic-gradient "rotating glow" borders for cards, buttons, inputs and
  status pills, built with @property + @keyframes. Includes the four named variants
  (Classic, Aurora, Comet, Luxe), exact palettes and speeds, the fallback for
  browsers without @property, performance tradeoffs, and reduced-motion handling.
  Trigger: user asks for a "rotating glow border", "spinning gradient border",
  "animated border", "glow card", "conic gradient border", "@property animation",
  "premium card border", or an AI/processing card with a moving edge.
license: MIT
---

# Rotating Glow Border

The "premium rotating glow" edge seen on modern AI apps. No video, no image, no SVG —
it is one CSS gradient rotating behind a card. Three pieces of CSS make it work.

## When to Use

- AI / assistant cards ("now writing…", "thinking…")
- Pricing or plan cards that need to feel expensive
- Primary buttons, search fields, status pills
- Anything that needs to read as *alive* without a spinner

Skip it when the surface is a large full-page background (repaint cost) or when the
brand is deliberately flat/brutalist.

---

## 1. Why This Works

A gradient **cannot** be animated directly. `conic-gradient(from 0deg, …)` to
`from 360deg` will not interpolate — CSS has no way to tween an image.

So you don't animate the gradient. You animate a **registered custom property**
that happens to be an angle, and feed it into the gradient. `@property` tells the
browser the value is an `<angle>`, which makes it interpolatable.

```css
@property --a {
  syntax: "<angle>";
  initial-value: 0deg;   /* required unless syntax is "*" */
  inherits: false;
}

@keyframes spin {
  from { --a: 0deg; }
  to   { --a: 360deg; }
}
```

Then the card:

```css
.card {
  background: conic-gradient(from var(--a, 0deg), #6366f1, #a855f7, #ec4899, #6366f1);
  animation: spin 3s linear infinite;
}
```

That is the whole trick. Everything below is polish.

### Three non-obvious details

1. **`var(--a, 0deg)` — always pass the fallback.** In browsers without `@property`
   (Safari < 16.4), `--a` is unset, the declaration becomes invalid *at computed-value
   time*, and the card gets **no gradient at all** — not a static one. The `0deg`
   fallback degrades to a still, perfectly good gradient instead of a broken card.
2. **First and last colour stop must match.** Otherwise the rotation shows a hard
   seam once per loop. `#6366f1 … #6366f1` closes the loop.
3. **`inherits: false`.** Stops the angle leaking into children, where it would
   silently animate things you didn't ask to animate.

---

## 2. The Component

Border thickness comes from padding; the inner panel sits on top and covers the
middle, leaving a ring of gradient. This is cleaner than `border-image` (which
can't follow `border-radius`) and cheaper than an SVG.

```html
<div class="glow">
  <div class="glow__inner">Content</div>
</div>
```

```css
.glow {
  --thickness: 2px;
  --radius: 20px;
  --speed: 3s;

  position: relative;
  border-radius: var(--radius);
  padding: var(--thickness);        /* = visible border width */
  background: conic-gradient(from var(--a, 0deg), #6366f1, #a855f7, #ec4899, #6366f1);
  animation: spin var(--speed) linear infinite;
  isolation: isolate;               /* keeps any halo ::before behind the card */
}

.glow__inner {
  border-radius: calc(var(--radius) - var(--thickness));  /* concentric corners */
  background: #0e0e16;              /* must be opaque, or the gradient shows through */
  padding: 28px 30px;
}
```

Optional outer halo — a blurred copy of the same gradient. Note `background: inherit`
rather than `var(--a)`, because `inherits: false` means the pseudo-element can't see
the angle:

```css
.glow::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: inherit;
  filter: blur(18px);
  opacity: 0.55;
}
```

Keep the halo subtle. Above ~0.6 opacity or ~24px blur it stops looking premium and
starts looking like a 2010 gaming mouse.

---

## 3. The Four Variants

Same machinery, different gradient and speed. The **speed is the message** — this is
the part people get wrong.

| Variant | Reads as | Speed | Palette |
|---|---|---|---|
| Classic | understated, expensive | 3s | indigo → violet → pink |
| Aurora | ambient, drifting | 6s | cyan · violet · purple, 5+ stops |
| Comet | processing, working | 2.4s | one bright arc on a dim ring |
| Luxe | premium tier, gold | 6–8s, **reverse** | dark bronze → gold → cream |

### Classic — indigo → pink sweep
The default look. Three stops, closed loop, calm 3s.

```css
background: conic-gradient(from var(--a, 0deg), #6366f1, #a855f7, #ec4899, #6366f1);
animation: spin 3s linear infinite;
```

### Aurora — cyan · violet · purple
More colour stops and a slower 6s rotation give a soft, drifting aurora. Best for
hero cards and large surfaces.

```css
background: conic-gradient(from var(--a, 0deg),
  #22d3ee, #818cf8, #a855f7, #d946ef, #22d3ee);
animation: spin 6s linear infinite;
```

### Comet — single chasing beam
Hard colour stops (two values per stop) make one bright arc race around a dim ring.
Fast 2.4s spin reads as "processing". This is the variant for loading states.

```css
background: conic-gradient(from var(--a, 0deg),
  rgba(255,255,255,0.06) 0deg 330deg,
  #22d3ee 330deg 345deg,
  #ffffff 345deg 352deg,
  rgba(255,255,255,0.06) 352deg 360deg);
animation: spin 2.4s linear infinite;
```

### Luxe — gold, counter-spin
Warm palette plus a reversed rotation. The direction flip alone changes the whole
personality — it reads as considered rather than urgent.

```css
background: conic-gradient(from var(--a, 0deg),
  #4a3413, #d4af37, #fff3c4, #d4af37, #4a3413);
animation: spin 7s linear infinite reverse;
```

---

## 4. Adapting to Other Surfaces

### Button
Thickness 1–1.5px, radius 10–12px, speed 4s. The label lives in the inner panel, so
hover states go on `.glow__inner`, not the wrapper.

```css
.glow-btn { --thickness: 1.5px; --radius: 12px; --speed: 4s; }
.glow-btn .glow__inner { padding: 12px 22px; background: #12121c; }
.glow-btn .glow__inner:hover { background: #1a1a28; }
```

### Input / search field
Same wrapper, `padding: 1.5px`, and a transparent input inside. Only glow on
`:focus-within` — a permanently spinning search bar is visual noise.

```css
.glow-field { --thickness: 1.5px; --radius: 14px; animation: none; }
.glow-field:focus-within { animation: spin 4s linear infinite; }
```

### Status pill / error state
Comet gradient, red/amber palette, 2s. The fast beam does the work; don't also add a
pulsing icon.

```css
background: conic-gradient(from var(--a, 0deg),
  rgba(255,255,255,0.06) 0deg 320deg,
  #f87171 320deg 342deg,
  #fca5a5 342deg 350deg,
  rgba(255,255,255,0.06) 350deg 360deg);
animation: spin 2s linear infinite;
```

---

## 5. Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .glow {
    animation: none;
    /* leave the gradient static — it still reads as a premium border */
  }
}
```

A frozen gradient at 3s into the loop is a good static frame. Do not fall back to a
plain 1px border; you lose the entire design intent.

Also ensure the inner panel's text meets contrast on its own — the moving gradient
must never be the only thing separating text from background.

---

## 6. Performance

Animating a registered custom property **repaints the gradient every frame**. It is
not compositor-accelerated the way `transform` is.

- Fine: a handful of small borders (cards, buttons, pills).
- Avoid: 20+ glowing elements in a scrolling list, or a full-viewport glow.
- If you must scale up, drop the `::before` blur first (it is the expensive part),
  then reduce to one glowing element per viewport.

The alternative — rotating an oversized pseudo-element with `transform: rotate()` —
is GPU-composited but distorts the gradient's centre on non-square cards, which is
exactly why the `@property` angle approach exists. Prefer it, and optimise only if
profiling says so.

---

## 7. Self-Check

- [ ] `initial-value` present in `@property` (rule is invalid without it)
- [ ] Every `var(--a)` written as `var(--a, 0deg)`
- [ ] First and last gradient stop identical (no seam)
- [ ] Inner panel background opaque
- [ ] Inner radius = outer radius − thickness
- [ ] No `overflow: hidden` on the wrapper (kills the halo)
- [ ] `prefers-reduced-motion` handled
- [ ] Speed matches intent: 3s calm, 2.4s processing, 6s+ ambient
- [ ] Border 1–2px; thicker reads cheap

---

## Source

Reel: instagram.com/reels/DbdmuhjMeK6 — *"that premium rotating glow border, pure CSS"*

Spoken transcript:

> That premium rotating glow border, pure CSS. I'm sure you've seen that spinning
> gradient border on nearly every new app. Well, it's not a video, it's not an image,
> it's this. The trick is that most people don't know you can't animate a gradient
> directly. So you register a custom angle property with `@property`, spin that from
> 0 to 360 degrees, and feed it into a conic gradient behind your card. The gradient
> rotates, the card sits on top, and you get that expensive-looking glowing edge.
> You're welcome.

On-screen code shown in the reel:

```css
@property --a {
  syntax: "<angle>";
  initial-value: 0deg;
}

@keyframes spin {
  to { --a: 360deg; }
}

.card {
  background: conic-gradient(from var(--a), red, yellow);
  animation: spin 3s linear infinite;
}
```

Note: the reel's snippet uses `red, yellow` and a `to`-only keyframe. Both are
simplified for the video — red→yellow leaves a visible seam on each loop, and an
explicit `from` keyframe is safer across engines. The versions above fix both.
