// Entry point. Wires the canvas, the game loop, the timer, and the HUD.
//
// This file implements the Shard Dominion v2 game from the Execution Manifest v2.0:
// - ECS architecture
// - Veterancy system (Basic -> Veteran -> Elite -> Heroic)
// - Hazard zones (Aether Burn)
// - 100x100 isometric grid
// - Core RTS systems: terrain, movement, economy, combat

import Phaser from 'phaser';
import { MainMapScene } from './scenes/MainMap';
import { GridManager } from './core/GridManager';
import { EntityManager } from './ecs/EntityManager';
import { DataLoader } from './data/DataLoader';
import { PositionComponent, RenderableComponent, VelocityComponent, MovementComponent } from './ecs/Component';
import { CombatSystem } from './systems/CombatSystem';
import { EconomySystem } from './systems/EconomySystem';
import { SpeedrunTimer, createHUD, createStorage } from 'speedrungames-sdk';
import './styles.css';

// Must match game.manifest.json#slug. `pnpm new:game` substitutes this.
const SLUG: string = "shard-dominion-v2";
const UNSET_SLUG = "__SLUG__";

const root = document.getElementById("app");
if (!root) throw new Error("#app element missing in index.html");

const hud = createHUD(root);
const timer = new SpeedrunTimer();
const storage = createStorage(SLUG === UNSET_SLUG ? "template-demo" : SLUG);

const pb = storage.getPB();
hud.setPB(pb?.ms ?? null);
hud.setStatus("Shard Dominion v2 - Initializing systems...");

timer.subscribe((ms, state) => hud.setTime(ms, state));

// ─── Game Implementation ─────────────────────────────────────────────────────

// Game state
const gameState = {
  gridSize: 100,
  cellSize: 32,
  selectedEntity: null as number | null,
  globalCredits: 1000,
  isPaused: false,
  lastTime: 0
};

// Systems
let gridManager: GridManager;
let entityManager: EntityManager;
let dataLoader: DataLoader;
let combatSystem: CombatSystem;
let economySystem: EconomySystem;


// Initialize game systems
async function initializeGame(): Promise<void> {
  console.log("Initializing Shard Dominion v2 systems...");

  // Initialize core systems
  gridManager = new GridManager();
  entityManager = new EntityManager();
  dataLoader = new DataLoader();
  combatSystem = new CombatSystem(entityManager);
  economySystem = new EconomySystem(entityManager);

  // Load faction data
  await dataLoader.load();

  // Set up initial entities
  setupInitialEntities();

  // Set up grid for demonstration
  setupGrid();

  // Create Phaser game with MainMapScene
  const gameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: [MainMapScene]
  };
  
  console.log("Game systems initialized!");
}

function setupInitialEntities(): void {
  // Spawn basic units for demonstration
  const harvester = entityManager.createEntity([
    new PositionComponent(100, 100),
    new VelocityComponent(0, 0, 1.5),
    new MovementComponent([], 0, 1.5, false),
    new RenderableComponent(undefined, 24, 24, '#00ff00')
  ]);
  
  const tank = entityManager.createEntity([
    new PositionComponent(200, 150),
    new VelocityComponent(0, 0, 2.2),
    new MovementComponent([], 0, 2.2, false),
    new RenderableComponent(undefined, 30, 30, '#00ccff')
  ]);
  
  console.log("Spawned initial units:", harvester, tank);
}

function setupGrid(): void {
  // Add some obstacles to the grid
  for (let x = 30; x < 40; x++) {
    for (let y = 20; y < 25; y++) {
      gridManager.setWalkable(x, y, false); // Create a building placement
    }
  }
  
  // Add some hazard zones
  gridManager.setHazardZone(50, 50, true);
  gridManager.setHazardZone(51, 50, true);
  gridManager.setHazardZone(50, 51, true);
  gridManager.setHazardZone(51, 51, true);
  console.log("Set up grid with obstacles and hazards");
}

// Game loop
let frameCount = 0;
function gameLoop(currentTime: number): void {
  if (!gameState.lastTime) gameState.lastTime = currentTime;
  const deltaTime = currentTime - gameState.lastTime;
  gameState.lastTime = currentTime;
  
  // Update game systems
  updateGame(deltaTime);
  
  frameCount++;
  
  // Update HUD status every 60 frames (~1 second)
  if (frameCount % 60 === 0) {
    hud.setStatus(`ECS active: ${entityManager.getEntityCount()} entities | Grid: ${gameState.gridSize}x${gameState.gridSize}`);
  }
}

function updateGame(deltaTime: number): void {
  // Update all entities with velocity
  entityManager.getAllEntities().forEach((_, entityId) => {
    const position = entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    const velocity = entityManager.getComponent<VelocityComponent>(entityId, VelocityComponent);

    if (position && velocity) {
      // Simple movement demo - units wander slowly
      if (frameCount % 120 === 0) { // Change direction every 2 seconds
        velocity.vx = (Math.random() - 0.5) * 2;
        velocity.vy = (Math.random() - 0.5) * 2;
      }

      position.x += velocity.vx * velocity.speed * deltaTime / 16; // 16ms = 60fps
      position.y += velocity.vy * velocity.speed * deltaTime / 16;

      // Keep units in bounds
      position.x = Math.max(20, Math.min(780, position.x));
      position.y = Math.max(20, Math.min(580, position.y));
    }
  });

  // Update combat system
  combatSystem.update(deltaTime);

  // Update economy system
  economySystem.update(deltaTime);
}

// Initialize and start the game
initializeGame().then(() => {
  timer.start();
  hud.setStatus("Click to interact • ECS: " + entityManager.getEntityCount() + " entities");
  requestAnimationFrame(gameLoop);
}).catch(error => {
  console.error("Failed to initialize game:", error);
  hud.setStatus("Init failed");
});

// ─── End gameplay ───────────────────────────────────────────────────────────