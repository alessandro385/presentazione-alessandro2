// I 5 livelli del gioco: PURI DATI.
// Aggiungere o ribilanciare un livello = modificare solo questo file.
//
//  lunghezzaMetri  distanza da percorrere prima del boss
//  sfondo          palette cielo, tipo di decorazioni parallax, aurora, neve
//  spawn           tabella pesata di archetipi + curva dell'intervallo di spawn
//                  (da intervalloIniziale a intervalloFinale lungo il livello)
//  eventi          eventi speciali a una certa frazione di avanzamento
//  boss            configurazione del boss con fasi a soglie di HP
//                  (sotto: frazione di HP sotto la quale la fase NON è più attiva)

export const LEVELS = [
  {
    id: 1,
    nome: 'Villaggio Innevato',
    lunghezzaMetri: 1000,
    sfondo: {
      cieloTop: '#0a0e1a', cieloBottom: '#1c2547',
      decor: 'villaggio', decorColori: ['#161e3c', '#243260'],
      luci: '#fbbf24',
      aurora: ['#34d399', '#22d3ee'], auroraIntensita: 0.30,
      neve: 0.5,
    },
    spawn: {
      intervalloIniziale: 2.0, intervalloFinale: 1.15,
      tabella: [
        { id: 'albero', peso: 5 },
        { id: 'pupazzo', peso: 3 },
        { id: 'stalattite', peso: 1 },
      ],
    },
    eventi: [{ at: 0.55, tipo: 'pioggiaRegali' }],
    boss: {
      nome: 'Grinch Esploratore', aspetto: 'grinch', hp: 35, punti: 2000,
      dimensione: 55, colore: '#34d399', velocita: 80,
      fasi: [
        { sotto: 1.00, pattern: ['ventaglio'], cooldown: 3.4, velocitaMult: 1.0 },
        { sotto: 0.55, pattern: ['ventaglio', 'raffica'], cooldown: 2.9, velocitaMult: 1.1 },
        { sotto: 0.22, pattern: ['raffica'], cooldown: 2.5, velocitaMult: 1.25 },
      ],
    },
  },
  {
    id: 2,
    nome: 'Foresta Incantata',
    lunghezzaMetri: 1250,
    sfondo: {
      cieloTop: '#081118', cieloBottom: '#123236',
      decor: 'foresta', decorColori: ['#0e2a26', '#17413a'],
      luci: '#34d399',
      aurora: ['#34d399', '#a3e635'], auroraIntensita: 0.42,
      neve: 0.7,
    },
    spawn: {
      intervalloIniziale: 1.8, intervalloFinale: 1.0,
      tabella: [
        { id: 'albero', peso: 4 },
        { id: 'pupazzo', peso: 3 },
        { id: 'folletto', peso: 3 },
        { id: 'corvo', peso: 2 },
      ],
    },
    eventi: [{ at: 0.5, tipo: 'pioggiaRegali' }],
    boss: {
      nome: 'Guardiano della Foresta', aspetto: 'guardiano', hp: 55, punti: 3000,
      dimensione: 60, colore: '#4ade80', velocita: 90,
      fasi: [
        { sotto: 1.00, pattern: ['ventaglio'], cooldown: 2.9, velocitaMult: 1.0 },
        { sotto: 0.65, pattern: ['raffica', 'ventaglio'], cooldown: 2.5, velocitaMult: 1.15 },
        { sotto: 0.30, pattern: ['muro', 'evocazione'], cooldown: 2.2, velocitaMult: 1.35 },
      ],
    },
  },
  {
    id: 3,
    nome: 'Città Illuminata',
    lunghezzaMetri: 1500,
    sfondo: {
      cieloTop: '#0d0a1f', cieloBottom: '#2a1f56',
      decor: 'citta', decorColori: ['#1b1640', '#2c2468'],
      luci: '#fbbf24',
      aurora: ['#6366f1', '#a78bfa'], auroraIntensita: 0.36,
      neve: 0.4,
    },
    spawn: {
      intervalloIniziale: 1.6, intervalloFinale: 0.9,
      tabella: [
        { id: 'pupazzo', peso: 3 },
        { id: 'folletto', peso: 4 },
        { id: 'corvo', peso: 3 },
        { id: 'drone', peso: 2 },
        { id: 'stalattite', peso: 2 },
      ],
    },
    eventi: [{ at: 0.35, tipo: 'pioggiaRegali' }, { at: 0.75, tipo: 'pioggiaRegali' }],
    boss: {
      nome: 'Sindaco di Ghiaccio', aspetto: 'sindaco', hp: 80, punti: 4500,
      dimensione: 62, colore: '#a78bfa', velocita: 100,
      fasi: [
        { sotto: 1.00, pattern: ['raffica', 'ventaglio'], cooldown: 2.6, velocitaMult: 1.0 },
        { sotto: 0.66, pattern: ['muro', 'raffica'], cooldown: 2.3, velocitaMult: 1.2 },
        { sotto: 0.33, pattern: ['pioggia', 'muro'], cooldown: 2.0, velocitaMult: 1.4 },
      ],
    },
  },
  {
    id: 4,
    nome: 'Vette Ghiacciate',
    lunghezzaMetri: 1750,
    sfondo: {
      cieloTop: '#06121f', cieloBottom: '#143a52',
      decor: 'vette', decorColori: ['#10293d', '#1d4663'],
      luci: '#7dd3fc',
      aurora: ['#22d3ee', '#67e8f9'], auroraIntensita: 0.48,
      neve: 1.0,
    },
    spawn: {
      intervalloIniziale: 1.45, intervalloFinale: 0.8,
      tabella: [
        { id: 'stalattite', peso: 4 },
        { id: 'corvo', peso: 3 },
        { id: 'drone', peso: 3 },
        { id: 'folletto', peso: 2 },
        { id: 'globo', peso: 2 },
      ],
    },
    eventi: [{ at: 0.5, tipo: 'pioggiaRegali' }],
    boss: {
      nome: 'Colosso delle Vette', aspetto: 'colosso', hp: 110, punti: 6000,
      dimensione: 68, colore: '#38bdf8', velocita: 105,
      fasi: [
        { sotto: 1.00, pattern: ['ventaglio', 'muro'], cooldown: 2.4, velocitaMult: 1.0 },
        { sotto: 0.66, pattern: ['pioggia', 'raffica'], cooldown: 2.1, velocitaMult: 1.25 },
        { sotto: 0.33, pattern: ['muro', 'pioggia', 'evocazione'], cooldown: 1.9, velocitaMult: 1.45 },
      ],
    },
  },
  {
    id: 5,
    nome: 'Cielo Artico',
    lunghezzaMetri: 2000,
    sfondo: {
      cieloTop: '#05070f', cieloBottom: '#171c3a',
      decor: 'cielo', decorColori: ['#121730', '#1e2547'],
      luci: '#e0e7ff',
      aurora: ['#34d399', '#22d3ee', '#a78bfa'], auroraIntensita: 0.65,
      neve: 0.3,
    },
    spawn: {
      intervalloIniziale: 1.3, intervalloFinale: 0.7,
      tabella: [
        { id: 'corvo', peso: 3 },
        { id: 'drone', peso: 3 },
        { id: 'folletto', peso: 3 },
        { id: 'globo', peso: 3 },
        { id: 'stalattite', peso: 3 },
      ],
    },
    eventi: [{ at: 0.4, tipo: 'pioggiaRegali' }, { at: 0.8, tipo: 'pioggiaRegali' }],
    boss: {
      nome: 'Il Grinch', aspetto: 'grinchfinale', hp: 150, punti: 10000,
      dimensione: 75, colore: '#84cc16', velocita: 115,
      fasi: [
        { sotto: 1.00, pattern: ['ventaglio', 'raffica'], cooldown: 2.2, velocitaMult: 1.0 },
        { sotto: 0.75, pattern: ['muro', 'evocazione'], cooldown: 2.0, velocitaMult: 1.2 },
        { sotto: 0.50, pattern: ['pioggia', 'raffica', 'muro'], cooldown: 1.8, velocitaMult: 1.4 },
        { sotto: 0.25, pattern: ['pioggia', 'muro', 'evocazione'], cooldown: 1.65, velocitaMult: 1.6 },
      ],
    },
  },
];
