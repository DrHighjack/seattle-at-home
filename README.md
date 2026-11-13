# Seattle At Home Local Preview

Run from the project root:

```sh
python3 -m http.server 8088 --bind 127.0.0.1
```

Open http://127.0.0.1:8088/ in your browser. Static page previews need no installation or build step. The newsletter API requires Node dependencies and a configured database; Python's static server does not run it. Google Fonts requires an internet connection; system sans-serif fallbacks still work offline.

## Git and handoff

This folder is the repository root, with `main` as the primary branch. The repository includes website code, tests, the dependency lockfile, project skills, and the media used by the site. No Git LFS setup is required for the current files; the largest media file is approximately 35 MB.

Dependencies, environment files (except the blank `.env.example`), local credentials, logs, private call transcripts, and source brand-brief PDFs are ignored. Ignored source material stays on the local machine. Never force-add it or put real credentials in the tracked example file.

After cloning, use Node.js 22 or newer and run:

```sh
npm ci
npm test
```

The PostgreSQL integration test is skipped unless an isolated test database is configured as described below. The static preview works without database credentials.

No remote is configured or published by this setup. Once the intended empty Git repository has been created, connect it using its actual URL:

```sh
git remote add origin <repository-url>
git push -u origin main
```

Before sharing or deploying publicly, review the preview limitations and indexing checklist below. Git readiness does not mean the site is approved for public launch.

## Rotating glow borders

The supplied `rotating-glow-border` skill is installed in `.agents/skills/rotating-glow-border/` for the prototype. Reopen the project or start a new agent session if it is not yet listed as an available skill.

The shared stylesheet applies a thin navy, teal, ivory, and gold rotating border to buttons and button-like links throughout the site, including dynamically created quiz controls. On hover with a fine pointer, enabled button borders widen from 2px to 6px and the halo grows from 8px to 24px without changing the button's layout. Focused text fields and selects also receive the treatment. Large video/quiz surfaces and studio controls keep a static border until hovered, and disabled controls do not rotate or expand. Reduced-motion preferences freeze the gradient; existing keyboard focus outlines remain visible. Browsers without registered custom-property animation show a static gradient, and browsers without the required gradient/mask support keep their existing button styles.

The decorative ring covers the native 2px button border at rest. On hover it grows outward to 6px, with its inner edge kept on the button's outer edge, so it never cuts into the button fill or creates an inner blue band. The import label allows overflow so its glow can expand outward too.

## Google reviews

The homepage links directly to the Google Maps profile for Emily Hawkins | Seattle At Home, matched to the business name and `seattleathome.com`. Its 4.9 rating and 55-review count were checked on November 11, 2026. These figures are a static snapshot, not an automatically updated feed; check Google and update the displayed rating, stars, count, and date when they change. Review text stays on Google rather than being copied into the site without confirmed testimonial permissions. The section requires no API key or third-party embed.

## Newsletter: Vercel + Railway Postgres

The homepage signup posts to `/api/newsletter`, a Vercel Node function. It stores a normalized, unique email, signup timestamp, consent version, source, and optional unsubscribe timestamp in PostgreSQL. It does not send newsletters or confirmation emails. Repeated submissions do not duplicate records or reactivate previously unsubscribed records. The form only clears after a successful server response; database errors stay visible and preserve the entered email.

### Setup (database not created yet)

1. Create a PostgreSQL service in your Railway project. Use a public TCP connection URL accessible from Vercel, not Railway's private service hostname. Keep passwords and connection strings out of chat and source control.
2. In Vercel, use this prototype folder as the project root, choose the Other/static framework preset, and leave the build command unset. Static files are served directly and `api/newsletter.js` runs as a Node function. Install dependencies with `npm ci`; no frontend build is needed.
3. Configure private Vercel environment variables for the intended deployment environment:
   - `DATABASE_URL`: Railway's public PostgreSQL connection URL. Follow Railway's connection/TLS settings; this code does not disable certificate validation.
   - `NEWSLETTER_ORIGIN`: exact browser origin, such as `https://seattleathome.com`, with no trailing slash/path. Choose one canonical domain and redirect aliases to it. Preview deployments need their own matching origin and preferably a separate test database.
   - `NEWSLETTER_RATE_LIMIT_SECRET`: a randomly generated secret (`openssl rand -hex 32`). This hashes the trusted Vercel client address for database-backed limits; no raw client IP is stored in these tables.
