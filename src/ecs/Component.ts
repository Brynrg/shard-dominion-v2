// Base component class for ECS system
export class Component {
  // Component-specific data can be set in derived classes
  constructor(public name: string = 'Component') {}
}

// Position component - tracks world coordinates
export class PositionComponent extends Component {
  constructor(
    public x: number = 0,
    public y: number = 0
  ) {
    super('Position');
  }
}

// Velocity component - tracks movement speed and direction
export class VelocityComponent extends Component {
  constructor(
    public vx: number = 0,
    public vy: number = 0,
    public speed: number = 1
  ) {
    super('Velocity');
  }
}

// Health component - tracks HP and state
export class HealthComponent extends Component {
  constructor(
    public maxHp: number = 100,
    public currentHp: number = 100,
    public armor: number = 0
  ) {
    super('Health');
  }
}

// Experience component - handles veterancy system
export class ExperienceComponent extends Component {
  constructor(
    public rank: number = 0, // 0: Basic, 1: Veteran, 2: Elite, 3: Heroic
    public kills: number = 0,
    public exp: number = 0
  ) {
    super('Experience');
  }
}

// Renderable component - holds visual representation data
export class RenderableComponent extends Component {
  constructor(
    public sprite?: string,
    public width: number = 32,
    public height: number = 32,
    public color: string = '#ffffff'
  ) {
    super('Renderable');
  }
}

// Combat component - weapon and stats
export class CombatComponent extends Component {
  constructor(
    public damage: number = 10,
    public range: number = 100,
    public cooldown: number = 1,
    public lastAttackTime: number = 0,
    public currentTarget: number | null = null // entity ID
  ) {
    super('Combat');
  }
}

// Movement component - pathfinding control
export class MovementComponent extends Component {
  constructor(
    public path: Array<{x: number, y: number}> = [],
    public currentPathIndex: number = 0,
    public speed: number = 1,
    public isMoving: boolean = false
  ) {
    super('Movement');
  }
}

// Unit type component - identifies unit species
export class UnitTypeComponent extends Component {
  constructor(
    public type: string = 'basic', // harvester, combat_tank, etc.
    public faction: string = 'vanguard_enclave'
  ) {
    super('UnitType');
  }
}

// Building type component - identifies building species
export class BuildingTypeComponent extends Component {
  constructor(
    public type: string = 'basic', // power_node, refinery, etc.
    public faction: string = 'vanguard_enclave'
  ) {
    super('BuildingType');
  }
}

// Resource component - for harvesters
export class ResourceComponent extends Component {
  constructor(
    public capacity: number = 500,
    public current: number = 0,
    public resources: string = 'aether_shards'
  ) {
    super('Resource');
  }
}

// Building component - structural properties
export class BuildingComponent extends Component {
  constructor(
    public buildTime: number = 10,
    public progress: number = 1, // 1 = built, <1 = building
    public powerOutput: number = 0,
    public powerDrain: number = 0
  ) {
    super('Building');
  }
}