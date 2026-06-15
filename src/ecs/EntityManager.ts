// Entity management system for ECS architecture
export class EntityManager {
  private entities: Map<number, any> = new Map();
  private nextId = 1;

  // Create a new entity with optional components
  createEntity(components: any[] = []): number {
    const entityId = this.nextId++;
    this.entities.set(entityId, { id: entityId, components: new Map() });
    
    // Add components
    components.forEach(component => {
      this.addComponent(entityId, component);
    });
    
    return entityId;
  }

  // Remove an entity
  removeEntity(entityId: number): void {
    this.entities.delete(entityId);
  }

  // Get specific entity
  getEntity(entityId: number): any | null {
    return this.entities.get(entityId) || null;
  }

  // Add component to entity
  addComponent(entityId: number, component: any): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    entity.components.set(component.constructor.name, component);
  }

  // Remove component from entity
  removeComponent(entityId: number, componentConstructor: any): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;
    entity.components.delete(componentConstructor.name);
  }

  // Get component from entity
  getComponent<T>(entityId: number, componentConstructor: any): T | null {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    return entity.components.get(componentConstructor.name) || null;
  }

  // Check if entity has component
  hasComponent(entityId: number, componentConstructor: any): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    return entity.components.has(componentConstructor.name);
  }

  // Get all entities with a specific component
  getEntitiesWithComponent(componentConstructor: any): number[] {
    const result: number[] = [];
    this.entities.forEach((entity, entityId) => {
      if (entity.components.has(componentConstructor.name)) {
        result.push(entityId);
      }
    });
    return result;
  }

  // Get all entities with multiple components
  getEntitiesWithComponents(componentConstructors: any[]): number[] {
    const result: number[] = [];
    this.entities.forEach((entity, entityId) => {
      const hasAll = componentConstructors.every(comp => 
        entity.components.has(comp.name)
      );
      if (hasAll) {
        result.push(entityId);
      }
    });
    return result;
  }

  // Count total entities
  getEntityCount(): number {
    return this.entities.size;
  }

  // Get all entity IDs
  getAllEntities(): number[] {
    return Array.from(this.entities.keys());
  }

  // Clear all entities
  clear(): void {
    this.entities.clear();
    this.nextId = 1;
  }

  // Get entities in a radius (basic spatial query)
  getEntitiesInRadius(centerX: number, centerY: number, radius: number): number[] {
    const result: number[] = [];
    
    // For now, check all entities - this can be optimized with spatial hashing later
    this.entities.forEach((entity, entityId) => {
      const position = entity.components.get('Position');
      if (position) {
        const distance = Math.sqrt(
          Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2)
        );
        if (distance <= radius) {
          result.push(entityId);
        }
      }
    });
    
    return result;
  }
}