4. Install dependencies locally with `npm ci`. Configure `DATABASE_URL` privately in the shell and run `npm run db:migrate` once before enabling signup. Alternatively, keep a private env file **outside the served project directory** and run `node --env-file=/absolute/private/path/newsletter.env scripts/migrate-newsletter.cjs`. Do not store a real `.env` inside the Python-served folder, even though Git ignores it. The migration is repeatable and creates only newsletter tables; it does not modify existing business tables.
5. Redeploy after configuring environment variables. Submit one approved test email from the deployed site and confirm the row appears in Railway's database viewer. Repeat with the same email to verify there is still one row, then remove the test record. Do not collect real subscribers until this check succeeds.

No live Railway persistence has been verified while the database is unconfigured. On port 8088, signup honestly reports unavailable rather than pretending the static server saved data. Leave other preview forms and quiz behavior unchanged.

### Operation and testing

- `npm test` runs API validation/error tests. An actual PostgreSQL integration test runs only when `NEWSLETTER_TEST_DATABASE_URL` points to an isolated test database. It creates and drops a uniquely named test schema.
- Five valid-shaped attempts per client network address per 15-minute window are allowed; further requests receive HTTP 429. This is basic abuse protection, not comprehensive bot protection. Configure Vercel firewall limits before a public campaign; add stronger bot verification if needed.
- Records in `newsletter_rate_limits` older than one day are removed on later accepted requests; if traffic stops, cleanup waits until a later request. No subscriber email is written to application logs.
- Use a database role limited to these tables for the API; run the migration with a separate owner role where possible. Do not expose database access to browser JavaScript.
- Until an email platform is connected, handle unsubscribe/removal requests sent to Emily manually. Mark a subscriber with `unsubscribed_at = now()` and exclude those rows from every mailing export. Delete a record when appropriate for a deletion request; ordinary duplicate signup does not undo an unsubscribe. Sending campaigns requires a separate compliant unsubscribe process and delivery setup.

## Pages

## Crawlers and AI reference

`robots.txt` deliberately blocks all compliant crawlers while the site is a preview. Public HTML retains `noindex,nofollow`. Neither is access control: use deployment authentication for confidential material, and do not rely on robots.txt to remove already indexed URLs.

`llms.txt` documents business identity, confirmed contact links, approach, services, page/quiz links, and explicit preview limitations. It is an informational Markdown convention, not a guaranteed discovery mechanism, crawler permission, or replacement for structured site content. Update it when facts, stories, newsletter configuration, or launch status change. The Vercel ignore file explicitly includes both text files while keeping raw transcript files excluded.

Before public indexing is approved, verify the production domain, finish launch content, generate and test a production sitemap, update robots.txt to allow approved public pages and declare the real sitemap URL, and remove public-page noindex directives. Keep authoring/test/API resources out of search listings; restricting crawlers does not secure them. Do not change only robots.txt and assume indexing is enabled.

### SEO and Google business signals

All 14 public-page footers display the supplied combined Coldwell Banker Danforth / Global Luxury mark from the approved "Seattle At Home - New Branding (USE ME)" kit (`CBGL_Danforth_Logo (1)/Danforth_CBGL_hz_stack_black.png`). The web asset is a lossless WebP conversion with original colors, transparency, and aspect ratio preserved. The wrapper is transparent so the footer watercolor shows through, with surrounding space retained around the mark. Seattle At Home remains the primary navigation brand; existing brokerage text and contact details are unchanged.

