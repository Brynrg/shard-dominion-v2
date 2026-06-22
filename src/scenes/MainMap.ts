// Main game scene using Phaser 3 framework
import Phaser from 'phaser';

import { EntityManager } from '../ecs/EntityManager';
import { DataLoader } from '../data/DataLoader';
import { PositionComponent, RenderableComponent, HealthComponent, ExperienceComponent, ResourceComponent, CombatComponent, UnitTypeComponent, MovementComponent, FactionComponent, VelocityComponent } from '../ecs/Component';
import { GridManager } from '../core/GridManager';
import { CombatSystem } from '../systems/CombatSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { PathfindingSystem } from '../systems/PathfindingSystem';
import { HarvesterFSM } from '../systems/HarvesterFSM';

export class MainMapScene extends Phaser.Scene {
  private gameInstance: any = {};
  private entityManager!: EntityManager;
  private dataLoader!: DataLoader;
  private gridManager!: GridManager;
  private combatSystem!: CombatSystem;
  private economySystem!: EconomySystem;
  private pathfindingSystem!: PathfindingSystem;
  private harvesterFSM!: HarvesterFSM;
  private selectedEntities: number[] = [];
  private entityGameObjects: Map<number, Phaser.GameObjects.Graphics> = new Map();

  constructor() {
    super({ key: 'MainMap' });
  }

  init(): void {
    // Initialize systems
    this.entityManager = new EntityManager();
    this.dataLoader = new DataLoader();
    this.gridManager = new GridManager();

    // Initialize game systems
        this.combatSystem = new CombatSystem(this.entityManager);
        this.economySystem = new EconomySystem(this.entityManager);
        this.pathfindingSystem = new PathfindingSystem(this.entityManager, this.gridManager);
        this.harvesterFSM = new HarvesterFSM(this.entityManager, this.gridManager, this.pathfindingSystem, this.economySystem);
        this.combatSystem.setGridManager(this.gridManager);

    // Connect systems to DataLoader
    this.combatSystem.setDataLoader(this.dataLoader);
    this.economySystem.setDataLoader(this.dataLoader);
    this.harvesterFSM.setDataLoader(this.dataLoader);

    // Add start/update methods to gameInstance
    this.gameInstance = {
      start: () => {
        console.log('Systems initialized:', {
          combat: !!this.combatSystem,
          economy: !!this.economySystem,
          pathfinding: !!this.pathfindingSystem,
          harvesterFSM: !!this.harvesterFSM
        });
      },
      update: (delta: number) => {
        // Update all systems
        this.combatSystem.update(delta);
        this.economySystem.update(delta);
        this.harvesterFSM.update(delta, delta);

        // Update pathfinding for all moving entities
        const entities = this.entityManager.getAllEntities();
        for (const entityId of entities) {
          this.pathfindingSystem.updateMovement(entityId, delta);
        }
      }
    };

    // Seed initial grid data after systems are ready
    this.seedInitialGrid();

    // Load faction data
    this.dataLoader.load().then(() => {
      console.log('Faction data loaded:', this.dataLoader.getFactions());
    });
  }

  preload(): void {
    // Placeholder for asset loading
    console.log('Loading assets...');
  }

  create(): void {
    // Initialize game systems
    this.gameInstance.start();

    // Compute world-space pixel dimensions of the 100x100 iso matrix
    // Diamond bounds: top (0,0), right (100,0), bottom (100,100), left (0,100)
    const diamondWidth = 100 * this.gridManager.cellSize; // 3200
    const diamondHeight = 100 * this.gridManager.cellSize; // 3200

    // Set camera bounds to the diamond
    this.cameras.main.setBounds(0, 0, diamondWidth, diamondHeight);

    // Center the camera
    this.cameras.main.centerOn(diamondWidth / 2, diamondHeight / 2);

    // Add input handling
    this.input.on('pointerdown', this.handlePointerDown, this);

    // Add some debug info
    this.add.text(10, 10, 'Shard Dominion v2 - Iso Camera + Grid Render', {
      fontSize: '18px',
      color: '#ffffff'
    });

    // Render the full 100x100 grid via Graphics
    this.renderIsoGrid();

    // Start the first 5 units (example)
    this.spawnInitialUnits();
  }

