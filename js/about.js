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

  function photosOf(star) {
    return (star.getAttribute("data-photo") || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  /* the photo this star will show on its next visit, without spending the turn */
  function peekSrc(star) {
    var list = photosOf(star);
    return list.length ? list[turn[list[0]] || 0] : null;
  }

  function nextSrc(star) {
    var list = photosOf(star);
    if (!list.length) return null;

    var key = list[0];
    var at = turn[key] || 0;
    turn[key] = (at + 1) % list.length;
    return list[at];
  }

  /* ---- loading ahead of the pointer ----
     The hover used to wait on the network: nothing was fetched until a star
     was first lit, so the wash arrived late. Now a photo is fetched AND
     decoded before it is needed — each star's first photo as the sky nears
     the viewport, and a star's next photo as soon as its current one shows.
     The decoded images are held so the browser does not drop them again. */
  var loading = {};   // url -> callbacks waiting on it
  var held = [];

  function load(src, done) {
    if (known[src] === false) return;
    if (known[src] === true) { if (done) done(); return; }
    if (loading[src]) { if (done) loading[src].push(done); return; }

    loading[src] = done ? [done] : [];
    var img = new Image();
    img.decoding = "async";
    img.onload = function () {
      var finish = function () {
        known[src] = true;
        held.push(img);
        var waiting = loading[src] || [];
        delete loading[src];
        waiting.forEach(function (fn) { fn(); });
      };
      // decode before the fade, so its first frame already has the photo
      if (img.decode) img.decode().then(finish, finish);
      else finish();
    };
    img.onerror = function () {
      known[src] = false;
      delete loading[src];
    };
    img.src = src;
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
    load(src, function () {
      // the pointer may have moved on while this loaded
      if (pending === src) showWash(src);
    });
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

    // the next visit to this star shows its next photo: have it ready
    var upcoming = peekSrc(star);
    if (upcoming && upcoming !== src) load(upcoming);
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

  /* Warm every star's first photo once the sky is about to be seen. Only
     where the wash can actually show: phones hide it (about.css), and a
     touch screen has no hover to light a star, so they download nothing. */
  var washes = wash && window.getComputedStyle(wash).display !== "none";
  var hovers = window.matchMedia("(hover: hover)").matches;
  if (washes && hovers && "IntersectionObserver" in window) {
    var warmer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      warmer.disconnect();
      stars.forEach(function (star) {
        var first = peekSrc(star);
        if (first) load(first);
      });
    }, { rootMargin: "600px 0px" });
    warmer.observe(stage);
  }
})();
