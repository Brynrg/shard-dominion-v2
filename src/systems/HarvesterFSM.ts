// Harvester FSM - state machine for harvester units
import { EntityManager } from '../ecs/EntityManager';
import { PositionComponent, VelocityComponent, MovementComponent, ResourceComponent, HealthComponent, UnitTypeComponent } from '../ecs/Component';
import { GridManager } from '../core/GridManager';
import { DataLoader } from '../data/DataLoader';
import { PathfindingSystem } from './PathfindingSystem';
import { EconomySystem } from './EconomySystem';

// Harvester states
enum HarvesterState {
  IDLE = 'IDLE',
  FINDING_SHARD = 'FINDING_SHARD',
  MINING = 'MINING',
  RETURNING = 'RETURNING',
  DEPOSITING = 'DEPOSITING',
  REPAIRING = 'REPAIRING'
}

// Harvester FSM class
export class HarvesterFSM {
  private entityManager: EntityManager;
  private pathfindingSystem: PathfindingSystem;
  private economySystem: EconomySystem;
  private state: HarvesterState = HarvesterState.IDLE;
  private targetEntityId: number | null = null;
  private mineTimer: number = 0;
  private depositTimer: number = 0;
  private stateTimer: number = 0;

  constructor(entityManager: EntityManager, _gridManager: GridManager, pathfindingSystem: PathfindingSystem, economySystem: EconomySystem) {
    this.entityManager = entityManager;
    this.pathfindingSystem = pathfindingSystem;
    this.economySystem = economySystem;
  }

  // Set data loader for accessing configuration (placeholder for future use)
  setDataLoader(_dataLoader: DataLoader): void {
    // TODO: Use dataLoader for harvester configuration in future
  }

  // Update harvester FSM for a specific entity
  update(_entityId: number, deltaTime: number): void {
    const position = this.entityManager.getComponent<PositionComponent>(_entityId, PositionComponent);
    const velocity = this.entityManager.getComponent<VelocityComponent>(_entityId, VelocityComponent);
    const movement = this.entityManager.getComponent<MovementComponent>(_entityId, MovementComponent);
    const resource = this.entityManager.getComponent<ResourceComponent>(_entityId, ResourceComponent);
    const health = this.entityManager.getComponent<HealthComponent>(_entityId, HealthComponent);
    const unitType = this.entityManager.getComponent<UnitTypeComponent>(_entityId, UnitTypeComponent);

    if (!position || !velocity || !movement || !resource || !health || !unitType) {
      return;
    }

    // Check if health is low - go to repair
    if (health.currentHp < health.maxHp * 0.3) {
      this.state = HarvesterState.REPAIRING;
      this.stateTimer = 0;
      return;
    }

    // State machine
    switch (this.state) {
      case HarvesterState.IDLE:
        this.handleIdle(_entityId, position, movement);
        break;

      case HarvesterState.FINDING_SHARD:
        this.handleFindingShard(_entityId, position, movement);
        break;

      case HarvesterState.MINING:
        this.handleMining(_entityId, position, deltaTime, resource);
        break;

      case HarvesterState.RETURNING:
        this.handleReturning(_entityId, position, movement);
        break;

      case HarvesterState.DEPOSITING:
        this.handleDepositing(_entityId, position, deltaTime, resource);
        break;

      case HarvesterState.REPAIRING:
        this.handleRepairing(_entityId, position, movement, health);
        break;
    }

    // Update state timer
    this.stateTimer += deltaTime;
  }

  // Handle IDLE state - wait for command or find nearest shard
  private handleIdle(_entityId: number, _position: PositionComponent, _movement: MovementComponent): void {
    // Check if we have resources to deposit
    const resource = this.entityManager.getComponent<ResourceComponent>(_entityId, ResourceComponent);
    if (resource && resource.current > 0) {
      this.state = HarvesterState.RETURNING;
      this.stateTimer = 0;
      return;
    }

    // Find nearest shard
    const nearestShard = this.findNearestShard(_entityId);
    if (nearestShard) {
      this.state = HarvesterState.FINDING_SHARD;
      this.targetEntityId = nearestShard;
      this.stateTimer = 0;
    }
  }

