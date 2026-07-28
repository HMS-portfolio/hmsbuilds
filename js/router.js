/* Router — five views, each at its own real URL so search engines can index
   them separately. Everything used to live under one URL behind a #hash, and
   crawlers discard the fragment, so Google saw the whole site as a single page
   and could never list sub-links for it.

   Home is the film, the signature-in-eye, and the closing invitation. Projects,
   Certs, About and Contact are pages in their own right.

   Degrades gracefully: with JS off every .page is visible (see CSS), and each
   nav link is a real href the server answers via the rewrites in vercel.json,
   so nothing depends on this file running. Old #hash links still work and are
   quietly upgraded to their path. */

(function () {
  "use strict";

  var SITE = "https://hmsbuilds.com";
  var NAME = "Hamza AlSalamat";

  /* route name -> the page it shows, the URL it lives at, and the title and
     description a crawler should see for it. Distinct copy per route is the
     whole point: five views competing as one result served nobody. */
  var ROUTES = {
    home: {
      page: "page-home",
      path: "/",
      /* The one route whose title carries no name. The other four still read
         "<view> · Hamza AlSalamat", and og:site_name plus the Person node in
         the JSON-LD graph both carry it, so a search for the name still has
         somewhere to land. */
      title: "Do it in style - it doesn't have to make sense to anyone else",
      desc: "Founder of Nama Site Intelligence, and hands-on with the rest: an engine that reads land, a car welded from steel, an agent that learns to write.",
    },
    projects: {
      page: "page-work",
      path: "/projects",
      title: "Projects · " + NAME,
      desc: "Things I built start to finish: Nama Site Intelligence, an electric car with MIT's Global Teaching Labs, Paperly, a self-learning outreach agent, and this site.",
    },
    certs: {
      page: "page-certs",
      path: "/certs",
      title: "Certifications · " + NAME,
      desc: "Certifications and programs, including MIT Global Teaching Labs.",
    },
    about: {
      page: "page-about",
      path: "/about",
      title: "About · " + NAME,
      desc: "Where the work comes from: Jordanian and American roots, and a path through Los Angeles, Dallas, Memphis, Bahrain and Riyadh.",
    },
    contact: {
      page: "page-contact",
      path: "/contact",
      title: "Contact · " + NAME,
      desc: "Get in touch with " + NAME + ".",
    },
  };

  /* legacy #hash names that should still resolve to a route */
  var ALIASES = { top: "home", work: "projects", "": "home" };

  /* path -> route name, derived from ROUTES so the two can never drift apart */
  var BY_PATH = {};
  Object.keys(ROUTES).forEach(function (name) {
    BY_PATH[ROUTES[name].path] = name;
  });

  /* The browser restores your previous scroll position AFTER load, which used
     to override the router and strand you at the foot of a short page when you
     arrived from a tall one: Home is 420vh, Projects is roughly half that, so a
     restored offset clamped to the maximum and landed on the footer. Owning
     scroll ourselves is what stops that, and History routing makes the browser
     attempt restoration far more often than #hash changes ever did. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* Jump to a section. scrollIntoView targets whatever element actually
     scrolls (html vs body — it varies by browser). On a direct load the 420vh
     film height may not have settled on the first frame, so re-run once the
     page is fully loaded to land accurately. */
  function jumpToAnchor(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var doJump = function () {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    };
    requestAnimationFrame(doJump);
    if (document.readyState !== "complete") {
      window.addEventListener("load", function once() {
        window.removeEventListener("load", once);
        requestAnimationFrame(doJump);
      });
    }
  }

  /* Land at the top, and hold it. One synchronous call is not enough: the page
     swap reflows, media settles, and the browser may still try to restore. */
  function resetScroll() {
    var toTop = function () { window.scrollTo(0, 0); };
    toTop();
    requestAnimationFrame(toTop);
    if (document.readyState !== "complete") {
      window.addEventListener("load", function once() {
        window.removeEventListener("load", once);
        requestAnimationFrame(toTop);
      });
    }
  }

  /* /about/ and /about should mean the same thing */
  function cleanPath(p) {
    p = (p || "/").toLowerCase();
    if (p.length > 1 && p.charAt(p.length - 1) === "/") p = p.slice(0, -1);
    return p || "/";
  }

  function routeFromLocation() {
    var byPath = BY_PATH[cleanPath(location.pathname)];

    /* A real path wins, except at the root: "/" is where an old #hash link
       lands, so there the fragment is the only statement of intent we have.
       Checking the path first unconditionally would resolve /#projects to
       home and silently drop the route. /projects#anything is still Projects. */
    if (byPath && byPath !== "home") return byPath;

    var h = (location.hash || "").replace("#", "").toLowerCase();
    if (h) {
      if (h in ALIASES) return ALIASES[h];
      if (ROUTES[h]) return h;
    }
    return byPath || "home";
  }

  /* Keep the metadata honest for whichever view is showing. Crawlers read the
     rendered title, and a person sees it in the tab and in their history. */
  function setMeta(route) {
    document.title = route.title;
    var set = function (sel, attr, value) {
      var el = document.querySelector(sel);
      if (el) el.setAttribute(attr, value);
    };
    set('meta[name="description"]', "content", route.desc);
    set('meta[property="og:title"]', "content", route.title);
    set('meta[property="og:description"]', "content", route.desc);
    set('meta[property="og:url"]', "content", SITE + route.path);
    set('meta[name="twitter:title"]', "content", route.title);
    set('meta[name="twitter:description"]', "content", route.desc);
    set('link[rel="canonical"]', "href", SITE + route.path);
  }

  function show(name) {
    var route = ROUTES[name] || ROUTES.home;

    document.querySelectorAll(".page").forEach(function (p) {
      p.classList.toggle("is-active", p.id === route.page);
    });

    /* nav active state — highlight the tab that owns this route */
    document.querySelectorAll(".nav-tabs a").forEach(function (a) {
      var forThis = cleanPath(a.getAttribute("href") || "") === route.path;
      a.classList.toggle("active", forThis);
      if (forThis) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    setMeta(route);
    resetScroll();
    if (route.anchor) jumpToAnchor(route.anchor);

    /* let the film + reveals know the view changed */
    window.dispatchEvent(
      new CustomEvent("page:change", { detail: { page: route.page } })
    );
  }

  /* Navigate without a reload, and record it so Back and Forward behave. */
  function go(name, push) {
    var route = ROUTES[name] || ROUTES.home;
    if (push && cleanPath(location.pathname) !== route.path) {
      history.pushState({ route: name }, "", route.path);
    }
    show(name);
  }

  /* One delegated listener covers every internal link on the site, so links
     added to the markup later route themselves with no extra wiring. Modified
     clicks, new-tab clicks and downloads are left to the browser. */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;

    var href = a.getAttribute("href") || "";
    if (!href || href === "#") return;
    /* anything pointing off-site is none of our business */
    if (a.host && a.host !== location.host) return;
    if (/^(mailto:|tel:)/i.test(href)) return;

    var name = null;
    if (href.charAt(0) === "#") {
      var h = href.slice(1).toLowerCase();
      name = h in ALIASES ? ALIASES[h] : ROUTES[h] ? h : null;
    } else if (href.charAt(0) === "/") {
      name = BY_PATH[cleanPath(href)] || null;
    }
    if (!name) return;

    e.preventDefault();
    go(name, true);
  });

  window.addEventListener("popstate", function () {
    show(routeFromLocation());
  });

  /* a stale #hash link should settle on the real path, not linger in the URL */
  window.addEventListener("hashchange", function () {
    var name = routeFromLocation();
    history.replaceState({ route: name }, "", ROUTES[name].path);
    show(name);
  });

  /* The wordmark is "take me back to the start of the film", from anywhere.
     It is handled explicitly because clicking it while already on Home must
     still restart the film rather than do nothing. */
  var mark = document.querySelector(".nav-logo");
  if (mark) {
    mark.addEventListener("click", function (e) {
      e.preventDefault();
      go("home", true);
      window.scrollTo(0, 0);
    });
  }

  /* set the initial view before paint, upgrading a #hash entry point to a path */
  document.documentElement.classList.add("has-router");
  var initial = routeFromLocation();
  if (location.hash) {
    history.replaceState({ route: initial }, "", ROUTES[initial].path);
  }
  show(initial);
})();
