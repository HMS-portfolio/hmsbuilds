/* Router — two views: HOME (the film, the signature-in-eye, then About + the
   closing invitation) and WORK (the case files). The nav tabs and in-page CTAs
   switch views via the URL hash; About and Contact are sections at the foot of
   Home. About and Contact are now pages in their own right.
   Degrades gracefully: with JS off, every .page is visible (see CSS). */

(function () {
  "use strict";

  /* route name -> { page id, optional anchor id to scroll to } */
  var ROUTES = {
    home: { page: "page-home", anchor: null },
    projects: { page: "page-work", anchor: null },
    work: { page: "page-work", anchor: null }, // legacy alias for #work links
    certs: { page: "page-certs", anchor: null },
    about: { page: "page-about", anchor: null },
    contact: { page: "page-contact", anchor: null },
  };

  /* Jump to a section. scrollIntoView targets whatever element actually
     scrolls (html vs body — it varies by browser). On a direct/bookmarked
     load the 420vh film height may not be settled on the first frame, so we
     also re-run once the page has fully loaded to land accurately. */
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

  function routeFromHash() {
    var h = (location.hash || "").replace("#", "").toLowerCase();
    if (h === "top" || h === "") return "home";
    return ROUTES[h] ? h : "home";
  }

  function show(name) {
    var route = ROUTES[name] || ROUTES.home;

    document.querySelectorAll(".page").forEach(function (p) {
      p.classList.toggle("is-active", p.id === route.page);
    });

    /* nav active state — highlight the tab that owns this route */
    document.querySelectorAll(".nav-tabs a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").replace("#", "").toLowerCase();
      var forThis = href === name || (href === "top" && name === "home");
      a.classList.toggle("active", forThis);
      if (forThis) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    /* fresh view: land at the top, or jump to the requested section.
       About/Contact live below a 420vh film, so we jump instantly rather
       than smooth-scrolling the whole intro. */
    window.scrollTo(0, 0);
    if (route.anchor) jumpToAnchor(route.anchor);

    /* let the film + reveals know the view changed */
    window.dispatchEvent(
      new CustomEvent("page:change", { detail: { page: route.page } })
    );
  }

  window.addEventListener("hashchange", function () { show(routeFromHash()); });

  /* The wordmark is "take me back to the start of the film", from anywhere.
     Setting the hash alone is not enough: if you are already on #top the
     browser fires no hashchange, so nothing would happen. Route explicitly,
     then land at scroll 0 so the film restarts from its first frame. */
  var mark = document.querySelector(".nav-logo");
  if (mark) {
    mark.addEventListener("click", function (e) {
      e.preventDefault();
      show("home");
      window.scrollTo(0, 0);
    });
  }

  /* set the initial view before paint */
  document.documentElement.classList.add("has-router");
  show(routeFromHash());
})();