Placeholder still-image slots on Buy/Sell now use supplied Emily brand photography, with factual alt text rather than claims of touring/filming/client portraits. About's hero uses `assets/emily-portrait-full-head.webp`, a 4:5 crop of the supplied `9_9_2025_The_Fortune_Group_Woodinville_Real_Estate_Branding_Photoshoot-209.jpg`, preserving the full source height and space above Emily's hair; the previous portrait asset itself cut off the top of her head. Sell uses a distinct sidewalk photo, `assets/emily-sell-portrait.webp`, cropped to 4:5 from Sade Photography's `Highlights/DSC_5236.jpg` with Emily's full head visible. Sell's three property illustrations use the matching supplied listing photos (4/5/6), consistent with Client Stories. The generic story template uses an explicitly labelled Emily photo, not invented client photography. Places quiz image slots use a labelled editorial Seattle-life photo, not purported matched-area images; quiz scoring and unapproved area text remain unchanged. Video samples are a separate existing limitation, not replaced with invented footage.

With the owner's confirmation of reuse permission, five Zillow lead photos were downloaded and optimized as local WebP assets named by map ID: `17001-inglewood`, `11901-32nd`, `222-4th-ave`, `26586-ne-143rd`, and `4040-32nd-ave-sw`. They appear in the matching map popups; Kirkland's story card uses the same updated photo. Four are exterior photos; Kenmore's lead image is an interior, not an exterior.

The owner subsequently supplied 16 images matched by street number and city. The abbreviated `1Redmond.webp` and `1bothell.png` were explicitly confirmed as 19264 NE 69th Cir #104 and 23230 44th Dr SE respectively. WebP originals were copied without re-encoding; Bothell's PNG was converted losslessly to WebP. The Bothell image is labelled as an aerial view of the development, not an exact unit view, and is displayed uncropped to preserve its attribution. Some supplied images show rear views or homesite imagery rather than front elevations; popup captions do not claim they are front photos. All 16 are stored locally under their matching map IDs. Of the 26 spreadsheet properties, only 12863 NE 200th Pl (Woodinville), 315 NW 49th St (Seattle), 25 S Quail Trail Ln (Coupeville), and 14327 Cascade Dr SE (Snohomish) still lack an image. Eastern retains its previously supplied listing photo. Palatine, outside the spreadsheet, also remains without an image.

Content Studio (`editor.html`) shares the website's brand tokens and includes the approved five-color kit with exact hex codes, typography guidance, and transparent logo/portrait shortcuts. Each draft can choose an Ivory, Navy, Teal, Gold, or Terracotta style. `brandPreset` is validated on import (unknown/missing values become Ivory), retained in local storage and JSON exports, and applied only to the studio preview; it does not publish or restyle live pages. Asset shortcuts replace the featured image and alt text, not the draft copy. The Emily portrait preview is top-aligned to keep her smiling face visible; other photos keep their default crop. Selected personal titles use the supplied, self-hosted Eyesome Script font.

The story map has 44 unique property pins: seven full client stories and 37 additional property details. All 40 closed transactions in the supplied Agent Production and Inventory Report are represented; 28 were already on the map and 12 were added with their MLS numbers, report categories, list and sold prices, dates, and days on market. Report categories are not additional claims about representation. The map also retains the pending listing at 3648 36th Ave S and the separately team-reported Palatine property. No representation details, photos, or narratives were inferred for the added entries. Pin coordinates use the US Census `Public_AR_Current` oneline-address geocoder; ArcGIS World Geocoding Service was used where Census returned no match. Coordinates are street-address estimates, not surveyed building or unit locations, and some addresses geocoded to nearby street ranges. The additional address list remains available without the map.

The Client Stories map keeps Leaflet markers/popups and uses MapLibre GL with OpenFreeMap vector tiles and font glyphs. All land stays soft green, with blue water, pale roads, and muted green/blue place, road, and water names. Local roads and road labels appear as visitors zoom in; land-use color patches, buildings, and points of interest are omitted. Attribution remains visible. MapLibre GL 5.6.1 and the Leaflet bridge 0.1.3 are pinned on unpkg. The background requires WebGL and network access; an explicit message appears if unavailable, while story pins and the address list remain usable. No API key or location permission is required.