  update(_time: number, delta: number): void {
    // Update game systems
    this.gameInstance.update(delta);

    // Update entity game objects to sync with position components
    for (const [entityId, graphics] of this.entityGameObjects) {
      const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
      if (position) {
        // Clear and redraw the graphics at the new position
        graphics.clear();
        graphics.fillStyle(Number(graphics.name.includes('harvester') ? '#00ff00' : '#00ccff'), 1);
        graphics.fillRect(position.x - 16, position.y - 16, 32, 32);
      }
    }

    // Update entities - simple movement
    const entities = this.entityManager.getAllEntities();
    for (const entityId of entities) {
      const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
      const velocity = this.entityManager.getComponent<VelocityComponent>(entityId, VelocityComponent);
      const movement = this.entityManager.getComponent<MovementComponent>(entityId, MovementComponent);

      if (position && velocity && movement) {
        // Simple movement based on target in path
        if (movement.isMoving && movement.path.length > 0) {
          const target = movement.path[movement.currentPathIndex];
          const dx = target.x - position.x;
          const dy = target.y - position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 5) {
            // Reached target
            movement.currentPathIndex++;
            if (movement.currentPathIndex >= movement.path.length) {
              movement.path = [];
              movement.currentPathIndex = 0;
              movement.isMoving = false;
            }
          } else {
            // Move towards target
            const speed = movement.speed || 1;
            velocity.vx = (dx / distance) * speed;
            velocity.vy = (dy / distance) * speed;
          }
        } else {
          velocity.vx = 0;
          velocity.vy = 0;
        }

        // Update position based on velocity
        position.x += velocity.vx;
        position.y += velocity.vy;
      }
    }

