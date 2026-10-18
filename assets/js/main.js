/* Apex Holdings Limited: hero slider, business tabs and KPI count-up (no dependencies) */
(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SLIDE_MS = 7000;

  var siteNav = document.querySelector("[data-site-nav]");
  if (siteNav) {
    var navToggle = siteNav.querySelector(".nav-toggle");
    var navMenu = siteNav.querySelector("#primary-navigation");
    var navScrim = siteNav.querySelector(".nav-scrim");
    var navLinks = Array.prototype.slice.call(navMenu.querySelectorAll("a"));
    document.body.appendChild(navScrim);
    navMenu.setAttribute("aria-hidden", window.innerWidth <= 760 ? "true" : "false");

    function closeNavigation(restoreFocus) {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation");
      navMenu.setAttribute("aria-hidden", "true");
      navScrim.hidden = true;
      document.body.classList.remove("nav-open");
      if (restoreFocus) {
        navToggle.focus();
      }
    }

    function openNavigation() {
      siteNav.classList.add("is-open");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close navigation");
      navMenu.setAttribute("aria-hidden", "false");
      navScrim.hidden = false;
      document.body.classList.add("nav-open");
      window.requestAnimationFrame(function () {
        navLinks[0].focus();
      });
    }

    navToggle.addEventListener("click", function () {
      if (navToggle.getAttribute("aria-expanded") === "true") {
        closeNavigation(true);
      } else {
        openNavigation();
      }
    });
    navScrim.addEventListener("click", function () {
      closeNavigation(true);
    });
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth > 760) {
          return;
        }
        closeNavigation(false);
        var href = link.getAttribute("href");
        var destination = href && href.charAt(0) === "#"
          ? document.getElementById(href.slice(1))
          : null;
        if (destination) {
          if (!destination.hasAttribute("tabindex")) {
            destination.setAttribute("tabindex", "-1");
          }
          window.setTimeout(function () {
            destination.focus({ preventScroll: true });
          }, 0);
        } else {
          navToggle.focus({ preventScroll: true });
        }
      });
    });
    document.addEventListener("keydown", function (event) {
      if (navToggle.getAttribute("aria-expanded") !== "true") {
        return;
      }
      if (event.key === "Escape") {
        closeNavigation(true);
        return;
      }
      if (event.key === "Tab") {
        var firstLink = navLinks[0];
        var lastLink = navLinks[navLinks.length - 1];
        if (event.shiftKey && document.activeElement === firstLink) {
          event.preventDefault();
          lastLink.focus();
        } else if (!event.shiftKey && document.activeElement === lastLink) {
          event.preventDefault();
          firstLink.focus();
        }
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) {
        if (navToggle.getAttribute("aria-expanded") === "true") {
          closeNavigation(false);
        }
        navMenu.setAttribute("aria-hidden", "false");
      } else if (navToggle.getAttribute("aria-expanded") !== "true") {
        navMenu.setAttribute("aria-hidden", "true");
      }
    });
  }

  /* ---------- hero slider ---------- */
  var hero = document.getElementById("top");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".dot"));
  var counter = document.getElementById("cur");
  var toggleBtn = document.getElementById("toggle");
  var toggleIcon = document.getElementById("toggleIcon");
  var PAUSE_ICON = "M4 3h3.5v12H4zM10.5 3H14v12h-3.5z";
  var PLAY_ICON = "M5 3l10 6-10 6z";
  var total = slides.length;
  var index = 0;
  var playing = !reduceMotion;
  var timer = null;

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function show(i) {
    index = i;
    slides.forEach(function (slide, k) {
      slide.classList.toggle("is-active", k === i);
      slide.classList.toggle("is-before", k < i);
      slide.setAttribute("aria-hidden", k === i ? "false" : "true");
      Array.prototype.forEach.call(slide.querySelectorAll("a"), function (a) {
        a.tabIndex = k === i ? 0 : -1;
      });
    });
    dots.forEach(function (dot, k) {
      dot.classList.toggle("is-active", k === i);
      if (k === i) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
    if (counter) {
      counter.textContent = pad(i + 1);
    }
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
  function startTimer() {
    stopTimer();
    var activeSlide = slides[index];
    var duration = Number(activeSlide.getAttribute("data-duration")) || SLIDE_MS;
    timer = setTimeout(function () {
      show((index + 1) % total);
      if (playing) {
        startTimer();
      }
    }, duration);
  }

  function go(i) {
    if (i === index) {
      return;
    }
    show(i);
    if (playing) {
      startTimer();
    }
  }

  function setPlaying(value) {
    playing = value;
    hero.classList.toggle("is-paused", !playing);
    if (toggleBtn) {
      toggleBtn.setAttribute(
        "aria-label",
        playing ? "Pause slideshow" : "Play slideshow",
      );
    }
    if (toggleIcon) {
      toggleIcon.setAttribute("d", playing ? PAUSE_ICON : PLAY_ICON);
    }
    if (playing) {
      var active = dots[index]; // restart the progress ring
      active.classList.remove("is-active");
      void active.offsetWidth;
      active.classList.add("is-active");
      startTimer();
    } else {
      stopTimer();
    }
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-action], [data-go]");
    if (!target) {
      return;
    }
    if (target.hasAttribute("data-go")) {
      go(parseInt(target.getAttribute("data-go"), 10));
      return;
    }
    var action = target.getAttribute("data-action");
    if (action === "next") {
      go((index + 1) % total);
    }
    if (action === "prev") {
      go((index + total - 1) % total);
    }
    if (action === "toggle") {
      setPlaying(!playing);
    }
  });

  if (slides.length) {
    show(0);
    setPlaying(playing);
  }

  /* ---------- business division tabs ---------- */
  var tabs = Array.prototype.slice.call(
    document.querySelectorAll("[data-tab]"),
  );
  var panels = Array.prototype.slice.call(
    document.querySelectorAll("[data-panel]"),
  );
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-tab");
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-pressed", on ? "true" : "false");
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute("data-panel") !== id;
      });
    });
  });

  /* ---------- KPI count-up (runs once when the strip scrolls into view) ---------- */
  var counters = Array.prototype.slice.call(
    document.querySelectorAll(".count"),
  );
  function animateCounters() {
    var start = Date.now();
    var duration = 1800;
    (function frame() {
      var t = Math.min(1, (Date.now() - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      counters.forEach(function (el) {
        el.textContent = Math.round(
          parseInt(el.getAttribute("data-count"), 10) * eased,
        ).toLocaleString("en-US");
      });
      if (t < 1) {
        requestAnimationFrame(frame);
      }
    })();
  }
  if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
    var seen = false;
    var observer = new IntersectionObserver(
      function (entries) {
        if (
          !seen &&
          entries.some(function (e) {
            return e.isIntersecting;
          })
        ) {
          seen = true;
          observer.disconnect();
          animateCounters();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(counters[0].closest("section"));
  }

  /* ---------- parallax backdrop (Our businesses) ---------- */
  var layers = Array.prototype.slice.call(
    document.querySelectorAll("[data-parallax]"),
  );
  var ticking = false;
  function updateParallax() {
    ticking = false;
    var vh = window.innerHeight;
    layers.forEach(function (layer) {
      var box = layer.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > vh) {
        return;
      }
      var offset = box.top + box.height / 2 - vh / 2; // 0 when the section is centred in the viewport
      layer.style.transform =
        "translate3d(0," + (offset * -0.2).toFixed(1) + "px,0)";
    });
  }
  if (layers.length && !reduceMotion) {
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(updateParallax);
        }
      },
      { passive: true },
    );
    window.addEventListener("resize", updateParallax);
    updateParallax();
  }

  /* ---------- sustainability flip cards: tap / Enter to flip on touch screens ---------- */
  var flips = Array.prototype.slice.call(document.querySelectorAll(".flip"));
  var canHover =
    window.matchMedia && window.matchMedia("(hover: hover)").matches;
  flips.forEach(function (card) {
    card.addEventListener("click", function () {
      if (!canHover) {
        card.classList.toggle("is-flipped");
      }
    });
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.classList.toggle("is-flipped");
      }
    });
  });

  /* ---------- Our journey: pinned horizontal timeline ---------- */
  var journey = document.querySelector("[data-journey]");
  if (journey && !reduceMotion) {
    var stage = journey.querySelector(".journey");
    var viewport = journey.querySelector(".tl-wrap");
    var track = journey.querySelector(".tl-track");
    var items = Array.prototype.slice.call(
      journey.querySelectorAll(".tl-item"),
    );
    var tlTicking = false;
    journey.classList.add("is-horizontal");
    journey.classList.add("tl-anim");
    var updateTimeline = function () {
      tlTicking = false;
      var box = journey.getBoundingClientRect();
      var distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      var travel = Math.max(1, journey.offsetHeight - stage.offsetHeight);
      var progress = Math.max(0, Math.min(1, -box.top / travel));
      var active = Math.round(progress * (items.length - 1));
      track.style.transform = "translate3d(" + -distance * progress + "px, 0, 0)";
      track.style.setProperty("--p", (progress * 100).toFixed(2) + "%");
      items.forEach(function (item, index) {
        item.classList.toggle("active", index === active);
      });
    };
    var measureTimeline = function () {
      var mobile = window.matchMedia("(max-width: 760px)").matches;
      var visibleCount = mobile
        ? 1.35
        : Math.min(4, viewport.clientWidth / 260);
      var itemWidth = Math.min(
        mobile ? 260 : 320,
        Math.max(mobile ? 210 : 260, viewport.clientWidth / visibleCount),
      );
      var sidePad = Math.max(
        0,
        (viewport.clientWidth - itemWidth * visibleCount) / 2,
      );
      track.style.setProperty("--tl-item-width", itemWidth + "px");
      track.style.setProperty("--tl-side-pad", sidePad + "px");
      track.style.setProperty("--tl-center", sidePad + itemWidth / 2 + "px");
      var distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      journey.style.height = stage.offsetHeight + distance + "px";
      updateTimeline();
    };
    window.addEventListener(
      "scroll",
      function () {
        if (!tlTicking) {
          tlTicking = true;
          requestAnimationFrame(updateTimeline);
        }
      },
      { passive: true },
    );
    window.addEventListener("resize", measureTimeline);
    measureTimeline();
  } else if (journey) {
    Array.prototype.forEach.call(
      journey.querySelectorAll(".tl-item"),
      function (item) {
        item.classList.add("in");
      },
    );
  }
})();