The confirmed canonical origin is `https://seattleathome.com` (without www). All 14 public HTML pages have unique titles/descriptions, canonical links, Open Graph/Twitter cards, and JSON-LD describing the site, page, Emily, and her real estate business. The structured contact details match the visible footers. No street address, coordinates, office hours, review scores, or Google profile URL are invented. The RealEstateAgent description is semantic markup, not a promise of Google LocalBusiness rich-result eligibility; Google may require a verified address and other fields. Google Business Profile edits and verification remain outside this work.

Run `npm run seo:generate` after changing the page metadata configuration or importing posts. The repeatable generator updates only marked head blocks/titles and `sitemap.xml`. The sitemap contains 10 core pages, four built-in quiz routes, and 125 article reader URLs; it excludes 404, generic story placeholders, editors, custom local quiz drafts, and the empty article reader. There are no fabricated last-modified timestamps. Blog/quiz metadata updates to the selected content in the browser. Article schema uses imported publication/modification dates without inventing timezone data. Private browser drafts must not be used as approved production content.

The article reader and archive still require JavaScript; social crawlers that do not execute JavaScript see generic article-reader metadata. Pre-rendered article pages, preservation/redirect mapping for the old WordPress URLs, verified canonical-domain redirects, Search Console ownership/sitemap submission, real 404 responses, and removal of preview noindex/robots blocking remain launch tasks. Do not point the existing domain at this preview before preserving existing article URLs and approving incomplete content.

Current robots.txt declares the prepared sitemap but continues to block crawling. Vercel's production domain and aliases must be configured in the project dashboard; no DNS or Google Business account settings have been changed.

### Page list

- Home: index.html
- About: about.html
- Buy: buy.html
- Sell: sell.html
- Client Stories: stories.html
- Blog archive: blog.html
- Blog article: blog-post.html?slug=<post-slug>
- Story Detail: story.html
- Videos: videos.html
- Start Here: start-here.html
- Contact / Book: contact.html
- 404 preview: 404.html
- Quizzes: quiz.html?type=buy, sell, fit, or places
- Placeholder privacy/accessibility: privacy.html
- Content editor prototype: editor.html

The 404 page is a clickable design preview. Python's basic server still uses its own error response for an arbitrary nonexistent URL.

## Preview Behavior

- Confirmed contact details: `emily@seattlathome.com` (spelling explicitly confirmed by the owner), `425-587-8838`, Coldwell Banker Danforth, Bellevue office. No street address was supplied.
- The Contact page links to `https://calendly.com/emilyhawkinshomes/call` instead of displaying a non-working contact form. The approved flow is Calendly's standard time selection, invitee details/questions, then confirmation. Configure the event duration, availability, required intake questions and meeting location in Emily's Calendly account; the static site cannot configure or verify those account settings. No booking was submitted during validation.

