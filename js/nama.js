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
  if (reduce || !("IntersectionObserver" in window)) return;

  function print() {
    if (wrap.classList.contains("is-printed")) return;
    wrap.classList.add("is-printed");
    io.disconnect();
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) print();
      });
    },
    { threshold: 0.3 }
  );
  io.observe(wrap);

  /* The same fallback hero.js needs, for the same reason. Arriving at /nama
     through the router means this page was display:none a moment ago, and an
     IntersectionObserver does not report an element that became visible
     without anything scrolling. On a tall window the sheet is already in view
     at that moment, so the observer alone would never print it.

     Guarded by print()'s own check, so whichever path gets there first wins
     and the wipe still only ever runs once. */
  function printIfInView() {
    var r = wrap.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    if (r.top < vh * 0.7 && r.bottom > 0) print();
  }

  /* Checked three times, the way hero.js schedules its reveals: once now,
     because layout may already be settled; once next frame; and once after a
     timeout, which still fires when requestAnimationFrame is throttled in a
     background tab. print() makes the repeats free. */
  function schedule() {
    printIfInView();
    requestAnimationFrame(printIfInView);
    setTimeout(printIfInView, 80);
  }

  window.addEventListener("page:change", schedule);
  window.addEventListener("load", printIfInView);
  schedule();
})();
