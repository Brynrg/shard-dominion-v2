// Economy system - handles resource gathering, building, and credit management
import { EntityManager } from '../ecs/EntityManager';
import { System } from '../ecs/System';
import { PositionComponent, ResourceComponent, HealthComponent } from '../ecs/Component';

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
    const harvesters = this.entityManager.getEntitiesWithComponents([
      PositionComponent, ResourceComponent
    ]);

    harvesters.forEach(entityId => {
      const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
      const resource = this.entityManager.getComponent<ResourceComponent>(entityId, ResourceComponent);

      if (!position || !resource) return;

      // Simple harvester logic: gather resources periodically
      if (Math.random() < 0.01) { // 1% chance per frame
        resource.current = Math.min(resource.capacity, resource.current + 10);
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

  getGlobalCredits(): number {
    return this.globalCredits;
  }

  setGlobalCredits(credits: number): void {
    this.globalCredits = credits;
  }
}