- On November 2, 2026, the owner supplied 8 homes sold in 2026 so far (correcting the initial 12) and 55 reviews averaging 4.9 stars. The initially supplied 3 years licensed was superseded at the owner's request by "Licensed since 2022," matching Emily's October 21 discovery transcript and avoiding a year count that becomes outdated. The owner separately confirmed 2025 averages of 18 days on market and a 99% list-to-sale price ratio. Home/About/Sell stat blocks use these supplied figures, with their differing periods retained; the review platform/source is still pending and no review schema or invented attribution is added. The separate illustrative seller-story outcome remains demo content until a real story is supplied.
- The confirmed professional title is Broker. License-number placeholders were removed at the owner's request, not replaced with invented identifiers. All public footers use the exact owner-supplied fair-housing statement. The owner approved the existing privacy/accessibility copy; draft-review wording was removed without claiming independent legal review or changing the still-preview form behavior. These content approvals do not enable public indexing or resolve the other pending content.
- Other on-site inquiry forms are local-only and display "Preview only — form not connected". The newsletter form is the exception: it uses the database endpoint described above. Calendly handles its own booking data after visitors follow the external link.
- Placeholder intro, FAQ, and listing videos and their unfinished video-only sections have been removed sitewide, along with random stand-in playback. The real YouTube galleries and curated Instagram reels remain. No third-party video, Tally or Calendly scripts load.
- The seller page's “Questions Sellers Ask Me” section contains Emily's supplied seven answers, marketing list, personal introduction, linked email and phone, and NWMLS production footnote (July 2022 – November 2026; includes co-listings). Native expandable questions work without JavaScript; the first answer is open initially.
- Client-quote placeholders on the seller page and draft story template use this exact Google review excerpt from Amy Schwab: “Emily made every step feel warm, exciting, and manageable.” Her five-star review was verified on Google Maps on November 13, 2026. Attribution links to Emily's Google profile. The seller testimonial no longer includes a fabricated sale timeline; the draft story labels the review as independent of its unfinished narrative.
- The approved brand palette is fixed across the site. The former Sound / Madrona preview switch and its saved-theme behavior have been removed.
- All four quizzes use native radio controls and show results without an email gate. Neighborhood shortlists use placeholder places, not real recommendations.
- The Quiz Studio can create additional quiz drafts with question choices and a result message. Custom quiz drafts appear on Start Here in that browser only; export/import moves them between browsers. They do not publish or send answers to a lead system.
- Client story cards include clearly marked price-detail slots. Replace them only with Emily-approved figures; no prices have been invented.
- Instagram and YouTube profile links use Emily's supplied URLs throughout the public pages, including blog footers. Facebook is omitted until its URL is supplied. Unconfigured contact details stay within the preview.

## Curated Instagram Reels

The Videos page shows up to three random unique reels from `reels/reels.json`. Duplicate Instagram URLs are deduplicated by the reel shortcode, including links with tracking parameters. Repeats are prevented within each displayed selection; a later page load can show a previously seen reel. Fewer than three valid entries show only those entries, never duplicates to fill space.

Put permitted local video/poster/caption files inside `reels/` and list them in the manifest, or curate Instagram reel links. Static hosting cannot automatically discover newly dropped files, so the JSON list must also be updated. Example entry (replace placeholders before use):

```json
{
	"reels": [
		{
			"url": "https://www.instagram.com/reel/REPLACE_WITH_SHORTCODE/",
			"title": "REPLACE_WITH_APPROVED_TITLE",
			"file": "emily-reel.mp4",
			"poster": "emily-reel.webp",
			"captions": "emily-reel.vtt"
		}
	]
}
```

`file`, `poster`, and `captions` are optional, relative to the reels folder. Local `.mp4`/`.webm` videos play with controls and no autoplay; URL-only entries link to Instagram in a new tab without third-party embed scripts. Only publish files Emily has permission to use and provide captions for speech. An empty list shows a coming-soon message without placeholder video cards. Broken/invalid lists show an unavailable message. No Instagram scraping, API token or additional subscription is used.

Six reels were imported from the supplied Desktop folder. The manifest uses `-web.mp4` copies with unchanged video, browser-compatible AAC-LC audio and fast-start metadata, plus extracted JPG posters. Original downloads are unchanged. Numbered display labels are temporary; replace them with approved titles. No separate caption files were supplied.

## Source and Intentional Differences

Converted from the newer `Emily Hawkins Site Design System (1).zip` export and the supplied Squarespace stylesheet. The custom design runtime is not included or required. The supplied 2026 brand brief is reflected in Manrope typography, navy text and dark surfaces, warm ivory backgrounds, teal highlights, champagne borders, and restrained terracotta accents. The supplied watercolor artwork adds a soft blue-tinted wash to the shared header and footer. Primary Home/About copy reflects the advice-first positioning, and the footer names Coldwell Banker Danforth from the brief.

