import { EntityManager } from '../ecs/EntityManager';
import { PositionComponent, VelocityComponent, MovementComponent } from '../ecs/Component';
import { GridManager } from '../core/GridManager';

// Simple A* pathfinding implementation
interface Node {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // g + h
  parent: Node | null;
}

export class PathfindingSystem {
  private entityManager: EntityManager;
  private gridManager: GridManager;

  constructor(entityManager: EntityManager, gridManager: GridManager) {
    this.entityManager = entityManager;
    this.gridManager = gridManager;
  }



  // Set a tile as unwalkable (for buildings, obstacles)
  setUnwalkable(x: number, y: number): void {
    this.gridManager.setWalkable(x, y, false);
  }

  // Set a tile as walkable
  setWalkable(x: number, y: number): void {
    this.gridManager.setWalkable(x, y, true);
  }

  // Set a tile as hazard zone (higher movement cost)
  setHazard(x: number, y: number): void {
    this.gridManager.setHazardZone(x, y, true);
  }

  // Check if a tile is walkable
  isWalkable(x: number, y: number): boolean {
    return this.gridManager.isWalkable(x, y);
  }

  // Get movement cost for a tile (hazard zones cost more)
  getMovementCost(x: number, y: number): number {
    return this.gridManager.isInHazardZone(x, y) ? 2.0 : 1.0;
  }