  // Handle FINDING_SHARD state - move to nearest shard
  private handleFindingShard(_entityId: number, position: PositionComponent, movement: MovementComponent): void {
    if (!this.targetEntityId) {
      this.state = HarvesterState.IDLE;
      return;
    }

    const targetPosition = this.entityManager.getComponent<PositionComponent>(this.targetEntityId, PositionComponent);
    if (!targetPosition) {
      this.state = HarvesterState.IDLE;
      this.targetEntityId = null;
      return;
    }

    // Calculate path to target using PathfindingSystem
    const path = this.pathfindingSystem.findPath(position.x, position.y, targetPosition.x, targetPosition.y);
    movement.path = path;
    movement.currentPathIndex = 0;
    movement.isMoving = path.length > 0;

    // Check if we've reached the target
    const distance = Math.sqrt(
      Math.pow(targetPosition.x - position.x, 2) +
      Math.pow(targetPosition.y - position.y, 2)
    );

    if (distance < 10) {
      this.state = HarvesterState.MINING;
      this.stateTimer = 0;
    }
  }

  // Handle MINING state - gather resources
  private handleMining(_entityId: number, _position: PositionComponent, deltaTime: number, resource: ResourceComponent): void {
    if (!this.targetEntityId) {
      this.state = HarvesterState.IDLE;
      return;
    }

    const targetPosition = this.entityManager.getComponent<PositionComponent>(this.targetEntityId, PositionComponent);
    if (!targetPosition) {
      this.state = HarvesterState.IDLE;
      this.targetEntityId = null;
      return;
    }

    // Check if target is still valid (not destroyed)
    const targetHealth = this.entityManager.getComponent<HealthComponent>(this.targetEntityId, HealthComponent);
    if (!targetHealth || targetHealth.currentHp <= 0) {
      this.state = HarvesterState.IDLE;
      this.targetEntityId = null;
      return;
    }

    // Mine resources
    this.mineTimer += deltaTime;
    if (this.mineTimer >= 1000) { // Mine every 1 second
      resource.current = Math.min(resource.capacity, resource.current + 10);
      this.mineTimer = 0;
    }

    // Check if we've gathered enough
    if (resource.current >= resource.capacity) {
      this.state = HarvesterState.RETURNING;
      this.stateTimer = 0;
    }
  }

  // Handle RETURNING state - return to refinery
  private handleReturning(_entityId: number, _position: PositionComponent, _movement: MovementComponent): void {
    const refinery = this.findNearestRefinery(_entityId);
    if (!refinery) {
      this.state = HarvesterState.IDLE;
      return;
    }

    const refineryPosition = this.entityManager.getComponent<PositionComponent>(refinery, PositionComponent);
    if (!refineryPosition) {
      this.state = HarvesterState.IDLE;
      return;
    }

    // Calculate path to refinery using PathfindingSystem
    const path = this.pathfindingSystem.findPath(_position.x, _position.y, refineryPosition.x, refineryPosition.y);
    _movement.path = path;
    _movement.currentPathIndex = 0;
    _movement.isMoving = path.length > 0;

    // Check if we've reached the refinery
    const distance = Math.sqrt(
      Math.pow(refineryPosition.x - _position.x, 2) +
      Math.pow(refineryPosition.y - _position.y, 2)
    );

    if (distance < 10) {
      this.state = HarvesterState.DEPOSITING;
      this.stateTimer = 0;
    }
  }

