// Funzioni di utilità condivise.

export const TAU = Math.PI * 2;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function chance(p) {
  return Math.random() < p;
}

export function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

// Estrae un elemento da una lista di voci { peso, ... } in modo pesato.
export function weightedPick(entries) {
  let total = 0;
  for (const e of entries) total += e.peso;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.peso;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function formatScore(n) {
  return n.toLocaleString('it-IT');
}
