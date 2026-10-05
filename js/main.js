/* ═══════════════════════════════════════════════════════
   A.S.D. Polisportiva Strovina — interazioni e animazioni
   ═══════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // su mobile la foto e' una banda ad altezza fissa: il parallasse scoprirebbe un vuoto
  const isMobile = window.matchMedia("(max-width: 820px)");

  /* ══════════════════════════════════════════════════════════
     CALENDARIO — Terza Categoria Oristano, Girone F, 2026-27
     Fonte: calendario ufficiale della Delegazione di Oristano.

     SQUADRE: chiave → nome. Lo stemma è assets/img/squadre/<chiave>.png;
     con logo: false compare un tondo con la sigla al suo posto.

     PROSSIME_PARTITE, una voce per partita:
       { g: 1, data: "2026-10-11T16:00", casa: true, avv: "olimpia-arbus" }
       g      = giornata
       data   = data e ora del calcio d'inizio
       casa   = true se si gioca allo Strovina Stadium
       luogo  = opzionale, per un campo diverso dal solito
     Se la FIGC sposta una partita basta correggere "data".
     L'ordinamento è automatico e al calcio d'inizio la partita
     esce da sola da rail, countdown e match center.
     ══════════════════════════════════════════════════════════ */
  const SQUADRE = {
    "laconi":                    { nome: "A.C. Laconi" },
    "arbus-guspini-costa-verde": { nome: "Arbus Guspini Costa Verde" },
    "colonia-julia":             { nome: "Colonia Julia" },
    "emmeci-football-academy":   { nome: "Emmeci Football Academy" },
    "lunamatrona":               { nome: "Lunamatrona" },
    "olimpia-arbus":             { nome: "Olimpia Arbus" },
    "santa-barbara-nureci":      { nome: "Santa Barbara Nureci" },
    "seddori":                   { nome: "Seddori" },
    "villacidro-soccer-24":      { nome: "Villacidro Soccer 24" },
    "villacidrese":              { nome: "Villacidrese" },
    "virtus-villamar":           { nome: "Virtus Villamar" }
  };

  const PROSSIME_PARTITE = [
    // Andata
    { g: 1,  data: "2026-10-11T16:00", casa: true,  avv: "olimpia-arbus" },
    { g: 2,  data: "2026-10-18T16:00", casa: false, avv: "villacidro-soccer-24" },
    { g: 3,  data: "2026-10-25T15:00", casa: false, avv: "lunamatrona" },
    { g: 4,  data: "2026-11-08T15:00", casa: true,  avv: "emmeci-football-academy" },
    { g: 5,  data: "2026-11-15T15:00", casa: false, avv: "laconi" },
    { g: 6,  data: "2026-11-22T15:00", casa: true,  avv: "villacidrese" },
    { g: 7,  data: "2026-11-29T15:00", casa: false, avv: "arbus-guspini-costa-verde" },
    { g: 8,  data: "2026-12-06T15:00", casa: true,  avv: "seddori" },
    { g: 9,  data: "2026-12-13T15:00", casa: false, avv: "santa-barbara-nureci" },
    { g: 10, data: "2026-12-20T15:00", casa: true,  avv: "virtus-villamar" },
    { g: 11, data: "2027-01-10T15:00", casa: false, avv: "colonia-julia" },
    // Ritorno
    { g: 12, data: "2027-01-17T15:00", casa: false, avv: "olimpia-arbus" },
    { g: 13, data: "2027-01-24T15:00", casa: true,  avv: "villacidro-soccer-24" },
    { g: 14, data: "2027-01-31T15:00", casa: true,  avv: "lunamatrona" },
    { g: 15, data: "2027-02-14T15:00", casa: false, avv: "emmeci-football-academy" },
    { g: 16, data: "2027-02-21T15:00", casa: true,  avv: "laconi" },
    { g: 17, data: "2027-02-28T15:00", casa: false, avv: "villacidrese" },
    { g: 18, data: "2027-03-07T15:00", casa: true,  avv: "arbus-guspini-costa-verde" },
    { g: 19, data: "2027-03-14T15:00", casa: false, avv: "seddori" },
    { g: 20, data: "2027-04-04T16:00", casa: true,  avv: "santa-barbara-nureci" },
    { g: 21, data: "2027-04-11T16:00", casa: false, avv: "virtus-villamar" },
    { g: 22, data: "2027-04-18T16:00", casa: true,  avv: "colonia-julia" }
  ];

  const STROVINA = { nome: "Strovina", src: "assets/img/logo-web.png" };

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

  function avversarioDi(m) {
    const s = SQUADRE[m.avv] || { nome: m.avv, logo: false };
    return {
      nome: s.nome,
      src: s.logo === false ? null : "assets/img/squadre/" + m.avv + ".png",
      sigla: s.sigla || s.nome.charAt(0)
    };
  }

  function luogoDi(m) {
    return m.luogo || (m.casa ? "Strovina Stadium" : "In trasferta");
  }

  // Stemma come <img>, oppure tondo con la sigla se il logo non c'e'
  function stemma(team, cls) {
    if (team.src) return '<img src="' + team.src + '" alt="" class="' + cls + '" width="200" height="200">';
    return '<span class="' + cls + ' crest-sigla" aria-hidden="true">' + team.sigla + '</span>';
  }

  // La squadra di casa sta sempre a sinistra, come nei tabellini
  function squadreDi(m) {
    const avv = avversarioDi(m);
    return m.casa ? { casa: STROVINA, ospite: avv, avv: avv } : { casa: avv, ospite: STROVINA, avv: avv };
  }

  /* ── Rail laterale hero ── */
  function renderRail() {
    const list = document.getElementById("nextList");
    if (!list) return;

    const future = partiteFuture();

    if (future.length === 0) {
      // Stagione finita (o calendario non ancora pubblicato)
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
      const avv = avversarioDi(m);
      return (
        '<article class="rail-item rail-item--' + (m.casa ? "casa" : "fuori") + (i === 0 ? " rail-item--first" : "") + '">' +
          '<div class="rail-item__date">' +
            '<span class="rail-item__day">' + m._d.getDate() + '</span>' +
            '<span class="rail-item__month">' + MESI[m._d.getMonth()] + '</span>' +
          '</div>' +
          stemma(avv, "rail-item__crest") +
          '<div class="rail-item__info">' +
            '<strong>' + avv.nome + '</strong>' +
            '<span><em class="rail-item__chip">' + (m.casa ? "Casa" : "Fuori") + '</em>ore ' + oraDi(m._d) + '</span>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  /* ── Match center: card "Prossima partita" ── */
  function renderMatchCard() {
    const teams = document.getElementById("mcTeams");
    if (!teams) return;
    const next = partiteFuture()[0];
    if (!next) return; // resta il segnaposto scritto nell'HTML

    const sq = squadreDi(next);
    function team(t) {
      return '<div class="match-team">' + stemma(t, "match-team__crest") +
        '<span class="match-team__name">' + t.nome + '</span></div>';
    }
    teams.innerHTML = team(sq.casa) + '<div class="match-card__vs"><span>VS</span></div>' + team(sq.ospite);

    const d = next._d;
    document.getElementById("mcDate").textContent =
      GIORNI_SETT[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()] + " " + d.getFullYear() + " · ore " + oraDi(d);
    document.getElementById("mcVenue").textContent =
      next.luogo || (next.casa ? "Strovina Stadium · Borgo Strovina" : "In trasferta");
    document.getElementById("mcNote").textContent = next.g + "ª giornata · Terza Categoria, Girone F";
  }

  /* ── Matchbar: prossima partita + countdown ── */
  let countdownTimer = null;

  function renderMatchBar() {
    const dateEl = document.getElementById("mbDate");
    const homeEl = document.getElementById("mbHome");
    const awayEl = document.getElementById("mbAway");
    const cdG = document.getElementById("cdG");
    const cdH = document.getElementById("cdH");
    const cdM = document.getElementById("cdM");
    const cdS = document.getElementById("cdS");
    if (!dateEl || !cdG) return;

    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }

    const next = partiteFuture()[0];

    if (!next) {
      dateEl.textContent = "Data da definire";
      cdG.textContent = cdH.textContent = cdM.textContent = cdS.textContent = "--";
      return;
    }

    const d = next._d;
    dateEl.textContent = GIORNI_SETT[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()] + " · ore " + oraDi(d) +
      " · " + luogoDi(next);

    const sq = squadreDi(next);
    homeEl.innerHTML = stemma(sq.casa, "matchbar__crest") + '<span class="matchbar__name">' + sq.casa.nome + '</span>';
    awayEl.innerHTML = stemma(sq.ospite, "matchbar__crest") + '<span class="matchbar__name">' + sq.ospite.nome + '</span>';

    function tick() {
      const diff = d - new Date();
      if (diff <= 0) {
        // Calcio d'inizio: la partita esce da rail, countdown e match center
        clearInterval(countdownTimer);
        renderRail();
        renderMatchCard();
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
  renderMatchCard();
  renderMatchBar();

  /* ── Header: stato scrolled ── */
  const header = document.getElementById("header");
  const toTop = document.getElementById("toTop");
  let ticking = false;

  const footStrip = document.querySelector(".footer .topbar");

  function onScroll() {
    const y = window.scrollY;
    // pagine come tesseramento.html non hanno header ne' pulsante "torna su"
    if (header) header.classList.toggle("is-scrolled", y > 40);
    if (toTop) toTop.classList.toggle("is-visible", y > 900);

    // In fondo alla pagina il pulsante "torna su" sale sopra la striscia del footer
    if (toTop && footStrip) {
      const sotto = window.innerHeight - footStrip.getBoundingClientRect().top;
      toTop.style.bottom = sotto > 0 ? "calc(1.4rem + " + sotto + "px)" : "";
    }

    // Parallax leggero sull'hero (solo desktop)
    if (!prefersReducedMotion && heroBg) {
      if (isMobile.matches) {
        if (heroBg.style.transform) heroBg.style.transform = "";
      } else if (y < window.innerHeight * 1.2) {
        heroBg.style.transform = "translateY(" + y * 0.28 + "px)";
      }
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

  if (burger && nav) {
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
  }

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
        el.style.setProperty("--reveal-delay", (Math.min(Math.max(idx, 0), 6) * 0.04) + "s");
        el.classList.add("is-visible");
        io.unobserve(el);
      });
      // rootMargin positivo in basso: la sezione parte poco prima di entrare
      // nello schermo, cosi' arriva gia' visibile invece di comparire in ritardo
    }, { threshold: 0.02, rootMargin: "0px 0px 10% 0px" });

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
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ── Anno corrente nel footer ── */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
