# Shard Dominion v2 — Gemini Iteration Plan (continue + improve)

> **Orchestrator note (read first):** Gemini authored this after reviewing the real build
> state (`docs/CURRENT_STATE_FOR_GEMINI.md`). It is the authoritative next-step spec — execute
> the tickets IN ORDER, each as a small shippable increment that keeps the build green. After
> EACH ticket: `npm run typecheck && npm run build` must pass, then commit (referencing the
> ticket) and `git push` (auto-deploys). **DEPLOY-CONTRACT GUARDRAIL (overrides the plan on
> conflict):** keep the template package.json CI scripts (`build`, `typecheck`, `lint:paths`,
> `test`), keep `base: "./"` in vite.config + relative asset paths, keep `game.manifest.json`,
> and keep gameplay numbers in `src/data/factions.json`. CI must stay green or the deploy PR
> won't merge. This continuation builds beyond the frozen `first-pass` git tag.
>
> Everything below this line is Gemini's plan, verbatim.

---

This is a classic symptom of local AI agent execution: writing excellent isolated algorithmic logic (like the A* pathfinding and ECS) but completely dropping the ball on the integration and architectural bindings. The codebase has multiple brains trying to drive the same car.

To fix this and get the true *Shard Dominion* RTS loop running without breaking the Vite/TS pipeline, we must ruthlessly prune the dead ends and wire the existing, high-quality logic into a single source of truth.

Here is the strict, ticket-by-ticket execution plan to surgically stitch the engine together in shippable increments.

---

### Phase 1: Engine Unification & The Prune

**Objective:** Commit to Phaser 3, eliminate rogue render loops, and establish a single unified grid.

* **Ticket 1.1: Purge the Rogue Canvas Loops**
* **Action:** Delete `core/Game.ts`. Rewrite `main.ts` entirely. It must no longer use a raw HTML5 canvas loop.
* **Implementation:** `main.ts` should contain only the Vite bootstrap logic that initializes a `Phaser.Game` instance, passing `MainMap.ts` into the scene array.
* **Acceptance Criteria:** `npm run build` passes. The browser renders a black Phaser canvas.


* **Ticket 1.2: Grid Consolidation**
* **Action:** Strip the redundant, isolated grid generation out of `systems/PathfindingSystem.ts`.
* **Implementation:** Modify `PathfindingSystem.ts` to accept a reference to `core/GridManager.ts` upon initialization. The A* algorithm must read directly from the core `GridManager`'s 100x100 structure.
* **Acceptance Criteria:** `PathfindingSystem` compiles without its internal grid logic.


* **Ticket 1.3: Render the True World**
* **Action:** Wire `MainMap.ts` to render the actual world state.
* **Implementation:** Inside the `MainMap` Phaser scene, iterate through `GridManager`'s 100x100 isometric matrix and render a lightweight visual representation (e.g., green tiles for grass, grey for concrete, red for hazards).
* **Acceptance Criteria:** The screen displays a 100x100 isometric grid, not the hardcoded 20x15 debug grid.



---

### Phase 2: ECS Wiring & Waking the Dead

**Objective:** Inject the proper components into entities so the dormant systems finally have data to process.

* **Ticket 2.1: Full Component Injection**
* **Action:** Fix the entity spawner logic.
* **Implementation:** When spawning a Vanguard Enclave Combat Tank via `DataLoader.ts`, the entity must be instantiated with `Health`, `Combat`, `Experience`, and `Renderable` components. Harvesters must receive `Health`, `Resource`, and `Movement` components.
* **Acceptance Criteria:** Console logging an entity reveals all expected component objects attached, not just `Position` and `Velocity`.


* **Ticket 2.2: Faction Tagging**
* **Action:** Prevent friendly fire and enable targeting.
* **Implementation:** Create a `FactionComponent` (`string: "player" | "enemy"`). Attach this to all spawned units.
* **Acceptance Criteria:** `CombatSystem.ts` can successfully filter targets to ensure units only attack opposing factions.



---

### Phase 3: The Movement & Economy Loop

**Objective:** Replace `Math.random()` wandering with actual player-driven A* pathing and autonomous harvesting.

* **Ticket 3.1: Input-Driven Pathfinding**
* **Action:** Connect Phaser input to the ECS.
* **Implementation:** Listen for pointer down events in `MainMap.ts`. When triggered, update the target coordinates of the selected entity's `MovementComponent`. `PathfindingSystem.ts` will detect this target change, calculate the A* path utilizing the `GridManager`, and output a waypoint array. The entity updates its `Velocity` to reach the next waypoint.
* **Acceptance Criteria:** Clicking a valid tile causes a unit to navigate there, respecting obstacles.


* **Ticket 3.2: Harvester State Machine (FSM)**
* **Action:** Overhaul `systems/EconomySystem.ts`.
* **Implementation:** Remove random gathering. Implement a strict state machine: `Seek Node` -> `Mine` (until capacity is reached) -> `Seek Processor` -> `Deposit`.
* **Acceptance Criteria:** A harvester automatically navigates to an Aether Shard, waits, returns to base, and increments a global credits counter logged to the console.



---

### Phase 4: Combat & Environmental Threats

**Objective:** Activate the final tier of mechanics now that entities and movement are stable.

* **Ticket 4.1: Live Veterancy**
* **Action:** Connect `CombatSystem.ts` to `DataLoader.ts`.
* **Implementation:** Remove the hardcoded veterancy thresholds in `CombatSystem.ts`. It must read the `rank_X_kills` and `stat_multiplier_per_rank` values directly from the parsed `factions.json` global state.
* **Acceptance Criteria:** A unit achieving 3 kills visibly increases its movement speed or fire rate in real-time.


* **Ticket 4.2: Dynamic Hazard Zones**
* **Action:** Implement the Shard Bloom stubs.
* **Implementation:** Create a repeating timer in `MainMap.ts`. When triggered, flag a 3x3 tile area in `GridManager.ts` as a hazard. Any entity whose `Position` intersects these coordinates during the ECS update loop takes tick damage applied to its `HealthComponent`.
* **Acceptance Criteria:** Units traversing red hazard squares lose HP and are eventually despawned by the `CombatSystem`.



---

This sequence forces the agent to fix the foundation before writing any more game logic, keeping the Vite build green every step of the way.
