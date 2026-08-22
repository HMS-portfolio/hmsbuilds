/* The deal sheet prints itself when it comes into view.

   Nama's brand system specifies this motion exactly: a clip-path wipe with a
   green leading edge, 1.15s, no fade and no bounce, because a document should
   arrive the way a document arrives. The keyframes live in nama.css; this file
   only decides WHEN.

   Two rules from that system are enforced here rather than in the stylesheet:

   · FAIL VISIBLE. Nothing is hidden up front. The sheet is complete and
     readable in the markup, and .is-printed only ever adds an animation on
     top. If this script never runs, the page is still finished. That is the
     brand's most-violated rule and the reason the wipe is not implemented as
     "hide, then reveal".

   · MOTION SHOWS STATE, NEVER DELIGHT. It prints once, the first time you
     reach it. Re-running it on every scroll past would make it decoration. */

(function () {
  "use strict";

  var wrap = document.querySelector("[data-print]");
  if (!wrap) return;

  var reduce =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  /* The wipe is scrubbed by scroll position: the sheet draws itself as you
     bring it into view, and undraws if you scroll back up.

     Progress is a single custom property, so the only per-frame work is one
     style write. Reads are batched into a rAF so a fast scroll cannot force
     layout on every event.

     The class goes on only once a value has been written, which is what
     keeps this fail-visible: an unstyled .n-sheet-wrap has no clip-path at
     all, so a thrown error here leaves a finished sheet rather than an
     empty box. */
  var START = 0.90; // sheet top at 90% of the viewport: nothing drawn yet
  var END = 0.35;   // sheet top at 35%: fully drawn, before you read it
  var ticking = false;

  function paint() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    var top = wrap.getBoundingClientRect().top;
    var p = (vh * START - top) / (vh * START - vh * END);
    if (p < 0) p = 0; else if (p > 1) p = 1;
    wrap.style.setProperty("--print", p.toFixed(4));
    wrap.classList.add("is-scrub");
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  /* the router shows this page from display:none, so nothing has scrolled and
     no frame is guaranteed; paint straight away as well as on the next one */
  window.addEventListener("page:change", function () { paint(); onScroll(); });
  window.addEventListener("load", paint);
  paint();
})();
