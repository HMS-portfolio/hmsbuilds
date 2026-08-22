/* THE ROUTE TABLE — one source of truth, read from two places.

   · the browser, where router.js swaps views and rewrites the head as you move
   · Node, where tools/build-routes.mjs bakes these strings into four real HTML
     files so a crawler gets the right head WITHOUT running any JavaScript

   Both matter. Google renders JS eventually, but the first indexing pass reads
   raw HTML, and until this file existed every route shipped the homepage's
   <title>, description and canonical. Five URLs all claiming "the real page is
   /" is the textbook way to have four of them dropped as duplicates, and a site
   with one indexed page cannot be given sitelinks.

   Declared as a plain `var` so a classic <script> tag makes it a global, with a
   CommonJS tail so `require()` picks up the same object. No build step, no
   module system, no way for the two consumers to drift.

   AFTER EDITING THIS FILE, re-run:  node tools/build-routes.mjs
*/

var SITE_ROUTES = {
  home: {
    page: "page-home",
    path: "/",
    /* The one route whose title carries no name. The other four still read
       "<view> · Hamza AlSalamat", and og:site_name plus the Person and WebSite
       nodes in the JSON-LD graph all carry it, so a search for the name still
       has somewhere to land. */
    title: "Do it... death ain't goin no where - It'll either be a great idea, or a great story",
    /* desc is the share card — the line under the title in a WhatsApp, LinkedIn
       or iMessage preview. It introduces the person, not the work: projects
       change, and a preview that lists them is out of date the moment one does.
       searchDesc is the same sentence with the name in front, because a search
       result has no og:site_name line above it to supply one. */
    desc: "I have to find things out for myself. It runs through all of it: the AI work, the mat, the mountains. What the habit has built so far lives here.",
    searchDesc: "Hamza AlSalamat. I have to find things out for myself. It runs through all of it: the AI work, the mat, the mountains. What the habit has built so far lives here.",
    breadcrumb: null,
  },
  projects: {
    page: "page-work",
    path: "/projects",
    title: "Projects · Hamza AlSalamat",
    desc: "Things I built start to finish: Nama Site Intelligence, now running in Madinah, an electric car with MIT's Global Teaching Labs, Paperly, a self-learning outreach agent, and this site.",
    breadcrumb: "Projects",
  },
  nama: {
    page: "page-nama",
    path: "/nama",
    title: "Nama Solutions · Hamza AlSalamat",
    /* The only route carrying its own share card. Every other view shares the
       site card, which introduces the person; this one is an announcement
       about a company, so it ships Nama's own artwork instead. The filename
       carries a date because platforms cache share cards by URL, and a new
       path is the only bust that does not need their debuggers. */
    desc: "Site Intelligence is running in Madinah. The company I founded and build: data systems and AI architecture, and a land report where every figure names the record it came from.",
    ogImage: "/assets/nama/og-2026-08.png",
    ogImageAlt: "Nama Solutions share card: the mark and wordmark above the line \u201cTen plots in the time one took.\u201d",
    breadcrumb: "Nama",
  },
  certs: {
    page: "page-certs",
    path: "/certs",
    title: "Certifications · Hamza AlSalamat",
    desc: "Certifications and programs, including MIT Global Teaching Labs.",
    breadcrumb: "Certifications",
  },
  about: {
    page: "page-about",
    path: "/about",
    title: "About · Hamza AlSalamat",
    desc: "Where the work comes from: Jordanian and American roots, and a path through Los Angeles, Dallas, Memphis, Bahrain and Riyadh.",
    breadcrumb: "About",
  },
  contact: {
    page: "page-contact",
    path: "/contact",
    title: "Contact · Hamza AlSalamat",
    desc: "Email, LinkedIn and GitHub. No forms and nobody in between.",
    breadcrumb: "Contact",
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = SITE_ROUTES;
