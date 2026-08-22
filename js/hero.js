/* Home signature + global cursor + re-triggering reveals.
   The signature no longer lives in a section you scroll to — it is drawn
   INSIDE the eye by film.js at the end of the flight. film.js calls
   window.__sig.draw() when the eye opens and window.__sig.reset() when you
   scroll back up, so the whole thing re-animates every time. */

(function () {
  "use strict";

  var DRAW_MS = 3000;
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var sig = document.getElementById("sig");
  var maskStrokes = sig ? [].slice.call(sig.querySelectorAll(".mask-stroke")) : [];

  /* ---- the signature drawing engine (idempotent, resettable) ---- */
  var raf = null;
  /* idle | drawing | done — draw() is a no-op unless idle, so a repeated
     call cannot yank a half-finished signature back to zero. */
  var drawState = "idle";
  /* One window per brush, indexed in the order the masks appear in the SVG defs:
     0 the name, 1 the trailing detail and underline, 2 the flourish. That IS the
     order the signature is written in, and the small overlaps keep the pen from
     coming to a full stop between strokes. */
  var bounds = [
    { start: 0.00, end: 0.50 },   // the name
    { start: 0.44, end: 0.74 },   // the trailing detail and long underline
    { start: 0.68, end: 1.00 }    // the flourish
  ];

  /* ONE ease, on the master clock — not per stroke.

     Easing each stroke separately meant every stroke decelerated into its own
     stop and the next accelerated out of its own start, so the handoffs sagged.
     Easing the shared clock instead makes the three brushes read as a single
     continuous hand: it lifts off the page once at the beginning and settles
     once at the end. */
  function ease(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  /* Linear WITHIN a stroke, deliberately. Earlier versions needed a lookup
     table to even out the reveal, because the brush swept ACROSS the artwork
     and so uncovered ink at a wildly uneven rate. Now each brush runs along the
     signature's own centreline, where distance travelled IS ink revealed, and
     constant speed is exactly what a pen does. The table is gone; do not
     reintroduce it without re-measuring. */
  function setProgress(t) {
    var g = ease(t);
    maskStrokes.forEach(function (p, i) {
      var b = bounds[i];
      if (!b) return;                         // a stroke added to the SVG with
                                              // no window: leave it alone
      var segT = Math.min(Math.max((g - b.start) / (b.end - b.start), 0), 1);
      p.style.strokeDashoffset = String(1 - segT);
    });
  }

  function draw() {
    if (!sig) return;
    if (drawState !== "idle") return;   // already drawing, or already drawn
    if (prefersReduced) { setProgress(1); sig.classList.add("dots-on"); drawState = "done"; return; }
    drawState = "drawing";
    if (raf) cancelAnimationFrame(raf);
    sig.classList.remove("dots-on");
    var start = null;
    (function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / DRAW_MS, 1);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(frame);
      else { sig.classList.add("dots-on"); drawState = "done"; }
    })(performance.now());
  }

  function reset() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    drawState = "idle";
    if (!sig) return;
    sig.classList.remove("dots-on");
    setProgress(0);
  }

  window.__sig = { draw: draw, reset: reset };
  reset(); // start hidden

  /* subtle parallax: the signature leans toward the cursor inside the eye */
  var sigWrap = sig ? sig.closest(".sig-wrap") : null;
  if (sigWrap && !prefersReduced) {
    var tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener("pointermove", function (e) {
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      tx = nx * 16; ty = ny * 10;
    });
    (function loop() {
      cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
      sigWrap.style.transform = "translate3d(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px,0)";
      requestAnimationFrame(loop);
    })();
  }

  /* ---- custom ink cursor dot (global, all pages) — no trailing ring ---- */
  var dot = document.querySelector(".cursor-dot");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (dot && fine) {
    document.addEventListener("pointermove", function (e) {
      document.body.classList.add("cursor-on");
      dot.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px) translate(-50%,-50%)";
    });
    document.addEventListener("pointerleave", function () { document.body.classList.remove("cursor-on"); });
    document.addEventListener("pointerover", function (e) {
      if (e.target.closest("a,button")) document.body.classList.add("cursor-grow");
    });
    document.addEventListener("pointerout", function (e) {
      if (e.target.closest("a,button")) document.body.classList.remove("cursor-grow");
    });
  }

  /* ---- re-triggering reveals: animate in every time they enter view ---- */
  var risers = document.querySelectorAll(".work-head, .work-card, .about .rise, .about-teaser .rise, .arenas-group, .arena-tile, .const-head .rise, .const-converge, .now .rise, .branch-card, .page-sign, .outro-line, .outro-links, .outro-foot, .outro-arabic, .outro-note, .contact .rise, .certs-head, .cert-card, .page--nama .rise, .home-news-card");
  risers.forEach(function (el) { el.classList.add("rise"); });

  /* add-only: reveal once and stay. Toggling .in off mid-reveal fought the
     translateY animation (which changes the visible ratio) and froze elements
     near opacity 0 — especially on routed pages that start hidden. */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add("in");
    });
  }, { threshold: 0.12 });

  risers.forEach(function (el) { io.observe(el); });

  /* SPA routing shows a page that started display:none, and IntersectionObserver
     won't fire for its in-view elements until the next scroll/resize. So reveal the
     risers already in the viewport of the active page — on every view change, and
     once now for the initial page (router fired page:change before this listener). */
  function revealActivePageRisers() {
    var active = document.querySelector(".page.is-active");
    if (!active) return;
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    active.querySelectorAll(".rise").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add("in");
    });
  }
  function scheduleReveal() {
    revealActivePageRisers();                       // now (layout may not be ready)
    requestAnimationFrame(revealActivePageRisers);  // next frame
    setTimeout(revealActivePageRisers, 80);         // after layout, fires even when rAF is throttled
  }
  window.addEventListener("page:change", scheduleReveal);
  window.addEventListener("load", revealActivePageRisers);
  scheduleReveal();
})();
