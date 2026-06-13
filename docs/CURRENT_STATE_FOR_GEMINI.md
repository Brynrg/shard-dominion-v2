# Shard Dominion v2 — Current Build State (for Gemini to iterate)

**This is the game built from your "Hermes Execution Manifest v2.0" plan.** A local AI
coding team (not you) implemented your plan into code. Below is an honest, code-grounded
audit of what actually exists so you can write the next iteration. Please produce a
concrete, ticket-style next-step plan against THIS state (don't restart from scratch).

- **Repo:** https://github.com/Brynrg/shard-dominion-v2 (public)
- **Live (playable now):** https://speedrungames.net/games/shard-dominion-v2/
- **Stack:** Vite + TypeScript (strict), `phaser` + `speedrungames-sdk` as deps. Build is
  `tsc && vite build`; typecheck/lint/playwright-smoke all green. ~1,650 lines of TS.

---

## TL;DR — what the game IS right now

A clean **ECS scaffold with mostly-dead systems**. When you open it you see **two colored
rectangles (a green "harvester" and a cyan "tank") wandering randomly** on a small grey
debug grid with one red hazard square. That's it — there is no real RTS gameplay loop yet.
The architecture is a reasonable foundation, but the systems that would make it a game are
either **written-but-never-invoked** or **stubbed**. Critically, **the running game is raw
HTML5 Canvas 2D — Phaser is a dependency but is NOT wired in** (your plan called for Phaser 3
+ a 100×100 isometric grid).

---

## Architecture map (file by file — REAL vs STUB/DEAD)

| File | Lines | State |
|---|---|---|
| `src/main.ts` | 227 | **THE LIVE ENTRY.** Raw Canvas-2D loop. Spawns 2 demo units that move by `Math.random()` velocity (not pathfinding). Draws a **20×15** grid of 40px cells (NOT the 100×100 iso grid) + one hardcoded hazard rect. HUD shows entity count. |
| `src/ecs/EntityManager.ts` | 118 | **REAL.** Solid entity/component store: create/remove, getEntitiesWithComponents, getEntitiesInRadius. Good. |
| `src/ecs/Component.ts` | 127 | **REAL.** 12 component types defined (Position, Velocity, Health, Experience, Renderable, Combat, Movement, UnitType, BuildingType, Resource, Building). But the spawned demo units only get Position/Velocity/Movement/Renderable — so Health/Combat/Experience/Resource are never attached, which is why the systems below do nothing. |
| `src/ecs/System.ts` | 99 | **REAL.** Abstract base system. |
| `src/core/GridManager.ts` | 127 | **REAL but under-used.** True 100×100 grid, walkable/occupied, hazard zones, world↔iso conversion, `getHazardZonesInRange`. Instantiated in main.ts and seeded with obstacles+hazards — BUT main.ts renders its own 20×15 grid instead of `GridManager.renderDebug()`, and units don't path on it. |
| `src/systems/CombatSystem.ts` | 204 | **REAL logic, DEAD in practice.** Full targeting (nearest enemy), damage, cooldown, and **veterancy rank-up** (Basic→Veteran→Elite→Heroic at 3/7/15 kills, ×1.15 to damage & fire-rate). But it only acts on entities that have Health+Experience+Combat components — **the demo units have none, so it processes zero entities.** Also: "all other combat entities are enemies" (no faction/team logic); veterancy thresholds are hardcoded in the system instead of read from DataLoader; **Silicate Leviathan and Shard Bloom are empty placeholder methods.** |
| `src/systems/EconomySystem.ts` | 63 | **STUB.** Harvesters "gather" via `Math.random() < 0.01 → +10`; refineries add credits via `Math.random()`. No real state machine (find shard → mine → return → deposit), no Concrete Slab logic, credits not surfaced to the player. Demo units lack ResourceComponent so even this no-ops. |
| `src/systems/PathfindingSystem.ts` | 324 | **REAL A*, but ORPHANED.** Genuine A* (open set, heuristic, neighbors, hazard-aware movement cost, path reconstruction) + partial boid separation. **It is NOT imported anywhere** — main.ts and the scenes never use it. It also builds its OWN grid, separate from GridManager. Dead code today. |
| `src/scenes/MainMap.ts` | 167 | **ORPHANED Phaser scene.** A `Phaser.Scene` with camera bounds + a drag-scroll, but **main.ts never loads it** (the live game is raw canvas). Most methods are `console.log` placeholders (renderTerrain, updateHazards, resolveCombat, updateEconomy…). `createHarvesterUnit()`/`createCombatTankUnit()` are broken (return a bare `PositionComponent`). |
| `src/core/Game.ts` | 51 | **ORPHANED placeholder.** A third canvas-loop class with empty update/render. Only referenced by the orphaned MainMap. |
| `src/data/DataLoader.ts` | 118 | **REAL.** Loads `factions.json` via inline import (survives the dist build), getters for factions/units/buildings/veterancy, validation + default fallback. Works. |
| `src/data/factions.json` | 22 | **REAL but minimal.** Only ONE faction (`vanguard_enclave`) with 2 units (harvester, combat_tank) + 2 buildings (power_node, refinery) + the veterancy block. The other two asymmetric factions from the broader vision do not exist. |
| `scripts/render_sprites.py`, `pack_sprites.js` | — | Present (your headless-Blender asset-pipeline stubs). Not yet integrated; visuals are colored rectangles. |

### The single biggest structural problem
There are **three competing, disconnected entry/render approaches** — `main.ts` (raw canvas,
the one that actually runs), `MainMap.ts` (Phaser, orphaned), and `Game.ts` (canvas class,
orphaned). They don't share state or call each other. Pick ONE (your plan says Phaser 3) and
make every system route through it.

---

## What's implemented vs your v2 manifest plan

- **Phase 1 (Engine skeleton & data):** ~50%. DataLoader ✅. GridManager exists ✅ but the
  rendered **100×100 isometric wireframe is not shown** (a 20×15 placeholder grid is). No
  Phaser bootstrap in the live path.
- **Phase 2 (ECS & movement):** ECS ✅. Movement is **random wander**, not velocity-integrated
  path-following. A* is written but **unused**; boid is partial (separation only).
- **Phase 3 (Aether economy):** ~stub. No harvester state machine, no Concrete Slab, credits
  not wired to UI.
- **Phase 4 (Combat / veterancy / threats):** Combat + veterancy **logic written but never
  triggered** (no combat-capable entities spawned, no teams). Leviathan + Shard Bloom = stubs.
- **Phase 5 (asset pipeline):** scripts present, not run; placeholders only.

---

## Suggested focus for the next iteration (your call — re-prioritize as you see fit)

1. **Unify the engine:** commit to Phaser 3 (per your plan) OR formally to the canvas path,
   delete the other two, and make all systems run through the one loop.
2. **Make the systems actually fire:** spawn units with the FULL component set (Health,
   Combat, Experience, Resource, UnitType+faction) so CombatSystem/EconomySystem/Pathfinding
   operate on real entities. Add team/faction so "enemy" means something.
3. **Wire pathfinding in:** route unit movement through `PathfindingSystem.findPath` on
   `GridManager`'s grid (merge the duplicate grids), so units navigate around obstacles/hazards
   instead of wandering.
4. **Render the real grid:** draw the 100×100 iso grid + actual hazard zones from GridManager.
5. **Close the economy loop:** real harvester FSM (find shard → mine → return → deposit →
   credits) and surface credits in the HUD.
6. **Activate veterancy + threats:** trigger rank-ups in live combat; implement the Silicate
   Leviathan and Shard Bloom→hazard-zone events you designed.

### Hard constraints (must stay true — these keep it deployable)
- Strict TypeScript; `npm run typecheck && npm run build` must stay green.
- Keep `base: "./"` in vite.config and **relative asset paths only** (CI enforces this).
- Keep the template package.json CI scripts (`build`, `typecheck`, `lint:paths`, `test`) and
  `game.manifest.json` — every push auto-deploys to speedrungames.net only if CI is green.
- Data-driven: gameplay numbers live in `src/data/factions.json`, not hardcoded.

**Please respond with a concrete, ordered next-step plan (ticket-by-ticket) against this exact
state — small, shippable increments that each keep the build green.**
