/* Certifications — the pile and the viewer, dependency-free.
   Three cooperating parts:
     1. items    — every certificate, read once from the contact sheet markup
     2. viewer   — a <dialog> lightbox that grows out of the print you clicked,
                   with arrows / swipe / keys and a real full-screen mode
     3. the pile — a loose stack of prints you can flick through and shuffle

   Why an image and not the PDF: the old viewer loaded the PDF into an iframe,
   so every open waited on the browser's PDF plugin and landed with a white
   flash. The print's thumbnail is already decoded, so the viewer can show it
   on the first frame and swap in the 2400px version once that has decoded. */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

  /* ============================================================
     1. ITEMS — the contact sheet is the single list of certificates
     ============================================================ */
  const prints = [...document.querySelectorAll("[data-cert]")];
  if (!prints.length) return;

  const items = prints.map((el) => {
    const img = el.querySelector("img");
    return Object.freeze({
      el,
      img,
      full: el.getAttribute("href"),
      thumb: img.getAttribute("src"),
      srcset: img.getAttribute("srcset"),
      width: img.getAttribute("width"),
      height: img.getAttribute("height"),
      alt: img.getAttribute("alt"),
      title: el.dataset.title,
      issuer: el.dataset.issuer,
      date: el.dataset.date,
      pdf: el.dataset.pdf,
      verify: el.dataset.verify || "",
    });
  });
  const n = items.length;
  const wrap = (i) => (i + n) % n;

  /* ---- two-finger trackpad swipes ----
     A Mac trackpad swipe is not a pointer drag: it arrives as a stream of
     horizontal wheel events, then keeps coming as momentum for up to a
     second after the fingers lift. So: act once the swipe has travelled
     far enough, then stay locked until the stream goes quiet, or a single
     swipe would flick through half the pile. Vertical-leaning wheels are
     left alone so the page still scrolls. */
  const WHEEL_SWIPE = 40;     // px of horizontal travel that counts as a swipe
  const WHEEL_IDLE_MS = 180;  // quiet gap that marks the end of one swipe's momentum

  function onTrackpadSwipe(el, onSwipe) {
    let travel = 0;
    let locked = false;
    let idle = null;
    el.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();       // no page side-scroll, no browser back/forward
      window.clearTimeout(idle);
      idle = window.setTimeout(() => { travel = 0; locked = false; }, WHEEL_IDLE_MS);
      if (locked) return;
      travel += e.deltaX;
      if (Math.abs(travel) < WHEEL_SWIPE) return;
      locked = true;
      onSwipe(travel > 0 ? 1 : -1);   // +1: fingers moved left, so go forward
      travel = 0;
    }, { passive: false });
  }

  /* ============================================================
     2. VIEWER — grow out of the print, swap to full-res when ready
     ============================================================ */
  const OPEN_MS = 460;
  const CLOSE_MS = 340;
  const SLIDE_MS = 170;
  const LB_SWIPE = 60;        // px past which a drag on the viewer turns the page

  const lb = document.getElementById("cert-lightbox");
  const canModal = !!lb && typeof lb.showModal === "function";
  const q = (sel) => (canModal ? lb.querySelector(sel) : null);
  const lbImg = q("[data-lb-img]");
  const lbStage = q("[data-lb-stage]");
  const lbTitle = q("[data-lb-title]");
  const lbIssuer = q("[data-lb-issuer]");
  const lbPdf = q("[data-lb-pdf]");
  const lbVerify = q("[data-lb-verify]");
  const lbFull = q("[data-lb-fullscreen]");
  const lbShell = q("[data-lb-shell]");   // full-screen target: a <dialog> itself is refused

  let current = 0;
  let originEl = null;        // the <img> the viewer grew out of, for the way back
  let originIndex = -1;
  let busy = false;

  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const canFullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);

  async function exitFullscreen() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    try { await exit.call(document); } catch (_) { /* already out */ }
  }

  function fill(i) {
    const it = items[i];
    current = i;
    lbTitle.textContent = it.title;
    lbIssuer.textContent = `${it.issuer} · ${it.date}`;
    lbPdf.href = it.pdf;
    lbVerify.hidden = !it.verify;
    if (it.verify) lbVerify.href = it.verify;

    // width/height give the box its aspect ratio before a single byte arrives,
    // so the thumb -> full swap never shifts the layout
    lbImg.width = Number(it.width);
    lbImg.height = Number(it.height);
    lbImg.alt = it.alt;
    lbImg.src = it.thumb;

    const hi = new Image();
    hi.src = it.full;
    hi.decode()
      .then(() => { if (current === i) lbImg.src = it.full; })
      .catch(() => { /* the thumb stays up; the PDF link still works */ });

    // warm the neighbours so the arrows feel instant
    [wrap(i + 1), wrap(i - 1)].forEach((j) => { new Image().src = items[j].full; });
  }

  // FLIP: a transform that puts the viewer's picture exactly over `el`
  function transformOnto(el) {
    const from = lbImg.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    if (!from.width || !to.width) return null;
    const s = to.width / from.width;
    return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${s})`;
  }

  function openViewer(i, fromEl) {
    if (!canModal) {
      window.open(items[i].full, "_blank", "noopener");
      return;
    }
    if (busy || lb.open) return;
    fill(i);
    originEl = fromEl || items[i].img;
    originIndex = i;
    lb.showModal();
    lb.classList.add("is-open");
    const start = prefersReduced ? null : transformOnto(originEl);
    if (start) {
      lbImg.animate(
        [{ transformOrigin: "0 0", transform: start }, { transformOrigin: "0 0", transform: "none" }],
        { duration: OPEN_MS, easing: EASE }
      );
    }
  }

  // shrink back into the print it came from, if that print is on screen
  function closeTarget() {
    const el = current === originIndex ? originEl : items[current].img;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const onScreen = r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    return onScreen ? el : null;
  }

  async function closeViewer() {
    if (!lb.open || busy) return;
    busy = true;
    if (fsElement()) {
      await exitFullscreen();
      // the viewport resize lands a frame or two after the exit resolves;
      // measure the shrink-back against the real page, not the full screen
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    lb.classList.add("is-closing");

    let anim = null;
    if (!prefersReduced) {
      const target = closeTarget();
      const end = target ? transformOnto(target) : null;
      const frames = end
        ? [{ transformOrigin: "0 0", transform: "none" }, { transformOrigin: "0 0", transform: end }]
        : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.94)" }];
      anim = lbImg.animate(frames, { duration: CLOSE_MS, easing: EASE, fill: "forwards" });
      await anim.finished.catch(() => {});
    }
    lb.close();
    lb.classList.remove("is-open", "is-closing");
    if (anim) anim.cancel();
    busy = false;
  }

  async function go(delta) {
    if (busy || !lb.open) return;
    const target = wrap(current + delta);
    if (prefersReduced) { fill(target); return; }
    busy = true;
    const out = lbImg.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-36 * delta}px)` }],
      { duration: SLIDE_MS, easing: "ease-in", fill: "forwards" }
    );
    await out.finished.catch(() => {});
    fill(target);
    out.cancel();
    lbImg.animate(
      [{ opacity: 0, transform: `translateX(${36 * delta}px)` }, { opacity: 1, transform: "none" }],
      { duration: SLIDE_MS + 60, easing: EASE }
    );
    busy = false;
  }

  function toggleFullscreen() {
    if (!canFullscreen) return;
    if (fsElement()) { exitFullscreen(); return; }
    const req = lbShell.requestFullscreen || lbShell.webkitRequestFullscreen;
    const p = req.call(lbShell);
    if (p && p.catch) p.catch(() => { /* refused (e.g. embed policy): stay in the dialog */ });
  }

  if (canModal) {
    lbFull.hidden = !canFullscreen;
    lbFull.addEventListener("click", toggleFullscreen);
    ["fullscreenchange", "webkitfullscreenchange"].forEach((ev) =>
      document.addEventListener(ev, () => {
        const on = fsElement() === lbShell;
        lbFull.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
      })
    );

    lb.querySelector("[data-lb-close]").addEventListener("click", closeViewer);
    lb.querySelector("[data-lb-prev]").addEventListener("click", () => go(-1));
    lb.querySelector("[data-lb-next]").addEventListener("click", () => go(1));
    lbImg.addEventListener("dblclick", toggleFullscreen);

    // a click on the dark around the certificate closes it — unless that
    // "click" is just the tail of a swipe that already turned the page
    let swiped = false;
    lb.addEventListener("click", (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target === lb || e.target === lbShell || e.target === lbStage) closeViewer();
    });

    // however the dialog ends up closed (ours, or the browser's own Esc
    // handling), leave it clean for the next open
    lb.addEventListener("close", () => {
      lb.classList.remove("is-open", "is-closing");
      if (fsElement()) exitFullscreen();
    });

    // Esc: the browser fires 'cancel' — intercept so the shrink-back runs
    lb.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeViewer();
    });

    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleFullscreen(); }
    });

    let swipeX = null;
    lbStage.addEventListener("pointerdown", (e) => { swipeX = e.clientX; swiped = false; });
    lbStage.addEventListener("pointerup", (e) => {
      if (swipeX === null) return;
      const dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > LB_SWIPE) {
        swiped = true;
        go(dx < 0 ? 1 : -1);
      }
    });
    lbStage.addEventListener("pointercancel", () => { swipeX = null; });
    onTrackpadSwipe(lb, (dir) => go(dir));
  }

  // the contact sheet: each print opens the viewer instead of the raw image
  items.forEach((it, i) => {
    it.el.addEventListener("click", (e) => {
      e.preventDefault();
      openViewer(i, it.img);
    });
  });

  /* ============================================================
     3. THE PILE — flick a print to the back, or shuffle the lot
     ============================================================ */
  const pile = document.querySelector("[data-cert-pile]");
  if (!pile) return;

  const MAX_DEPTH = 5;        // prints with a visible edge under the top one
  const FLY_MS = 380;
  const SCATTER_MS = 340;
  const PILE_SWIPE = 80;
  const TAP_SLOP = 6;         // px of drift a press can have and still be a tap

  const stage = pile.querySelector("[data-pile-stage]");
  const capTitle = pile.querySelector("[data-pile-title]");
  const capIssuer = pile.querySelector("[data-pile-issuer]");
  const capDate = pile.querySelector("[data-pile-date]");

  const rand = (min, max) => min + Math.random() * (max - min);
  const randomLie = () => ({ r: rand(-8, 8), x: rand(-22, 22), y: rand(-14, 14) });

  const cards = items.map((it, i) => {
    const card = document.createElement("div");
    card.className = "pile-card";
    card.setAttribute("aria-hidden", "true");
    const mat = document.createElement("span");
    mat.className = "cert-print-mat";
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.width = Number(it.width);
    img.height = Number(it.height);
    img.decoding = "async";
    if (i > MAX_DEPTH) img.loading = "lazy";
    img.sizes = "(max-width: 640px) 84vw, 560px";
    img.srcset = it.srcset;
    img.src = it.thumb;
    mat.appendChild(img);
    card.appendChild(mat);
    stage.appendChild(card);
    return card;
  });

  function lay(card, lie) {
    card.style.setProperty("--r", lie.r.toFixed(2));
    card.style.setProperty("--x", lie.x.toFixed(1));
    card.style.setProperty("--y", lie.y.toFixed(1));
  }

  let order = items.map((_, i) => i);   // order[0] is the print on top
  let animating = false;
  cards.forEach((c) => lay(c, randomLie()));

  function render() {
    order.forEach((idx, pos) => {
      const card = cards[idx];
      card.style.setProperty("--d", Math.min(pos, MAX_DEPTH));
      card.style.zIndex = String(n - pos);
      card.classList.toggle("top", pos === 0);
      card.toggleAttribute("data-gone", pos > MAX_DEPTH);
    });
    const top = items[order[0]];
    capTitle.textContent = top.title;
    capIssuer.textContent = top.issuer;
    capDate.textContent = top.date;
  }

  const topCard = () => cards[order[0]];
  const topImg = () => topCard().querySelector("img");

  function clearInline(card) {
    card.style.transition = "";
    card.style.transform = "";
    card.style.opacity = "";
  }

  // after an instant change, let the browser paint before transitions resume
  const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  // toss the top print off the pile, then slide it in underneath
  function next(dir = 1) {
    if (animating) return;
    animating = true;
    const front = topCard();
    const rotated = () => [...order.slice(1), order[0]];
    if (prefersReduced) {
      order = rotated();
      render();
      animating = false;
      return;
    }
    front.style.transition = `transform ${FLY_MS}ms ${EASE}, opacity ${FLY_MS}ms ease`;
    front.style.transform = `translate(${dir * 120}%, -8%) rotate(${dir * 16}deg)`;
    front.style.opacity = "0";
    window.setTimeout(() => {
      order = rotated();
      front.style.transition = "none";
      clearInline(front);
      render();
      nextFrame(() => { front.style.transition = ""; animating = false; });
    }, FLY_MS);
  }

  // pull the bottom print back up onto the top
  function prev() {
    if (animating) return;
    animating = true;
    order = [order[n - 1], ...order.slice(0, n - 1)];
    const front = topCard();
    render();
    if (prefersReduced) { animating = false; return; }
    front.style.transition = "none";
    front.style.transform = "translate(-120%, -8%) rotate(-16deg)";
    front.style.opacity = "0";
    nextFrame(() => {
      front.style.transition = "";
      clearInline(front);
      window.setTimeout(() => (animating = false), FLY_MS);
    });
  }

  // Fisher–Yates on a copy, so the old order is never edited in place.
  // If the same print would land on top again, rotate it down one: a shuffle
  // that leaves the top card where it was reads as "nothing happened".
  function shuffled(list) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out[0] === list[0] && out.length > 1 ? [...out.slice(1), out[0]] : out;
  }

  // spread the prints across the table, then gather them in a new order
  function shuffle() {
    if (animating) return;
    if (prefersReduced) {
      order = shuffled(order);
      cards.forEach((c) => lay(c, randomLie()));
      render();
      return;
    }
    animating = true;
    const spread = Math.min(stage.clientWidth * 0.55, 320);
    cards.forEach((c, k) => {
      c.style.setProperty("--sx", rand(-spread, spread).toFixed(0));
      c.style.setProperty("--sy", rand(-spread * 0.35, spread * 0.35).toFixed(0));
      c.style.setProperty("--sr", rand(-28, 28).toFixed(1));
      c.style.setProperty("--k", k % 8);
    });
    pile.classList.add("is-shuffling");
    window.setTimeout(() => {
      order = shuffled(order);
      cards.forEach((c) => lay(c, randomLie()));
      render();
      pile.classList.remove("is-shuffling");
      window.setTimeout(() => (animating = false), SCATTER_MS + 200);
    }, SCATTER_MS + 120);
  }

  pile.querySelector("[data-pile-next]").addEventListener("click", () => next(1));
  pile.querySelector("[data-pile-prev]").addEventListener("click", prev);
  pile.querySelector("[data-pile-shuffle]").addEventListener("click", shuffle);
  pile.querySelector("[data-pile-view]").addEventListener("click", () =>
    openViewer(order[0], topImg()));

  // fingers left: the top print is tossed off to the left; fingers right:
  // the last one slides back in from the left, the way prev() animates
  onTrackpadSwipe(stage, (dir) => (dir > 0 ? next(-1) : prev()));

  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openViewer(order[0], topImg()); }
  });

  // ---- drag the top print: a flick sends it to the back, a tap opens it ----
  let dragId = null;          // the one pointer driving the drag, or null
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let dy = 0;

  // stop dragging; returns the print so the caller can decide where it goes
  function release() {
    dragId = null;
    const front = topCard();
    front.classList.remove("dragging");
    return front;
  }

  stage.addEventListener("pointerdown", (e) => {
    // primary button, one finger: a right-click or a second touch is not a drag
    if (dragId !== null || e.button !== 0 || !e.isPrimary) return;
    if (animating || !topCard().contains(e.target)) return;
    dragId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    topCard().classList.add("dragging");
    // capture can fail if the pointer is already gone; the drag works without it
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* uncaptured is fine */ }
  });

  stage.addEventListener("pointermove", (e) => {
    if (e.pointerId !== dragId) return;
    if (e.buttons === 0) { clearInline(release()); return; }  // the release went missing
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    topCard().style.transform = `translate(${dx}px, ${dy * 0.4}px) rotate(${dx * 0.05}deg)`;
  });

  stage.addEventListener("pointerup", (e) => {
    if (e.pointerId !== dragId) return;
    const front = release();
    const isTap = Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP;
    // a flick keeps its dragged transform so it flies on from where it was let go
    if (Math.abs(dx) > PILE_SWIPE && !animating) { next(dx < 0 ? -1 : 1); return; }
    clearInline(front);          // snap back onto the pile
    if (isTap) openViewer(order[0], topImg());
  });

  // the browser took the gesture (a page scroll, a long-press menu): this is
  // never a tap and never a flick, so just put the print back
  stage.addEventListener("pointercancel", (e) => {
    if (e.pointerId !== dragId) return;
    clearInline(release());
  });

  pile.hidden = false;
  render();
})();
