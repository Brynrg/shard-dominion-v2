// Entry point. Wires the Phaser game, the timer, and the HUD.
//
// Ticket 1.1: Purge the Rogue Canvas Loops
// Main.ts now uses Phaser.Game instead of raw HTML5 canvas loop.

import Phaser from 'phaser';
import { MainMapScene } from './scenes/MainMap';
import { SpeedrunTimer, createHUD, createStorage } from 'speedrungames-sdk';
import './styles.css';

// Must match game.manifest.json#slug. `pnpm new:game` substitutes this.
const SLUG: string = "shard-dominion-v2";
const UNSET_SLUG = "__SLUG__";

const root = document.getElementById("app");
if (!root) throw Error("#app element missing in index.html");

const hud = createHUD(root);
const timer = new SpeedrunTimer();
const storage = createStorage(SLUG === UNSET_SLUG ? "template-demo" : SLUG);

const pb = storage.getPB();
hud.setPB(pb?.ms ?? null);
hud.setStatus("Shard Dominion v2 - Initializing systems...");

timer.subscribe((ms, state) => hud.setTime(ms, state));

// ─── Game Configuration ─────────────────────────────────────────────────────

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  backgroundColor: '#1a1a2e',
  scene: [MainMapScene],
  scale: {
    mode: Phaser.Scale.ScaleModes.FIT
  }
};

// Initialize and start the game
function initializeGame(): void {
  console.log("Initializing Shard Dominion v2 with Phaser...");
  
  new Phaser.Game(config);
  
  console.log("Phaser game started!");
}

// Initialize game (bootstrapped by Vite)
initializeGame();