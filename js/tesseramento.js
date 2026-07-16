/* ═══════════════════════════════════════════════════════════
   Modulo di tesseramento — validazione, compressione e invio
   I dati finiscono su Google Sheet, i file su Google Drive,
   tramite lo script in apps-script/Codice.gs
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ══════════════════════════════════════════════════════════
     CONFIGURAZIONE — da compilare dopo aver pubblicato lo
     script Google (istruzioni in apps-script/ISTRUZIONI.md)
     ══════════════════════════════════════════════════════════ */
  const CONFIG = {
    // L'URL che Google ti dà al momento del deploy. Finisce con /exec
    ENDPOINT: "https://script.google.com/macros/s/AKfycby4KiHnUSd4kJfBV1RZojFstPHOYQEUVWzt83d8m8oIzrjuwR6DoGNy6FLauRDJCTzu/exec",
    // La stessa parola d'ordine scritta in Codice.gs. Tiene fuori i bot di passaggio,
    // non è una password: chi apre il sorgente della pagina la vede.
    SECRET: "strovina-2026",
    // Oltre questa soglia le foto vengono rimpicciolite prima dell'invio
    MAX_IMG_SIDE: 1600,
    JPEG_QUALITY: 0.82,
    // Limite per file dopo la compressione (i PDF non si comprimono)
    MAX_FILE_MB: 10
  };

  const form = document.getElementById("tform");
  if (!form) return;

  const submitBtn = document.getElementById("submitBtn");
  const statusEl = document.getElementById("formStatus");
  const doneEl = document.getElementById("formDone");
  const doneMsg = document.getElementById("doneMsg");
  const againBtn = document.getElementById("againBtn");

  // il codice fiscale non viene validato: si toglie solo lo sporco (spazi,
  // minuscole) e si accetta quello che scrive la persona
  function normalizzaCF(cf) {
    return String(cf || "").toUpperCase().replace(/\s/g, "");
  }

  /* ─────────────────────────────────────────────
     Utility
     ───────────────────────────────────────────── */
  function fieldOf(input) { return input.closest(".field"); }

  function setError(input, msg) {
    const field = fieldOf(input);
    if (!field) return;
    field.classList.toggle("is-invalid", Boolean(msg));
    field.classList.toggle("is-valid", !msg && Boolean(input.value));
    const box = field.querySelector('[data-error-for="' + input.name + '"]');
    if (box) box.textContent = msg || "";
  }

  function formatBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "tform__status" + (kind ? " tform__status--" + kind : "");
  }

  /* ─────────────────────────────────────────────
     Regole di validazione, campo per campo
     ───────────────────────────────────────────── */
  const RULES = {
    nome: function (v) { return v.trim().length >= 2 ? "" : "Scrivi il nome."; },
    cognome: function (v) { return v.trim().length >= 2 ? "" : "Scrivi il cognome."; },
    dataNascita: function (v) {
      if (!v) return "Indica la data di nascita.";
      const d = new Date(v + "T00:00:00");
      if (isNaN(d)) return "Data non valida.";
      const oggi = new Date();
      if (d > oggi) return "La data è nel futuro.";
      if (oggi.getFullYear() - d.getFullYear() > 100) return "Controlla l'anno di nascita.";
      return "";
    },
    luogoNascita: function (v) { return v.trim().length >= 2 ? "" : "Indica il comune di nascita."; },
    codiceFiscale: function (v) {
      return normalizzaCF(v) ? "" : "Il codice fiscale è obbligatorio.";
    },
    indirizzo: function (v) { return v.trim().length >= 4 ? "" : "Scrivi via e numero civico."; },
    comune: function (v) { return v.trim().length >= 2 ? "" : "Indica il comune di residenza."; },
    cap: function (v) {
      if (!v.trim()) return "";
      return /^\d{5}$/.test(v.trim()) ? "" : "Il CAP è di 5 cifre.";
    },
    email: function (v) {
      if (!v.trim()) return "";
      return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) ? "" : "Indirizzo email non valido.";
    },
    ruolo: function (v) { return v ? "" : "Scegli il ruolo."; },
    taglia: function (v) { return v ? "" : "Scegli la taglia."; }
  };

  Object.keys(RULES).forEach(function (name) {
    const input = form.elements[name];
    if (!input) return;
    const evento = (input.tagName === "SELECT" || input.type === "date") ? "change" : "blur";
    input.addEventListener(evento, function () { setError(input, RULES[name](input.value)); });
    // appena l'utente corregge, il messaggio sparisce
    input.addEventListener("input", function () {
      if (fieldOf(input).classList.contains("is-invalid")) setError(input, RULES[name](input.value));
    });
  });

  // il codice fiscale si scrive da solo in maiuscolo
  const cfInput = form.elements.codiceFiscale;
  cfInput.addEventListener("input", function () {
    const pos = cfInput.selectionStart;
    cfInput.value = normalizzaCF(cfInput.value);
    cfInput.setSelectionRange(pos, pos);
  });

  ["provNascita", "provincia"].forEach(function (name) {
    const el = form.elements[name];
    if (el) el.addEventListener("input", function () { el.value = el.value.toUpperCase().replace(/[^A-Z]/g, ""); });
  });

  const capInput = form.elements.cap;
  capInput.addEventListener("input", function () { capInput.value = capInput.value.replace(/\D/g, ""); });

  // telefono: solo cifre, non piu' di 12. Prima si tolgono spazi, prefissi e
  // parentesi, poi si conta: cosi' un numero incollato "sporco" resta intero
  const telInput = form.elements.telefono;
  telInput.addEventListener("input", function () {
    telInput.value = telInput.value.replace(/\D/g, "").slice(0, 12);
  });

  /* ─────────────────────────────────────────────
     Upload: anteprima, drag & drop, rimozione
     ───────────────────────────────────────────── */
  const FILE_FIELDS = ["docFronte", "docRetro"];
  const previewUrls = {};

  function resetDropzone(name) {
    const input = form.elements[name];
    const zone = document.querySelector('[data-drop-for="' + name + '"]');
    const preview = zone.querySelector(".dropzone__preview");
    input.value = "";
    if (previewUrls[name]) { URL.revokeObjectURL(previewUrls[name]); delete previewUrls[name]; }
    preview.hidden = true;
    setError(input, "");
  }

  function validaFile(input, file) {
    if (!file) return input.required ? "Carica il file." : "";
    const isPdf = file.type === "application/pdf";
    const isImg = file.type.indexOf("image/") === 0;
    if (!isPdf && !isImg) return "Formato non ammesso: carica un'immagine o un PDF.";
    if (isPdf && file.size > CONFIG.MAX_FILE_MB * 1024 * 1024) {
      return "Il PDF pesa " + formatBytes(file.size) + ": il limite è " + CONFIG.MAX_FILE_MB + " MB.";
    }
    return "";
  }

  FILE_FIELDS.forEach(function (name) {
    const input = form.elements[name];
    const zone = document.querySelector('[data-drop-for="' + name + '"]');
    if (!input || !zone) return;

    const preview = zone.querySelector(".dropzone__preview");
    const img = preview.querySelector("img");
    const nameEl = preview.querySelector(".dropzone__name");
    const sizeEl = preview.querySelector(".dropzone__size");
    const clearBtn = preview.querySelector(".dropzone__clear");

    input.addEventListener("change", function () {
      const file = input.files[0];
      if (!file) { resetDropzone(name); return; }

      const err = validaFile(input, file);
      if (err) {
        resetDropzone(name);   // svuota il campo, poi mostra il motivo del rifiuto
        setError(input, err);
        return;
      }
      setError(input, "");

      if (previewUrls[name]) URL.revokeObjectURL(previewUrls[name]);
      nameEl.textContent = file.name;
      sizeEl.textContent = formatBytes(file.size);

      if (file.type === "application/pdf") {
        img.classList.add("is-pdf");
        img.src = "data:image/svg+xml;utf8," + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" stroke="#8E1B30" ' +
          'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M22 8h24l14 14v50a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z"/>' +
          '<path d="M46 8v14h14"/><path d="M28 44h24M28 54h24M28 34h10"/></svg>'
        );
        img.alt = "File PDF caricato: " + file.name;
      } else {
        img.classList.remove("is-pdf");
        previewUrls[name] = URL.createObjectURL(file);
        img.src = previewUrls[name];
        img.alt = "Anteprima di " + file.name;
      }
      preview.hidden = false;
    });

    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      resetDropzone(name);
      input.focus();
    });

    // drag & drop
    ["dragenter", "dragover"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("is-dragover"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("is-dragover"); });
    });
    zone.addEventListener("drop", function (e) {
      const dropped = e.dataTransfer && e.dataTransfer.files;
      if (!dropped || !dropped.length) return;
      input.files = dropped;
      input.dispatchEvent(new Event("change"));
    });
  });

  /* ─────────────────────────────────────────────
     Compressione lato browser: le foto da telefono
     pesano 4-8 MB, in Drive ne bastano ~300 KB
     ───────────────────────────────────────────── */
  function caricaImmagine(file) {
    if ("createImageBitmap" in window) {
      // imageOrientation raddrizza le foto scattate in verticale
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () {
        return caricaImmagineFallback(file);
      });
    }
    return caricaImmagineFallback(file);
  }

  function caricaImmagineFallback(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); resolve(im); };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Immagine illeggibile")); };
      im.src = url;
    });
  }

  function comprimiImmagine(file) {
    return caricaImmagine(file).then(function (bitmap) {
      const w = bitmap.width, h = bitmap.height;
      const scala = Math.min(1, CONFIG.MAX_IMG_SIDE / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scala);
      canvas.height = Math.round(h * scala);
      const ctx = canvas.getContext("2d");
      // i JPEG non hanno canale alpha: senza questo, il PNG trasparente diventa nero
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      if (bitmap.close) bitmap.close();

      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          // se la compressione non aiuta (foto già piccola), tengo l'originale
          resolve(blob && blob.size < file.size ? blob : file);
        }, "image/jpeg", CONFIG.JPEG_QUALITY);
      });
    }).catch(function () {
      return file; // se qualcosa va storto, meglio l'originale che niente
    });
  }

  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const s = String(reader.result);
        resolve(s.slice(s.indexOf(",") + 1));
      };
      reader.onerror = function () { reject(new Error("Lettura del file fallita")); };
      reader.readAsDataURL(blob);
    });
  }

  function preparaFile(input) {
    const file = input.files[0];
    if (!file) return Promise.resolve(null);

    const isImg = file.type.indexOf("image/") === 0;
    const lavorato = isImg ? comprimiImmagine(file) : Promise.resolve(file);

    return lavorato.then(function (blob) {
      if (blob.size > CONFIG.MAX_FILE_MB * 1024 * 1024) {
        throw new Error("Il file «" + file.name + "» resta troppo pesante (" + formatBytes(blob.size) + ").");
      }
      return toBase64(blob).then(function (b64) {
        const ext = isImg && blob !== file ? "jpg" : (file.name.split(".").pop() || "bin").toLowerCase();
        return {
          campo: input.name,
          nomeOriginale: file.name,
          estensione: ext,
          mime: blob.type || file.type || "application/octet-stream",
          bytes: blob.size,
          dati: b64
        };
      });
    });
  }

  /* ─────────────────────────────────────────────
     Invio
     ───────────────────────────────────────────── */
  function validaTutto() {
    let primoErrore = null;

    Object.keys(RULES).forEach(function (name) {
      const input = form.elements[name];
      if (!input) return;
      const msg = RULES[name](input.value);
      setError(input, msg);
      if (msg && !primoErrore) primoErrore = input;
    });

    FILE_FIELDS.forEach(function (name) {
      const input = form.elements[name];
      const msg = validaFile(input, input.files[0]);
      setError(input, msg);
      if (msg && !primoErrore) primoErrore = input;
    });

    const privacy = form.elements.privacy;
    const privacyMsg = privacy.checked ? "" : "Serve il consenso per poter inviare il modulo.";
    const consentField = privacy.closest(".tform__group");
    consentField.classList.toggle("is-invalid", Boolean(privacyMsg));
    const privacyBox = document.querySelector('[data-error-for="privacy"]');
    if (privacyBox) {
      privacyBox.textContent = privacyMsg;
      privacyBox.style.display = privacyMsg ? "block" : "none";
    }
    if (privacyMsg && !primoErrore) primoErrore = privacy;

    return primoErrore;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (CONFIG.ENDPOINT.indexOf("INCOLLA_QUI") === 0) {
      setStatus("Il modulo non è ancora collegato a Google: manca l'indirizzo dello script in js/tesseramento.js.", "error");
      return;
    }

    const primoErrore = validaTutto();
    if (primoErrore) {
      const n = form.querySelectorAll(".is-invalid").length;
      setStatus(n === 1 ? "C'è un campo da sistemare." : "Ci sono " + n + " campi da sistemare.", "error");
      primoErrore.scrollIntoView({ behavior: "smooth", block: "center" });
      primoErrore.focus({ preventScroll: true });
      return;
    }

    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    setStatus("Preparo il documento…", "info");

    Promise.all(FILE_FIELDS.map(function (n) { return preparaFile(form.elements[n]); }))
      .then(function (files) {
        setStatus("Invio in corso… non chiudere la pagina.", "info");

        const payload = {
          secret: CONFIG.SECRET,
          honeypot: form.elements.sitoWeb.value,
          dati: {
            nome: form.elements.nome.value.trim(),
            cognome: form.elements.cognome.value.trim(),
            dataNascita: form.elements.dataNascita.value,
            luogoNascita: form.elements.luogoNascita.value.trim(),
            provNascita: form.elements.provNascita.value.trim(),
            codiceFiscale: normalizzaCF(form.elements.codiceFiscale.value),
            indirizzo: form.elements.indirizzo.value.trim(),
            comune: form.elements.comune.value.trim(),
            provincia: form.elements.provincia.value.trim(),
            cap: form.elements.cap.value.trim(),
            telefono: form.elements.telefono.value.trim(),
            email: form.elements.email.value.trim(),
            ruolo: form.elements.ruolo.value,
            taglia: form.elements.taglia.value,
            consenso: form.elements.privacy.checked ? "Sì" : "No"
          },
          files: files.filter(Boolean)
        };

        // niente header custom: così la richiesta resta "semplice" e il
        // browser non manda il preflight OPTIONS, che Apps Script non gestisce
        return fetch(CONFIG.ENDPOINT, {
          method: "POST",
          redirect: "follow",
          body: JSON.stringify(payload)
        });
      })
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
        if (out.cartella) {
          doneMsg.textContent = "I dati di " + form.elements.nome.value.trim() + " " +
            form.elements.cognome.value.trim() + " sono arrivati alla segreteria della Strovina, " +
            "documento compreso. Ti contattiamo noi se serve altro.";
        }
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
    FILE_FIELDS.forEach(resetDropzone);
    form.querySelectorAll(".is-invalid, .is-valid").forEach(function (el) {
      el.classList.remove("is-invalid", "is-valid");
    });
    setStatus("");
    doneEl.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
