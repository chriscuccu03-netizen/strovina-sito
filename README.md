# Sito web — A.S.D. Polisportiva Strovina

Sito statico (HTML + CSS + JS vanilla, nessun build step). Per pubblicarlo basta caricare
il contenuto della cartella `sito/` su qualunque hosting statico (Netlify, GitHub Pages,
Cloudflare Pages, Aruba, ecc.).

## Anteprima locale

Doppio click su `index.html`, oppure da terminale:

```
cd sito
python -m http.server 8000
```

e apri http://localhost:8000

## Struttura

```
sito/
├── index.html            → tutto il sito (single page, sezioni ancorate)
├── tesseramento.html     → modulo raccolta dati tesserati (pagina a sé, noindex)
├── css/style.css         → stile completo (palette giallo-amaranto dal logo)
├── css/tesseramento.css  → stile del modulo
├── js/main.js            → animazioni, menu mobile, lightbox, contatori
├── js/tesseramento.js    → validazione, compressione foto e invio del modulo
├── assets/img/           → logo (sfondo trasparente), foto squadra, gallery
├── robots.txt
└── sitemap.xml

apps-script/              → fuori da sito/: NON va caricato sull'hosting
├── Codice.gs             → script Google che salva su Sheet + Drive
└── ISTRUZIONI.md         → come collegarlo (10 min, una volta sola)
```

## Modulo di tesseramento

`tesseramento.html` raccoglie anagrafica, taglia, ruolo e documento d'identità (fronte
obbligatorio, retro facoltativo): i dati finiscono su un Google Sheet e i file in una
sottocartella Drive per tesserato.
Il collegamento a Google si fa una volta sola seguendo
[`apps-script/ISTRUZIONI.md`](../apps-script/ISTRUZIONI.md); finché non lo fai, il modulo
mostra un avviso invece di inviare.

- La pagina è `noindex` e **non è linkata dal menu**: si raggiunge solo col link diretto.
- La pagina non ha header né menu: si apre direttamente sul modulo.
- Il codice fiscale **non viene validato**: si accetta quello che scrive la persona
  (viene solo messo in maiuscolo). Controllalo a mano prima di depositare il cartellino.
- Le foto vengono ridotte a 1600px e compresse dal browser prima dell'invio
  (~70% di peso in meno), così le foto da telefono non fanno fallire l'upload.

## Dati da completare (cerca `TODO` nei file)

| Cosa | Dove |
|---|---|
| **Rosa 2026-27** | sezione `#squadra`, blocco `.rosa-placeholder` |
| **Link ai siti degli sponsor** | sezione `#sponsor` — i 5 loghi sono inseriti, mancano gli URL |
| **P.IVA / Codice Fiscale** | tolta dal footer su richiesta (ottobre 2026); se arriva, rimettere un `<p class="footer__fiscal">` in `.footer__meta` |
| **Link Tuttocampo diretto** | card campionato in `#stagione` (ID società: 1028079) |
| **Collegamento del modulo a Google** | `js/tesseramento.js`, `CONFIG.ENDPOINT` — vedi `apps-script/ISTRUZIONI.md` |

## Calendario partite

Tutto in cima a `js/main.js`: `SQUADRE` (nomi, stemmi in `assets/img/squadre/<chiave>.png`)
e `PROSSIME_PARTITE` (22 giornate del Girone F 2026-27). Da lì si riempiono il rail
"Prossimi incontri", la barra col countdown e la card del match center. Ordinamento
automatico; al calcio d'inizio la partita sparisce e sale la successiva.
Se la FIGC sposta una gara basta correggere la sua `data`.
Gli originali dei loghi (1600px) stanno fuori dal sito, in `Foto/Squadre avversarie/`.

## Note

- La palette è ricavata dallo stemma ufficiale: **giallo `#FFDD00` / amaranto `#8E1B30`**
  (la card FIGC riporta "giallo-nero", ma il logo e la maglia storica confermano il giallo-amaranto).
- Le coordinate della mappa (`39.526601, 8.846315`) puntano al campo sportivo di Strovina
  (fonte: OpenStreetMap, way 280053217 — `leisure=pitch`, `sport=soccer`), non al centro del paese.
- Le foto della gallery sono ottimizzate (max 1100px, ~150-250 KB). Le originali restano in `Foto/`.
- Il logo con sfondo trasparente è stato generato dall'originale (`assets/img/logo-web.png`).
