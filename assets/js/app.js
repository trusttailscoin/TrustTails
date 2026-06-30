/* ============================================================
   TrustTails — Motion & interaction engine
   - Smooth scroll (Lenis, progressive enhancement)
   - Scroll reveals (IntersectionObserver)
   - Animated hero "network" constellation (canvas)
   - Number count-up, nav state, mobile menu, copy-to-clipboard
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Nav scroll state ---------- */
  var nav = document.querySelector(".nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 24); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () { menu.classList.toggle("open"); });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { menu.classList.remove("open"); });
    });
  }

  /* ---------- Smooth scroll (Lenis, optional) ---------- */
  if (!reduce && window.Lenis) {
    var lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  /* ---------- Scroll reveals ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Number count-up ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var dur = 1400, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = (target >= 1000 ? Math.floor(val).toLocaleString() : val.toFixed(0)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { cio.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.getAttribute("data-count") + (c.getAttribute("data-suffix") || ""); });
  }

  /* ---------- Copy to clipboard ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        var label = btn.querySelector(".copy-label");
        var prev = label ? label.textContent : null;
        btn.classList.add("copied");
        if (label) label.textContent = "Copied";
        setTimeout(function () { btn.classList.remove("copied"); if (label) label.textContent = prev; }, 1600);
      };
      if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done).catch(done); }
      else { var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); done(); }
    });
  });

  /* ---------- Hero network constellation ---------- */
  var canvas = document.getElementById("hero-canvas");
  if (canvas && !reduce) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [], W, H, mouse = { x: -999, y: -999 };
    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(Math.floor((W * H) / 16000), 90);
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: Math.random() * 1.6 + 0.6 });
      }
    }
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j], dx = n.x - m.x, dy = n.y - m.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.strokeStyle = "rgba(69,230,255," + (0.14 * (1 - d / 130)) + ")";
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
        var mdx = n.x - mouse.x, mdy = n.y - mouse.y, md = Math.sqrt(mdx * mdx + mdy * mdy);
        var near = md < 150;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = near ? "rgba(242,183,54,.9)" : "rgba(138,241,255,.6)"; ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize(); tick();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    window.addEventListener("mouseleave", function () { mouse.x = mouse.y = -999; });
  }

  /* ---------- Footer year ---------- */
  var y = document.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();
