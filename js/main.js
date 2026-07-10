/* ═══════════════════════════════════════════════════════
   A.S.D. Polisportiva Strovina — interazioni e animazioni
   ═══════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ══════════════════════════════════════════════════════════
     PROSSIMI INCONTRI — riempire questo array con le partite.
     Formato di ogni voce:
       {
         data: "2026-09-13T15:30",          // data e ora del calcio d'inizio
         avversario: "Nome Squadra",
         casa: true,                         // true = allo Strovina Stadium
         luogo: "Strovina Stadium",          // opzionale, dedotto da "casa" se omesso
         competizione: "Terza Categoria"     // opzionale
       }
     L'ordinamento per data è automatico (la più vicina in alto).
     Le partite già giocate spariscono da sole dal carosello.
     ══════════════════════════════════════════════════════════ */
  const PROSSIME_PARTITE = [
    // Esempio (togliere le barre per attivare):
    // { data: "2026-09-13T15:30", avversario: "Nome Avversario", casa: true, competizione: "Terza Categoria" },
  ];

  const MESI = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];
  const GIORNI_SETT = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];

  function partiteFuture() {
    const now = new Date();
    return PROSSIME_PARTITE
      .map(function (m) { return Object.assign({}, m, { _d: new Date(m.data) }); })
      .filter(function (m) { return m._d >= now; })
      .sort(function (a, b) { return a._d - b._d; });
  }

  function oraDi(d) {
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  /* ── Rail laterale hero ── */
  function renderRail() {
    const list = document.getElementById("nextList");
    if (!list) return;

    const future = partiteFuture();

    if (future.length === 0) {
      // Stato placeholder: calendario non ancora pubblicato
      let html = "";
      for (let i = 0; i < 4; i++) {
        html +=
          '<article class="rail-item rail-item--tbd">' +
            '<div class="rail-item__date"><span class="rail-item__day">?</span><span class="rail-item__month">—</span></div>' +
            '<div class="rail-item__info">' +
              '<strong>Avversario da definire</strong>' +
              '<span>Calendario in arrivo</span>' +
            '</div>' +
          '</article>';
      }
      list.innerHTML = html;
      return;
    }

    list.innerHTML = future.map(function (m, i) {
      const luogo = m.luogo || (m.casa ? "Strovina Stadium" : "Trasferta");
      const comp = m.competizione ? " · " + m.competizione : "";
      return (
        '<article class="rail-item' + (i === 0 ? " rail-item--first" : "") + '">' +
          '<div class="rail-item__date">' +
            '<span class="rail-item__day">' + m._d.getDate() + '</span>' +
            '<span class="rail-item__month">' + MESI[m._d.getMonth()] + '</span>' +
          '</div>' +
          '<div class="rail-item__info">' +
            '<strong>Strovina vs ' + m.avversario + '</strong>' +
            '<span>' + luogo + ' · ore ' + oraDi(m._d) + comp + '</span>' +
          '</div>' +
          '<span class="rail-item__chip">' + (m.casa ? "CASA" : "FUORI") + '</span>' +
        '</article>'
      );
    }).join("");
  }

  /* ── Matchbar: prossima partita + countdown ── */
  let countdownTimer = null;

  function renderMatchBar() {
    const dateEl = document.getElementById("mbDate");
    const oppEl = document.getElementById("mbOpp");
    const cdG = document.getElementById("cdG");
    const cdH = document.getElementById("cdH");
    const cdM = document.getElementById("cdM");
    const cdS = document.getElementById("cdS");
    if (!dateEl || !cdG) return;

    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }

    const next = partiteFuture()[0];

    if (!next) {
      dateEl.textContent = "Data da definire";
      oppEl.textContent = "Da definire";
      cdG.textContent = cdH.textContent = cdM.textContent = cdS.textContent = "--";
      return;
    }

    const d = next._d;
    dateEl.textContent = GIORNI_SETT[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()] + " · ore " + oraDi(d) +
      " · " + (next.luogo || (next.casa ? "Strovina Stadium" : "Trasferta"));
    oppEl.textContent = next.avversario;

    function tick() {
      const diff = d - new Date();
      if (diff <= 0) {
        // Calcio d'inizio: la partita esce da carosello e countdown
        clearInterval(countdownTimer);
        renderRail();
        renderMatchBar();
        return;
      }
      const s = Math.floor(diff / 1000);
      cdG.textContent = String(Math.floor(s / 86400)).padStart(2, "0");
      cdH.textContent = String(Math.floor(s % 86400 / 3600)).padStart(2, "0");
      cdM.textContent = String(Math.floor(s % 3600 / 60)).padStart(2, "0");
      cdS.textContent = String(s % 60).padStart(2, "0");
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  renderRail();
  renderMatchBar();

  /* ── Header: stato scrolled ── */
  const header = document.getElementById("header");
  const toTop = document.getElementById("toTop");
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    toTop.classList.toggle("is-visible", y > 900);

    // Parallax leggero sull'hero
    if (!prefersReducedMotion && heroBg && y < window.innerHeight * 1.2) {
      heroBg.style.transform = "translateY(" + y * 0.28 + "px)";
    }
    ticking = false;
  }

  const heroBg = document.getElementById("heroBg");
  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ── Menu mobile ── */
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  burger.addEventListener("click", function () {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
    document.body.style.overflow = open ? "hidden" : "";
  });

  nav.addEventListener("click", function (e) {
    if (e.target.classList.contains("nav__link")) {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
  });

  /* ── Reveal on scroll (con stagger automatico per gruppi) ── */
  const revealEls = document.querySelectorAll(".reveal");

  if (prefersReducedMotion) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // stagger: ritardo in base alla posizione tra i fratelli .reveal visibili insieme
        const siblings = Array.prototype.filter.call(
          el.parentElement ? el.parentElement.children : [],
          function (c) { return c.classList && c.classList.contains("reveal"); }
        );
        const idx = siblings.indexOf(el);
        el.style.setProperty("--reveal-delay", (Math.max(idx, 0) * 0.09) + "s");
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ── Contatore animato (anni di storia) ── */
  const counters = document.querySelectorAll("[data-count]");
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute("data-count"), 10);
        const start = performance.now();
        const dur = 1600;

        function tick(now) {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  }

  /* ── Zanzarona: vola una volta al caricamento ── */
  const mosquito = document.getElementById("mosquito");
  if (mosquito && !prefersReducedMotion) {
    window.addEventListener("load", function () {
      mosquito.classList.add("is-flying");
    });
  }

  /* ── Lightbox gallery ── */
  const grid = document.getElementById("galleryGrid");
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");
  const items = grid ? Array.prototype.slice.call(grid.querySelectorAll(".gallery-item")) : [];
  let current = -1;
  let lastFocused = null;

  function openLightbox(i) {
    current = i;
    const btn = items[i];
    lbImg.src = btn.getAttribute("data-full");
    lbImg.alt = btn.querySelector("img").alt;
    lastFocused = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  function step(dir) {
    openLightbox((current + dir + items.length) % items.length);
  }

  items.forEach(function (btn, i) {
    btn.addEventListener("click", function () { openLightbox(i); });
  });
  if (lightbox) {
    lbClose.addEventListener("click", closeLightbox);
    lbPrev.addEventListener("click", function () { step(-1); });
    lbNext.addEventListener("click", function () { step(1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  /* ── To top ── */
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  /* ── Anno corrente nel footer ── */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
