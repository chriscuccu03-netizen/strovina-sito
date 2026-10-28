/* ═══════════════════════════════════════════════════════════
   Modulo ordini tuta e polo — scelta capi, totale, invio
   Usa lo stesso script Google del tesseramento (apps-script/Codice.gs),
   che scrive gli ordini nel file "Ordini tuta e polo Strovina"
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // Stesso indirizzo e stessa parola d'ordine di js/tesseramento.js:
  // se cambiano la', vanno cambiati anche qui
  const CONFIG = {
    ENDPOINT: "https://script.google.com/macros/s/AKfycby4KiHnUSd4kJfBV1RZojFstPHOYQEUVWzt83d8m8oIzrjuwR6DoGNy6FLauRDJCTzu/exec",
    SECRET: "strovina-2026"
  };

  // Prezzi e nomi: se cambiano qui, vanno cambiati anche in ORDINI_CAPI di Codice.gs,
  // che ricalcola il totale per conto suo e non si fida di quello del browser
  const CAPI = {
    tuta: { nome: "Tuta bianco-nera", uno: "tuta", tanti: "tute", prezzo: 45 },
    polo: { nome: "Polo a maniche corte", uno: "polo", tanti: "polo", prezzo: 20 }
  };
  const TAGLIE = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const MAX_PEZZI = 10;

  const form = document.getElementById("tform");
  if (!form) return;

  const submitBtn = document.getElementById("submitBtn");
  const statusEl = document.getElementById("formStatus");
  const doneEl = document.getElementById("formDone");
  const doneMsg = document.getElementById("doneMsg");
  const againBtn = document.getElementById("againBtn");
  const capiError = document.getElementById("capiError");
  const riepilogo = document.getElementById("riepilogo");

  function fieldOf(input) { return input.closest(".field"); }

  function setError(input, msg) {
    const field = fieldOf(input);
    field.classList.toggle("is-invalid", Boolean(msg));
    field.classList.toggle("is-valid", !msg && Boolean(input.value));
    const box = field.querySelector('[data-error-for="' + input.name + '"]');
    if (box) box.textContent = msg || "";
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "tform__status" + (kind ? " tform__status--" + kind : "");
  }

  function euro(n) { return n + " €"; }

  /* ── Capi: casella, quantità e una riga (taglia + per chi) per ogni pezzo ── */
  const blocchi = {};
  form.querySelectorAll(".capo").forEach(function (el) {
    const chiave = el.getAttribute("data-capo");
    blocchi[chiave] = {
      el: el,
      check: el.querySelector('input[type="checkbox"]'),
      body: el.querySelector(".capo__body"),
      val: el.querySelector(".qty__val"),
      meno: el.querySelector('[data-step="-1"]'),
      piu: el.querySelector('[data-step="1"]'),
      pezzi: el.querySelector(".capo__pezzi"),
      qta: 1
    };
  });

  function rigaPezzo(chiave, i) {
    const c = CAPI[chiave];
    const idT = chiave + "_taglia_" + i;
    const idC = chiave + "_chi_" + i;
    const opzioni = TAGLIE.map(function (t) { return "<option>" + t + "</option>"; }).join("");
    const div = document.createElement("div");
    div.className = "pezzo";
    div.innerHTML =
      '<span class="pezzo__n">' + c.uno.charAt(0).toUpperCase() + c.uno.slice(1) + " " + i + "</span>" +
      '<div class="field">' +
        '<label for="' + idT + '">Taglia <span class="req-mark">*</span></label>' +
        '<div class="select-wrap"><select id="' + idT + '" name="' + idT + '" required>' +
          '<option value="" selected disabled>Scegli…</option>' + opzioni +
        "</select></div>" +
        '<p class="field__error" data-error-for="' + idT + '"></p>' +
      "</div>" +
      '<div class="field">' +
        '<label for="' + idC + '">Per chi</label>' +
        '<input type="text" id="' + idC + '" name="' + idC + '" maxlength="60" autocomplete="off" placeholder="' +
          (i === 1 ? "Per te" : "Facoltativo") + '">' +
      "</div>";
    const sel = div.querySelector("select");
    sel.addEventListener("change", function () { setError(sel, ""); aggiorna(); });
    return div;
  }

  // Aggiunge o toglie righe in fondo: quelle gia' compilate restano com'erano
  function allineaPezzi(chiave) {
    const b = blocchi[chiave];
    while (b.pezzi.children.length < b.qta) b.pezzi.appendChild(rigaPezzo(chiave, b.pezzi.children.length + 1));
    while (b.pezzi.children.length > b.qta) b.pezzi.removeChild(b.pezzi.lastElementChild);
    b.val.textContent = b.qta;
    b.meno.disabled = b.qta <= 1;
    b.piu.disabled = b.qta >= MAX_PEZZI;
  }

  Object.keys(blocchi).forEach(function (chiave) {
    const b = blocchi[chiave];
    b.check.addEventListener("change", function () {
      b.body.hidden = !b.check.checked;
      b.el.classList.toggle("is-on", b.check.checked);
      if (b.check.checked) allineaPezzi(chiave);
      capiError.textContent = "";
      aggiorna();
    });
    [b.meno, b.piu].forEach(function (btn) {
      btn.addEventListener("click", function () {
        b.qta = Math.min(MAX_PEZZI, Math.max(1, b.qta + Number(btn.getAttribute("data-step"))));
        allineaPezzi(chiave);
        aggiorna();
      });
    });
  });

  function ordine() {
    const out = {};
    Object.keys(blocchi).forEach(function (chiave) {
      const b = blocchi[chiave];
      if (!b.check.checked) { out[chiave] = []; return; }
      out[chiave] = Array.prototype.map.call(b.pezzi.children, function (riga) {
        return { taglia: riga.querySelector("select").value, perChi: riga.querySelector("input").value.trim() };
      });
    });
    return out;
  }

  function totaleDi(o) {
    return Object.keys(o).reduce(function (s, k) { return s + o[k].length * CAPI[k].prezzo; }, 0);
  }

  // "2 tute e 1 polo"
  function descrivi(o) {
    return Object.keys(o).filter(function (k) { return o[k].length; }).map(function (k) {
      return o[k].length + " " + (o[k].length === 1 ? CAPI[k].uno : CAPI[k].tanti);
    }).join(" e ");
  }

  function aggiorna() {
    const o = ordine();
    const righe = Object.keys(o).filter(function (k) { return o[k].length; });
    if (!righe.length) {
      riepilogo.innerHTML = '<p class="riepilogo__vuoto">Scegli almeno un capo per vedere il totale.</p>';
      return;
    }
    riepilogo.innerHTML = righe.map(function (k) {
      const taglie = o[k].map(function (p) { return p.taglia || "?"; }).join(", ");
      return '<div class="riepilogo__riga"><span>' + CAPI[k].nome + " × " + o[k].length +
        ' <small>taglie ' + taglie + "</small></span><strong>" + euro(o[k].length * CAPI[k].prezzo) + "</strong></div>";
    }).join("") +
      '<div class="riepilogo__totale"><span>Totale</span><strong>' + euro(totaleDi(o)) + "</strong></div>";
  }

  /* ── Nome e cognome ── */
  const RULES = {
    nome: function (v) { return v.trim().length >= 2 ? "" : "Scrivi il nome."; },
    cognome: function (v) { return v.trim().length >= 2 ? "" : "Scrivi il cognome."; }
  };

  Object.keys(RULES).forEach(function (name) {
    const input = form.elements[name];
    input.addEventListener("blur", function () { setError(input, RULES[name](input.value)); });
    input.addEventListener("input", function () {
      if (fieldOf(input).classList.contains("is-invalid")) setError(input, RULES[name](input.value));
    });
  });

  /* ── Invio ── */
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    let primoErrore = null;
    let errori = 0;
    Object.keys(RULES).forEach(function (name) {
      const input = form.elements[name];
      const msg = RULES[name](input.value);
      setError(input, msg);
      if (msg) { errori++; if (!primoErrore) primoErrore = input; }
    });

    const o = ordine();
    if (!o.tuta.length && !o.polo.length) {
      capiError.textContent = "Scegli almeno la tuta o la polo.";
      errori++;
      if (!primoErrore) primoErrore = blocchi.tuta.check;
    } else {
      capiError.textContent = "";
    }
    form.querySelectorAll(".capo__pezzi select").forEach(function (sel) {
      const msg = sel.value ? "" : "Scegli la taglia.";
      setError(sel, msg);
      if (msg) { errori++; if (!primoErrore) primoErrore = sel; }
    });

    if (primoErrore) {
      setStatus(errori === 1 ? "C'è un campo da sistemare." : "Ci sono " + errori + " campi da sistemare.", "error");
      primoErrore.scrollIntoView({ behavior: "smooth", block: "center" });
      primoErrore.focus({ preventScroll: true });
      return;
    }

    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    setStatus("Invio in corso…", "info");

    const nome = form.elements.nome.value.trim();
    const cognome = form.elements.cognome.value.trim();

    const payload = {
      secret: CONFIG.SECRET,
      modulo: "abbigliamento",
      honeypot: form.elements.sitoWeb.value,
      dati: {
        nome: nome,
        cognome: cognome,
        tuta: o.tuta,
        polo: o.polo,
        note: form.elements.note.value.trim()
      }
    };

    // niente header custom: la richiesta resta "semplice" e il browser
    // non manda il preflight OPTIONS, che Apps Script non gestisce
    fetch(CONFIG.ENDPOINT, { method: "POST", redirect: "follow", body: JSON.stringify(payload) })
      .then(function (res) {
        return res.text().then(function (txt) {
          let out;
          try { out = JSON.parse(txt); }
          catch (err) { throw new Error("Risposta inattesa dal server. Riprova tra poco."); }
          if (!res.ok || !out.ok) throw new Error(out.error || "Invio non riuscito.");
          return out;
        });
      })
      .then(function () {
        doneMsg.textContent = "L'ordine di " + nome + " " + cognome + " (" + descrivi(o) + ", totale " +
          euro(totaleDi(o)) + ") è arrivato alla segreteria della Strovina.";
        form.hidden = true;
        doneEl.hidden = false;
        doneEl.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .catch(function (err) {
        setStatus(err.message || "Invio non riuscito: controlla la connessione e riprova.", "error");
      })
      .then(function () {
        submitBtn.classList.remove("is-loading");
        submitBtn.disabled = false;
      });
  });

  againBtn.addEventListener("click", function () {
    form.reset();
    form.querySelectorAll(".is-invalid, .is-valid").forEach(function (el) {
      el.classList.remove("is-invalid", "is-valid");
    });
    Object.keys(blocchi).forEach(function (chiave) {
      const b = blocchi[chiave];
      b.qta = 1;
      b.pezzi.innerHTML = "";
      b.body.hidden = true;
      b.el.classList.remove("is-on");
    });
    capiError.textContent = "";
    setStatus("");
    aggiorna();
    doneEl.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
