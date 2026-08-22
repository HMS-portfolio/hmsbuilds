/* Work / case files — interactive behavior, dependency-free.
   Three cooperating parts:
     1. dossiers   — open/close native <dialog> case files, pause media on close
     2. decks      — swipeable/draggable card-stack galleries (one per project)
     3. the writer — the outreach agent drafting, learning, and rewriting better */

(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     1. DOSSIERS — the case-file dialogs
     ============================================================ */
  const openers = document.querySelectorAll("[data-open]");
  let writerStop = null; // teardown for the agent writer while its dialog is open
  let pipelineStop = null; // teardown for Nama's deal run, same lifecycle

  openers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dlg = document.getElementById(btn.getAttribute("data-open"));
      if (dlg && typeof dlg.showModal === "function") openDialog(dlg);
    });
  });

  function openDialog(dlg) {
    dlg.showModal();
    // start the agent writer only while its case file is open
    if (dlg.id === "dossier-agent") writerStop = startWriter(dlg);
    // same for Nama's deal run
    if (dlg.id === "dossier-nama") pipelineStop = startPipeline(dlg);
    // let the top video in this dialog's deck play (muted autoplay)
    const deck = dlg.querySelector("[data-deck]");
    if (deck && deck.__deckPlay) deck.__deckPlay();
  }

  function closeDialog(dlg) {
    // pause every video inside so audio never leaks past a closed file
    dlg.querySelectorAll("video").forEach((v) => v.pause());
    if (dlg.id === "dossier-agent" && writerStop) {
      writerStop();
      writerStop = null;
    }
    if (dlg.id === "dossier-nama" && pipelineStop) {
      pipelineStop();
      pipelineStop = null;
    }
    dlg.close();
  }

  document.querySelectorAll(".dossier").forEach((dlg) => {
    // close button
    const closeBtn = dlg.querySelector("[data-close]");
    if (closeBtn) closeBtn.addEventListener("click", () => closeDialog(dlg));

    // click on the backdrop (outside the shell) closes
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) closeDialog(dlg);
    });

    // Esc: browser fires 'cancel' — intercept so our teardown runs
    dlg.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDialog(dlg);
    });
  });

  // a certs link inside a dossier: close the case file so it doesn't sit on top
  // of the certifications page. The link's href="#certs" still routes the page.
  document.querySelectorAll("[data-certs-link]").forEach((link) => {
    link.addEventListener("click", () => {
      const dlg = link.closest(".dossier");
      if (dlg && dlg.open) closeDialog(dlg);
      // spotlight the program's cert (CSS :target can't fire on the #certs route)
      const target = document.getElementById("cert-gtl");
      if (target) {
        document.querySelectorAll(".cert-card.is-linked")
          .forEach((c) => c.classList.remove("is-linked"));
        window.setTimeout(() => target.classList.add("is-linked"), 60);
      }
    });
  });

  /* ---- in-site certificate viewer: present the PDF inside the site ---- */
  const certViewer = document.getElementById("cert-viewer");
  if (certViewer && typeof certViewer.showModal === "function") {
    const frame = certViewer.querySelector("[data-cert-viewer-frame]");
    const titleEl = certViewer.querySelector("[data-cert-viewer-title]");
    const dl = certViewer.querySelector("[data-cert-viewer-download]");

    function openCert(src, title) {
      if (!src) return;
      if (titleEl) titleEl.textContent = title || "Certificate";
      if (dl) dl.href = src;
      if (frame) frame.src = src; // browser's built-in PDF view, inline
      certViewer.showModal();
    }

    function closeCert() {
      certViewer.close();
      if (frame) frame.src = "about:blank"; // stop rendering the PDF
    }

    document.querySelectorAll("[data-cert-open]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault(); // don't follow the fallback href into a new tab
        openCert(el.getAttribute("href"), el.getAttribute("data-cert-title"));
      });
    });

    certViewer.querySelectorAll("[data-close]").forEach((b) =>
      b.addEventListener("click", closeCert));
    certViewer.addEventListener("click", (e) => {
      if (e.target === certViewer) closeCert();
    });
    certViewer.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeCert();
    });
  }

  /* ============================================================
     2. DECKS — swipeable card-stack galleries
     ============================================================ */
  const SWIPE_THRESHOLD = 90;   // px past which a drag commits to a flick
  const MAX_DEPTH = 4;          // cards rendered with visible offset behind the top
  const FLY_MS = 360;

  document.querySelectorAll("[data-deck]").forEach(initDeck);

  function initDeck(deck) {
    const cards = [...deck.querySelectorAll(".deck-card")];
    const n = cards.length;
    if (!n) return;

    const countEl = deck.querySelector("[data-deck-count]");
    const prevBtn = deck.querySelector("[data-deck-prev]");
    const nextBtn = deck.querySelector("[data-deck-next]");
    const video = deck.querySelector("[data-deck-video]");
    const soundBtn = deck.querySelector("[data-deck-sound]");

    cards.forEach((c, i) => (c.dataset.n = String(i + 1)));
    let order = cards.map((_, i) => i); // order[0] is the front card
    let animating = false;

    function render() {
      order.forEach((cardIdx, pos) => {
        const card = cards[cardIdx];
        const depth = Math.min(pos, MAX_DEPTH);
        card.style.setProperty("--i", depth);
        card.classList.toggle("top", pos === 0);
        card.toggleAttribute("data-gone", pos > MAX_DEPTH);
      });
      if (countEl) countEl.textContent = `${cards[order[0]].dataset.n} / ${n}`;
      syncVideo();
    }

    // play the deck's video only when its card is the visible front one
    function syncVideo() {
      if (!video) return;
      const videoCard = video.closest(".deck-card");
      const isFront = cards[order[0]] === videoCard;
      if (isFront) {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        video.pause();
      }
    }
    deck.__deckPlay = syncVideo; // called by openDialog

    function clearInline(card) {
      card.style.transition = "";
      card.style.transform = "";
      card.style.opacity = "";
    }

    function next() {
      if (animating) return;
      animating = true;
      const front = cards[order[0]];
      if (prefersReduced) {
        order.push(order.shift());
        render();
        animating = false;
        return;
      }
      front.style.transition = `transform ${FLY_MS}ms var(--ease-pen), opacity ${FLY_MS}ms ease`;
      front.style.transform = "translateX(-135%) rotate(-14deg)";
      front.style.opacity = "0";
      window.setTimeout(() => {
        order.push(order.shift());
        front.style.transition = "none";
        clearInline(front);
        render();
        // re-enable transitions next frame so the settle animates
        requestAnimationFrame(() => requestAnimationFrame(() => {
          front.style.transition = "";
          animating = false;
        }));
      }, FLY_MS);
    }

    function prev() {
      if (animating) return;
      animating = true;
      order.unshift(order.pop());
      const front = cards[order[0]];
      render();
      if (prefersReduced) { animating = false; return; }
      front.style.transition = "none";
      front.style.transform = "translateX(-135%) rotate(-14deg)";
      front.style.opacity = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        front.style.transition = "";
        clearInline(front);
        window.setTimeout(() => (animating = false), FLY_MS);
      }));
    }

    if (nextBtn) nextBtn.addEventListener("click", next);
    if (prevBtn) prevBtn.addEventListener("click", prev);

    // arrow keys while this deck's dialog is focused
    const dlg = deck.closest(".dossier");
    if (dlg) {
      dlg.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      });
    }

    // ---- drag / swipe on the top card ----
    let dragging = false;
    let startX = 0;
    let dx = 0;

    deck.addEventListener("pointerdown", (e) => {
      const front = cards[order[0]];
      if (!front.contains(e.target)) return;
      if (e.target.closest(".deck-sound")) return; // let the sound button work
      dragging = true;
      startX = e.clientX;
      dx = 0;
      front.classList.add("dragging");
      front.setPointerCapture?.(e.pointerId);
    });

    deck.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      const front = cards[order[0]];
      front.style.transform = `translateX(${dx}px) rotate(${dx * 0.04}deg)`;
      front.style.opacity = String(Math.max(0.3, 1 - Math.abs(dx) / 520));
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      const front = cards[order[0]];
      front.classList.remove("dragging");
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        clearInline(front); // let next()/prev() drive from a clean slate
        dx < 0 ? next() : prev();
      } else {
        front.style.transition = "";
        clearInline(front); // snap back to rest
      }
      dx = 0;
    }

    deck.addEventListener("pointerup", endDrag);
    deck.addEventListener("pointercancel", endDrag);
    deck.addEventListener("pointerleave", endDrag);

    // ---- sound toggle (MISTI car video only) ----
    if (soundBtn && video) {
      soundBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        soundBtn.classList.toggle("on", !video.muted);
        soundBtn.textContent = video.muted ? "♪ sound off" : "♪ sound on";
        if (!video.muted) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
      });
    }

    render();
  }

  /* ============================================================
     3. THE WRITER — the agent drafts, learns, rewrites better
     ============================================================ */
  // Illustrative of the real learning loop: each pass is sharper than the last,
  // and the reply rate climbs as the agent learns from actual outcomes.
  const DRAFTS = [
    {
      tag: "draft v1 · cold",
      text: "Hi, I built an AI tool for real estate feasibility and would love to show you a demo sometime. Are you free this week?",
      metric: "reply rate · 2%",
    },
    {
      tag: "draft v2 · learned from replies",
      text: "The White Land Tax invoices just landed. Nama triages a land bank (develop, sell, or JV) in minutes, not weeks.",
      metric: "reply rate · 9%",
    },
    {
      tag: "draft v3 · learned from replies",
      text: "I ran one of your Madinah parcels live: buildable program, full pro forma, and the one data gap a consultant would’ve papered over. Worth 10 minutes?",
      metric: "reply rate · 21%",
    },
  ];

  /* ---------------------------------------------------------------
     05 · the signature, signing itself on the card face

     The artwork is NOT duplicated. It is cloned from the hero's #sig
     so there stays exactly one copy of the path data on the page: if
     the signature is ever redrawn, both places change together.

     Cloning SVG means cloning ids, and duplicate ids would make the
     hero's masks ambiguous. So every mask id on the clone is suffixed
     and its mask="url(#…)" reference rewritten to match.

     Timing mirrors hero.js: the same three windows, so the pen moves
     the same way here as it does inside the falcon's eye.
     --------------------------------------------------------------- */

  const SIG_DRAW_MS = 2600;
  const SIG_DOTS_MS = 240;    // beat after the last stroke, before the qalam dots
  const SIG_SUFFIX = "-card";
  const SIG_BOUNDS = [
    { start: 0.00, end: 0.50 },   // the name
    { start: 0.44, end: 0.74 },   // the trailing detail and long underline
    { start: 0.68, end: 1.00 }    // the flourish
  ];

  function buildCardSignature() {
    const mount = document.querySelector("[data-sig-card]");
    const source = document.getElementById("sig");
    // no signature on the page: leave the card face empty rather than break
    if (!mount || !source) return null;

    const svg = source.cloneNode(true);
    svg.removeAttribute("id");
    svg.setAttribute("class", "sig-card-svg");
    svg.removeAttribute("role");
    svg.removeAttribute("aria-label");

    // give the clone its own mask namespace
    svg.querySelectorAll("mask[id]").forEach((m) => {
      const was = m.getAttribute("id");
      const now = was + SIG_SUFFIX;
      m.setAttribute("id", now);
      svg.querySelectorAll('[mask="url(#' + was + ')"]').forEach((g) => {
        g.setAttribute("mask", "url(#" + now + ")");
      });
    });

    mount.appendChild(svg);

    const strokes = [].slice.call(svg.querySelectorAll(".mask-stroke"));
    if (!strokes.length) return null;

    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

    const setProgress = (t) => {
      const g = ease(t);
      strokes.forEach((p, i) => {
        const b = SIG_BOUNDS[i];
        if (!b) return;
        const segT = Math.min(Math.max((g - b.start) / (b.end - b.start), 0), 1);
        p.style.strokeDashoffset = String(1 - segT);
      });
    };

    // reduced motion: the signature is simply already signed
    if (prefersReduced) {
      setProgress(1);
      svg.classList.add("dots-on");
      return null;
    }

    let raf = null;
    let dotsTimer = null;
    let drawing = false;

    function draw() {
      if (drawing) return;          // never yank a half-signed name back to zero
      drawing = true;
      svg.classList.remove("dots-on");
      window.clearTimeout(dotsTimer);
      setProgress(0);

      let start = null;
      const frame = (now) => {
        if (start === null) start = now;
        const t = Math.min((now - start) / SIG_DRAW_MS, 1);
        setProgress(t);
        if (t < 1) {
          raf = window.requestAnimationFrame(frame);
          return;
        }
        drawing = false;
        dotsTimer = window.setTimeout(() => svg.classList.add("dots-on"), SIG_DOTS_MS);
      };
      raf = window.requestAnimationFrame(frame);
    }

    // sign it when the card first comes into view, and re-sign on hover
    const card = mount.closest(".work-card");
    if (card) card.addEventListener("pointerenter", draw);

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          draw();
          io.disconnect();
        });
      }, { threshold: 0.4 });
      io.observe(mount);
    } else {
      draw();
    }

    return function stop() {
      if (raf) window.cancelAnimationFrame(raf);
      window.clearTimeout(dotsTimer);
    };
  }

  buildCardSignature();

  /* ---------------------------------------------------------------
     Nama · the deal run
     Each agent lands in turn, then the sheet is written. The pause
     before the verdict is deliberate: the engine is allowed to look
     like it is doing work, because it is.
     --------------------------------------------------------------- */

  const STEP_MS = 620;      // between one agent finishing and the next
  const LEAD_MS = 420;      // beat before the first agent lands
  const VERDICT_MS = 560;   // after the last agent, before the verdict
  const REST_MS = 2600;     // verdict held, then the run repeats
  const VERDICT_TEXT = "deal sheet ready · every figure traced to its source";

  function startPipeline(dlg) {
    const steps = [].slice.call(dlg.querySelectorAll("[data-pipe-step]"));
    const verdict = dlg.querySelector("[data-pipe-verdict]");
    if (!steps.length) return null;

    const settle = () => {
      steps.forEach((s) => s.classList.add("is-done"));
      if (verdict) {
        verdict.textContent = VERDICT_TEXT;
        verdict.classList.add("is-shown");
      }
    };

    // reduced motion: show the finished run, don't animate it
    if (prefersReduced) {
      settle();
      return null;
    }

    let timers = [];
    let cancelled = false;
    const wait = (ms) => new Promise((r) => timers.push(window.setTimeout(r, ms)));

    const reset = () => {
      steps.forEach((s) => s.classList.remove("is-done"));
      if (verdict) {
        verdict.classList.remove("is-shown");
        verdict.innerHTML = "&nbsp;";
      }
    };

    async function run() {
      while (!cancelled) {
        reset();
        await wait(LEAD_MS);

        for (const step of steps) {
          if (cancelled) return;
          step.classList.add("is-done");
          await wait(STEP_MS);
        }
        if (cancelled) return;

        await wait(VERDICT_MS);
        if (cancelled) return;
        if (verdict) {
          verdict.textContent = VERDICT_TEXT;
          verdict.classList.add("is-shown");
        }

        await wait(REST_MS);
      }
    }

    run();

    return function stop() {
      cancelled = true;
      timers.forEach(window.clearTimeout);
      timers = [];
      reset();
    };
  }

  const TYPE_MS = 32;
  const DELETE_MS = 14;
  const HOLD_MS = 2200;
  const GAP_MS = 500;

  function startWriter(dlg) {
    const out = dlg.querySelector("[data-writer-out]");
    const statusEl = dlg.querySelector("[data-writer-status]");
    const metricEl = dlg.querySelector("[data-writer-metric]");
    if (!out) return null;

    // reduced motion: show the best draft, state the outcome, don't animate
    if (prefersReduced) {
      const best = DRAFTS[DRAFTS.length - 1];
      out.textContent = best.text;
      if (statusEl) statusEl.textContent = best.tag;
      if (metricEl) { metricEl.textContent = best.metric; metricEl.classList.add("up"); }
      return null;
    }

    let timers = [];
    let cancelled = false;
    const wait = (ms) => new Promise((r) => timers.push(window.setTimeout(r, ms)));

    async function type(str) {
      out.textContent = "";
      for (let i = 0; i < str.length && !cancelled; i++) {
        out.textContent += str[i];
        await wait(TYPE_MS);
      }
    }

    async function del() {
      let s = out.textContent;
      while (s.length && !cancelled) {
        s = s.slice(0, -1);
        out.textContent = s;
        await wait(DELETE_MS);
      }
    }

    async function loop() {
      let idx = 0;
      while (!cancelled) {
        const draft = DRAFTS[idx];
        if (statusEl) statusEl.textContent = draft.tag;
        if (metricEl) metricEl.classList.toggle("up", idx === DRAFTS.length - 1);
        await type(draft.text);
        if (cancelled) break;
        if (metricEl) metricEl.textContent = draft.metric;
        await wait(HOLD_MS);
        if (cancelled) break;
        // learn: delete and rewrite better — after the best draft, reset to cold
        await del();
        await wait(GAP_MS);
        idx = (idx + 1) % DRAFTS.length;
      }
    }

    loop();

    return function stop() {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
    };
  }

  /* ---- ambient card-04 preview: a word that keeps rewriting itself ---- */
  (function agentCardPreview() {
    const el = document.querySelector("[data-agent-line]");
    if (!el || prefersReduced) return;
    const words = ["writing.", "learning.", "rewriting.", "improving."];
    let wi = 0;

    function type(s) {
      return new Promise((res) => {
        let i = 0;
        const id = setInterval(() => {
          el.textContent = s.slice(0, ++i);
          if (i >= s.length) { clearInterval(id); res(); }
        }, 90);
      });
    }
    function del() {
      return new Promise((res) => {
        const id = setInterval(() => {
          el.textContent = el.textContent.slice(0, -1);
          if (!el.textContent.length) { clearInterval(id); res(); }
        }, 55);
      });
    }
    async function run() {
      /* eslint-disable no-await-in-loop */
      while (true) {
        await type(words[wi]);
        await new Promise((r) => setTimeout(r, 1600));
        await del();
        await new Promise((r) => setTimeout(r, 260));
        wi = (wi + 1) % words.length;
      }
    }
    run();
  })();
})();
