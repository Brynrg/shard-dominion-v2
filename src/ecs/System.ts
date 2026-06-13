// Base system class for ECS architecture
import { EntityManager } from './EntityManager';
import { PositionComponent, VelocityComponent, RenderableComponent } from './Component';

export abstract class System {
  protected entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  // Abstract method to be implemented by each system
  abstract update(deltaTime: number): void;

  // Get entities relevant to this system (can be overridden)
  protected getRelevantEntities(): Iterable<number> {
    return this.entityManager.getAllEntities().keys();
  }

  // Utility method to check if entity has all required components
  protected hasComponents(entityId: number, componentTypes: any[]): boolean {
    return componentTypes.every(compType =>
      this.entityManager.hasComponent(entityId, compType)
    );
  }

  // Get specific component from entity with type safety
  protected getComponent<T>(entityId: number, componentType: any): T | null {
    return this.entityManager.getComponent<T>(entityId, componentType);
  }

  // Filter entities by component requirements
  protected filterByComponents(entities: Iterable<number>, componentTypes: any[]): number[] {
    const result: number[] = [];
    for (const entityId of entities) {
      if (this.hasComponents(entityId, componentTypes)) {
        result.push(entityId);
      }
    }
    return result;
  }
}

// Example velocity system - moves entities based on their velocity component
export class MovementSystem extends System {
  update(deltaTime: number): void {
    const entities = this.filterByComponents(
      Array.from(this.getRelevantEntities()),
      [PositionComponent, VelocityComponent]
    );

    entities.forEach(entityId => {
      const position = this.getComponent<PositionComponent>(entityId, PositionComponent);
      const velocity = this.getComponent<VelocityComponent>(entityId, VelocityComponent);

      if (position && velocity) {
        // Apply velocity to position
        position.x += velocity.vx * velocity.speed * deltaTime / 1000;
        position.y += velocity.vy * velocity.speed * deltaTime / 1000;
      }
    });
  }
}

// Example rendering system - handles visual representation
export class RenderingSystem extends System {
  private ctx: CanvasRenderingContext2D;

  constructor(entityManager: EntityManager, ctx: CanvasRenderingContext2D) {
    super(entityManager);
    this.ctx = ctx;
  }

  update(_deltaTime: number): void {
    // Clear canvas in base case
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, 800, 600);

    const entities = this.filterByComponents(
      Array.from(this.getRelevantEntities()),
      [PositionComponent, RenderableComponent]
    );

    entities.forEach(entityId => {
      const position = this.getComponent<PositionComponent>(entityId, PositionComponent);
      const renderable = this.getComponent<RenderableComponent>(entityId, RenderableComponent);

      if (position && renderable) {
        // Simple rectangle rendering for now
        this.ctx.fillStyle = renderable.color;
        this.ctx.fillRect(
          position.x - renderable.width / 2,
          position.y - renderable.height / 2,
          renderable.width,
          renderable.height
        );
      }
    });
  }
}