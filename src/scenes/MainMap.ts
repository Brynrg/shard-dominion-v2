// Main game scene using Phaser 3 framework
import Phaser from 'phaser';

import { EntityManager } from '../ecs/EntityManager';
import { DataLoader } from '../data/DataLoader';
import { PositionComponent, RenderableComponent, HealthComponent, ExperienceComponent, ResourceComponent, CombatComponent, UnitTypeComponent, MovementComponent } from '../ecs/Component';
import { GridManager } from '../core/GridManager';

export class MainMapScene extends Phaser.Scene {
  private gameInstance: any;
  private entityManager!: EntityManager;
  private dataLoader!: DataLoader;
  private gridManager!: GridManager;

  constructor() {
    super({ key: 'MainMap' });
  }

  init(): void {
    // Initialize systems
    this.gameInstance = {};
    this.entityManager = new EntityManager();
    this.dataLoader = new DataLoader();
    this.gridManager = new GridManager();

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

    // Set up camera
    this.cameras.main.setBounds(0, 0, 3200, 3200); // Large isometric world
    this.cameras.main.setZoom(1);

    // Add some debug info
    this.add.text(10, 10, 'Shard Dominion v2 - ECS System Running', {
      fontSize: '18px',
      color: '#ffffff'
    });

    // Render the actual grid terrain
    this.renderTerrain();

    // Start the first 5 units (example)
    this.spawnInitialUnits();
  }

  update(_time: number, delta: number): void {
    // Update game systems
    this.gameInstance.update(delta);

    // Update entities
    // Placeholder for entity updates

    // For now, just rotate camera for visual feedback
    if (this.input.activePointer.isDown) {
      this.cameras.main.setScroll(
        this.input.activePointer.x - 400,
        this.input.activePointer.y - 300
      );
    }
  }

  // Spawn initial units for demonstration
  private spawnInitialUnits(): void {
    // Spawn a harvester unit
    const harvesterId = this.entityManager.createEntity([
      new PositionComponent(100, 100),
      new RenderableComponent(undefined, 32, 32, '#00ff00'),
      this.createHarvesterUnit()
    ]);

    // Spawn a combat tank unit
    const tankId = this.entityManager.createEntity([
      new PositionComponent(200, 150),
      new RenderableComponent(undefined, 40, 40, '#00ccff'),
      this.createCombatTankUnit()
    ]);

    console.log('Spawned initial units:', harvesterId, tankId);
  }

  // Create harvester unit components
  private createHarvesterUnit() {
    return [
      new HealthComponent(300),
      new ExperienceComponent(),
      new ResourceComponent(500, 0, 'aether_shards'),
      new UnitTypeComponent('harvester', 'vanguard_enclave'),
      new MovementComponent([], 0, 1.5, false),
    ];
  }

  // Create combat tank unit components
  private createCombatTankUnit() {
    return [
      new HealthComponent(400),
      new ExperienceComponent(),
      new CombatComponent(45, 5, 1.5, 0, null),
      new UnitTypeComponent('combat_tank', 'vanguard_enclave'),
      new MovementComponent([], 0, 2.2, false),
    ];
  }

  // Add building to map
  addBuilding(x: number, y: number, type: string, _faction: string) {
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
    
    const tileSize = this.gridManager.gridToWorld(1, 0).x - this.gridManager.gridToWorld(0, 0).x;
    
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