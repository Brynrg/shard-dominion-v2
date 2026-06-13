// Data loader for faction configurations and global mechanics
export class DataLoader {
  private data: any = {};
  private loaded = false;

  constructor() {}

  async load(): Promise<void> {
    try {
      // Load factions data inline to avoid fetch issues in built dist/
      const factionsData = await import('./factions.json');
      this.data = factionsData.default;
      this.loaded = true;
    } catch (error) {
      console.error('Error loading factions data:', error);
      this.data = getDefaultFactionsData();
      this.loaded = true;
    }
  }

  // Get all faction configurations
  getFactions(): any {
    if (!this.loaded) throw new Error('Data not loaded yet');
    return this.data.factions || {};
  }

  // Get specific faction by key
  getFaction(factionKey: string): any {
    if (!this.loaded) throw new Error('Data not loaded yet');
    return this.data.factions?.[factionKey] || null;
  }

  // Get global mechanics configuration
  getGlobalMechanics(): any {
    if (!this.loaded) throw new Error('Data not loaded yet');
    return this.data.global_mechanics || {};
  }

  // Get veterancy thresholds and multipliers
  getVeterancyConfig(): any {
    if (!this.loaded) throw new Error('Data not loaded yet');
    return this.data.global_mechanics?.veterancy || getDefaultVeterancyData();
  }

  // Get unit configuration by faction and type
  getUnitConfig(factionKey: string, unitType: string): any {
    if (!this.loaded) throw new Error('Data not loaded yet');
    const faction = this.getFaction(factionKey);
    return faction?.units?.[unitType] || null;
  }

  // Get building configuration by faction and type
  getBuildingConfig(factionKey: string, buildingType: string): any {
    if (!this.loaded) throw new Error('Data not loaded yet');
    const faction = this.getFaction(factionKey);
    return faction?.buildings?.[buildingType] || null;
  }

  // Check if data is loaded
  isLoaded(): boolean {
    return this.loaded;
  }

  // Get all available faction keys
  getFactionKeys(): string[] {
    if (!this.loaded) throw new Error('Data not loaded yet');
    return Object.keys(this.data.factions || {});
  }

  // Validate loaded data structure
  validate(): boolean {
    if (!this.loaded) return false;
    
    // Check for required structures
    const required = ['global_mechanics', 'factions'];
    for (const key of required) {
      if (!(key in this.data)) return false;
    }
    
    // Check factions structure
    if (typeof this.data.factions !== 'object' || this.data.factions === null) {
      return false;
    }
    
    return true;
  }
}

// Default faction data if JSON fails to load
function getDefaultFactionsData(): any {
  return {
    global_mechanics: {
      veterancy: getDefaultVeterancyData()
    },
    factions: {
      vanguard_enclave: {
        name: "Vanguard Enclave",
        units: {
          harvester: { hp: 300, speed: 1.5, cost: 1000, build_time: 15, armor: "heavy", capacity: 500, weapons: null },
          combat_tank: { hp: 400, speed: 2.2, cost: 800, build_time: 12, armor: "heavy", weapons: [{damage: 45, range: 5, cooldown: 1.5}] }
        },
        buildings: {
          power_node: { hp: 200, cost: 300, build_time: 10, power_output: 100 },
          refinery: { hp: 800, cost: 2000, build_time: 30, power_drain: 40 }
        }
      }
    }
  };
}

// Default veterancy data
function getDefaultVeterancyData(): any {
  return {
    rank_1_kills: 3,
    rank_2_kills: 7,
    rank_3_kills: 15,
    stat_multiplier_per_rank: 1.15
  };
}