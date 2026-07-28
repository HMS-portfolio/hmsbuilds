/* InkReveal — a dark ink surface the visitor brushes away.
   Pointer movement stamps organic, wobbly blots (destination-out) that bloom
   open and heal shut. The warm .ember layer shows through the holes. */

(function () {
  "use strict";

  const SURFACE_COLOR = "#170e06"; /* warm espresso — the iris glows through */
  const SURFACE_ALPHA = 0.6;       /* semi-sheer: the eye stays visible beneath */
  const STAMP_MIN_DIST = 14;      // px of pointer travel between stamps
  const STAMP_LIFE_MS = 3600;     // how long a blot lives before healing
  const STAMP_BLOOM_PORTION = 0.22; // first fraction of life spent growing
  const RADIUS_MIN = 42;
  const RADIUS_MAX = 78;
  const WOBBLE = 0.34;            // vertex radius jitter (0..1)
  const VERTS = 14;               // polygon vertices per blot
  const MOTE_COUNT = 34;          // drifting embers on the surface
  const MOTE_SPEED_MIN = 6;       // px/s upward
  const MOTE_SPEED_MAX = 16;

  class InkReveal {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.stamps = [];
      this.lastX = null;
      this.lastY = null;
      this.running = false;
      this.raf = null;

      this.resize = this.resize.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.tick = this.tick.bind(this);

      window.addEventListener("resize", this.resize);
      // listen on the hero so text/CTAs don't swallow the brush
      const host = canvas.parentElement || canvas;
      host.addEventListener("pointermove", this.onPointerMove);

      this.motes = this.seedMotes();
      this.lastTick = null;

      this.resize();
      this.start();
    }

    seedMotes() {
      const motes = [];
      for (let i = 0; i < MOTE_COUNT; i++) {
        motes.push({
          x: Math.random(),                        // 0..1 of width
          y: Math.random(),                        // 0..1 of height
          speed: MOTE_SPEED_MIN + Math.random() * (MOTE_SPEED_MAX - MOTE_SPEED_MIN),
          sway: 0.4 + Math.random() * 0.9,         // horizontal sway amplitude px
          phase: Math.random() * Math.PI * 2,
          size: 0.6 + Math.random() * 1.5,
          glow: 0.25 + Math.random() * 0.5,
        });
      }
      return motes;
    }

    drawMotes(now, dt) {
      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      ctx.globalCompositeOperation = "source-over";
      for (const m of this.motes) {
        m.y -= (m.speed * dt) / 1000 / h;
        if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
        const x = m.x * w + Math.sin(now / 1600 + m.phase) * m.sway * 8;
        const y = m.y * h;
        const twinkle = 0.55 + 0.45 * Math.sin(now / 900 + m.phase * 2);
        ctx.globalAlpha = m.glow * twinkle;
        ctx.fillStyle = "#e9ae4c";
        ctx.beginPath();
        ctx.arc(x, y, m.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth, clientHeight } = this.canvas;
      this.canvas.width = Math.round(clientWidth * dpr);
      this.canvas.height = Math.round(clientHeight * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.paintSurface();
    }

    onPointerMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.lastX !== null) {
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        if (dx * dx + dy * dy < STAMP_MIN_DIST * STAMP_MIN_DIST) return;
      }
      this.lastX = x;
      this.lastY = y;
      this.addStamp(x, y);
    }

    addStamp(x, y) {
      const radius = RADIUS_MIN + Math.random() * (RADIUS_MAX - RADIUS_MIN);
      const verts = [];
      for (let i = 0; i < VERTS; i++) {
        verts.push(1 - WOBBLE / 2 + Math.random() * WOBBLE);
      }
      this.stamps.push({
        x, y, radius, verts,
        rotation: Math.random() * Math.PI * 2,
        born: performance.now(),
      });
    }

    /* radius eases out during bloom; alpha fades in the final third */
    stampShape(t) {
      const bloomT = Math.min(t / STAMP_BLOOM_PORTION, 1);
      const grow = 1 - Math.pow(1 - bloomT, 3);
      const fade = t < 0.66 ? 1 : 1 - (t - 0.66) / 0.34;
      return { grow, fade };
    }

    paintSurface() {
      const { clientWidth, clientHeight } = this.canvas;
      this.ctx.clearRect(0, 0, clientWidth, clientHeight);
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.globalAlpha = SURFACE_ALPHA;
      this.ctx.fillStyle = SURFACE_COLOR;
      this.ctx.fillRect(0, 0, clientWidth, clientHeight);
      this.ctx.globalAlpha = 1;
    }

    drawBlot(stamp, grow, fade) {
      const ctx = this.ctx;
      const r = stamp.radius * grow;
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = fade;
      ctx.beginPath();
      for (let i = 0; i <= VERTS; i++) {
        const angle = stamp.rotation + (i / VERTS) * Math.PI * 2;
        const vr = r * stamp.verts[i % VERTS];
        const px = stamp.x + Math.cos(angle) * vr;
        const py = stamp.y + Math.sin(angle) * vr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      // soft edge: two passes, inner solid + outer faint
      ctx.fill();
      ctx.globalAlpha = 0.25 * fade;
      ctx.beginPath();
      ctx.arc(stamp.x, stamp.y, r * 1.25, 0, Math.PI * 2);
      ctx.fill();
    }

    tick(now) {
      if (!this.running) return;
      const dt = this.lastTick === null ? 16 : Math.min(now - this.lastTick, 48);
      this.lastTick = now;

      this.paintSurface();
      this.drawMotes(now, dt);

      const alive = [];
      for (const stamp of this.stamps) {
        const t = (now - stamp.born) / STAMP_LIFE_MS;
        if (t >= 1) continue;
        const { grow, fade } = this.stampShape(t);
        this.drawBlot(stamp, grow, fade);
        alive.push(stamp);
      }
      this.stamps = alive;

      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.globalAlpha = 1;
      this.raf = requestAnimationFrame(this.tick);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.raf = requestAnimationFrame(this.tick);
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  window.InkReveal = InkReveal;
})();
