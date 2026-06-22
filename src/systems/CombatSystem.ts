// Combat system - handles targeting, veterancy, and weapon mechanics
import { EntityManager } from '../ecs/EntityManager';
import { System } from '../ecs/System';
import { PositionComponent, HealthComponent, ExperienceComponent, CombatComponent, UnitTypeComponent, FactionComponent } from '../ecs/Component';
import { DataLoader } from '../data/DataLoader';
import { GridManager } from '../core/GridManager';

export class CombatSystem extends System {
  private combatRange = 100; // pixels
  private dataLoader!: DataLoader;
  private gridManager!: GridManager;

  constructor(entityManager: EntityManager) {
    super(entityManager);
  }

  // Set grid manager for hazard zone operations
  setGridManager(gridManager: GridManager): void {
    this.gridManager = gridManager;
  }

  // Set data loader for accessing configuration
  setDataLoader(dataLoader: DataLoader): void {
    this.dataLoader = dataLoader;
  }

  update(deltaTime: number): void {
    // Find all combat-ready entities
    const combatEntities = this.entityManager.getEntitiesWithComponents([
      PositionComponent, HealthComponent, ExperienceComponent, CombatComponent
    ]);

    // Process combat for each entity
    combatEntities.forEach(entityId => {
      this.processCombat(entityId, deltaTime);
    });
  }

  private processCombat(entityId: number, deltaTime: number): void {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    const health = this.entityManager.getComponent<HealthComponent>(entityId, HealthComponent);
    const experience = this.entityManager.getComponent<ExperienceComponent>(entityId, ExperienceComponent);
    const combat = this.entityManager.getComponent<CombatComponent>(entityId, CombatComponent);

    if (!position || !health || !experience || !combat) return;

    // Check if this entity has a target
    if (combat.currentTarget !== null) {
      this.combatWithTarget(entityId, combat.currentTarget, deltaTime);
    } else {
      // Look for new target
      const targetId = this.findNearestEnemy(entityId);
      if (targetId !== null) {
        combat.currentTarget = targetId;
        combat.lastAttackTime = 0; // Reset attack cooldown
      }
    }

    // Check if current target is dead or out of range
    if (combat.currentTarget !== null) {
      const targetPosition = this.entityManager.getComponent<PositionComponent>(combat.currentTarget, PositionComponent);
      const targetHealth = this.entityManager.getComponent<HealthComponent>(combat.currentTarget, HealthComponent);
      
      if (!targetPosition || !targetHealth || targetHealth.currentHp <= 0) {
        combat.currentTarget = null;
      } else {
        const distance = this.calculateDistance(position, targetPosition);
        if (distance > this.combatRange) {
          combat.currentTarget = null;
        }
      }
    }
  }

  private combatWithTarget(entityId: number, targetId: number, _deltaTime: number): void {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    const combat = this.entityManager.getComponent<CombatComponent>(entityId, CombatComponent);
    const targetPosition = this.entityManager.getComponent<PositionComponent>(targetId, PositionComponent);
    const targetHealth = this.entityManager.getComponent<HealthComponent>(targetId, HealthComponent);
    const experience = this.entityManager.getComponent<ExperienceComponent>(entityId, ExperienceComponent);

    if (!position || !combat || !targetPosition || !targetHealth || !experience) return;

    // Calculate distance
    const distance = this.calculateDistance(position, targetPosition);
    
    // If in range, attack
    if (distance <= combat.range) {
      const currentTime = performance.now();
      if (currentTime - combat.lastAttackTime >= combat.cooldown * 1000) {
        this.dealDamage(targetId, combat.damage);
        combat.lastAttackTime = currentTime;
        
        // Check if target was killed for experience
        const targetHealthAfter = this.entityManager.getComponent<HealthComponent>(targetId, HealthComponent);
        if (targetHealthAfter && targetHealthAfter.currentHp <= 0) {
          this.addExperience(entityId, 1); // 1 exp per kill
        }
      }
    }
  }

  private dealDamage(targetId: number, damage: number): void {
    const targetHealth = this.entityManager.getComponent<HealthComponent>(targetId, HealthComponent);
    if (!targetHealth) return;

    targetHealth.currentHp -= damage;
    if (targetHealth.currentHp < 0) {
      targetHealth.currentHp = 0;
    }
  }

