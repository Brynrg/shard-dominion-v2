// Grid-based spatial manager for 100x100 isometric map
export class GridManager {
  private gridSize = 100;
  public cellSize = 32;
  private grid: Map<string, any> = new Map();
  private hazardZones: Set<string> = new Set();
  private terrainTypes: Map<string, string> = new Map();

  constructor() {
    // Initialize grid
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const key = this.gridKey(x, y);
        this.grid.set(key, { x, y, walkable: true, occupied: false });
      }
    }
  }

  private gridKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  // Convert world coordinates to grid coordinates
  worldToGrid(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize)
    };
  }

  // Convert grid coordinates to world coordinates (isometric)
  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    const x = (gridX + gridY) * this.cellSize / 2;
    const y = (gridY - gridX) * this.cellSize / 2 + 16;
    return { x, y };
  }

  // Set cell as walkable/unwalkable (for buildings, obstacles)
  setWalkable(x: number, y: number, walkable: boolean): void {
    const key = this.gridKey(x, y);
    const cell = this.grid.get(key);
    if (cell) {
      cell.walkable = walkable;
      cell.occupied = !walkable;
    }
  }

  // Check if a cell is walkable
  isWalkable(x: number, y: number): boolean {
    const key = this.gridKey(x, y);
    const cell = this.grid.get(key);
    return cell ? cell.walkable : false;
  }

  // Add/remove hazard zones (Aether Burn)
  setHazardZone(x: number, y: number, isHazard: boolean): void {
    const key = this.gridKey(x, y);
    if (isHazard) {
      this.hazardZones.add(key);
      this.setWalkable(x, y, false); // Hazard blocks movement
    } else {
      this.hazardZones.delete(key);
      this.setWalkable(x, y, true); // Restore walkability
    }
  }

  // Check if a cell is in a hazard zone
  isInHazardZone(x: number, y: number): boolean {
    const key = this.gridKey(x, y);
    return this.hazardZones.has(key);
  }

  // Debug wireframe rendering
  renderDebug(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Draw grid lines
    for (let x = 0; x <= this.gridSize; x++) {
      for (let y = 0; y <= this.gridSize; y++) {
        const world = this.gridToWorld(x, y);
        
        // Horizontal lines
        if (x < this.gridSize) {
          const right = this.gridToWorld(x + 1, y);
          ctx.beginPath();
          ctx.moveTo(world.x, world.y);
          ctx.lineTo(right.x, right.y);
          ctx.stroke();
        }
        
        // Vertical lines
        if (y < this.gridSize) {
          const up = this.gridToWorld(x, y + 1);
          ctx.beginPath();
          ctx.moveTo(world.x, world.y);
          ctx.lineTo(up.x, up.y);
          ctx.stroke();
        }
      }
    }

    // Highlight hazard zones in red
    ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
    this.hazardZones.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const world = this.gridToWorld(x, y);
      ctx.fillRect(world.x, world.y, this.cellSize, this.cellSize);
    });
  }

  // Get all hazard zones in a radius around a point
  getHazardZonesInRange(centerX: number, centerY: number, radius: number): Array<{x: number, y: number}> {
    const hazards: Array<{x: number, y: number}> = [];
    const gridCenter = this.worldToGrid(centerX, centerY);
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = this.gridKey(gridCenter.x + dx, gridCenter.y + dy);
        if (this.hazardZones.has(key)) {
          const [x, y] = key.split(',').map(Number);
          hazards.push({x, y});
        }
      }
    }
    
    return hazards;
  }

  // Terrain type methods
  setTerrainType(x: number, y: number, type: string): void {
    const key = this.gridKey(x, y);
    this.terrainTypes.set(key, type);
  }

  getTerrainType(x: number, y: number): string {
    const key = this.gridKey(x, y);
    return this.terrainTypes.get(key) || 'concrete';
  }
}