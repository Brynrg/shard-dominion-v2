# Gemini — Pass 3 / Chance 3 plan (staged verbatim 2026-06-17)

> Bake-off note (orchestrator): Gemini's chance-3 plan, authored after reading the
> post-round-2 state doc (`final-pass/round2/gemini-shard-dominion-v2.md` + live screenshot).
> Staged verbatim. The local builder (GLM-4.7-Flash via alex-builder) executes it; orchestrator
> only stages + fixes the deploy lane. Executes against the CURRENT repo state — note some of
> Phase 1/3 (engine unification, single GridManager) already landed in round 2; the builder
> reconciles each ticket with actual state.

---

To be completely candid: this specific manifest will not instantly yield a 1:1 *Dune 2000* clone complete with enemy AI base-building, full tech trees, fog of war, and a campaign in a single generation.

What this plan *will* definitively build is a **fully playable vertical slice**—the fundamental RTS core loop. You will have grid-aware pathfinding, autonomous resource harvesting, dynamic hazards, and faction-based combat. This execution manifest is engineered specifically to be parsed by a private, local-first orchestration system. By strictly compartmentalizing the logic, it prevents context collapse and takes full advantage of the memory overhead on an M5 Max development node, ensuring the Vite build stays green at every step.

Here is the final, copy-pasteable execution payload for your AI team.

---

# Shard Dominion v2: Core Loop Execution Manifest

**Target Architecture:** Vite + TypeScript (Strict) + Phaser 3 Engine + Custom ECS.
**Execution Protocol:** Execute sequentially. Do not hallucinate files or logic outside the current ticket. Run `npm run build && npm run typecheck` after every ticket to verify the CI contract.

## Phase 1: Engine Unification & Camera

**Objective:** Establish `MainMap.ts` as the single source of truth and render the isometric battlefield.

* **Ticket 1.1: Purge Orphans and Bootstrap Phaser**
* **Target:** `src/main.ts`, `src/core/Game.ts`
* **Action:** Delete `core/Game.ts`. Rewrite `main.ts` to remove the raw HTML5 canvas loop, the 20x15 grid, and the `requestAnimationFrame` logic. Replace it with a `new Phaser.Game(config)` bootstrap that loads `src/scenes/MainMap.ts`. Ensure the canvas attaches to `#app`.
* **Acceptance:** Build is green. Browser displays a Phaser canvas, not a raw 2D canvas.


* **Ticket 1.2: Isometric Camera & True Grid Render**
* **Target:** `src/scenes/MainMap.ts`
* **Action:** Instantiate `GridManager`. Calculate the world-space pixel dimensions of the 100x100 isometric matrix. Use `this.cameras.main.setBounds` to encompass this diamond. Use Phaser's `Graphics` API in the update loop to render `GridManager.renderDebug()` so the true 100x100 grid is visible.
* **Acceptance:** The camera is centered, scrollable within bounds, and displays the full isometric grid.



## Phase 2: ECS Component Injection & Factions

**Objective:** Populate entities with the necessary data to wake up the dormant systems.

* **Ticket 2.1: Full Factory Injection**
* **Target:** `src/ecs/Component.ts`, `src/scenes/MainMap.ts`
* **Action:** Add `FactionComponent` (property: `team: string`) to `Component.ts`. Fix `createHarvesterUnit` and `createCombatTankUnit` in `MainMap.ts`. They must invoke `entityManager.createEntity()` and attach `Position`, `Velocity`, `Movement`, `Health`, `Renderable`, and `FactionComponent`. Harvesters must also receive `Resource`; Tanks must receive `Combat` and `Experience`.
* **Acceptance:** Console logging `entityManager.getEntitiesWithComponent(HealthComponent)` returns fully populated entities.


* **Ticket 2.2: Faction-Aware Targeting**
* **Target:** `src/systems/CombatSystem.ts`
* **Action:** Update `findNearestEnemy()` to utilize `FactionComponent`. The targeting sweep must ignore entities that share the same `team` string as the attacker.
* **Acceptance:** Friendly fire is completely disabled.



## Phase 3: Pathfinding & Input Routing

**Objective:** Replace random wandering with player-driven, obstacle-aware navigation.

* **Ticket 3.1: Deduplicate Pathfinding**
* **Target:** `src/systems/PathfindingSystem.ts`
* **Action:** Delete the private `walkableGrid` and `hazardGrid` Sets. Inject the global `GridManager` instance into the constructor. Update the A* heuristic and neighbor checks to query `GridManager.getCell()` directly.
* **Acceptance:** System compiles cleanly without internal duplicate grid math.


* **Ticket 3.2: Pointer-Driven Navigation**
* **Target:** `src/scenes/MainMap.ts`
* **Action:** Add a `this.input.on('pointerdown')` listener. Convert the screen click to isometric grid coordinates using `GridManager.worldToGrid()`. Update the currently selected entity's `MovementComponent.targetPosition`. `PathfindingSystem` will calculate the A* path to this new target.
* **Acceptance:** Right-clicking a tile smoothly routes the unit to that destination, navigating around obstacles.



## Phase 4: The Aether Economy Loop

**Objective:** Implement the autonomous resource gathering state machine.

* **Ticket 4.1: Harvester FSM**
* **Target:** `src/systems/EconomySystem.ts`
* **Action:** Delete the `Math.random()` gathering logic. Implement a finite state machine for entities holding a `ResourceComponent`: **Seek Node** (A* path to nearest Aether Shard) -> **Mine** (tick until cargo is full) -> **Return** (A* path to base/refinery) -> **Deposit** (increment global credits, empty cargo, revert to Seek).
* **Acceptance:** Harvesters loop autonomously. Global credits increment upon successful deposit.



## Phase 5: Live UI & Dynamic Threats

**Objective:** Surface game state to the player and activate environmental hazards.

* **Ticket 5.1: Live HUD**
* **Target:** `src/scenes/MainMap.ts`
* **Action:** Implement a static Phaser UI text object anchored to the camera viewport. Bind this to display the global credits value driven by the `EconomySystem`.
* **Acceptance:** The on-screen credit counter visibly increases when a harvester deposits resources.


* **Ticket 5.2: Data-Driven Veterancy & Bloom Hazards**
* **Target:** `src/systems/CombatSystem.ts`, `src/scenes/MainMap.ts`
* **Action:** 1. Update `CombatSystem` to read veterancy rank thresholds (3/7/15) from the `DataLoader` rather than hardcoded functions. 2. Implement a 45-second repeating timer in `MainMap.ts` that triggers a Shard Bloom, flagging a 3x3 tile cluster in `GridManager` as a hazard. Apply tick damage in `CombatSystem` to any unit intersecting these hazard coordinates.
* **Acceptance:** Units gain stats based strictly on `factions.json` rules. Red hazard zones damage traversing units.