  private addExperience(entityId: number, kills: number): void {
    const experience = this.entityManager.getComponent<ExperienceComponent>(entityId, ExperienceComponent);
    if (!experience) return;

    experience.kills += kills;
    experience.exp += kills * 10; // 10 exp per kill

    // Check for rank up
    const veterancyConfig = this.getVeterancyConfig();
    if (veterancyConfig) {
      let newRank = experience.rank;
      if (experience.kills >= veterancyConfig.rank_3_kills) {
        newRank = 3; // Heroic
      } else if (experience.kills >= veterancyConfig.rank_2_kills) {
        newRank = 2; // Elite
      } else if (experience.kills >= veterancyConfig.rank_1_kills) {
        newRank = 1; // Veteran
      }

      if (newRank > experience.rank) {
        experience.rank = newRank;
        this.applyVeterancyBonus(entityId);
      }
    }
  }

  private applyVeterancyBonus(entityId: number): void {
    const experience = this.entityManager.getComponent<ExperienceComponent>(entityId, ExperienceComponent);
    const combat = this.entityManager.getComponent<CombatComponent>(entityId, CombatComponent);
    
    if (!experience || !combat) return;

    const multiplier = this.getVeterancyMultiplier();
    if (multiplier > 1) {
      combat.damage = Math.floor(combat.damage * multiplier);
      combat.cooldown = combat.cooldown / multiplier;
    }
  }

  private findNearestEnemy(entityId: number): number | null {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return null;

    const attackerFaction = this.entityManager.getComponent<FactionComponent>(entityId, FactionComponent);
    if (!attackerFaction) return null;

    let nearestEnemy: number | null = null;
    let minDistance = Infinity;

    // Find enemies (for now, assume all other combat entities are enemies)
    const combatEntities = this.entityManager.getEntitiesWithComponents([
      PositionComponent, HealthComponent, ExperienceComponent, CombatComponent
    ]);

    for (const otherId of combatEntities) {
      if (otherId === entityId) continue;

      const otherPosition = this.entityManager.getComponent<PositionComponent>(otherId, PositionComponent);
      if (!otherPosition) continue;

      // Check if the other entity has a FactionComponent and if it's the same team
      const otherFaction = this.entityManager.getComponent<FactionComponent>(otherId, FactionComponent);
      if (otherFaction && otherFaction.faction === attackerFaction.faction) {
        // Same faction - skip this entity (friendly fire disabled)
        continue;
      }

      const distance = this.calculateDistance(position, otherPosition);
      if (distance < minDistance && distance <= this.combatRange) {
        minDistance = distance;
        nearestEnemy = otherId;
      }
    }

    return nearestEnemy;
  }

  private calculateDistance(pos1: PositionComponent, pos2: PositionComponent): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getVeterancyConfig(): any {
    // Load from DataLoader
    if (this.dataLoader) {
      const globalMechanics = this.dataLoader.getGlobalMechanics();
      return globalMechanics?.veterancy || null;
    }
    return null;
  }

  private getVeterancyMultiplier(): number {
    const config = this.getVeterancyConfig();
    return config?.stat_multiplier_per_rank || 1.15;
  }

  // Add Silicate Leviathan AI (invisible, moves under sand, tracks heavy armor, attacks, burrows)
  updateLeviathan(entityId: number, _deltaTime: number): void {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    const health = this.entityManager.getComponent<HealthComponent>(entityId, HealthComponent);
    const combat = this.entityManager.getComponent<CombatComponent>(entityId, CombatComponent);
    const experience = this.entityManager.getComponent<ExperienceComponent>(entityId, ExperienceComponent);
    const unitType = this.entityManager.getComponent<UnitTypeComponent>(entityId, UnitTypeComponent);

    if (!position || !health || !combat || !experience || !unitType) return;

    // Leviathan is invisible - don't render it
    if (health.currentHp <= 0) return;

    // Find nearest heavy armor unit (combat tanks)
    const targetId = this.findNearestHeavyArmor(entityId);
    if (targetId !== null) {
      combat.currentTarget = targetId;
      combat.lastAttackTime = 0; // Reset attack cooldown

      // Move towards target
      const targetPosition = this.entityManager.getComponent<PositionComponent>(targetId, PositionComponent);
      if (targetPosition) {
        const distance = this.calculateDistance(position, targetPosition);

        if (distance <= combat.range) {
          // Attack
          const currentTime = performance.now();
          if (currentTime - combat.lastAttackTime >= combat.cooldown * 1000) {
            this.dealDamage(targetId, combat.damage);
            combat.lastAttackTime = currentTime;
          }
        } else {
          // Move towards target
          const dx = targetPosition.x - position.x;
          const dy = targetPosition.y - position.y;
          const moveDistance = Math.sqrt(dx * dx + dy * dy);
          const speed = 0.5; // Slow movement

          position.x += (dx / moveDistance) * speed;
          position.y += (dy / moveDistance) * speed;
        }
      }
    } else {
      // No target - move randomly under sand
      const randomAngle = Math.random() * Math.PI * 2;
      const speed = 0.3;
      position.x += Math.cos(randomAngle) * speed;
      position.y += Math.sin(randomAngle) * speed;
    }
  }

