// Definizione dei power-up: puri dati + etichette per l'HUD.

export const POWERUPS = {
  triplo:  { nome: 'Sparo Triplo',  etichetta: 'TRIPLO',   colore: '#22d3ee', durata: 10 },
  rapido:  { nome: 'Fuoco Rapido',  etichetta: 'RAPIDO',   colore: '#fbbf24', durata: 10 },
  scudo:   { nome: 'Scudo',         etichetta: 'SCUDO',    colore: '#6366f1', durata: 12 },
  vita:    { nome: 'Vita Extra',    etichetta: 'VITA',     colore: '#f87171', durata: 0 },
  x2:      { nome: 'Punti ×2',      etichetta: 'PUNTI ×2', colore: '#a78bfa', durata: 12 },
  magnete: { nome: 'Magnete Regali', etichetta: 'MAGNETE', colore: '#34d399', durata: 12 },
};

// Tipi pescabili a caso quando un nemico rilascia un power-up.
export const POWERUP_DROP_TABLE = [
  { tipo: 'triplo', peso: 4 },
  { tipo: 'rapido', peso: 4 },
  { tipo: 'scudo', peso: 3 },
  { tipo: 'x2', peso: 3 },
  { tipo: 'magnete', peso: 3 },
  { tipo: 'vita', peso: 1 },
];
