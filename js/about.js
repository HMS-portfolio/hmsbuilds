/* About · constellation behaviour.
   Lighting a star dims the rest of the sky (CSS), and — for any star that
   names a photo — washes that photo in behind the constellation. Nothing here
   reads data-side, so work stars and field stars behave identically; both
   carry photos.

   Photos are optional by design: a star whose image is missing simply lights
   without a wash, so the section works before any photography is dropped in. */

(function () {
  "use strict";

  var stage = document.querySelector("[data-const]");
  if (!stage) return;

  var wash = stage.querySelector("[data-const-wash]");
  var stars = [].slice.call(stage.querySelectorAll(".c-star"));
  if (!stars.length) return;

  /* ---- the unnamed field ----
     Named stars alone read as a diagram no matter how the joins are drawn.
     What makes a chart celestial is the anonymous dust around them, at mixed
     magnitudes. Authored rather than random so the sky is identical on every
     visit. Each row is [x%, y%, diameter px, opacity]. */
  var DUST = [
    [4, 8, 2, 0.22], [11, 34, 1.5, 0.16], [7, 58, 2, 0.2], [24, 12, 1.5, 0.14],
    [28, 68, 2, 0.24], [22, 88, 1.5, 0.18], [38, 26, 2, 0.2], [41, 62, 1.5, 0.15],
    [35, 92, 2, 0.22], [46, 8, 1.5, 0.16], [48, 40, 2, 0.18], [44, 78, 1.5, 0.14],
    [54, 20, 2, 0.2], [57, 44, 1.5, 0.16], [52, 72, 2, 0.22], [58, 96, 1.5, 0.14],
    [66, 10, 2, 0.18], [70, 28, 1.5, 0.15], [64, 52, 2, 0.2], [72, 64, 1.5, 0.16],
    [68, 88, 2, 0.22], [78, 6, 1.5, 0.14], [80, 38, 2, 0.2], [76, 58, 1.5, 0.16],
    [82, 84, 2, 0.18], [88, 16, 1.5, 0.15], [92, 32, 2, 0.22], [90, 50, 1.5, 0.14],
    [94, 70, 2, 0.2], [86, 94, 1.5, 0.16], [96, 10, 1.5, 0.14], [14, 74, 1.5, 0.16],
    [30, 48, 1.5, 0.14], [60, 34, 1.5, 0.15]
  ];

  var dustHost = stage.querySelector("[data-const-dust]");
  if (dustHost && !dustHost.childNodes.length) {
    var frag = document.createDocumentFragment();
    DUST.forEach(function (d) {
      var dot = document.createElement("i");
      dot.style.setProperty("--x", d[0] + "%");
      dot.style.setProperty("--y", d[1] + "%");
      dot.style.setProperty("--s", d[2] + "px");
      dot.style.setProperty("--o", d[3]);
      frag.appendChild(dot);
    });
    dustHost.appendChild(frag);
  }

  /* url -> true (loaded) | false (missing). Avoids re-requesting a 404. */
  var known = {};
  var activeSrc = null;
  var pending = null;

  /* A star may name several photos, comma-separated. Each visit to that star
     shows the next one, so hovering again rewards the second look. */
  var turn = {};

  function nextSrc(star) {
    var list = (star.getAttribute("data-photo") || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);

    if (!list.length) return null;

    var key = list[0];
    var at = turn[key] || 0;
    turn[key] = (at + 1) % list.length;
    return list[at];
  }

  function showWash(src) {
    if (!wash) return;
    activeSrc = src;
    wash.style.backgroundImage = 'url("' + src + '")';
    stage.classList.add("is-washed");
  }

  function clearWash() {
    activeSrc = null;
    stage.classList.remove("is-washed");
  }

  /* Only wash once we know the file exists — a missing photo should be
     invisible to the visitor, not a broken frame. */
  function requestWash(src) {
    if (known[src] === false) return;

    if (known[src] === true) {
      showWash(src);
      return;
    }

    var probe = new Image();
    probe.onload = function () {
      known[src] = true;
      // the pointer may have moved on while this loaded
      if (pending === src) showWash(src);
    };
    probe.onerror = function () {
      known[src] = false;
    };
    probe.src = src;
  }

  /* pointerenter and focus can both fire for one visit (clicking a star does
     both) — without this the photo would swap out from under the visitor. */
  var lastStar = null;

  function light(star) {
    stage.classList.add("is-lit");
    if (star === lastStar) return;
    lastStar = star;

    var src = nextSrc(star);
    pending = src;
    if (src) requestWash(src);
    else if (activeSrc) clearWash();
  }

  function unlight() {
    stage.classList.remove("is-lit");
    lastStar = null;
    pending = null;
    clearWash();
  }

  stars.forEach(function (star) {
    star.addEventListener("pointerenter", function () { light(star); });
    star.addEventListener("focus", function () { light(star); });
    star.addEventListener("pointerleave", unlight);
    star.addEventListener("blur", unlight);
  });

  /* leaving the whole sky always resets it */
  stage.addEventListener("pointerleave", unlight);
})();
