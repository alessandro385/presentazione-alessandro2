/* Portfolio 2026 — interazioni */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Temi ---------- */
  const THEMES = ['aurora', 'lumen', 'ember'];
  const root = document.documentElement;

  function setTheme(name, save = true) {
    if (!THEMES.includes(name)) name = 'aurora';
    root.dataset.theme = name;
    document.querySelectorAll('[data-set-theme]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.setTheme === name));
    });
    if (save) {
      try { localStorage.setItem('ab-theme-2026', name); } catch { /* storage non disponibile */ }
    }
  }

  // Le pagine con data-brand hanno una palette fissa coerente con
  // l'app presentata: non applicare il tema salvato dell'utente.
  const hasBrand = !!root.dataset.brand;
  if (!hasBrand) {
    try {
      const saved = localStorage.getItem('ab-theme-2026');
      if (saved) setTheme(saved, false);
    } catch { /* ignora */ }
  }

  document.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.setTheme));
  });

  /* ---------- Menu mobile ---------- */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Typewriter ruoli ---------- */
  const roles = [
    'AI Operations & Supply Chain Specialist @ Dog Heroes',
    'Sviluppatore di dashboard & automazioni dati',
    'Data Analyst — Python · SQL · Streamlit',
    'Demand planner della linea freschi 🐶',
  ];
  const tw = document.getElementById('typewriter');
  if (tw) {
    if (reduced) {
      tw.textContent = roles[0];
    } else {
      let ri = 0, ci = 0, deleting = false;
      (function tick() {
        const word = roles[ri];
        ci += deleting ? -1 : 1;
        tw.textContent = word.slice(0, ci);
        let delay = deleting ? 28 : 52;
        if (!deleting && ci === word.length) { delay = 2200; deleting = true; }
        else if (deleting && ci === 0) { deleting = false; ri = (ri + 1) % roles.length; delay = 350; }
        setTimeout(tick, delay);
      })();
    }
  }

  /* ---------- Reveal allo scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => obs.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- Contatori hero ---------- */
  const counters = document.querySelectorAll('[data-count]');
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '+';
    if (reduced) { el.textContent = target + suffix; return; }
    const dur = 1400;
    const t0 = performance.now();
    (function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    const cObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animateCount(e.target); cObs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => cObs.observe(el));
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Glow segui-mouse sulle card ---------- */
  document.querySelectorAll('.skill-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Link attivo in navbar ---------- */
  const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
  const sections = [...navLinks].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => navObs.observe(s));
  }
})();
