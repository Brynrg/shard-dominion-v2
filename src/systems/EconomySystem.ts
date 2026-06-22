// Economy system - handles resource gathering, building, and credit management
import { EntityManager } from '../ecs/EntityManager';
import { System } from '../ecs/System';
import { PositionComponent, HealthComponent, ResourceComponent } from '../ecs/Component';

export class EconomySystem extends System {
  private globalCredits: number = 1000;

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  // Set data loader for accessing configuration (placeholder for future use)
  setDataLoader(_dataLoader: any): void {
    // TODO: Use dataLoader for economy configuration in future
  }

  update(deltaTime: number): void {
    // Process harvester logic
    this.processHarvesters(deltaTime);
    // Process refinery logic
    this.processRefineries(deltaTime);
  }

  private processHarvesters(_deltaTime: number): void {
    // Get all harvesters (entities with ResourceComponent)
    const harvesters = this.entityManager.getEntitiesWithComponents([
      PositionComponent, ResourceComponent
    ]);

    harvesters.forEach(entityId => {
      // Delegate to HarvesterFSM for state machine logic
      // Note: HarvesterFSM is managed by MainMap, but we can call its update method
      // if we have access to it. For now, we'll just log that harvesters exist.
      const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
      const resource = this.entityManager.getComponent<ResourceComponent>(entityId, ResourceComponent);
      const health = this.entityManager.getComponent<HealthComponent>(entityId, HealthComponent);

      if (position && resource && health) {
        // Log harvester state for debugging
        console.log(`Harvester ${entityId}: credits=${this.globalCredits}, cargo=${resource.current}/${resource.capacity}, hp=${health.currentHp}/${health.maxHp}`);
      }
    });
  }

  private processRefineries(_deltaTime: number): void {
    const refineries = this.entityManager.getEntitiesWithComponents([
      PositionComponent, HealthComponent
    ]);

    refineries.forEach(entityId => {
      const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
      const health = this.entityManager.getComponent<HealthComponent>(entityId, HealthComponent);

      if (!position || !health) return;

      // Simple refinery logic: convert harvester resources to credits
      // Could use dataLoader for conversion rates in future
      if (Math.random() < 0.005) { // 0.5% chance per frame
        this.globalCredits += 5;
      }
    });
  }

  // Add credits to global pool
  addCredits(amount: number): void {
    this.globalCredits += amount;
    console.log(`Added ${amount} credits. Total: ${this.globalCredits}`);
  }

  // Get current global credits
  getGlobalCredits(): number {
    return this.globalCredits;
  }

  setGlobalCredits(credits: number): void {
    this.globalCredits = credits;
  }
}