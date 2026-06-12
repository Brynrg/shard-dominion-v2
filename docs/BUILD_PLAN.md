# Shard Dominion: Hermes Execution Manifest (v2.0)

**Target Architecture:** Vite + TypeScript + Phaser 3 (Engine), Python + Blender (Headless Asset Pipeline)
**Execution Protocol:** Strict sequential modular generation. Leverage local memory overhead to output complete class structures, but do not hallucinate files outside the current phase request.

## Source upgrades in this revision

1. **Veterancy System (Mechanic):** Units that survive and secure kills will now rank up (Veteran -> Elite -> Heroic), gaining slight speed, HP, and fire-rate buffs, plus a self-healing factor at max rank. This rewards micro-management and unit preservation over mindless spamming.
2. **Hazard Zones (Mechanic):** Aether Shard Blooms are no longer just explosive events; they leave behind a temporary "Aether Burn" hazard zone on the grid. Units pathing through it take tick damage, creating dynamic chokepoints.
3. **Execution Optimization:** Build the Vite/Phaser skeleton first while generating placeholders, and push the heavier headless Blender visual pipeline to run as a background batch process, maximizing local compute efficiency.

## 1. Target Directory Structure

Initialize the following directory tree before beginning code generation:

```
shard-dominion/
├── assets/
│   ├── raw_3d/
│   └── sprites/
├── scripts/
│   ├── render_sprites.py
│   └── pack_sprites.js
├── src/
│   ├── core/
│   │   ├── Game.ts
│   │   └── GridManager.ts
│   ├── ecs/
│   │   ├── EntityManager.ts
│   │   ├── Component.ts
│   │   └── System.ts
│   ├── systems/
│   │   ├── CombatSystem.ts     # Handles targeting and veterancy
│   │   └── PathfindingSystem.ts# Handles A* and hazard zones
│   ├── data/
│   │   ├── DataLoader.ts
│   │   └── factions.json
│   ├── scenes/
│   │   └── MainMap.ts
│   └── style.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 2. Seed Files (Create these first)

### `package.json`

```json
{
  "name": "shard-dominion",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "pack-assets": "node scripts/pack_sprites.js"
  },
  "dependencies": {
    "phaser": "^3.80.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
```

### `src/data/factions.json`

```json
{
  "global_mechanics": {
    "veterancy": {
      "rank_1_kills": 3,
      "rank_2_kills": 7,
      "rank_3_kills": 15,
      "stat_multiplier_per_rank": 1.15
    }
  },
  "factions": {
    "vanguard_enclave": {
      "name": "Vanguard Enclave",
      "units": {
        "harvester": { "hp": 300, "speed": 1.5, "cost": 1000, "build_time": 15, "armor": "heavy", "capacity": 500, "weapons": null },
        "combat_tank": { "hp": 400, "speed": 2.2, "cost": 800, "build_time": 12, "armor": "heavy", "weapons": [{"damage": 45, "range": 5, "cooldown": 1.5}] }
      },
      "buildings": {
        "power_node": { "hp": 200, "cost": 300, "build_time": 10, "power_output": 100 },
        "refinery": { "hp": 800, "cost": 2000, "build_time": 30, "power_drain": 40 }
      }
    }
  }
}
```

## 3. Execution Prompts (Execute sequentially)

### Phase 1: Engine Skeleton & Data

**Execute:** Write `src/core/Game.ts`, `src/core/GridManager.ts`, and `src/data/DataLoader.ts`

Initialize the Vite/Phaser 3 environment. Setup a 100x100 isometric spatial hashing grid. Render a debug wireframe overlay. Implement the `DataLoader` to parse `factions.json` and store it in a global state object accessible by the engine.

### Phase 2: ECS & Movement

**Execute:** Write `src/ecs/EntityManager.ts`, `Component.ts`, `System.ts`

Implement a lightweight ECS for the Phaser update loop. Create components: `Position`, `Velocity`, `Health`, `Renderable`, and `Experience`.

**Execute:** Write `src/systems/PathfindingSystem.ts`

Implement A* pathfinding. Units must navigate around static buildings and avoid "Hazard Zones" (temporary grid tiles with a high traversal cost penalty). Include local boid/flocking math so units don't stack on exact coordinates.

### Phase 3: The Aether Economy

**Execute:** Implement the Harvester Loop

Create a `ResourceNode` entity. Build the state machine for the Harvester: Find Nearest Shard -> Mine -> Return to Refinery -> Deposit -> Update Global Player Credits. Implement the "Concrete Slab" base-building constraint logic.

### Phase 4: Combat, Veterancy & Threats

**Execute:** Write `src/systems/CombatSystem.ts`

Build the targeting scanner and weapon cooldown logic. When a unit reduces a target's `HealthComponent` to 0, increment the killer's `Experience` component. If kills reach the thresholds defined in `factions.json`, apply the `stat_multiplier` to speed and damage.

**Execute:** Implement the Silicate Leviathan & Shard Blooms

Build the Leviathan AI: invisible, moves under sand, tracks highest concentration of heavy armor, attacks, and burrows away. Build the Shard Bloom event: triggers an explosion and temporarily flags a 3x3 grid area as a "Hazard Zone" in the `GridManager`, applying tick damage to units inside.

### Phase 5: The Asset Pipeline (Background Task)

**Execute:** Write `scripts/render_sprites.py` and `scripts/pack_sprites.js`

Write the Python script for headless Blender execution. It must import a 3D model, set an orthographic camera at a 45-degree isometric angle, apply 3-point lighting, and render 8 directional rotations (45-degree increments) as transparent PNGs. Write the Node script to pack these into a Phaser 3 `.json` atlas.