The public navigation uses `assets/seattle-at-home-logo.webp`, extracted from the original oval artwork embedded in the brand brief's light collateral sample. Exterior cream backing is transparent; the oval's proportions and interior lettering are preserved. A standalone original logo export can replace this asset later. Emily's name has been removed from beside the logo; hovering the logo on a mouse device reveals the supplied circle knockout mark. The logo links home. Eyesome Script is self-hosted at `assets/fonts/eyesome-script.otf`, extracted unchanged from the owner's supplied Eyesome-Font.zip on November 2, 2026. The owner confirmed a license permitting website embedding. Only the Script face is used, at weight 400 with `font-display: swap`, for the existing selected personal titles; Allura remains a loading fallback. TT Chocolates is reserved for actual “FOR SALE” sign/display applications, not general website typography.

Approved social profiles:
- Instagram: https://www.instagram.com/emilyhawkinshomes/
- YouTube: https://www.youtube.com/@EmilyHawkinsHomes

Social content remains curated. Profile links do not enable automatic feeds, tracking scripts, or third-party embeds.

## Emily's Business Quotes

Home, About, Buy, Sell, Contact, and Videos include distinct excerpts from `2026-10-21-emily-discovery-call-transcript.txt`. Public captions show only Emily Hawkins, not the conversation label or date; the quotes are not presented as client testimonials. Wording is retained with whitespace normalized, including the transcript's informal phrasing. The source has no speaker labels or timestamps; the selected excerpts come from apparent first-person business answers, not interviewer questions. The About excerpt replaces the previous drafted quotation.

- Source copy, section order and bracketed placeholders were retained on the content pages.
- The scheduler label is `[CALENDLY EMBED]`, as requested, instead of the source's longer scheduler placeholder.
- The source's decorative FAQ/radio controls became native interactive elements. Quiz questions, scoring and result titles follow BUILD-PLAN.md instead of the mockups' illustrative sample results. The single-priority neighborhood explanation replaces the outdated two-priority sample wording.
- The places quiz omits the unfinished purchase-price question until approved price ranges are available. Its five remaining questions still use the final primary-priority answer to select a shortlist.
- Source container-scaled fonts and negative letter spacing were replaced with fixed responsive sizes and zero letter spacing. Tiny or clipped text was not reproduced.
- A shared CTA band was added to pages whose mockups lacked it, as requested. The homepage story strip becomes a responsive grid to avoid horizontal scrolling. The header keeps both Emily's name and the firm visible at every size.
- Missing 404 and legal content use explicit minimal preview/placeholder pages, not invented brokerage policies.

Production hosting is planned for Vercel. Production editing, forms, bookings, final legal content and launch checks remain separate work; static hosting does not make local drafts publish or sync.

## Content Editor Prototype

`editor.html` is a local content-editing prototype. It seeds drafts for the existing key pages, loads imported blog posts, supports headline/body/photo edits, offers standard-page, neighborhood-guide, and blog/client-story templates, and has live preview plus JSON import/export. Article formatting is preserved in the rich-text editor. Drafts are stored in the current browser's localStorage only; edits do not publish to the public pages or synchronize between devices. Production editing needs authenticated server-side storage or a CMS integration.

`quiz-studio.html` creates additional local quiz drafts with question choices and a custom result message. These are stored in localStorage and can be exported/imported as JSON; they appear on `start-here.html` and can be previewed, but are not published or connected to lead collection. The built-in quizzes remain unchanged.

## Blog Archive

The archive and article reader are `blog.html` and `blog-post.html`. The imported archive contains 125 posts from `https://seattleathome.com`, including dates, excerpts, categories, tags, featured images, and article HTML. Locally hosted featured and inline images are in `blog/images/`. The public WP REST import can be repeated with:

```sh
node blog/import-blog.mjs
```

The importer fetches only Seattle At Home post metadata and images hosted under its WordPress uploads directory. The blog pages are currently `noindex` along with the rest of this local preview; review content, publication dates, links, images, and rights before production launch.