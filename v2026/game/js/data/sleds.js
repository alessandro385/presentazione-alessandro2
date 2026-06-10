// Le tre slitte selezionabili. Puri dati: aggiungere una slitta = aggiungere una voce.

export const SLEDS = [
  {
    id: 'classica',
    nome: 'Classica',
    desc: 'La slitta di sempre: equilibrata e affidabile.',
    vite: 3,
    velocita: 1.0,   // moltiplicatore velocità di movimento
    fuoco: 1.0,      // moltiplicatore cadenza di fuoco
    colore: '#f87171',
    statistiche: { Velocità: 0.6, Fuoco: 0.6, Difesa: 0.6 },
  },
  {
    id: 'turbo',
    nome: 'Turbo',
    desc: 'Scattante e letale, ma fragile: solo 2 vite.',
    vite: 2,
    velocita: 1.3,
    fuoco: 1.2,
    colore: '#22d3ee',
    statistiche: { Velocità: 1.0, Fuoco: 0.8, Difesa: 0.3 },
  },
  {
    id: 'corazzata',
    nome: 'Corazzata',
    desc: 'Lenta ma indistruttibile: parte con 4 vite.',
    vite: 4,
    velocita: 0.8,
    fuoco: 0.9,
    colore: '#34d399',
    statistiche: { Velocità: 0.35, Fuoco: 0.5, Difesa: 1.0 },
  },
];

export function getSled(id) {
  return SLEDS.find((s) => s.id === id) || SLEDS[0];
}