  // Handle DEPOSITING state - deposit resources
  private handleDepositing(_entityId: number, _position: PositionComponent, deltaTime: number, resource: ResourceComponent): void {
    const refinery = this.findNearestRefinery(_entityId);
    if (!refinery) {
      this.state = HarvesterState.IDLE;
      return;
    }

    const refineryPosition = this.entityManager.getComponent<PositionComponent>(refinery, PositionComponent);
    if (!refineryPosition) {
      this.state = HarvesterState.IDLE;
      return;
    }

    // Deposit resources
    this.depositTimer += deltaTime;
    if (this.depositTimer >= 500) { // Deposit every 0.5 seconds
      const amount = Math.min(resource.current, 50);
      resource.current -= amount;
      this.addCredits(amount);
      this.depositTimer = 0;
    }

    // Check if we've deposited all resources
    if (resource.current <= 0) {
      this.state = HarvesterState.IDLE;
    }
  }

  // Handle REPAIRING state - return to base for repair
  private handleRepairing(_entityId: number, position: PositionComponent, movement: MovementComponent, health: HealthComponent): void {
    const base = this.findNearestBase(_entityId);
    if (!base) {
      this.state = HarvesterState.IDLE;
      return;
    }

    const basePosition = this.entityManager.getComponent<PositionComponent>(base, PositionComponent);
    if (!basePosition) {
      this.state = HarvesterState.IDLE;
      return;
    }

    // Calculate path to base using PathfindingSystem
    const path = this.pathfindingSystem.findPath(position.x, position.y, basePosition.x, basePosition.y);
    movement.path = path;
    movement.currentPathIndex = 0;
    movement.isMoving = path.length > 0;

    // Check if we've reached the base
    const distance = Math.sqrt(
      Math.pow(basePosition.x - position.x, 2) +
      Math.pow(basePosition.y - position.y, 2)
    );

    if (distance < 10) {
      // Repair
      health.currentHp = Math.min(health.maxHp, health.currentHp + 10);
      this.state = HarvesterState.IDLE;
    }
  }

  // Find nearest shard (ResourceNode entity)
  private findNearestShard(entityId: number): number | null {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return null;

    let nearestShard: number | null = null;
    let minDistance = Infinity;

    // Find all resource nodes (shards)
    const resourceNodes = this.entityManager.getEntitiesWithComponents([
      PositionComponent, ResourceComponent
    ]);

    for (const nodeId of resourceNodes) {
      const nodePosition = this.entityManager.getComponent<PositionComponent>(nodeId, PositionComponent);
      if (!nodePosition) continue;

      const distance = Math.sqrt(
        Math.pow(nodePosition.x - position.x, 2) +
        Math.pow(nodePosition.y - position.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestShard = nodeId;
      }
    }

    return nearestShard;
  }

  // Find nearest refinery
  private findNearestRefinery(entityId: number): number | null {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return null;

    let nearestRefinery: number | null = null;
    let minDistance = Infinity;

    // Find all refineries (buildings with HealthComponent)
    const refineries = this.entityManager.getEntitiesWithComponents([
      PositionComponent, HealthComponent
    ]);

    for (const refineryId of refineries) {
      const refineryPosition = this.entityManager.getComponent<PositionComponent>(refineryId, PositionComponent);
      if (!refineryPosition) continue;

      const distance = Math.sqrt(
        Math.pow(refineryPosition.x - position.x, 2) +
        Math.pow(refineryPosition.y - position.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestRefinery = refineryId;
      }
    }

    return nearestRefinery;
  }

  // Find nearest base (power node or refinery)
  private findNearestBase(entityId: number): number | null {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return null;

    let nearestBase: number | null = null;
    let minDistance = Infinity;

    // Find all buildings
    const buildings = this.entityManager.getEntitiesWithComponents([
      PositionComponent, HealthComponent
    ]);

    for (const buildingId of buildings) {
      const buildingPosition = this.entityManager.getComponent<PositionComponent>(buildingId, PositionComponent);
      if (!buildingPosition) continue;

      const distance = Math.sqrt(
        Math.pow(buildingPosition.x - position.x, 2) +
        Math.pow(buildingPosition.y - position.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestBase = buildingId;
      }
    }

    return nearestBase;
  }

  // Add credits to global pool
  private addCredits(amount: number): void {
    this.economySystem.addCredits(amount);
  }

  // Get current state
  getState(_entityId: number): HarvesterState {
    return this.state;
  }
}