  // Find nearest heavy armor unit (combat tanks)
  private findNearestHeavyArmor(entityId: number): number | null {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return null;

    let nearestTarget: number | null = null;
    let minDistance = Infinity;

    // Find all combat tanks
    const combatTanks = this.entityManager.getEntitiesWithComponents([
      PositionComponent, HealthComponent, UnitTypeComponent
    ]);

    for (const tankId of combatTanks) {
      if (tankId === entityId) continue;

      const tankPosition = this.entityManager.getComponent<PositionComponent>(tankId, PositionComponent);
      const tankType = this.entityManager.getComponent<UnitTypeComponent>(tankId, UnitTypeComponent);

      if (!tankPosition || !tankType) continue;

      // Check if it's a combat tank
      if (tankType.type === 'combat_tank') {
        const distance = this.calculateDistance(position, tankPosition);
        if (distance < minDistance) {
          minDistance = distance;
          nearestTarget = tankId;
        }
      }
    }

    return nearestTarget;
  }

  // Add Shard Bloom event (explosion + 3x3 hazard zone with tick damage)
  triggerShardBloom(x: number, y: number): void {
    // Trigger explosion (visual effect)
    console.log(`Shard Bloom triggered at (${x}, ${y})`);

    // Flag 3x3 grid area as hazard zone
    const gridX = Math.floor(x / 32);
    const gridY = Math.floor(y / 32);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        this.gridManager.setHazardZone(gridX + dx, gridY + dy, true);
      }
    }

    // Apply tick damage to units in hazard zone
    this.applyHazardDamage(gridX, gridY, 3, 5); // 3x3 area, 5 damage per tick
  }

  // Apply tick damage to units in hazard zone
  private applyHazardDamage(_centerX: number, _centerY: number, radius: number, damage: number): void {
    const entities = this.entityManager.getAllEntities();

    for (const entityId of entities) {
      const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
      const health = this.entityManager.getComponent<HealthComponent>(entityId, HealthComponent);

      if (!position || !health) continue;

      // Check if entity is in hazard zone
      const gridX = Math.floor(position.x / 32);
      const gridY = Math.floor(position.y / 32);

      let inHazardZone = false;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (this.gridManager.isInHazardZone(gridX + dx, gridY + dy)) {
            inHazardZone = true;
            break;
          }
        }
        if (inHazardZone) break;
      }

      if (inHazardZone) {
        health.currentHp -= damage;
        console.log(`Unit ${entityId} took ${damage} damage from hazard zone`);
      }
    }
  }

  // Apply hazard damage to all entities (called from MainMap update loop)
  applyHazardDamageToAll(): void {
    // Get all entities with health
    const entities = this.entityManager.getAllEntities();

    for (const entityId of entities) {
      const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
      const health = this.entityManager.getComponent<HealthComponent>(entityId, HealthComponent);

      if (!position || !health) continue;

      // Check if entity is in any hazard zone
      const gridX = Math.floor(position.x / 32);
      const gridY = Math.floor(position.y / 32);

      if (this.gridManager.isInHazardZone(gridX, gridY)) {
        // Apply 5 damage per tick (every 1 second)
        health.currentHp -= 5;
        console.log(`Unit ${entityId} took 5 damage from hazard zone`);
      }
    }
  }

  // Render combat visual effects
  renderCombatEffects(): void {
    // Placeholder for combat visuals
  }
}