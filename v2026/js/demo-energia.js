/* ============================================================
   Demo interattive del case study "Dati energetici"
   (v2026/presentazioni/simecom.html).

   1. Forecast vs consuntivo — curve a 96 quarti d'ora per zona del
      mercato elettrico italiano, GENERATE NEL BROWSER (seed per zona e
      giorno): nessun dato aziendale. Ritocchi percentuali per fascia,
      MAPE prima/dopo, grafico SVG disegnato a mano.
   2. Temperature dei capoluoghi — dati pubblici dal vivo da
      Open-Meteo.com (una richiesta per 107 località), mappa Leaflet
      caricata solo quando la sezione entra in vista, con ripiego su
      un'istantanea salvata (assets/simecom/temperature-esempio.json).

   Nessuna dipendenza oltre a Leaflet (da cdnjs, solo per la mappa).
   I colori arrivano dai token CSS della pagina (data-brand="energia").
   ============================================================ */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NF0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' });
  const NF1 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const track = (name) => { try { window.abTrack?.(name); } catch { /* analytics non disponibile */ } };
  const svgEl = (tag, attrs = {}) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  // Percorso degli asset calcolato dallo script, così funziona da qualsiasi pagina
  const ASSETS = (() => {
    try { return new URL('../../assets/simecom/', document.currentScript.src).href; }
    catch { return '../../assets/simecom/'; }
  })();

  /* ---------- PRNG deterministico (mulberry32 + hash della stringa) ---------- */
  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (r) => { // Box-Muller
    const u = Math.max(r(), 1e-9), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  /* ============================================================
     DEMO 1 — FORECAST VS CONSUNTIVO (dati simulati)
     ============================================================ */
  function initForecast() {
    const root = document.getElementById('demo-forecast');
    if (!root) return;
    const selZona = root.querySelector('#fc-zona');
    const selGiorno = root.querySelector('#fc-giorno');
    const plot = root.querySelector('#fc-plot');
    const tip = root.querySelector('#fc-tip');
    const live = root.querySelector('#fc-live');
    const fasceBox = root.querySelector('#fc-fasce');
    const btnReset = root.querySelector('#fc-reset');
    const outOrig = root.querySelector('#fc-mape-orig');
    const outCorr = root.querySelector('#fc-mape-corr');
    const outDiff = root.querySelector('#fc-mape-diff');

    const Q = 96; // quarti d'ora
    const FASCE = [
      { id: 'notte', nome: 'Notte', breve: 'notte', ore: '00–06', da: 0, a: 24 },
      { id: 'mattina', nome: 'Mattina', breve: 'matt.', ore: '06–12', da: 24, a: 48 },
      { id: 'pomeriggio', nome: 'Pomeriggio', breve: 'pom.', ore: '12–18', da: 48, a: 72 },
      { id: 'sera', nome: 'Sera', breve: 'sera', ore: '18–24', da: 72, a: 96 },
    ];
    // Profili plausibili (ordine di grandezza dei carichi zonali, valori inventati):
    // night = livello di valle, morning/ind/evening = pesi delle componenti.
    const ZONE = {
      NORD: { scale: 24000, night: 0.56, morning: 0.20, ind: 0.24, dip: 0.05, evening: 0.20 },
      CNOR: { scale: 4300, night: 0.58, morning: 0.22, ind: 0.16, dip: 0.05, evening: 0.25 },
      CSUD: { scale: 5700, night: 0.58, morning: 0.24, ind: 0.12, dip: 0.05, evening: 0.29 },
      SUD: { scale: 3300, night: 0.59, morning: 0.22, ind: 0.12, dip: 0.06, evening: 0.31 },
      CALA: { scale: 850, night: 0.57, morning: 0.20, ind: 0.06, dip: 0.06, evening: 0.37 },
      SICI: { scale: 2300, night: 0.59, morning: 0.21, ind: 0.08, dip: 0.06, evening: 0.34 },
      SARD: { scale: 1150, night: 0.61, morning: 0.20, ind: 0.10, dip: 0.05, evening: 0.30 },
    };
    const g = (x, mu, s) => Math.exp(-0.5 * ((x - mu) / s) ** 2);
    const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    function shape(h, p, giorno) {
      const sab = giorno === 5, dom = giorno === 6;
      const ind = p.ind * (dom ? 0.18 : sab ? 0.5 : 1);
      const shiftM = dom ? 1.2 : sab ? 0.6 : 0;
      const morning = p.morning * (dom ? 0.75 : sab ? 0.88 : 1) * g(h, 10.4 + shiftM, 2.5);
      const plateau = ind * smooth(h, 6.5, 8.8) * (1 - smooth(h, 16.8, 19.5));
      const dip = -p.dip * g(h, 13.4, 1.0) * (dom ? 0.4 : 1);
      const evening = p.evening * g(h, 18.9, 1.7) + p.evening * 0.35 * g(h, 21.2, 1.4);
      const trough = -0.04 * g(h, 4.2, 1.8);
      // giorno circolare: la curva della mezzanotte si richiude
      const tail = 0.08 * g(h, -1, 1.6) + 0.08 * g(h, 25, 1.6);
      return (p.night + morning + plateau + dip + evening + trough + tail) * (dom ? 0.84 : sab ? 0.93 : 1);
    }

    // Bias del forecast per fascia, interpolato in modo continuo tra i centri delle fasce
    function biasAt(h, b) {
      // centri delle fasce alle 3, 9, 15 e 21; x = 0 al centro della notte
      const x = ((h - 3) % 24 + 24) % 24;
      const i = Math.floor(x / 6), t = (x - i * 6) / 6;
      const w = (1 - Math.cos(Math.PI * t)) / 2;
      return b[i % 4] * (1 - w) + b[(i + 1) % 4] * w;
    }

    const cache = new Map();
    function genera(zona, giorno) {
      const key = zona + '|' + giorno;
      if (cache.has(key)) return cache.get(key);
      const p = ZONE[zona];
      const r = rng(hashStr('energia-demo|' + key));
      const livello = 1 + gauss(r) * 0.018;
      // bias sistematici del forecast (±6%), almeno una fascia con errore evidente
      const b = FASCE.map(() => (r() * 2 - 1) * 0.06);
      const k = b.reduce((m, v, i) => (Math.abs(v) > Math.abs(b[m]) ? i : m), 0);
      if (Math.abs(b[k]) < 0.035) b[k] = Math.sign(b[k] || 1) * (0.035 + r() * 0.02);
      const spostaPicco = (r() * 2 - 1) * 0.35; // il forecast anticipa/ritarda la rampa serale
      const livelloF = 1 + gauss(r) * 0.01;
      const cons = new Array(Q), fc = new Array(Q);
      let e1 = 0, e2 = 0;
      for (let i = 0; i < Q; i++) {
        const h = i / 4;
        e1 = 0.86 * e1 + gauss(r) * 0.0065; // rumore lento sul consuntivo
        e2 = 0.7 * e2 + gauss(r) * 0.003;   // rumore del forecast
        cons[i] = p.scale * shape(h, p, giorno) * livello * (1 + e1);
        fc[i] = p.scale * shape(h + spostaPicco * g(h, 18.5, 2.2), p, giorno) * livelloF * (1 + biasAt(h, b) + e2);
      }
      const out = { cons, fc };
      cache.set(key, out);
      return out;
    }

    /* ---- stato ---- */
    const ritocchi = new Map(); // zona|giorno → [4 percentuali]
    const keyCorrente = () => selZona.value + '|' + selGiorno.value;
    const getRit = () => ritocchi.get(keyCorrente()) || [0, 0, 0, 0];
    let cursore = null; // indice del quarto d'ora evidenziato
    let interagito = false;
    const primaInterazione = () => { if (!interagito) { interagito = true; track('demo-forecast'); } };

    /* ---- righe degli slider ---- */
    const righe = FASCE.map((f, i) => {
      const row = document.createElement('div');
      row.className = 'fc-row';
      const id = 'fc-r-' + f.id;
      row.innerHTML =
        `<div class="fc-row-top"><label for="${id}">${f.nome} <span class="ore">${f.ore}</span></label>` +
        `<output for="${id}" class="fc-val">0%</output></div>` +
        `<input type="range" id="${id}" min="-15" max="15" step="1" value="0" ` +
        `aria-describedby="${id}-s">` +
        `<p class="fc-scarto" id="${id}-s"></p>`;
      fasceBox.insertBefore(row, btnReset);
      const input = row.querySelector('input');
      input.addEventListener('input', () => {
        primaInterazione();
        const v = getRit().slice();
        v[i] = Number(input.value);
        ritocchi.set(keyCorrente(), v);
        aggiorna();
      });
      return { input, out: row.querySelector('output'), scarto: row.querySelector('.fc-scarto') };
    });

    btnReset.addEventListener('click', () => {
      primaInterazione();
      ritocchi.delete(keyCorrente());
      aggiorna();
    });
    [selZona, selGiorno].forEach(s => s.addEventListener('change', () => { primaInterazione(); aggiorna(); }));

    /* ---- calcoli ---- */
    function corretto(fc, rit) {
      return fc.map((v, i) => v * (1 + rit[Math.floor(i / 24)] / 100));
    }
    const mape = (f, a, da = 0, to = Q) => {
      let s = 0;
      for (let i = da; i < to; i++) s += Math.abs(f[i] - a[i]) / a[i];
      return (s / (to - da)) * 100;
    };
    const bias = (f, a, da, to) => {
      let s = 0;
      for (let i = da; i < to; i++) s += (f[i] - a[i]) / a[i];
      return (s / (to - da)) * 100;
    };
    const pct = (v, segno = true) => (segno && v > 0.05 ? '+' : '') + NF1.format(Math.abs(v) < 0.05 ? 0 : v).replace('-', '−') + '%';

    /* ---- grafico SVG ---- */
    const svg = svgEl('svg', { class: 'fc-svg', role: 'img' });
    const title = svgEl('title');
    svg.appendChild(title);
    plot.appendChild(svg);
    let geom = null;

    function niceStep(range, n) {
      const raw = range / n, mag = 10 ** Math.floor(Math.log10(raw)), r = raw / mag;
      return (r >= 5 ? 10 : r >= 2 ? 5 : r >= 1 ? 2 : 1) * mag;
    }

    function disegna(dati, corr) {
      const W = Math.max(260, Math.round(plot.clientWidth || 600));
      const narrow = W < 520;
      const H = narrow ? 250 : 330;
      const m = { l: narrow ? 46 : 56, r: 10, t: 24, b: 26 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const all = dati.cons.concat(dati.fc, corr);
      let lo = Math.min(...all), hi = Math.max(...all);
      const step = niceStep(hi - lo, narrow ? 4 : 5);
      lo = Math.floor((lo - (hi - lo) * 0.04) / step) * step;
      hi = Math.ceil((hi + (hi - lo) * 0.03) / step) * step;
      const x = (i) => m.l + (i / (Q - 1)) * iw;
      const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
      geom = { W, H, m, iw, ih, x, y };

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild);

      // fasce
      const gF = svgEl('g', { class: 'fc-bands' });
      FASCE.forEach((f, i) => {
        const x0 = m.l + (f.da / Q) * iw, x1 = m.l + (f.a / Q) * iw;
        if (i % 2 === 0) gF.appendChild(svgEl('rect', { x: x0, y: m.t, width: x1 - x0, height: ih, class: 'band' }));
        const t = svgEl('text', { x: (x0 + x1) / 2, y: m.t - 8, 'text-anchor': 'middle', class: 'band-lbl' });
        t.textContent = narrow ? f.breve : f.nome.toLowerCase();
        gF.appendChild(t);
      });
      svg.appendChild(gF);

      // griglia e assi
      const gA = svgEl('g', { class: 'fc-axes' });
      for (let v = lo; v <= hi + step / 2; v += step) {
        gA.appendChild(svgEl('line', { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v), class: 'grid' }));
        const t = svgEl('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' });
        t.textContent = NF0.format(v);
        gA.appendChild(t);
      }
      for (let h = 0; h <= 24; h += narrow ? 6 : 3) {
        const xi = m.l + (h / 24) * iw;
        gA.appendChild(svgEl('line', { x1: xi, x2: xi, y1: m.t + ih, y2: m.t + ih + 4, class: 'axis' }));
        const t = svgEl('text', { x: xi, y: H - 6, 'text-anchor': h === 0 ? 'start' : h === 24 ? 'end' : 'middle', class: 'tick' });
        t.textContent = String(h).padStart(2, '0') + ':00';
        gA.appendChild(t);
      }
      gA.appendChild(svgEl('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: 'axis' }));
      const u = svgEl('text', { x: m.l - 6, y: m.t - 8, 'text-anchor': 'end', class: 'tick unit' });
      u.textContent = 'MW';
      gA.appendChild(u);
      svg.appendChild(gA);

      // linee
      const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
      // il forecast originale (tratteggiato) sta sopra: senza ritocchi resta visibile sul corretto
      svg.appendChild(svgEl('path', { d: path(corr), class: 'ln ln-corr' }));
      svg.appendChild(svgEl('path', { d: path(dati.cons), class: 'ln ln-cons' }));
      svg.appendChild(svgEl('path', { d: path(dati.fc), class: 'ln ln-orig' }));

      // cursore
      const gC = svgEl('g', { class: 'fc-cursor' });
      gC.appendChild(svgEl('line', { y1: m.t, y2: m.t + ih, class: 'rule' }));
      ['cons', 'orig', 'corr'].forEach(c => gC.appendChild(svgEl('circle', { r: 4, class: 'dot dot-' + c })));
      svg.appendChild(gC);
      mostraCursore();
    }

    function mostraCursore(annuncia = false) {
      const gC = svg.querySelector('.fc-cursor');
      if (!gC || !geom) return;
      if (cursore == null) { gC.style.display = 'none'; tip.classList.remove('on'); tip.textContent = ''; return; }
      const { cons, fc } = genera(selZona.value, Number(selGiorno.value));
      const corr = corretto(fc, getRit());
      const i = cursore, xi = geom.x(i);
      gC.style.display = '';
      const rule = gC.querySelector('.rule');
      rule.setAttribute('x1', xi); rule.setAttribute('x2', xi);
      [['cons', cons], ['orig', fc], ['corr', corr]].forEach(([c, arr]) => {
        const d = gC.querySelector('.dot-' + c);
        d.setAttribute('cx', xi); d.setAttribute('cy', geom.y(arr[i]));
      });
      const hh = String(Math.floor(i / 4)).padStart(2, '0'), mm = String((i % 4) * 15).padStart(2, '0');
      const err = ((corr[i] - cons[i]) / cons[i]) * 100;
      tip.innerHTML =
        `<b>ore ${hh}:${mm}</b>` +
        `<span><i class="sw sw-orig"></i>forecast <em>${NF0.format(fc[i])}</em></span>` +
        `<span><i class="sw sw-corr"></i>corretto <em>${NF0.format(corr[i])}</em></span>` +
        `<span><i class="sw sw-cons"></i>consuntivo <em>${NF0.format(cons[i])}</em></span>` +
        `<span class="err">scarto corretto <em>${pct(err)}</em></span>`;
      tip.classList.add('on');
      if (annuncia) live.textContent = `Ore ${hh}:${mm}: forecast ${NF0.format(fc[i])}, corretto ${NF0.format(corr[i])}, consuntivo ${NF0.format(cons[i])} megawatt.`;
      // posizione: a destra del cursore, a sinistra se non c'è spazio
      const box = plot.getBoundingClientRect(), fig = plot.parentElement.getBoundingClientRect();
      const scale = box.width / geom.W;
      const px = (box.left - fig.left) + xi * scale;
      const tw = tip.offsetWidth;
      let left = px + 12;
      if (left + tw > fig.width) left = px - tw - 12;
      tip.style.left = Math.max(0, left) + 'px';
      tip.style.top = (box.top - fig.top + geom.m.t * scale + 4) + 'px';
    }

    function indiceDaEvento(ev) {
      const box = plot.getBoundingClientRect();
      const sx = ((ev.clientX - box.left) / box.width) * geom.W;
      const i = Math.round(((sx - geom.m.l) / geom.iw) * (Q - 1));
      return Math.min(Q - 1, Math.max(0, i));
    }
    plot.addEventListener('pointermove', (ev) => { if (!geom) return; cursore = indiceDaEvento(ev); mostraCursore(); });
    plot.addEventListener('pointerdown', (ev) => { if (!geom) return; primaInterazione(); cursore = indiceDaEvento(ev); mostraCursore(); });
    plot.addEventListener('pointerenter', primaInterazione, { once: true });
    plot.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') { cursore = null; mostraCursore(); } });
    plot.addEventListener('keydown', (ev) => {
      const passi = { ArrowRight: 1, ArrowLeft: -1, PageUp: 4, PageDown: -4 };
      if (ev.key in passi) {
        ev.preventDefault();
        primaInterazione();
        cursore = cursore == null ? 32 : Math.min(Q - 1, Math.max(0, cursore + passi[ev.key]));
        mostraCursore(true);
      } else if (ev.key === 'Home' || ev.key === 'End') {
        ev.preventDefault();
        cursore = ev.key === 'Home' ? 0 : Q - 1;
        mostraCursore(true);
      } else if (ev.key === 'Escape') { cursore = null; mostraCursore(); }
    });
    plot.addEventListener('blur', () => { cursore = null; mostraCursore(); });

    /* ---- aggiornamento ---- */
    function aggiorna() {
      const zona = selZona.value, giorno = Number(selGiorno.value);
      const dati = genera(zona, giorno);
      const rit = getRit();
      const corr = corretto(dati.fc, rit);
      const mO = mape(dati.fc, dati.cons), mC = mape(corr, dati.cons);
      const d = Math.round(mC * 10) / 10 - Math.round(mO * 10) / 10; // coerente con i valori mostrati

      outOrig.textContent = NF1.format(mO) + '%';
      outCorr.textContent = NF1.format(mC) + '%';
      const nulla = Math.abs(d) < 0.05;
      outDiff.innerHTML = nulla ? '0,0 pt <small>invariato</small>'
        : (d < 0 ? '−' : '+') + NF1.format(Math.abs(d)) + ' pt <small>' + (d < 0 ? 'meglio' : 'peggio') + '</small>';
      outDiff.dataset.esito = nulla ? '' : d < 0 ? 'meglio' : 'peggio';

      FASCE.forEach((f, i) => {
        const r = righe[i];
        r.input.value = rit[i];
        r.out.textContent = (rit[i] > 0 ? '+' : '') + String(rit[i]).replace('-', '−') + '%';
        r.input.setAttribute('aria-valuetext', r.out.textContent);
        const bO = bias(dati.fc, dati.cons, f.da, f.a), bC = bias(corr, dati.cons, f.da, f.a);
        r.scarto.innerHTML = `scarto medio <b>${pct(bO)}</b>` +
          (rit[i] ? ` → <b class="${Math.abs(bC) < Math.abs(bO) ? 'ok' : 'ko'}">${pct(bC)}</b>` : '');
      });
      btnReset.disabled = rit.every(v => v === 0);
      title.textContent = `Zona ${zona}, ${selGiorno.selectedOptions[0].textContent}: MAPE del forecast ${NF1.format(mO)}%, del forecast corretto ${NF1.format(mC)}%.`;
      disegna(dati, corr);
    }

    let rq = 0, ultimaW = 0;
    new ResizeObserver(() => {
      const w = Math.round(plot.clientWidth);
      if (w === ultimaW) return;
      ultimaW = w;
      cancelAnimationFrame(rq);
      rq = requestAnimationFrame(aggiorna);
    }).observe(plot);
    aggiorna();
  }

  /* ============================================================
     DEMO 2 — MAPPA DELLE TEMPERATURE (Open-Meteo dal vivo)
     ============================================================ */
  function initMappa() {
    const root = document.getElementById('demo-temperature');
    if (!root) return;
    const mapEl = root.querySelector('#tm-map');
    const poster = root.querySelector('#tm-poster');
    const posterMsg = root.querySelector('#tm-poster-msg');
    const status = root.querySelector('#tm-status');
    const legend = root.querySelector('#tm-legend');
    const selSchema = root.querySelector('#tm-schema');
    const selCitta = root.querySelector('#tm-citta');
    const outMedia = root.querySelector('#tm-media');
    const outCalda = root.querySelector('#tm-calda');
    const outFredda = root.querySelector('#tm-fredda');

    const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
    const SRI_JS = 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==';
    const SRI_CSS = 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw==';
    const API = 'https://api.open-meteo.com/v1/forecast';
    const CARTO_KEY = ''; // chiave CARTO Basemaps (facoltativa): se vuota si usano le tile OSM
    const CACHE_KEY = 'ab-demo-meteo-v1';
    const CACHE_TTL = 15 * 60 * 1000; // 15 minuti: rispetta i limiti gratuiti di Open-Meteo
    const ITALIA = [[36.55, 6.6], [47.1, 18.55]];
    const coarse = matchMedia('(pointer: coarse)').matches;
    const BINS = 8;

    const css = (name, fb) => (getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb);
    const hexToRgb = (hex) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
      if (!m) return null;
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const rgbStr = (c) => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');

    // Schemi: il primo nasce dai token del brand (accento freddo → accento caldo)
    function schemi() {
      const cold = hexToRgb(css('--accent', '#0c6780')) || [12, 103, 128];
      const warm = hexToRgb(css('--accent-warm', '#b45309')) || [180, 83, 9];
      // centro color sabbia (non bianco): i cerchi a metà scala restano visibili sulla mappa chiara
      const sand = [214, 190, 128];
      return {
        brand: [mix(cold, [0, 0, 0], 0.35), cold, mix(cold, [255, 255, 255], 0.45), sand, mix(warm, sand, 0.45), warm, mix(warm, [0, 0, 0], 0.4)],
        // ColorBrewer RdYlBu (invertita) e viridis: scale pubbliche e note
        termico: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'].map(hexToRgb),
        viridis: ['#440154', '#46327e', '#365c8d', '#277f8e', '#1fa187', '#4ac16d', '#a0da39', '#fde725'].map(hexToRgb),
      };
    }
    function campiona(stops, t) {
      const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
      const i = Math.min(stops.length - 2, Math.floor(x));
      return mix(stops[i], stops[i + 1], x - i);
    }

    let caricato = false, map = null, layer = null, tiles = null;
    let citta = [], valori = null, marker = new Map();

    function setStatus(text, tipo) {
      status.textContent = text;
      status.dataset.tipo = tipo || '';
    }

    function caricaLeaflet() {
      if (window.L && window.L.map) return Promise.resolve(window.L);
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET + 'leaflet.min.css';
        link.integrity = SRI_CSS;
        link.crossOrigin = 'anonymous';
        link.referrerPolicy = 'no-referrer';
        const cssOk = new Promise((ok) => { link.onload = ok; link.onerror = ok; });
        document.head.appendChild(link);
        const s = document.createElement('script');
        s.src = LEAFLET + 'leaflet.min.js';
        s.integrity = SRI_JS;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = () => cssOk.then(() => (window.L ? resolve(window.L) : reject(new Error('Leaflet assente'))));
        s.onerror = () => reject(new Error('Leaflet non caricato'));
        document.head.appendChild(s);
      });
    }

    async function getJSON(url, opts = {}) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeout || 9000);
      try {
        const r = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
      } finally { clearTimeout(timer); }
    }

    function leggiCache() {
      try {
        const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (c && Date.now() - c.salvato < CACHE_TTL && Array.isArray(c.valori) && c.valori.length === citta.length) return c;
      } catch { /* storage non disponibile */ }
      return null;
    }
    function scriviCache(obj) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch { /* ignora */ }
    }

    async function datiDalVivo() {
      const cached = leggiCache();
      if (cached) return cached;
      const qs = new URLSearchParams({
        latitude: citta.map(c => c.lat).join(','),
        longitude: citta.map(c => c.lon).join(','),
        current: 'temperature_2m',
        daily: 'temperature_2m_max,temperature_2m_min',
        timezone: 'Europe/Rome',
        forecast_days: '1',
      });
      const d = await getJSON(API + '?' + qs.toString());
      const arr = Array.isArray(d) ? d : [d];
      if (arr.length !== citta.length) throw new Error('risposta incompleta');
      const out = arr.map((x, i) => ({
        sigla: citta[i].sigla,
        t: x?.current?.temperature_2m,
        min: x?.daily?.temperature_2m_min?.[0],
        max: x?.daily?.temperature_2m_max?.[0],
      }));
      if (out.some(v => ![v.t, v.min, v.max].every(Number.isFinite))) throw new Error('valori mancanti');
      const res = { valori: out, generato: arr[0].current.time, salvato: Date.now(), fonte: 'live' };
      scriviCache(res);
      return res;
    }

    const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    function dataIt(iso, conGiorno = true) {
      // "2026-11-05T21:30" è già in ora italiana (timezone=Europe/Rome)
      const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
      if (!m) return iso || '';
      const ora = m[4] + ':' + m[5];
      return conGiorno ? `${Number(m[3])} ${MESI[Number(m[2]) - 1]} ${m[1]}, ${ora}` : ora;
    }

    const metrica = () => root.querySelector('input[name="tm-metrica"]:checked')?.value || 't';
    const NOMI_METRICA = { t: 'adesso', min: 'minima', max: 'massima' };
    const gradi = (v) => NF1.format(v).replace('-', '−') + ' °C';

    function scala(vals) {
      const lo0 = Math.min(...vals), hi0 = Math.max(...vals);
      const step = Math.max(0.5, Math.ceil(((hi0 - lo0) / BINS) * 2) / 2);
      const lo = Math.floor(lo0 / step) * step;
      let n = BINS;
      while (lo + step * n < hi0) n++;
      return { lo, step, n };
    }

    function disegnaLegenda(sc, stops) {
      legend.innerHTML = '';
      const ul = document.createElement('ol');
      for (let i = 0; i < sc.n; i++) {
        const li = document.createElement('li');
        li.style.setProperty('--c', rgbStr(campiona(stops, (i + 0.5) / sc.n)));
        li.innerHTML = `<span>${NF1.format(sc.lo + i * sc.step).replace('-', '−').replace(',0', '')}</span>`;
        ul.appendChild(li);
      }
      const end = document.createElement('li');
      end.className = 'end';
      end.innerHTML = `<span>${NF1.format(sc.lo + sc.n * sc.step).replace('-', '−').replace(',0', '')} °C</span>`;
      ul.appendChild(end);
      legend.appendChild(ul);
    }

    function raggio() {
      const z = map ? map.getZoom() : 5.5;
      return Math.max(5, Math.min(12, 5 + (z - 5.5) * 1.6));
    }

    function popupHtml(c, v) {
      const k = metrica();
      return `<div class="tm-pop"><strong>${c.nome}</strong><span class="sub">${c.sigla} · ${c.regione}</span>` +
        `<dl><div${k === 't' ? ' class="sel"' : ''}><dt>adesso</dt><dd>${gradi(v.t)}</dd></div>` +
        `<div${k === 'min' ? ' class="sel"' : ''}><dt>minima</dt><dd>${gradi(v.min)}</dd></div>` +
        `<div${k === 'max' ? ' class="sel"' : ''}><dt>massima</dt><dd>${gradi(v.max)}</dd></div></dl></div>`;
    }

    function aggiornaVista() {
      if (!valori) return;
      const k = metrica();
      const stops = schemi()[selSchema.value] || schemi().brand;
      const vals = valori.map(v => v[k]);
      const sc = scala(vals);
      disegnaLegenda(sc, stops);

      // riepilogo
      const media = vals.reduce((a, b) => a + b, 0) / vals.length;
      let iMax = 0, iMin = 0;
      vals.forEach((v, i) => { if (v > vals[iMax]) iMax = i; if (v < vals[iMin]) iMin = i; });
      outMedia.textContent = gradi(media);
      outCalda.innerHTML = `${gradi(vals[iMax])} <small>${citta[iMax].nome}</small>`;
      outFredda.innerHTML = `${gradi(vals[iMin])} <small>${citta[iMin].nome}</small>`;
      root.querySelector('#tm-kpi').setAttribute('aria-label', `Temperatura ${NOMI_METRICA[k]}`);

      if (!map) return;
      const bordo = css('--ink', '#1f2430');
      const r = raggio();
      citta.forEach((c, i) => {
        const v = valori[i];
        const bin = Math.min(sc.n - 1, Math.max(0, Math.floor((v[k] - sc.lo) / sc.step)));
        const col = rgbStr(campiona(stops, (bin + 0.5) / sc.n));
        let mk = marker.get(c.sigla);
        if (!mk) {
          mk = L.circleMarker([c.lat, c.lon], { radius: r, weight: 1, color: bordo, opacity: 0.7, fillOpacity: 0.92, fillColor: col });
          mk.bindPopup(() => popupHtml(c, valori[i]), { closeButton: true, autoPanPadding: [16, 16] });
          mk.bindTooltip(`${c.nome} ${gradi(v[k])}`, { direction: 'top', offset: [0, -4] });
          mk.addTo(layer);
          marker.set(c.sigla, mk);
        } else {
          mk.setStyle({ fillColor: col, color: bordo });
          mk.setTooltipContent(`${c.nome} ${gradi(v[k])}`);
          if (mk.isPopupOpen()) mk.setPopupContent(popupHtml(c, v));
        }
      });
    }

    function stileTiles() {
      // tile chiare o scure in base al token --bg (tema/brand); il colore calcolato del body
      // non basta perché è in transizione subito dopo il cambio di tema
      const bg = hexToRgb(css('--bg', '')) ||
        (getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g) || [255, 255, 255]).map(Number);
      const [r, g, b] = bg;
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return lum < 0.45 ? 'dark' : 'light';
    }
    // Basemap: CARTO light/dark se è configurata una chiave (gratuita per uso non commerciale,
    // da carto.com/basemaps/apikey: senza chiave le tile mostrano "API key required");
    // altrimenti le tile standard di OpenStreetMap, rese neutre (grigie o scure) via CSS.
    const urlTiles = (st) => CARTO_KEY
      ? `https://{s}.basemaps.cartocdn.com/${st === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
    const ATTR = CARTO_KEY ? OSM_ATTR + ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>' : OSM_ATTR;

    function creaMappa(L) {
      map = L.map(mapEl, {
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        minZoom: 4.5,
        maxZoom: 11,
        scrollWheelZoom: false,      // la rotella scorre la pagina, non la mappa
        dragging: !coarse,           // su touch: un dito scorre la pagina, due dita spostano/zoomano
        touchZoom: true,
        zoomAnimation: !reduced,
        fadeAnimation: !reduced,
        markerZoomAnimation: !reduced,
        maxBounds: [[33.5, 2.5], [49.5, 22.5]],
        maxBoundsViscosity: 0.8,
      });
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      let st = stileTiles();
      mapEl.dataset.tiles = CARTO_KEY ? 'carto' : 'osm';
      mapEl.dataset.scheme = st;
      tiles = L.tileLayer(urlTiles(st), {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: ATTR,
      }).addTo(map);
      layer = L.layerGroup().addTo(map);
      map.fitBounds(ITALIA, { padding: [6, 6], animate: false });
      map.on('zoomend', () => { const r = raggio(); marker.forEach(m => m.setRadius(r)); });
      // se cambia il tema della pagina (es. data-theme), cambiano anche le tile e i bordi
      new MutationObserver(() => {
        const nuovo = stileTiles();
        if (nuovo !== st) { st = nuovo; mapEl.dataset.scheme = st; tiles.setUrl(urlTiles(st)); }
        aggiornaVista();
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-brand'] });
      new ResizeObserver(() => map.invalidateSize({ animate: false })).observe(mapEl);
      if (coarse) root.classList.add('is-touch');
    }

    async function avvia() {
      if (caricato) return;
      caricato = true;
      setStatus('carico i dati da Open-Meteo…', 'load');
      try {
        const doc = await getJSON(ASSETS + 'capoluoghi.json');
        citta = doc.capoluoghi;
      } catch {
        setStatus('dati non disponibili', 'err');
        posterMsg.textContent = 'Non riesco a caricare l\'elenco dei capoluoghi.';
        return;
      }

      // dati (dal vivo o di esempio) e Leaflet in parallelo
      const pDati = datiDalVivo().catch(async () => {
        const snap = await getJSON(ASSETS + 'temperature-esempio.json');
        const per = new Map(snap.valori.map(v => [v.sigla, v]));
        return { valori: citta.map(c => per.get(c.sigla)), generato: snap.generato, fonte: 'esempio' };
      });
      // il catch subito evita "Uncaught (in promise)" se Leaflet fallisce prima che i dati arrivino
      const pLeaflet = caricaLeaflet().catch(() => null);

      let dati;
      try { dati = await pDati; } catch {
        setStatus('dati non disponibili', 'err');
        posterMsg.textContent = 'Open-Meteo non risponde e l\'istantanea di esempio non si è caricata.';
        return;
      }
      valori = dati.valori;
      if (dati.fonte === 'live') setStatus('dal vivo · rilevazione delle ' + dataIt(dati.generato, false), 'live');
      else setStatus('dati di esempio del ' + dataIt(dati.generato), 'esempio');

      // elenco città per la ricerca (accessibile da tastiera)
      const ordinate = citta.map((c, i) => [c, i]).sort((a, b) => a[0].nome.localeCompare(b[0].nome, 'it'));
      ordinate.forEach(([c]) => {
        const o = document.createElement('option');
        o.value = c.sigla;
        o.textContent = `${c.nome} (${c.sigla})`;
        selCitta.appendChild(o);
      });
      selCitta.disabled = false;

      aggiornaVista();

      try {
        const L = await pLeaflet;
        if (!L) throw new Error('Leaflet non disponibile');
        creaMappa(L);
        aggiornaVista();
        poster.hidden = true;
        root.classList.add('is-ready');
        track('demo-temperature');
      } catch {
        posterMsg.textContent = 'La mappa non si è caricata (libreria bloccata o rete assente): i valori qui sotto restano validi.';
      }
    }

    // interazioni
    root.querySelectorAll('input[name="tm-metrica"]').forEach(r => r.addEventListener('change', aggiornaVista));
    selSchema.addEventListener('change', aggiornaVista);
    selCitta.addEventListener('change', () => {
      const sigla = selCitta.value;
      if (!sigla || !valori) return;
      const i = citta.findIndex(c => c.sigla === sigla);
      const mk = marker.get(sigla);
      if (map && mk) {
        map.setView(mk.getLatLng(), Math.max(map.getZoom(), 7), { animate: false });
        mk.openPopup();
      } else if (i >= 0) {
        const v = valori[i], k = metrica();
        posterMsg.textContent = `${citta[i].nome}: ${NOMI_METRICA[k]} ${gradi(v[k])} (min ${gradi(v.min)}, max ${gradi(v.max)})`;
      }
    });

    // caricamento pigro: Leaflet e dati solo quando la sezione si avvicina
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) { io.disconnect(); avvia(); }
      }, { rootMargin: '300px 0px' });
      io.observe(root);
    } else {
      avvia();
    }
  }

  const start = () => { initForecast(); initMappa(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
