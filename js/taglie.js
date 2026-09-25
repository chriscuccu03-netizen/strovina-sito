/* ═══════════════════════════════════════════════════════════
   Modulo taglie e numeri di maglia — validazione e invio
   Usa lo stesso script Google del tesseramento (apps-script/Codice.gs),
   che scrive le risposte nel file "Taglie e numeri Strovina"
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // Stesso indirizzo e stessa parola d'ordine di js/tesseramento.js:
  // se cambiano la', vanno cambiati anche qui
  const CONFIG = {
    ENDPOINT: "https://script.google.com/macros/s/AKfycby4KiHnUSd4kJfBV1RZojFstPHOYQEUVWzt83d8m8oIzrjuwR6DoGNy6FLauRDJCTzu/exec",
    SECRET: "strovina-2026"
  };

  const form = document.getElementById("tform");
  if (!form) return;

  const submitBtn = document.getElementById("submitBtn");
  const statusEl = document.getElementById("formStatus");
  const doneEl = document.getElementById("formDone");
  const doneMsg = document.getElementById("doneMsg");
  const againBtn = document.getElementById("againBtn");

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

  const RULES = {
    nome: function (v) { return v.trim().length >= 2 ? "" : "Scrivi il nome."; },
    cognome: function (v) { return v.trim().length >= 2 ? "" : "Scrivi il cognome."; },
    tagliaGiubbotto: function (v) { return v ? "" : "Scegli la taglia."; },
    numeroMaglia: function (v) {
      if (!v.trim()) return "Scrivi il numero.";
      const n = Number(v);
      return n >= 1 && n <= 99 ? "" : "Il numero va da 1 a 99.";
    }
  };

  Object.keys(RULES).forEach(function (name) {
    const input = form.elements[name];
    const evento = input.tagName === "SELECT" ? "change" : "blur";
    input.addEventListener(evento, function () { setError(input, RULES[name](input.value)); });
    input.addEventListener("input", function () {
      if (fieldOf(input).classList.contains("is-invalid")) setError(input, RULES[name](input.value));
    });
  });

  // numero: solo cifre
  const numInput = form.elements.numeroMaglia;
  numInput.addEventListener("input", function () {
    numInput.value = numInput.value.replace(/\D/g, "").slice(0, 2);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    let primoErrore = null;
    Object.keys(RULES).forEach(function (name) {
      const input = form.elements[name];
      const msg = RULES[name](input.value);
      setError(input, msg);
      if (msg && !primoErrore) primoErrore = input;
    });
    if (primoErrore) {
      const n = form.querySelectorAll(".is-invalid").length;
      setStatus(n === 1 ? "C'è un campo da sistemare." : "Ci sono " + n + " campi da sistemare.", "error");
      primoErrore.scrollIntoView({ behavior: "smooth", block: "center" });
      primoErrore.focus({ preventScroll: true });
      return;
    }

    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    setStatus("Invio in corso…", "info");

    const nome = form.elements.nome.value.trim();
    const cognome = form.elements.cognome.value.trim();
    const numero = String(Number(numInput.value));   // "07" diventa "7"

    const payload = {
      secret: CONFIG.SECRET,
      modulo: "taglie",
      honeypot: form.elements.sitoWeb.value,
      dati: {
        nome: nome,
        cognome: cognome,
        tagliaGiubbotto: form.elements.tagliaGiubbotto.value,
        numeroMaglia: numero,
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
      .then(function (out) {
        doneMsg.textContent = "Taglia " + form.elements.tagliaGiubbotto.value + " e numero " + numero +
          " per " + nome + " " + cognome + " sono arrivati alla segreteria della Strovina." +
          (out.numeroDoppio ? " Il " + numero + " l'ha già chiesto qualcun altro: se serve, ti contattiamo noi." : "");
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
    setStatus("");
    doneEl.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