    // For now, just rotate camera for visual feedback
    if (this.input.activePointer.isDown && this.selectedEntities.length === 0) {
      this.cameras.main.setScroll(
        this.input.activePointer.x - 400,
        this.input.activePointer.y - 300
      );
    }
  }

  // Spawn initial units for demonstration
  private spawnInitialUnits(): void {
    // Spawn a harvester unit
    const harvesterId = this.createHarvesterUnit(100, 100);

    // Spawn a combat tank unit
    const tankId = this.createCombatTankUnit(200, 150);

    console.log('Spawned initial units:', harvesterId, tankId);
  }

  // Create harvester unit components
  private createHarvesterUnit(x: number, y: number): number {
    const entityId = this.entityManager.createEntity([
      new PositionComponent(x, y),
      new VelocityComponent(0, 0, 1.5),
      new MovementComponent([], 0, 1.5, false),
      new HealthComponent(300),
      new RenderableComponent(undefined, 32, 32, '#00ff00'),
      new ResourceComponent(500, 0, 'aether_shards'),
      new UnitTypeComponent('harvester', 'vanguard_enclave'),
      new FactionComponent('vanguard_enclave')
    ]);

    // Create persistent Phaser GameObject for rendering
    this.createEntityGameObject(entityId, 32, 32, '#00ff00');

    return entityId;
  }

  // Create combat tank unit components
  private createCombatTankUnit(x: number, y: number): number {
    const entityId = this.entityManager.createEntity([
      new PositionComponent(x, y),
      new VelocityComponent(0, 0, 2.2),
      new MovementComponent([], 0, 2.2, false),
      new HealthComponent(400),
      new RenderableComponent(undefined, 40, 40, '#00ccff'),
      new CombatComponent(45, 5, 1.5, 0, null),
      new UnitTypeComponent('combat_tank', 'vanguard_enclave'),
      new ExperienceComponent(),
      new FactionComponent('vanguard_enclave')
    ]);

    // Create persistent Phaser GameObject for rendering
    this.createEntityGameObject(entityId, 40, 40, '#00ccff');

    return entityId;
  }

  // Create persistent Phaser GameObject for an entity
  private createEntityGameObject(entityId: number, width: number, height: number, color: string): void {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return;

    // Create a Graphics object for the entity
    const graphics = this.add.graphics();
    graphics.fillStyle(Number(color.replace('#', '0x')), 1);
    graphics.fillRect(position.x - width / 2, position.y - height / 2, width, height);
    graphics.setName(`entity-${entityId}`);

    // Store the graphics object for later updates
    this.entityGameObjects.set(entityId, graphics);
  }

  // Add building to map
  addBuilding(x: number, y: number, type: string, _faction: string) {
    // Check if tile is concrete (concrete slab constraint)
    const gridX = Math.floor(x / this.gridManager.cellSize);
    const gridY = Math.floor(y / this.gridManager.cellSize);
    const terrainType = this.gridManager.getTerrainType(gridX, gridY);

    if (terrainType !== 'concrete') {
      console.log(`Cannot build ${type} on ${terrainType} terrain. Must be on concrete.`);
      return;
    }

    const buildings = {
      'power_node': { width: 64, height: 64, color: '#ffaa00' },
      'refinery': { width: 80, height: 64, color: '#ff6600' }
    };

    const building = buildings[type as keyof typeof buildings] || buildings['power_node'];

    this.entityManager.createEntity([
      new PositionComponent(x, y),
      new RenderableComponent(undefined, building.width, building.height, building.color)
    ]);
  }

  // Add unit to map
  addUnit(x: number, y: number, type: string, _faction: string) {
    const units = {
      'harvester': { width: 24, height: 24, color: '#00ff00' },
      'combat_tank': { width: 30, height: 30, color: '#00ccff' }
    };

    const unit = units[type as keyof typeof units] || units['harvester'];

    this.entityManager.createEntity([
      new PositionComponent(x, y),
      new RenderableComponent(undefined, unit.width, unit.height, unit.color)
    ]);
  }

  // Render debug grid overlay
  renderDebugGrid(): void {
    // Placeholder for grid visualization
    console.log('Rendering debug grid...');
  }

  // Handle player input for building placement
  handlePlacement() {
    // Placeholder for placement logic
    console.log('Handling placement...');
  }

  // Handle pointer click for unit selection and movement
  private handlePointerDown(): void {
    const worldX = this.input.activePointer.x + this.cameras.main.scrollX;
    const worldY = this.input.activePointer.y + this.cameras.main.scrollY;

    // For now, select the first spawned unit and move it to the clicked position
    if (this.selectedEntities.length === 0) {
      // Select first entity (harvester)
      this.selectedEntities.push(this.entityManager.getAllEntities()[0]);
      console.log('Selected entity:', this.selectedEntities[0]);
    }

    // Move selected entity to clicked position
    const entityId = this.selectedEntities[0];
    const movement = this.entityManager.getComponent<MovementComponent>(entityId, MovementComponent);
    if (movement) {
      movement.path = [];
      movement.currentPathIndex = 0;
      movement.isMoving = true;
      movement.path.push({ x: worldX, y: worldY });
      console.log('Moving entity', entityId, 'to position:', worldX, worldY);
    }
  }

  // Camera controls
  handleCamera() {
    // Placeholder for camera controls
    console.log('Handling camera...');
  }

  // Render terrain from GridManager's 100x100 matrix
  renderTerrain(): void {
    console.log('Rendering actual terrain grid...');

    // Clear any existing graphics
    const existingGraphics = this.children.getByName('grid-layer');
    if (existingGraphics) {
      existingGraphics.destroy();
    }

    const graphics = this.add.graphics();
    graphics.setName('grid-layer');

    const tileSize = this.gridManager.cellSize;

    // Iterate through 100x100 grid and render tiles
    for (let gridX = 0; gridX < 100; gridX++) {
      for (let gridY = 0; gridY < 100; gridY++) {
        const worldPos = this.gridManager.gridToWorld(gridX, gridY);

        let color = '#888888'; // Concrete (default)
        let alpha = 0.3;

        // Get terrain type and set color
        const terrainType = this.gridManager.getTerrainType(gridX, gridY);
        switch (terrainType) {
          case 'grass':
            color = '#4CAF50'; // Green
            break;
          case 'dirt':
            color = '#8D6E63'; // Brown
            break;
          case 'stone':
            color = '#9E9E9E'; // Grey
            break;
          case 'concrete':
          default:
            color = '#757575'; // Concrete (grey)
            break;
        }

        // Check if it's a hazard zone
        if (this.gridManager.isInHazardZone(gridX, gridY)) {
          color = '#ff6666'; // Red for hazards
          alpha = 0.6;
        }

        // Draw a simple rectangle for each tile
        graphics.fillStyle(Number(color.replace('#', '0x')), alpha);
        graphics.fillRect(worldPos.x, worldPos.y, tileSize, tileSize);

        // Draw grid lines
        graphics.lineStyle(1, Number('#444444'.replace('#', '0x')), 0.5);
        graphics.strokeRect(worldPos.x, worldPos.y, tileSize, tileSize);
      }
    }

    console.log('Rendered 100x100 terrain grid');
  }

  // Render the full 100x100 iso grid via Graphics using GridManager
  renderIsoGrid(): void {
    console.log('Rendering full 100x100 iso grid via Graphics...');

    // Clear any existing graphics
    const existingGraphics = this.children.getByName('iso-grid-layer');
    if (existingGraphics) {
      existingGraphics.destroy();
    }

    const graphics = this.add.graphics();
    graphics.setName('iso-grid-layer');

    // Use GridManager's renderDebugToGraphics method
    this.gridManager.renderDebugToGraphics(graphics);

    console.log('Rendered full 100x100 iso grid');
  }

  // Seed initial grid data
  private seedInitialGrid(): void {
    console.log('Seeding initial grid data...');

    // Add some obstacles
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 100);
      const y = Math.floor(Math.random() * 100);
      this.gridManager.setWalkable(x, y, false);
    }

    // Add terrain types
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 100; y++) {
        // Create patches of different terrain types
        const terrainType = Math.random();
        if (terrainType < 0.3) {
          this.gridManager.setTerrainType(x, y, 'grass');
        } else if (terrainType < 0.6) {
          this.gridManager.setTerrainType(x, y, 'concrete');
        } else if (terrainType < 0.8) {
          this.gridManager.setTerrainType(x, y, 'dirt');
        } else {
          this.gridManager.setTerrainType(x, y, 'stone');
        }
      }
    }

    // Add one hazard zone for demo
    this.gridManager.setHazardZone(50, 50, true);

    console.log('Initial grid data seeded');
  }

  // Update hazard zones
  updateHazards() {
    // Placeholder for hazard zone updates
    console.log('Updating hazards...');
  }

  // Combat resolution
  resolveCombat() {
    // Placeholder for combat logic
    console.log('Resolving combat...');
  }

  // Economy system
  updateEconomy() {
    // Placeholder for economy logic
    console.log('Updating economy...');
  }
}