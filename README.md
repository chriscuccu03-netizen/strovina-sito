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
├── index.html          → tutto il sito (single page, sezioni ancorate)
├── css/style.css       → stile completo (palette giallo-amaranto dal logo)
├── js/main.js          → animazioni, menu mobile, lightbox, contatori
├── assets/img/         → logo (sfondo trasparente), foto squadra, gallery
├── robots.txt
└── sitemap.xml
```

## Dati da completare (cerca `TODO` nei file)

| Cosa | Dove |
|---|---|
| **Dominio definitivo** | `index.html` (canonical, og:image, JSON-LD), `robots.txt`, `sitemap.xml` |
| **Rosa 2026-27** | sezione `#squadra`, blocco `.rosa-placeholder` |
| **Prossimi incontri (carosello hero)** | `js/main.js`, array `PROSSIME_PARTITE` in cima al file — ordinamento per data automatico, le partite passate spariscono da sole |
| **Calendario / prossima partita** | sezione `#stagione`, card `.match-card--next` |
| **Link ai siti degli sponsor** | sezione `#sponsor` — i 5 loghi sono inseriti, mancano gli URL |
| **P.IVA / Codice Fiscale** | footer, `.footer__fiscal` |
| **Link Tuttocampo diretto** | card campionato in `#stagione` (ID società: 1028079) |
| **Girone 2026-27** | verificare "Girone D · Oristano" con dato FIGC ufficiale |

## Note

- La palette è ricavata dallo stemma ufficiale: **giallo `#FFDD00` / amaranto `#8E1B30`**
  (la card FIGC riporta "giallo-nero", ma il logo e la maglia storica confermano il giallo-amaranto).
- Le coordinate della mappa (`39.5235519, 8.8502942`) puntano allo Strovina Stadium.
- Le foto della gallery sono ottimizzate (max 1100px, ~150-250 KB). Le originali restano in `Foto/`.
- Il logo con sfondo trasparente è stato generato dall'originale (`assets/img/logo-web.png`).
