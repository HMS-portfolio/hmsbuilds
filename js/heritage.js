/* Heritage layer — runtime marks & self-stitching tatreez.
   1. injects seven-point stars and najmeh marks (SVG) where flagged
   2. sets the favicon to a brass seven-point star
   3. renders tatreez hems + qabbeh as cross-stitch that embroiders
      itself in when scrolled into view (echoes the signature drawing itself) */

(function () {
  "use strict";

  var ROSE = "#9e3b26";
  var BRASS = "#80500d";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- geometry: an n-point star path ---- */
  function starPath(cx, cy, R, r, points) {
    var n = points * 2, p = "", i, a, rad, x, y;
    for (i = 0; i < n; i++) {
      a = -Math.PI / 2 + (i * Math.PI) / points;
      rad = i % 2 === 0 ? R : r;
      x = cx + Math.cos(a) * rad;
      y = cy + Math.sin(a) * rad;
      p += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
    }
    return p + "Z";
  }

  function starSVG(points, innerRatio) {
    var d = starPath(12, 12, 11, 11 * innerRatio, points);
    return (
      "<svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<path d='" + d + "' fill='currentColor'/></svg>"
    );
  }

  var SEVEN = starSVG(7, 0.46);   // Jordanian seven-point star
  var NAJMEH = starSVG(8, 0.60);  // eight-point najmeh (chunkier)

  /* ---- inject inline marks ---- */
  document.querySelectorAll('.js-star[data-star="7"]').forEach(function (el) {
    el.innerHTML = SEVEN;
    var s = el.querySelector("svg");
    if (s) { s.setAttribute("width", "13"); s.setAttribute("height", "13"); }
  });
  document.querySelectorAll(".js-najmeh").forEach(function (el) {
    el.innerHTML = NAJMEH;
  });

  /* ---- favicon: bronze seven-point star on parchment ---- */
  try {
    var fav = document.getElementById("favicon") || document.createElement("link");
    fav.rel = "icon";
    fav.type = "image/svg+xml";
    var favSvg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>" +
      "<rect width='24' height='24' fill='#202a1e'/>" +
      "<path d='" + starPath(12, 12, 10, 4.6, 7) + "' fill='#e6bd7c'/></svg>";
    fav.href = "data:image/svg+xml;utf8," + encodeURIComponent(favSvg);
    if (!fav.parentNode) document.head.appendChild(fav);
  } catch (e) { /* favicon is non-critical */ }

  /* ---- tatreez cross-stitch renderer ---- */
  function stitch(ctx, x, y, cell, col) {
    var pad = cell * 0.16;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.4, cell * 0.15);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + cell - pad, y + cell - pad);
    ctx.moveTo(x + cell - pad, y + pad); ctx.lineTo(x + pad, y + cell - pad);
    ctx.stroke();
  }

  /* horizontal hem: a repeating diamond band, 5 rows tall */
  function hemGrid(cols) {
    var rows = 5, g = [], x, y;
    for (y = 0; y < rows; y++) {
      g[y] = [];
      for (x = 0; x < cols; x++) {
        var unit = 6, cx = x % unit, lx = Math.abs(cx - 3), ly = Math.abs(y - 2), d = lx + ly, v = 0;
        if (y === 0 || y === rows - 1) v = 1;   // top & bottom rule
        if (d === 1) v = 2;                      // diamond centers (brass)
        g[y][x] = v;
      }
    }
    return g;
  }

  /* vertical qabbeh — an authentic Levantine chest-panel arrangement:
     outer rails, dotted inner rails, and a central column of eight-point
     stars (najmeh) linked by small diamonds. */
  function qabbehGrid(rows) {
    var cols = 11, cc = 5, g = [], x, y;
    for (y = 0; y < rows; y++) {
      g[y] = [];
      for (x = 0; x < cols; x++) {
        var v = 0;
        if (x === 0 || x === cols - 1) v = 1;                       // outer rails
        if ((x === 1 || x === cols - 2) && y % 2 === 0) v = 2;      // dotted inner rails

        var center = Math.round((y - 4) / 8) * 8 + 4;              // nearest star centre
        var dr = Math.abs(y - center), dc = Math.abs(x - cc);
        if (dr <= 2 && dc <= 2) {
          var isPlus = (dc === 0 || dr === 0) && (dc + dr) <= 2;    // orthogonal arms
          var isDiag = dc === dr && dc <= 2;                        // full-length diagonals
          if (isPlus || isDiag) v = 2;                             // → true eight-point star (najmeh), not a cross
        }
        if (Math.abs(y - (center + 4)) + dc === 1) v = 1;          // linking diamond

        g[y][x] = v;
      }
    }
    return g;
  }

  function render(cv) {
    var kind = cv.getAttribute("data-stitch");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    var w, h;

    /* a <canvas> is a replaced element and won't stretch to a grid row, so size
       the qabbeh explicitly from the About text column beside it */
    if (kind === "qabbeh") {
      var about = cv.closest(".about");
      var inner = about && about.querySelector(".about-inner");
      h = inner ? Math.round(inner.getBoundingClientRect().height) : 0;
      w = cv.offsetWidth || 56;
      if (h) cv.style.height = h + "px";
    } else {
      var r = cv.getBoundingClientRect();
      w = Math.round(r.width) || cv.clientWidth;
      h = Math.round(r.height) || cv.clientHeight;
    }
    if (!w || !h) return;
    cv.width = w * dpr; cv.height = h * dpr;
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var g, cell, ox, oy;
    if (kind === "qabbeh") {
      cell = w / 11;
      var qrows = Math.floor(h / cell);
      g = qabbehGrid(qrows);
      ox = 0; oy = (h - qrows * cell) / 2;
    } else {
      var rows = 5;
      cell = h / rows;
      var cols = Math.floor(w / cell);
      g = hemGrid(cols);
      ox = (w - cols * cell) / 2; oy = 0;
    }

    var cells = [];
    for (var y = 0; y < g.length; y++)
      for (var x = 0; x < g[0].length; x++)
        if (g[y][x]) cells.push([x, y, g[y][x]]);

    if (reduce) {
      cells.forEach(function (c) { stitch(ctx, ox + c[0] * cell, oy + c[1] * cell, cell, c[2] === 2 ? BRASS : ROSE); });
      return;
    }

    var i = 0;
    (function step() {
      for (var b = 0; b < 4 && i < cells.length; b++, i++) {
        var c = cells[i];
        stitch(ctx, ox + c[0] * cell, oy + c[1] * cell, cell, c[2] === 2 ? BRASS : ROSE);
      }
      if (i < cells.length) requestAnimationFrame(step);
    })();
  }

  /* ---- reveal on scroll: (re-)stitch canvases each time they enter view,
     so scrolling away and back re-embroiders them ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) render(entry.target);
    });
  }, { threshold: 0.2 });

  document.querySelectorAll("[data-stitch]").forEach(function (c) {
    if (reduce) render(c); else io.observe(c);
  });

  /* re-stitch the tatreez of whichever page just became visible (after layout) */
  window.addEventListener("page:change", function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.querySelectorAll(".page.is-active [data-stitch]").forEach(render);
      });
    });
  });

  /* re-fit canvases on resize (redraw instantly) */
  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(function () {
      var prev = reduce; reduce = true;   // redraw whole, no animation
      document.querySelectorAll("[data-stitch]").forEach(render);
      reduce = prev;
    }, 160);
  });
})();
