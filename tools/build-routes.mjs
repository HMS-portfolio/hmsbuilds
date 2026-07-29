/* Bake the four sub-routes into real HTML files.
 *
 *     node tools/build-routes.mjs
 *
 * WHY THIS EXISTS
 *
 * The site is one document with five views. Until now vercel.json rewrote
 * /projects, /certs, /about and /contact to /index.html, so all five URLs
 * served byte-identical HTML: the same <title>, the same description, and
 * — worst of it — the same <link rel="canonical" href="https://hmsbuilds.com/">.
 *
 * router.js corrects all of that at runtime, and Google does eventually render
 * JavaScript. But the FIRST indexing pass reads raw HTML, and raw HTML said,
 * four times over, "the real page here is the homepage." A canonical is a
 * near-binding instruction. The likely outcome is four URLs folded into one,
 * and a site with one indexed page is not eligible for sitelinks, which are
 * drawn from a site's other INDEXED pages. No markup elsewhere fixes that
 * while the canonical is lying.
 *
 * So each route gets a real file, generated from index.html rather than copied
 * by hand. index.html stays the single source of markup; js/routes.js stays
 * the single source of route copy.
 *
 * vercel.json carries the other half: those rewrites are gone, replaced by
 * "cleanUrls": true, which serves projects.html at /projects and 308s the
 * .html spelling back to the clean path so it cannot become a second URL for
 * the same content. That rationale lives here because vercel.json is JSON and
 * has nowhere to put it — a "//" key fails Vercel's schema validation and
 * fails the whole deploy.
 *
 * Every substitution asserts it matched EXACTLY ONCE. If someone reformats the
 * head and a pattern stops matching, this exits non-zero and names it — the
 * failure mode is a loud build, never a silent page that quietly went back to
 * claiming it is the homepage.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://hmsbuilds.com";

const ROUTES = createRequire(import.meta.url)(join(ROOT, "js", "routes.js"));
const source = readFileSync(join(ROOT, "index.html"), "utf8");

/** Escape a string for use inside a double-quoted HTML attribute. */
const attr = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Replace exactly one occurrence of `pattern`, or throw.
 *
 * The throw is the point. A pattern that silently matched zero times would
 * leave the homepage's canonical in place on a sub-route, which is the precise
 * bug this file exists to kill.
 */
function replaceOnce(html, pattern, replacement, label) {
  const count = (html.match(new RegExp(pattern.source, pattern.flags + "g")) || []).length;
  if (count !== 1) {
    throw new Error(
      `build-routes: "${label}" matched ${count} times in index.html, expected 1. ` +
        `The markup moved; update the pattern in tools/build-routes.mjs.`
    );
  }
  return html.replace(pattern, replacement);
}

/** The extra JSON-LD a sub-page carries: what it is, and where it sits. */
function pageGraph(route) {
  const url = SITE + route.path;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url + "#webpage",
        url,
        name: route.title,
        description: route.desc,
        isPartOf: { "@id": SITE + "/#website" },
        about: { "@id": SITE + "/#hamza" },
        inLanguage: "en",
      },
      {
        /* Breadcrumbs are how a flat site still reads as a structure, and they
           replace the bare URL in a result with "hmsbuilds.com › Projects". */
        "@type": "BreadcrumbList",
        "@id": url + "#breadcrumb",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: route.breadcrumb, item: url },
        ],
      },
    ],
  };
}

/** index.html, rewritten to be the page at `route.path`. */
function build(name, route) {
  const url = SITE + route.path;
  const title = attr(route.title);
  const desc = attr(route.desc);
  const search = attr(route.searchDesc || route.desc);
  let html = source;

  /* mark the document so the entry route can be read off the element */
  html = replaceOnce(html, /<html lang="en">/, `<html lang="en" data-route="${name}">`, "html tag");

  /* the head: what a crawler reads before it runs anything */
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, "title");
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${search}" />`,
    "meta description"
  );
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`,
    "canonical"
  );

  /* the share card */
  const og = [
    [/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, "og:url"],
    [/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`, "og:title"],
    [/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${desc}" />`, "og:description"],
    [/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`, "twitter:title"],
    [/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${desc}" />`, "twitter:description"],
  ];
  for (const [pattern, replacement, label] of og) {
    html = replaceOnce(html, pattern, replacement, label);
  }

  /* structured data for this page, alongside the site-wide graph */
  const block = JSON.stringify(pageGraph(route), null, 2)
    .split("\n")
    .map((line) => "    " + line)
    .join("\n");
  html = replaceOnce(
    html,
    /<\/head>/,
    `  <script type="application/ld+json">\n${block}\n  </script>\n</head>`,
    "head close"
  );

  /* which view is showing before JavaScript runs */
  html = replaceOnce(html, / class="page page--home is-active"/, ' class="page page--home"', "home is-active");
  html = replaceOnce(
    html,
    new RegExp(`<div class="page (page--[a-z]+)" id="${route.page}"`),
    `<div class="page $1 is-active" id="${route.page}"`,
    `${route.page} activation`
  );

  /* and which tab is lit */
  html = replaceOnce(
    html,
    /<a href="\/" class="active" aria-current="page">Home<\/a>/,
    '<a href="/">Home</a>',
    "home nav tab"
  );
  html = replaceOnce(
    html,
    new RegExp(`<a href="${route.path}">([^<]+)</a>`),
    `<a href="${route.path}" class="active" aria-current="page">$1</a>`,
    `${name} nav tab`
  );

  return html;
}

let built = 0;
for (const [name, route] of Object.entries(ROUTES)) {
  if (name === "home") continue; // home IS index.html
  writeFileSync(join(ROOT, name + ".html"), build(name, route), "utf8");
  console.log(`  ${name}.html  ${route.path}  "${route.title}"`);
  built += 1;
}
console.log(`built ${built} route pages from index.html`);
