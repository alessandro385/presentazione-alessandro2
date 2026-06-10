// Bootstrap: collega viewport, input, gioco e game loop.

import { Viewport } from './core/viewport.js';
import { Input } from './core/input.js';
import { GameLoop } from './core/loop.js';
import { audio } from './core/audio.js';
import { Game } from './game.js';

function boot() {
  const canvas = document.getElementById('game-canvas');
  const viewport = new Viewport(canvas);
  const input = new Input();
  const game = new Game(viewport, input);

  // Sblocca l'audio al primo gesto (richiesto dai browser)
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  const loop = new GameLoop(
    (dt) => game.update(dt),
    (alpha, rawDt) => game.render(alpha, rawDt),
  );
  loop.start();

  // Handle di debug (ispezione da console, nessun impatto sul gioco)
  window.__game = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
