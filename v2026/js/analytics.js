/* ============================================================
   Analytics privacy-friendly via GoatCounter.
   - Nessun cookie, nessun dato personale, nessun fingerprinting.
   - Traccia: visite alle pagine, tempo di permanenza (a fasce),
     eventi custom (es. edizione scelta, versione gioco, partite).
   - In locale (localhost) non invia nulla: logga in console.

   ATTIVAZIONE: crea un account gratuito su goatcounter.com con
   codice sito uguale a SITE qui sotto. Fatto. I dati appaiono su
   https://<SITE>.goatcounter.com
   ============================================================ */
(() => {
  'use strict';

  const SITE = 'alessandro385'; // codice sito GoatCounter
  const ENDPOINT = 'https://' + SITE + '.goatcounter.com/count';

  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  // Auto-esclusione del proprietario: visita il sito con #non-contarmi
  // una sola volta e quel browser non verrà più conteggiato.
  // Per riattivarti: visita con #contami.
  try {
    if (location.hash === '#non-contarmi') {
      localStorage.setItem('ab-no-track', '1');
      alert('Statistiche: questo browser non verrà più conteggiato.');
    } else if (location.hash === '#contami') {
      localStorage.removeItem('ab-no-track');
      alert('Statistiche: questo browser torna a essere conteggiato.');
    }
    if (localStorage.getItem('ab-no-track') === '1') return;
  } catch { /* storage non disponibile: si continua normalmente */ }

  // Dentro un iframe (es. gioco embeddato nella presentazione) il
  // pageview lo conta già la pagina madre: qui inviamo solo eventi.
  const inIframe = window.self !== window.top;

  /** Invio di un hit a GoatCounter (GET, niente cookie). */
  function send(path, title, isEvent) {
    const params = new URLSearchParams({
      p: path,
      t: title || document.title,
      r: document.referrer || '',
      rnd: Math.random().toString(36).slice(2), // anti-cache
    });
    if (isEvent) params.set('e', 'true');
    const url = ENDPOINT + '?' + params.toString();

    if (isLocal) {
      console.log('[analytics:local]', isEvent ? 'evento' : 'pagina', path);
      return;
    }
    // fetch keepalive sopravvive alla chiusura della pagina (per pagehide)
    try {
      fetch(url, { mode: 'no-cors', keepalive: true, credentials: 'omit' });
    } catch {
      const img = new Image();
      img.src = url;
    }
  }

  /** API globale per gli eventi custom: abTrack('nome-evento') */
  window.abTrack = (name) => send('evento/' + name, name, true);

  // ---- Pageview ----
  if (!inIframe) send(location.pathname, document.title, false);

  // ---- Tempo di permanenza (a fasce, inviato quando si lascia la pagina) ----
  if (!inIframe) {
    const t0 = Date.now();
    let sent = false;
    const sendTime = () => {
      if (sent) return;
      sent = true;
      const s = Math.round((Date.now() - t0) / 1000);
      const fascia =
        s < 10 ? '00-10s' :
        s < 30 ? '10-30s' :
        s < 60 ? '30-60s' :
        s < 180 ? '1-3min' :
        s < 600 ? '3-10min' : 'oltre-10min';
      send('tempo' + location.pathname + '/' + fascia, 'Tempo: ' + fascia, true);
    };
    addEventListener('pagehide', sendTime);
    // Fallback per browser/percorsi dove pagehide non scatta
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendTime();
    });
  }

  // ---- Eventi automatici sui link marcati ----
  // Qualsiasi elemento con data-track="nome" invia l'evento al click.
  addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el) window.abTrack(el.dataset.track);
  });
})();
