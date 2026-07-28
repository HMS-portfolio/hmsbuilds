# Hamza AlSalamat — Portfolio Creative Brief

_Source of truth for direction, UI/UX, and copy. Agreed via survey, 16 July 2026._

## 1. The One-Line Positioning

**A high-potential generalist with a global arc: drop him anywhere and he figures it out, builds something, and brings people with him.**

AI/Nama is the flagship *proof*, not the identity. The site is broad about industry, specific about character.

## 1b. Current Build — Architecture (as of 17 July 2026)

**Multi-page, hash-routed SPA** (one `index.html`, static; served by `python -m http.server`). Not a scroll-through one-pager anymore — each section is its own page, switched via the URL hash. Graceful-degrades: JS off → all pages visible.

- **Router:** `js/router.js`. Maps hash → page: `#top`/none → home, `#work` → work, `#about`/`#contact` → about. Adds `.has-router` to `<html>`; `.page.is-active` shows one page (CSS in `heritage.css`). Dispatches a `page:change` event on every switch. Nav tabs + in-page CTAs (`.eye-cta`, `.page-cta`) drive it.
- **Pages:** `#page-home` (film + signature-in-eye), `#page-work` (marquee + 4 work cards + `<dialog>` case-files/decks — built in a parallel session, `work.css`/`work.js`, do not clobber), `#page-about` (tatreez hem + About + hem + footer/#contact).
- **Home / the film:** `js/film.js` scrubs a 180-frame webp sequence (4K/60 master → 1920px/30fps, in `assets/hero/frames/`) over a sticky 420vh section. Scroll = wheel over `body` (body is the scroll container via `overflow-x:hidden`). At the zoom's end a **broadhead arrow** flies into the pupil and fades; at `z > EYE_OPEN_AT (0.6)` it adds `.eye-open` to `.film` and calls `window.__sig.draw()`; scrolling back up calls `window.__sig.reset()` — so it re-animates. Veil capped at `VEIL_MAX 0.55` so the eye stays visible behind the ink.
- **Signature:** lives in `.eye-sig` INSIDE the film-stage (not a separate hero section). `js/hero.js` exposes `window.__sig = {draw, reset}`, runs the global custom ink cursor, and re-triggers `.rise` reveals (toggle observer — animates every time, not once). Arabic name **حمزة** sits close beneath (Aref Ruqaa font).
- **Heritage layer:** `heritage.css` + `js/heritage.js`. Seven-point star (favicon + hem/About marks), najmeh star on work cards, **tatreez stitched hems**, **authentic Levantine qabbeh** (11-col najmeh column, `.about` side rail — sized in JS from `.about-inner` height because a `<canvas>` won't stretch to a grid row). Petra rose (`--rose #c17a5a`) reserved for heritage only; brass stays primary. Tatreez re-stitches on `page:change` + IntersectionObserver.
- **Copy now live:** contact CTA = "Take the shot" / *"If you're still here, you're a target."*; About lede rewritten ("perpetual new arrival" throughline). Fonts: Cormorant Garamond (display), Jost (body), Aref Ruqaa (Arabic).
- **Known env gotcha:** the in-app preview pane freezes scroll/rAF and returns black screenshots + 0 canvas rects — verify visually in a real browser, not the pane. `dispatchEvent(new Event('resize'))` force-renders tatreez there.
- **Scripts load order:** router, film, hero, work, heritage. (`ink.js` no longer loaded — the ink-brush surface was dropped when the signature moved into the eye.)

## 2. Audience & Job-To-Be-Done

| Priority | Visitor | What the site must do |
|---|---|---|
| Primary | Recruiters / internship & program gatekeepers | Communicate competence in ~30 seconds of skimming; give them a reason to reply |
| Secondary | Anyone who Googles "Hamza AlSalamat" | Be the definitive, impressive "who is this person" page |

Broad on purpose — no single career lane signaled. Doors targeted: tech, business/strategy, programs/fellowships.

## 3. Identity & Branding

- **Site identity:** Hamza the person. Nama is the flagship project, not the whole story.
- **Name form:** **AlSalamat** (preferred over "Salamat" for branding).
- **Domain:** hms-builds.com (owned, registered in his Vercel account; project deleted, domain persists — re-attach on deploy).
- **Contact channels:** Email, LinkedIn, GitHub. No X/Instagram in v1. _(Handles/URLs still needed.)_

## 4. The Story Spine (for copy)

Pattern, not place: **new environment → figure it out → build something → lead people → level up.**

Arc (present but understated — never a list of cities in the hero):
LA → Dallas → Memphis → Bahrain (HS grad) → Riyadh (university, next).
Roots: US (Southern) + Arab (Jordanian). **Not** "Bahrain-rooted."

Core threads (his words): makes things happen · learns anything fast · leads and brings people along · global story.

### Credential wording rule (non-negotiable)
- MISTI Bahrain — AI Vision Quest, Certificate of Excellence and Achievement, Jan 2025.
- MISTI — Global Teaching Labs 2026, Certificate of Participation and Achievement, Jan 2026.
- These are MIT MISTI *programs delivered at RVIS Bahrain*. Never phrase as "MIT student/degree."

## 5. Voice & Copy Register

Confident declarative × story-driven. First person, short sentences, no hedging, ambitious but grounded in specifics. Mostly professional; personal color used sparingly (place + trajectory, not private details). AI-building never framed as "who he is" — always as "one thing he's done."

## 5b. The Opening Film (added 16 July 2026, his concept)

Scroll-scrubbed cinematic intro before the signature hero: photoreal archer in misty
pine forest aiming at a distant elk → scroll drives arrow-POV flight → dive into the
elk's eye macro → pupil swallows the screen (black veil) → signature world begins.
Assets (PRISTINE pass, 17 Jul): `assets/hero/shot-a-hunter.png` (full-bearded weathered
hunter, nano-banana edit), `shot-b-eye.png` (elk eye macro). `film.mp4` = Kling 3.0 std
(start=hunter, end=eye, shot-list beats + cfg 0.8) → ByteDance AI upscale to true
**3874×2160 @ 60 fps** → `frames/frame-0001..0180.webp` (1920px, 30fps cut, ~21 MB).
Prior cuts kept: `film-v2/v3.mp4`, `frames-v3-backup/`. Engine: `js/film.js` — sticky
**420vh** section, canvas cover-fit, damped smoothP scrub (lerp 0.14) + sub-frame
crossfade, `pow(t,1.55)` speed-ramp (slow hold → fast flight), continuous rAF loop,
reduced-motion skips film. Landing hero backdrop = the eye itself (`.hero-eye` zoomed
to iris) under a semi-sheer warm ink surface. Prompt lesson: video models obey positive
timestamped shot-lists, ignore "do not" negatives. Generated on his Higgsfield account.

## 6. Visual & Motion Direction

- **Mode:** Dark & cinematic — near-black canvas, glowing accent(s), depth and atmosphere. Disciplined: must never read "crypto startup."
- **Motion:** Signature hero moment **plus** a site that breathes everywhere — characterful hovers, page transitions, scroll reveals. Constraint: recruiters skim, so drama lives in the first viewport and interactions; content itself stays instantly scannable. Performance is a feature.
- **Feeling on tab close:** "This person is going somewhere."

## 7. Information Architecture (v1)

Multi-page:

1. **Home** — cinematic hero (signature animation), positioning statement, flagship work teaser, credentials strip, contact CTA.
2. **Work** — Nama deep-dive + 2–3 other projects + activities/leadership highlights (timeline/highlights format for story-shaped wins).
3. **About** — the arc + core threads; mostly professional, lightly personal.
4. **Contact** — email, LinkedIn, GitHub.
- **Writing/Notes:** explicitly NOT in v1. No placeholder page.

## 8. Project Inventory (confirmed, with assets)

### Nama Site Intelligence — flagship
Multi-agent AI feasibility engine for Saudi/Riyadh land: parcel number in → investment-grade deal sheet out.
**Design requirement:** a visit-link slot (he's buying a domain for it) — design the link in from day one so it doesn't look bolted on; render gracefully as "domain coming soon" until the URL exists.

### The Car (MISTI build)
His words: "Designed, Engineered, and built a fully functioning car with a top speed of 40 km/h."
**Confirmed:** electric motor; built as part of **MISTI Global Teaching Labs 2026**. Team build (photos show several people) — don't claim solo. The **2025 AI Vision Quest** has no project details — display it respectfully in credentials but don't hype it; GTL 2026 carries the story.
Assets prove the full arc: dimensioned CAD chassis drawings → welding/grinding (day + night sessions) → suspension, disc brakes, steering knuckle assembly → finished red/white body with windshield, dash, steering wheel.
Assets: `assets/misti/misti-1..9.jpg` + `assets/misti/misti-video.mp4` (**audio ON** — the only unmuted video on the site).

### Paperly
Tool that intakes a resume and generates a portfolio website. Landing page: "Turn your resume into a beautiful portfolio website" — upload PDF/DOC, three personalization questions, out comes a themed portfolio (dark product-page example in assets). Meta-angle available in copy: he built a portfolio *generator*.
Assets: `assets/paperly/paperly-1.jpeg`, `paperly-2.jpeg` + `paperly-demo.mp4` (5.7 MB, 1440px, audio stripped at file level — original 243 MB .mov remains in Downloads).

### Brand asset (found in repo)
`HMS logo/` — calligraphic signature logo, black + white variants, **SVG included**. White SVG = wordmark on dark canvas. Hero concept candidate: SVG stroke "draws itself" animation — the literal signature as the signature moment.

### Media rules (his instructions)
- All videos muted **except** the MISTI video (audio allowed there).
- Each project's images presented as a **scrollable deck** (swipeable card-stack gallery per project).
- MISTI certificates: `assets/certs/misti-cert-a.pdf`, `misti-cert-b.pdf`.

## 9. Contact & Links (confirmed)

- Email: **HMSalamat15@gmail.com**
- GitHub: **https://github.com/HMS-portfolio** (verified live)
- LinkedIn: **https://www.linkedin.com/in/hamza-salamat/**

## 10. Open Inputs (remaining)

- [ ] Portrait photo of Hamza for About/hero (build shots exist; a clear portrait would unlock more layouts).
- [ ] Activities/leadership wins list (mentioned in survey, not yet itemized).
- [ ] Nama domain URL once purchased (link slot ships as "coming soon").