  // Convert world coordinates to grid coordinates
  worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return this.gridManager.worldToGrid(worldX, worldY);
  }

  // Convert grid coordinates to world coordinates
  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return this.gridManager.gridToWorld(gridX, gridY);
  }

  // A* pathfinding algorithm
  findPath(startX: number, startY: number, goalX: number, goalY: number): Array<{ x: number; y: number }> {
    const start = { x: Math.floor(startX / 32), y: Math.floor(startY / 32) };
    const goal = { x: Math.floor(goalX / 32), y: Math.floor(goalY / 32) };

    // Ensure start and goal are valid
    if (!this.isWalkable(start.x, start.y) || !this.isWalkable(goal.x, goal.y)) {
      return [];
    }

    const openList: Node[] = [];
    const closedList: Set<string> = new Set();

    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start.x, start.y, goal.x, goal.y),
      f: 0,
      parent: null
    };
    startNode.g = this.heuristic(start.x, start.y, goal.x, goal.y);
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f cost
      let currentNode = openList[0];
      let currentIndex = 0;

      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < currentNode.f) {
          currentNode = openList[i];
          currentIndex = i;
        }
      }

      // Move current node from open to closed
      openList.splice(currentIndex, 1);
      closedList.add(`${currentNode.x},${currentNode.y}`);

      // Check if we've reached the goal
      if (currentNode.x === goal.x && currentNode.y === goal.y) {
        return this.reconstructPath(currentNode);
      }

      // Generate neighbors
      const neighbors: Node[] = this.getNeighbors(currentNode.x, currentNode.y);

      for (const neighbor of neighbors) {
        // Skip if neighbor is in closed list
        if (closedList.has(`${neighbor.x},${neighbor.y}`)) {
          continue;
        }

        // Calculate tentative g cost
        const tentativeG = currentNode.g + this.getMovementCost(neighbor.x, neighbor.y);

        // Check if neighbor is in open list
        const existingNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (!existingNode) {
          // Add to open list
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor.x, neighbor.y, goal.x, goal.y);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = currentNode;
          openList.push(neighbor);
        } else if (tentativeG < existingNode.g) {
          // Found a better path, update values
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = currentNode;
        }
      }
    }

    // No path found
    return [];
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private getNeighbors(x: number, y: number): Node[] {
    const neighbors: Node[] = [];
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 },  // Right
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }, // Left
      { x: -1, y: -1 }, // Up-left
      { x: 1, y: -1 },  // Up-right
      { x: -1, y: 1 },  // Down-left
      { x: 1, y: 1 },   // Down-right
    ];

    for (const dir of directions) {
      const newX = x + dir.x;
      const newY = y + dir.y;

      // Check bounds
      if (newX >= 0 && newX < 100 && newY >= 0 && newY < 100) {
        // Check if walkable
        if (this.isWalkable(newX, newY)) {
          neighbors.push({ x: newX, y: newY, g: 0, h: 0, f: 0, parent: null });
        }
      }
    }

    return neighbors;
  }

  private reconstructPath(goalNode: Node): Array<{ x: number; y: number }> {
    const path: Array<{ x: number; y: number }> = [];
    let currentNode: Node | null = goalNode;

    while (currentNode !== null) {
      path.unshift({ x: currentNode.x, y: currentNode.y });
      currentNode = currentNode.parent;
    }

    return path;
  }

  // Update movement for all entities with pathfinding
  updateMovement(_entityId: number, _deltaTime: number): void {
    const position = this.entityManager.getComponent<PositionComponent>(_entityId, PositionComponent);
    const velocity = this.entityManager.getComponent<VelocityComponent>(_entityId, VelocityComponent);
    const movement = this.entityManager.getComponent<MovementComponent>(_entityId, MovementComponent);

    if (!position || !velocity || !movement) {
      return;
    }

    // If no path, calculate one to current target or wander
    if (movement.path.length === 0) {
      // For now, just move in a random direction
      const targetX = position.x + (Math.random() - 0.5) * 100;
      const targetY = position.y + (Math.random() - 0.5) * 100;
      const path = this.findPath(position.x, position.y, targetX, targetY);
      movement.path = path;
      movement.currentPathIndex = 0;
      movement.isMoving = path.length > 0;
    }

    // Follow current path
    if (movement.isMoving && movement.path.length > 0) {
      const targetNode = movement.path[movement.currentPathIndex];
      const targetWorld = this.gridToWorld(targetNode.x, targetNode.y);

      // Calculate direction
      const dx = targetWorld.x - position.x;
      const dy = targetWorld.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If close enough to current target, move to next in path
      if (distance < 5) {
        movement.currentPathIndex++;
        if (movement.currentPathIndex >= movement.path.length) {
          movement.path = [];
          movement.currentPathIndex = 0;
          movement.isMoving = false;
        }
      } else {
        // Move towards current target
        velocity.vx = dx / distance;
        velocity.vy = dy / distance;
      }
    } else {
      // No path to follow, stop moving
      velocity.vx = 0;
      velocity.vy = 0;
      movement.isMoving = false;
    }
  }

  // Simple boid-like behavior to prevent stacking
  applyBoidBehavior(entityId: number, neighborRadius: number = 30): void {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    const velocity = this.entityManager.getComponent<VelocityComponent>(entityId, VelocityComponent);

    if (!position || !velocity) return;

    const separation = this.calculateSeparation(entityId, neighborRadius);
    const alignment = this.calculateAlignment(entityId, neighborRadius);
    const cohesion = this.calculateCohesion(entityId, neighborRadius);

    // Apply boid forces
    velocity.vx += separation.x * 0.5 + alignment.x * 0.1 + cohesion.x * 0.1;
    velocity.vy += separation.y * 0.5 + alignment.y * 0.1 + cohesion.y * 0.1;

    // Limit speed
    const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    const maxSpeed = velocity.speed;
    if (speed > maxSpeed) {
      velocity.vx = (velocity.vx / speed) * maxSpeed;
      velocity.vy = (velocity.vy / speed) * maxSpeed;
    }
  }

  private calculateSeparation(entityId: number, radius: number): { x: number; y: number } {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return { x: 0, y: 0 };

    let separationX = 0;
    let separationY = 0;
    let count = 0;

    // Find neighbors within radius
    const entities = this.entityManager.getEntitiesInRadius(position.x, position.y, radius);
    
    for (const otherId of entities) {
      if (otherId === entityId) continue;

      const otherPosition = this.entityManager.getComponent<PositionComponent>(otherId, PositionComponent);
      if (!otherPosition) continue;

      const dx = position.x - otherPosition.x;
      const dy = position.y - otherPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius && distance > 0) {
        separationX += dx / distance;
        separationY += dy / distance;
        count++;
      }
    }

    if (count > 0) {
      separationX /= count;
      separationY /= count;
    }

    return { x: separationX, y: separationY };
  }

  private calculateAlignment(_entityId: number, _radius: number): { x: number; y: number } {
    // Placeholder for alignment
    return { x: 0, y: 0 };
  }

  private calculateCohesion(_entityId: number, _radius: number): { x: number; y: number } {
    // Placeholder for cohesion
    return { x: 0, y: 0 };
  }
}