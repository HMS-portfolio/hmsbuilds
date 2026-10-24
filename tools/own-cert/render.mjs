/* Render the self-issued certificate.
 *
 *     node tools/own-cert/render.mjs
 *
 * Fills certificate.html with the seven-point star and the signature from
 * assets/wordmark.svg, renders it in headless Chrome at the same size as the
 * Skilljar prints (3300 x 2550), and writes into assets/certs/:
 *
 *     hamza-the-standard.pdf          the printable original
 *     hamza-the-standard.webp         2400px, what the viewer shows
 *     hamza-the-standard-thumb.webp   900px, the contact sheet and the pile
 *
 * Needs Google Chrome and cwebp (brew install webp) on the machine.
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const OUT = join(ROOT, "assets", "certs");
const SLUG = "hamza-the-standard";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PAGE_W = 1056;          // Letter landscape at 96dpi
const PAGE_H = 816;
const SCALE = 3.125;          // -> 3300 x 2550, the Skilljar print size
const FULL_W = 2400;
const THUMB_W = 900;

/** A {7/3} heptagram — the najmeh the rest of the site uses — as a path. */
function heptagram(radius) {
  const pts = Array.from({ length: 7 }, (_, i) => {
    const a = (-90 + (i * 360) / 7) * (Math.PI / 180);
    return [radius * Math.cos(a), radius * Math.sin(a)];
  });
  const order = Array.from({ length: 7 }, (_, i) => pts[(i * 3) % 7]);
  return "M" + order.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" L") + " Z";
}

/** The signature artwork, minus its XML prolog and Illustrator guide layer. */
function signature() {
  const svg = readFileSync(join(ROOT, "assets", "wordmark.svg"), "utf8");
  const start = svg.indexOf("<svg");
  if (start < 0) throw new Error("assets/wordmark.svg has no <svg> element");
  return svg
    .slice(start)
    .replace(/<g class="st0">[\s\S]*?<\/g>\s*<\/g>/, "")   // hidden guide boxes
    .replace(/\s(id|x|y)="[^"]*"/g, "");                    // no stray ids/offsets
}

function fill(template) {
  const star = `<svg viewBox="-1 -1 2 2" aria-hidden="true"><path fill="currentColor" d="${heptagram(1)}"/></svg>`;
  const replacements = {
    "{{STAR}}": star,
    "{{SEAL_STAR}}": `<path d="${heptagram(34)}"/>`,
    "{{SIGNATURE}}": signature(),
  };
  return Object.entries(replacements).reduce((html, [key, value]) => {
    if (!html.includes(key)) throw new Error(`certificate.html is missing ${key}`);
    return html.split(key).join(value);
  }, template);
}

function chrome(args, htmlPath) {
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${PAGE_W},${PAGE_H}`,
    "--virtual-time-budget=10000",   // let the web fonts land before the shot
    ...args,
    `file://${htmlPath}`,
  ], { stdio: "pipe" });
}

const work = mkdtempSync(join(tmpdir(), "own-cert-"));
try {
  const html = join(work, "certificate.html");
  const png = join(work, "certificate.png");
  writeFileSync(html, fill(readFileSync(join(HERE, "certificate.html"), "utf8")));

  chrome([`--force-device-scale-factor=${SCALE}`, `--screenshot=${png}`], html);
  chrome([`--print-to-pdf=${join(OUT, SLUG + ".pdf")}`, "--no-pdf-header-footer"], html);

  execFileSync("cwebp", ["-quiet", "-q", "86", "-resize", String(FULL_W), "0", png, "-o", join(OUT, `${SLUG}.webp`)]);
  execFileSync("cwebp", ["-quiet", "-q", "78", "-resize", String(THUMB_W), "0", png, "-o", join(OUT, `${SLUG}-thumb.webp`)]);
  process.stdout.write(`rendered ${SLUG}.{pdf,webp} and ${SLUG}-thumb.webp into assets/certs/\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
