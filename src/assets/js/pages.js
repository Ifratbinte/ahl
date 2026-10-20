/* Apex Holdings Limited: page enhancements (home About + Divisions, Our Businesses, Sustainability, CSR, Careers, Contact)
 * Scroll reveal, counters, parallax, progress bar, sticky sub-nav scroll-spy,
 * group map, donut chart, card tilt, tabs and the circular loop. No dependencies.
 * Everything degrades gracefully: without JS all content is visible.
 */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  doc.classList.add("pg-js");

  // ---------- scroll reveal ----------
  var revealItems = $$("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    revealItems.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  // ---------- counters ----------
  function formatNumber(n) {
    return Math.round(n).toLocaleString("en-US");
  }
  function runCounter(el) {
    var target = Number(el.getAttribute("data-count-to"));
    if (!target || reduceMotion) {
      return;
    }
    // data-count-plain: years etc. (no thousands separator, counts the last few decades)
    var plain = el.hasAttribute("data-count-plain");
    var from = plain ? target - 45 : 0;
    var start = null;
    var duration = 1400;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      var value = from + (target - from) * eased;
      el.textContent = plain ? String(Math.round(value)) : formatNumber(value);
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }
  var counters = $$("[data-count-to]");
  if (counters.length && "IntersectionObserver" in window) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach(function (el) {
      counterObserver.observe(el);
    });
  }

  // ---------- progress bar + parallax (one rAF loop) ----------
  var progress = document.querySelector("[data-progress]");
  var parallaxLayers = reduceMotion ? [] : $$("[data-speed]");
  var ticking = false;
  function onScroll() {
    var scrollTop = window.pageYOffset || doc.scrollTop;
    var max = doc.scrollHeight - window.innerHeight;
    if (progress) {
      progress.style.transform = "scaleX(" + (max > 0 ? scrollTop / max : 0) + ")";
    }
    var vh = window.innerHeight;
    parallaxLayers.forEach(function (layer) {
      var box = layer.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > vh) return;
      var speed = Number(layer.getAttribute("data-speed")) || 0.1;
      var offset = (box.top + box.height / 2 - vh / 2) * -speed;
      layer.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0) scale(1.12)";
    });
    ticking = false;
  }
  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", onScroll);
  onScroll();

  // ---------- sticky sub-nav: scroll-spy ----------
  var spyLinks = $$("[data-spy]");
  if (spyLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    spyLinks.forEach(function (link) {
      byId[link.getAttribute("data-spy")] = link;
    });
    var spyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var link = byId[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            spyLinks.forEach(function (l) {
              l.classList.toggle("is-active", l === link);
              if (l === link) l.setAttribute("aria-current", "true");
              else l.removeAttribute("aria-current");
            });
            if (link.scrollIntoView && link.parentElement.scrollWidth > link.parentElement.clientWidth) {
              link.parentElement.scrollTo({
                left: link.offsetLeft - 16,
                behavior: reduceMotion ? "auto" : "smooth",
              });
            }
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spyObserver.observe(section);
    });
  }
  var subnav = document.querySelector("[data-subnav]");
  if (subnav && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    subnav.parentNode.insertBefore(sentinel, subnav);
    new IntersectionObserver(function (entries) {
      subnav.classList.toggle("is-stuck", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  // ---------- group map (orbit) ----------
  var map = document.querySelector("[data-map]");
  if (map) {
    var mapButtons = $$("[data-map-btn]", map);
    var mapPanels = $$("[data-map-panel]");
    var activate = function (key) {
      map.setAttribute("data-active", key);
      mapButtons.forEach(function (btn) {
        var on = btn.getAttribute("data-map-btn") === key;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      mapPanels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-map-panel") !== key;
      });
    };
    mapButtons.forEach(function (btn) {
      var key = btn.getAttribute("data-map-btn");
      btn.addEventListener("click", function () {
        activate(key);
      });
      if (finePointer) {
        btn.addEventListener("mouseenter", function () {
          activate(key);
        });
      }
    });
    if (mapButtons.length) activate(mapButtons[0].getAttribute("data-map-btn"));
  }

  // ---------- donut chart ----------
  var donut = document.querySelector("[data-donut]");
  if (donut) {
    var keys = $$("[data-donut-key]");
    var segs = $$("[data-donut-seg]", donut);
    var highlight = function (key) {
      donut.classList.toggle("has-focus", !!key);
      segs.forEach(function (s) {
        s.classList.toggle("is-on", s.getAttribute("data-donut-seg") === key);
      });
      keys.forEach(function (k) {
        k.classList.toggle("is-on", k.getAttribute("data-donut-key") === key);
      });
    };
    keys.concat(segs).forEach(function (el) {
      var key = el.getAttribute("data-donut-key") || el.getAttribute("data-donut-seg");
      el.addEventListener("mouseenter", function () {
        highlight(key);
      });
      el.addEventListener("mouseleave", function () {
        highlight(null);
      });
      el.addEventListener("focus", function () {
        highlight(key);
      });
      el.addEventListener("blur", function () {
        highlight(null);
      });
    });
  }

  // ---------- 3D tilt on cards (mouse only) ----------
  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--rx", (-y * 5).toFixed(2) + "deg");
        card.style.setProperty("--ry", (x * 6).toFixed(2) + "deg");
        card.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(1) + "%");
        card.style.setProperty("--my", ((y + 0.5) * 100).toFixed(1) + "%");
      });
      card.addEventListener("pointerleave", function () {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  // ---------- tabs (sustainability efficiency) ----------
  $$("[data-ptabs]").forEach(function (group) {
    var tabs = $$("[data-ptab]", group);
    var panels = $$("[data-ppanel]", group);
    function select(i, focus) {
      tabs.forEach(function (tab, k) {
        var on = k === i;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(i, false);
      });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % tabs.length;
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  });

  // ---------- circular loop (auto-advances, pauses on interaction) ----------
  var loop = document.querySelector("[data-loop]");
  if (loop) {
    var steps = $$("[data-loop-step]", loop);
    var details = $$("[data-loop-detail]", loop);
    var current = 0;
    var timer = null;
    var paused = false;
    var show = function (i) {
      current = i;
      loop.style.setProperty("--active", i);
      steps.forEach(function (s, k) {
        s.classList.toggle("is-active", k === i);
        s.setAttribute("aria-pressed", k === i ? "true" : "false");
      });
      details.forEach(function (d, k) {
        d.hidden = k !== i;
      });
    };
    var schedule = function () {
      window.clearTimeout(timer);
      if (reduceMotion || paused) return;
      timer = window.setTimeout(function () {
        show((current + 1) % steps.length);
        schedule();
      }, 2800);
    };
    steps.forEach(function (s, i) {
      s.addEventListener("click", function () {
        paused = true;
        show(i);
        window.clearTimeout(timer);
      });
    });
    loop.addEventListener("mouseenter", function () {
      window.clearTimeout(timer);
    });
    loop.addEventListener("mouseleave", function () {
      if (!paused) schedule();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) schedule();
        else window.clearTimeout(timer);
      }).observe(loop);
    }
    show(0);
  }
  // ---------- home: division explorer (expanding panels / accordion) ----------
  $$("[data-explorer]").forEach(function (explorer) {
    var panels = $$("[data-explorer-panel]", explorer);
    var open = function (panel) {
      panels.forEach(function (p) {
        var on = p === panel;
        p.classList.toggle("is-open", on);
        p.querySelector("[data-explorer-toggle]").setAttribute("aria-expanded", on ? "true" : "false");
      });
    };
    panels.forEach(function (panel) {
      var toggle = panel.querySelector("[data-explorer-toggle]");
      toggle.addEventListener("click", function () {
        open(panel);
      });
      if (finePointer) {
        panel.addEventListener("mouseenter", function () {
          if (window.innerWidth > 900) open(panel);
        });
      }
    });
  });

  // ---------- Our Businesses: company carousel per division ----------
  $$("[data-carousel]").forEach(function (carousel) {
    var tabs = $$("[data-carousel-tab]", carousel);
    var dots = $$("[data-carousel-dot]", carousel);
    var panels = $$("[data-carousel-panel]", carousel);
    var track = carousel.querySelector("[data-carousel-track]");
    var images = track ? Array.prototype.slice.call(track.children) : [];
    var count = panels.length;
    var current = 0;

    function go(i, focusTab) {
      i = (i + count) % count;
      carousel.classList.toggle("is-back", i < current);
      current = i;
      if (track) track.style.setProperty("--i", i);
      images.forEach(function (img, k) {
        img.classList.toggle("is-active", k === i);
      });
      panels.forEach(function (panel, k) {
        panel.classList.toggle("is-active", k === i);
      });
      tabs.forEach(function (tab, k) {
        var on = k === i;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });
      dots.forEach(function (dot, k) {
        dot.classList.toggle("is-active", k === i);
        if (k === i) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
      // keep the active badge visible when the badge row scrolls (small screens)
      var row = tabs[i] && tabs[i].parentElement;
      if (row && row.scrollWidth > row.clientWidth) {
        row.scrollTo({ left: tabs[i].offsetLeft - 16, behavior: reduceMotion ? "auto" : "smooth" });
      }
      if (focusTab && tabs[i]) tabs[i].focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        go(i);
      });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = current + 1;
        if (e.key === "ArrowLeft") next = current - 1;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = count - 1;
        if (next !== null) {
          e.preventDefault();
          go(next, true);
        }
      });
    });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        go(i);
      });
    });

    // swipe on the photo (touch and pen)
    var media = carousel.querySelector(".bz-car-media");
    var startX = null;
    if (media) {
      media.addEventListener("pointerdown", function (e) {
        startX = e.clientX;
      });
      media.addEventListener("pointerup", function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
      });
      media.addEventListener("pointercancel", function () {
        startX = null;
      });
    }

    // links to a company (#company-afl) open its slide
    function openFromHash(hash, smooth) {
      var i = panels.findIndex(function (p) {
        return "#" + p.id === hash;
      });
      if (i < 0) return false;
      go(i);
      carousel.scrollIntoView({ behavior: smooth && !reduceMotion ? "smooth" : "auto", block: "center" });
      return true;
    }
    document.addEventListener("click", function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#company-"]');
      if (link && openFromHash(link.getAttribute("href"), true)) {
        e.preventDefault();
        if (history.replaceState) history.replaceState(null, "", link.getAttribute("href"));
      }
    });
    if (location.hash) {
      window.setTimeout(function () {
        openFromHash(location.hash, false);
      }, 60);
    }
    go(0);

    // autoplay: advances every few seconds while the carousel is on screen;
    // pauses while hovered or focused, and is off for reduced motion
    var DELAY = 5000;
    var timer = null;
    var hovered = false;
    var focused = false;
    var onScreen = false;
    function stop() {
      window.clearInterval(timer);
      timer = null;
    }
    function start() {
      stop();
      if (reduceMotion || count < 2 || hovered || focused || !onScreen || document.hidden) return;
      timer = window.setInterval(function () {
        go(current + 1);
      }, DELAY);
    }
    carousel.addEventListener("mouseenter", function () {
      hovered = true;
      stop();
    });
    carousel.addEventListener("mouseleave", function () {
      hovered = false;
      start();
    });
    carousel.addEventListener("focusin", function () {
      focused = true;
      stop();
    });
    carousel.addEventListener("focusout", function (e) {
      if (!carousel.contains(e.relatedTarget)) {
        focused = false;
        start();
      }
    });
    // a manual change restarts the countdown
    carousel.addEventListener("click", function (e) {
      if (e.target.closest("[data-carousel-tab], [data-carousel-dot]")) start();
    });
    document.addEventListener("visibilitychange", start);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          onScreen = entries[0].isIntersecting;
          start();
        },
        { threshold: 0.35 },
      ).observe(carousel);
    } else {
      onScreen = true;
      start();
    }
  });

  // ---------- back to top: show the fixed button after scrolling ----------
  var toTop = document.querySelector(".f-top");
  if (toTop) {
    var toggleTop = function () {
      toTop.classList.toggle("is-shown", (window.pageYOffset || doc.scrollTop) > 400);
    };
    window.addEventListener("scroll", toggleTop, { passive: true });
    toggleTop();
  }

  // ---------- home: video gallery (featured player, playlist, lightbox) ----------
  $$("[data-gallery]").forEach(function (gallery) {
    var feature = gallery.querySelector("[data-gallery-feature]");
    var items = $$("[data-gallery-item]", gallery);
    var section = gallery.closest("section") || document;
    var box = section.querySelector("[data-lightbox]");
    var player = box && box.querySelector("[data-lightbox-player]");
    var lastFocus = null;
    if (!feature) return;

    function openVideo(id, title) {
      if (!box || !player) {
        window.open("https://www.youtube.com/watch?v=" + id, "_blank", "noopener");
        return;
      }
      lastFocus = document.activeElement;
      var frame = document.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1";
      frame.title = title || "Video";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      player.innerHTML = "";
      player.appendChild(frame);
      box.hidden = false;
      document.body.classList.add("hm-lightbox-open");
      var close = box.querySelector(".hm-lightbox-close");
      if (close) close.focus();
    }
    function closeVideo() {
      if (!box || box.hidden) return;
      box.hidden = true;
      player.innerHTML = "";
      document.body.classList.remove("hm-lightbox-open");
      if (lastFocus) lastFocus.focus();
    }
    function select(item) {
      items.forEach(function (it) {
        var on = it === item;
        it.classList.toggle("is-active", on);
        if (on) it.setAttribute("aria-current", "true");
        else it.removeAttribute("aria-current");
      });
      var id = item.getAttribute("data-video");
      feature.classList.add("is-swapping");
      window.setTimeout(function () {
        feature.setAttribute("data-video", id);
        feature.href = item.href;
        feature.setAttribute("aria-label", (feature.getAttribute("aria-label") || "").split(":")[0] + ": " + item.getAttribute("data-title"));
        feature.className = feature.className.replace(/pg-tone--\S+/, "pg-tone--" + item.getAttribute("data-theme"));
        var img = feature.querySelector("[data-gallery-img]");
        img.style.visibility = "";
        img.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
        feature.querySelector("[data-gallery-title]").textContent = item.getAttribute("data-title");
        feature.querySelector("[data-gallery-text]").textContent = item.getAttribute("data-text");
        feature.querySelector("[data-gallery-chip]").textContent = item.getAttribute("data-category");
        feature.classList.remove("is-swapping");
      }, reduceMotion ? 0 : 300);
    }

    feature.addEventListener("click", function (e) {
      e.preventDefault();
      openVideo(feature.getAttribute("data-video"), feature.querySelector("[data-gallery-title]").textContent);
    });
    items.forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        // first click shows it in the player, a second click plays it
        if (item.classList.contains("is-active")) openVideo(item.getAttribute("data-video"), item.getAttribute("data-title"));
        else select(item);
      });
    });
    if (box) {
      $$("[data-lightbox-close]", box).forEach(function (el) {
        el.addEventListener("click", closeVideo);
      });
      document.addEventListener("keydown", function (e) {
        if (box.hidden) return;
        if (e.key === "Escape") closeVideo();
        if (e.key === "Tab") {
          // keep focus inside the lightbox: close button <-> player
          e.preventDefault();
          var closeBtn = box.querySelector(".hm-lightbox-close");
          var frame = player.querySelector("iframe");
          (document.activeElement === closeBtn && frame ? frame : closeBtn).focus();
        }
      });
    }
  });

  // ---------- home: pointer-driven tilt of the group visual ----------
  if (finePointer && !reduceMotion) {
    $$("[data-pointer-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--tx", (x * 18).toFixed(1) + "px");
        el.style.setProperty("--ty", (y * 18).toFixed(1) + "px");
        el.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
        el.style.setProperty("--ry", (x * 8).toFixed(2) + "deg");
      });
      el.addEventListener("pointerleave", function () {
        ["--tx", "--ty", "--rx", "--ry"].forEach(function (k) {
          el.style.removeProperty(k);
        });
      });
    });
  }

  // ---------- forms (Contact, Careers): validation + email or endpoint ----------
  // data-endpoint empty: opens the visitor's email app with the message filled in.
  // data-endpoint set (e.g. a Formspree / Netlify Forms URL): posts the form there.
  $$("[data-form]").forEach(function (form) {
    var alertBox = form.querySelector("[data-form-alert]");
    var success = form.querySelector("[data-form-success]");
    var fields = $$("[data-field]", form);
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var PHONE = /^\+?[\d\s\-().]{7,20}$/;

    fields.forEach(function (field, i) {
      var err = field.querySelector("[data-field-error]");
      if (err) {
        err.id = form.id + "-err-" + i;
        $$("input, select, textarea", field).forEach(function (c) {
          c.setAttribute("aria-describedby", err.id);
        });
      }
      field.addEventListener("input", function () {
        if (field.classList.contains("is-invalid")) check(field);
      });
      field.addEventListener("change", function () {
        if (field.classList.contains("is-invalid")) check(field);
      });
    });

    function labelOf(field) {
      var l = field.querySelector(".pg-label");
      return l ? l.textContent.replace(/\*|\(optional\)/g, "").trim() : "";
    }

    function check(field) {
      var controls = $$("input, select, textarea", field);
      var first = controls[0];
      var msg = "";
      if (first && first.type === "radio") {
        if (first.required && !controls.some(function (c) { return c.checked; })) msg = "Please choose one option.";
      } else if (first) {
        var v = first.value.trim();
        if (first.required && !v) msg = first.tagName === "SELECT" ? "Please choose an option." : "Please fill in this field.";
        else if (v && first.type === "email" && !EMAIL.test(v)) msg = "Please enter a valid email address.";
        else if (v && first.type === "tel" && !PHONE.test(v)) msg = "Please enter a valid phone number.";
      }
      field.classList.toggle("is-invalid", !!msg);
      controls.forEach(function (c) {
        if (msg) c.setAttribute("aria-invalid", "true");
        else c.removeAttribute("aria-invalid");
      });
      var err = field.querySelector("[data-field-error]");
      if (err) err.textContent = msg;
      return !msg;
    }

    function values() {
      var out = [];
      fields.forEach(function (field) {
        var controls = $$("input, select, textarea", field);
        if (!controls.length || controls[0].type === "file") return;
        var v = controls[0].type === "radio"
          ? (controls.filter(function (c) { return c.checked; })[0] || {}).value || ""
          : controls[0].value.trim();
        if (v) out.push({ name: controls[0].name, label: labelOf(field), value: v });
      });
      return out;
    }

    function done() {
      if (alertBox) alertBox.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus();
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = fields.map(check).every(Boolean);
      if (success) success.hidden = true;
      if (!ok) {
        if (alertBox) {
          alertBox.textContent = form.getAttribute("data-error") || "Please check the highlighted fields.";
          alertBox.hidden = false;
        }
        var bad = form.querySelector(".is-invalid input, .is-invalid select, .is-invalid textarea");
        if (bad) bad.focus();
        return;
      }
      var endpoint = form.getAttribute("data-endpoint");
      if (endpoint) {
        var btn = form.querySelector("[type=submit]");
        if (btn) btn.disabled = true;
        fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
          .then(function (r) {
            if (!r.ok) throw new Error(r.status);
            form.reset();
            done();
          })
          .catch(function () {
            if (alertBox) {
              alertBox.textContent = "Sorry, your message could not be sent. Please email " + form.getAttribute("data-mailto") + ".";
              alertBox.hidden = false;
            }
          })
          .then(function () {
            if (btn) btn.disabled = false;
          });
        return;
      }
      var list = values();
      var pick = function (n) {
        var f = list.filter(function (x) { return x.name === n; })[0];
        return f ? f.value : "";
      };
      var subject = [form.getAttribute("data-subject"), pick("topic") || pick("category"), pick("name")]
        .filter(Boolean)
        .join(" | ");
      var body = list
        .map(function (x) {
          return x.name === "message" ? "\n" + x.value : x.label + ": " + x.value;
        })
        .join("\n");
      window.location.href =
        "mailto:" + form.getAttribute("data-mailto") +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body + "\n");
      done();
    });
  });

  // ---------- prefill a form select from a chip / card (career areas, contact topics) ----------
  function syncPressed(select) {
    $$('[data-prefill="' + select.id + '"][aria-pressed]').forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-value") === select.value ? "true" : "false");
    });
  }
  $$("[data-prefill]").forEach(function (trigger) {
    var select = document.getElementById(trigger.getAttribute("data-prefill"));
    if (!select) return;
    select.addEventListener("change", function () {
      syncPressed(select);
    });
    trigger.addEventListener("click", function () {
      var value = trigger.getAttribute("data-value");
      var has = Array.prototype.some.call(select.options, function (o) {
        return o.value === value;
      });
      if (!value || !has) return;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      if (trigger.tagName === "A") {
        // let the anchor scroll first, then put the cursor in the first empty field
        setTimeout(function () {
          var form = select.form;
          var empty = form && $$("input:not([type=radio]):not([type=file]), textarea", form).filter(function (c) {
            return !c.value;
          })[0];
          (empty || select).focus({ preventScroll: true });
        }, reduceMotion ? 0 : 650);
      }
    });
  });

  // ---------- filterable list (contact: group directory) ----------
  $$("[data-filter]").forEach(function (root) {
    var buttons = $$("[data-filter-btn]", root);
    var items = $$("[data-filter-item]", root);
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-filter-btn");
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        items.forEach(function (item) {
          item.hidden = key !== "all" && item.getAttribute("data-filter-item") !== key;
        });
      });
    });
  });

  // ---------- office open / closed badge (contact) ----------
  $$("[data-office-status]").forEach(function (el) {
    var tz = parseFloat(el.getAttribute("data-tz")) || 0;
    var days = (el.getAttribute("data-days") || "").split(",").map(Number);
    var toMin = function (t) {
      var p = (t || "0:0").split(":");
      return +p[0] * 60 + +p[1];
    };
    function update() {
      var local = new Date(Date.now() + tz * 3600000);
      var mins = local.getUTCHours() * 60 + local.getUTCMinutes();
      var open = days.indexOf(local.getUTCDay()) > -1 &&
        mins >= toMin(el.getAttribute("data-open")) && mins < toMin(el.getAttribute("data-close"));
      el.classList.toggle("is-open", open);
      el.textContent = el.getAttribute(open ? "data-open-label" : "data-closed-label");
      el.hidden = false;
    }
    update();
    setInterval(update, 60000);
  });
})();
