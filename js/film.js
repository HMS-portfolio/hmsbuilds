/* FilmScrubber — the opening film, scrubbed by scroll:
   a falcon soars head-on and majestic (frame sequence) → the camera rushes
   into its hunter eyes → the eye darkens → the signature world begins.

   The section is FILM_VH tall; a sticky stage pins the canvas while the
   visitor's scroll drives the frame index. The last stretch of scroll
   settles on the eye and darkens a veil, handing off to the signature. */

(function () {
  "use strict";

  const ASSET_VER = "8";                   // bump when frames are re-exported (busts browser cache)
  const FRAME_COUNT = 193;                 // frames of the new falcon soar → native macro into the eye (Topaz 4K)
  /* Phones get a 1280-wide cut of the same 193 frames (9.5MB vs 42MB).
     A 4K frame decodes to ~33MB of bitmap; holding a scrubbable window of
     those on a phone is what makes mobile Safari drop the tab. Decided once
     at load — swapping sources on resize would re-fetch the whole sequence. */
  /* Both conditions, not either. navigator.deviceMemory reports in coarse
     power-of-two buckets and plenty of desktops report 4, which silently
     demoted real machines to the 720p set. A coarse pointer is the only
     reliable "this is actually a phone" signal; every desktop has a fine one,
     so a desktop always gets the full 4K sequence no matter how narrow the
     window is. */
  const PHONE =
    window.matchMedia("(max-width: 820px)").matches &&
    window.matchMedia("(pointer: coarse)").matches;
  const FRAME_DIR = PHONE ? "dive-720" : "dive";
  const FRAME_PATH = (i) =>
    `assets/hero/${FRAME_DIR}/frame-${String(i + 1).padStart(4, "0")}.webp?v=${ASSET_VER}`;
  const POSTER_PATH = `assets/hero/${FRAME_DIR}/frame-0001.webp?v=${ASSET_VER}`;
  const SCRUB_END = 0.67;                  // flight plays across the first ~296vh (same pace as before)
  const SETTLE_END = 0.76;                 // eye settles + darkens + signature draw complete here…
  //                                          …then 0.76→1.0 is a LONG hold (~106vh of scroll) so the
  //                                          signature dwells over a full screen and can't be flicked past.
  const ZOOM_TARGET = { x: 0.5, y: 0.45 };  // falcon's eyes in the final frame (head-on)
  const ZOOM_MAX = 1.0;                    // the new video zooms into the eye natively — no CSS zoom (keeps 1080p crisp)
  const EAGER_FRAMES = 20;                 // loaded before anything else
  const EYE_OPEN_AT = 0.32;                // opens here...
  const EYE_CLOSE_AT = 0.20;               // ...but does not close until well below.
  //   A single shared threshold meant any scroll jitter near 0.32 (one wheel
  //   notch, trackpad momentum) flipped eyeOpen back and forth and restarted
  //   the 3s signature draw from zero. Hysteresis is what makes it settle.                // signature begins early in the settle, holds through the rest
  const VEIL_MAX = 0.72;                   // darker veil so the ink reads over the bright iris

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const film = document.querySelector(".film");
  const canvas = document.getElementById("filmCanvas");
  const veil = document.querySelector(".film-veil");
  const hint = document.querySelector(".film-hint");
  if (!film || !canvas) return;

  const ctx = canvas.getContext("2d");
  const frames = new Array(FRAME_COUNT).fill(null);
  let loadedCount = 0;
  let poster = null;
  let eyeOpen = false;

  /* reduced motion: skip the film entirely, land on the signature */
  if (prefersReduced) {
    film.style.display = "none";
    return;
  }

  function resize() {
    /* up to 3× backing store so 4K frames resolve on hi-DPI displays; phones
       draw from the 720p set, where a 3× store would only cost fill rate */
    const dpr = Math.min(window.devicePixelRatio || 1, PHONE ? 2 : 3);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastKey = "";
    render();
  }

  /* draw an image cover-fit, optionally zoomed toward the pupil */
  function drawCover(img, zoom) {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const scale = Math.max(cw / img.width, ch / img.height) * (zoom || 1);
    const w = img.width * scale;
    const h = img.height * scale;
    /* anchor: viewport center normally; pupil point when zooming */
    const ax = zoom > 1 ? ZOOM_TARGET.x : 0.5;
    const ay = zoom > 1 ? ZOOM_TARGET.y : 0.5;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, cw / 2 - w * ax, ch / 2 - h * ay, w, h);
  }

  function nearestLoaded(idx) {
    for (let d = 0; d < FRAME_COUNT; d++) {
      if (frames[idx - d]) return frames[idx - d];
      if (frames[idx + d]) return frames[idx + d];
    }
    return poster;
  }

  function progress() {
    const rect = film.getBoundingClientRect();
    const total = film.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(Math.max(-rect.top / total, 0), 1);
  }

  /* damped progress: a follower that glides toward the scroll position. A
     mouse wheel emits DISCRETE jumps; a low lerp lets the film smooth over
     those steps so the flight plays like continuous footage, not stair-steps.
     (Too high and it tracks each wheel notch — that's what felt "funky".) */
  const PROGRESS_LERP = 0.12;
  let smoothP = 0;
  let lastKey = "";

  function render() {
    const rawP = progress();
    smoothP += (rawP - smoothP) * PROGRESS_LERP;
    if (Math.abs(rawP - smoothP) < 0.0004) smoothP = rawP;
    const p = smoothP;

    const key = p.toFixed(4) + ":" + loadedCount;
    if (key === lastKey) return;
    lastKey = key;

    if (hint) hint.style.opacity = p < 0.02 ? "1" : "0";

    if (p < SCRUB_END) {
      const t = p / SCRUB_END;
      /* LINEAR: scroll maps directly to video frames, so the falcon flight plays
         at the footage's own natural pace — no ease curve distorting the motion */
      const exact = Math.min(t * (FRAME_COUNT - 1), FRAME_COUNT - 1);
      const idxA = Math.floor(exact);
      const idxB = Math.min(idxA + 1, FRAME_COUNT - 1);
      const mix = exact - idxA;

      /* crossfade smooths the SLOW early soar (adjacent frames nearly identical,
         so blending just softens the step). But near the eye the camera rushes
         and adjacent frames differ a lot, so the blend becomes a visible ghost =
         motion-blur. Taper the crossfade off over the back third of the flight
         so the dive into the pupil stays crisp; the soar keeps its smoothness. */
      const crispen = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.35);

      /* sub-frame crossfade: floor frame under, next frame fading in over */
      const imgA = nearestLoaded(idxA);
      if (imgA) drawCover(imgA, 1);
      const imgB = frames[idxB];
      if (imgB && mix > 0.01 && imgB !== imgA && crispen > 0.01) {
        ctx.globalAlpha = mix * crispen;
        drawCoverBlend(imgB, 1);
        ctx.globalAlpha = 1;
      }
      if (veil) veil.style.opacity = "0";
      if (eyeOpen) { eyeOpen = false; film.classList.remove("eye-open"); if (window.__sig) window.__sig.reset(); }
    } else {
      /* the eye pushes in deep and darkens over the settle band (SCRUB_END→SETTLE_END),
         then everything HOLDS at full for the rest of the scroll so the signature has a
         long, unmissable dwell — a flick of the wheel can no longer skip past it. */
      const z = Math.min(Math.max((p - SCRUB_END) / (SETTLE_END - SCRUB_END), 0), 1);
      const eased = z * z * (3 - 2 * z);
      const img = nearestLoaded(FRAME_COUNT - 1);
      if (img) drawCover(img, 1 + eased * (ZOOM_MAX - 1));
      if (veil) veil.style.opacity = String(Math.pow(eased, 1.6) * VEIL_MAX);

      /* hand off to the signature once the eye begins to settle; it stays open through
         the entire hold band (z is clamped to 1, so it never flips back off up here) */
      if (z > EYE_OPEN_AT && !eyeOpen) {
        eyeOpen = true; film.classList.add("eye-open"); if (window.__sig) window.__sig.draw();
      } else if (z <= EYE_CLOSE_AT && eyeOpen) {
        eyeOpen = false; film.classList.remove("eye-open"); if (window.__sig) window.__sig.reset();
      }
    }
  }

  /* like drawCover but without clearing — used for the crossfade layer */
  function drawCoverBlend(img, zoom) {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const scale = Math.max(cw / img.width, ch / img.height) * (zoom || 1);
    const w = img.width * scale;
    const h = img.height * scale;
    const ax = zoom > 1 ? ZOOM_TARGET.x : 0.5;
    const ay = zoom > 1 ? ZOOM_TARGET.y : 0.5;
    ctx.drawImage(img, cw / 2 - w * ax, ch / 2 - h * ay, w, h);
  }

  /* progressive loading: poster first, eager head, then the rest */
  function loadFrame(i) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        frames[i] = img;
        loadedCount++;
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = FRAME_PATH(i);
    });
  }

  const posterImg = new Image();
  posterImg.onload = () => {
    poster = posterImg;
    film.classList.add("ready");   // fade the loader — the falcon is on screen
    render();
  };
  posterImg.src = POSTER_PATH;

  (async function loadAll() {
    const eager = [];
    for (let i = 0; i < Math.min(EAGER_FRAMES, FRAME_COUNT); i++) eager.push(loadFrame(i));
    await Promise.all(eager);
    lastKey = "";
    render();
    for (let i = EAGER_FRAMES; i < FRAME_COUNT; i++) {
      loadFrame(i).then(() => {
        if (loadedCount === FRAME_COUNT) { lastKey = ""; render(); }
      });
    }
  })();

  /* continuous render loop — immune to dropped scroll events; render()
     early-returns when the frame index hasn't changed, so idle cost is nil */
  (function loop() {
    render();
    requestAnimationFrame(loop);
  })();

  window.addEventListener("resize", resize);
  resize();
})();
