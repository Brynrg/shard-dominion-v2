// Combat system - handles targeting, veterancy, and weapon mechanics
import { EntityManager } from '../ecs/EntityManager';
import { System } from '../ecs/System';
import { PositionComponent, HealthComponent, ExperienceComponent, CombatComponent } from '../ecs/Component';

export class CombatSystem extends System {
  private combatRange = 100; // pixels

  constructor(entityManager: EntityManager) {
    super(entityManager);
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

  private getVeterancyMultiplier(): number {
    // Load from config - for now return default
    return 1.15;
  }

  private findNearestEnemy(entityId: number): number | null {
    const position = this.entityManager.getComponent<PositionComponent>(entityId, PositionComponent);
    if (!position) return null;

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
    // Placeholder for veterancy configuration from DataLoader
    return {
      rank_1_kills: 3,
      rank_2_kills: 7,
      rank_3_kills: 15,
      stat_multiplier_per_rank: 1.15
    };
  }

  // Add Silicate Leviathan AI (invisible, moves under sand)
  updateLeviathan(_entityId: number): void {
    // Placeholder for leviathan AI
    // - Track highest concentration of heavy armor
    // - Attack, then burrow away
  }

  // Add Shard Bloom event 
  triggerShardBloom(_x: number, _y: number): void {
    // Placeholder for shard bloom event
    // - Trigger explosion
    // - Flag 3x3 grid area as hazard zone
  }

  // Render combat visual effects
  renderCombatEffects(): void {
    // Placeholder for combat visuals
  }
}