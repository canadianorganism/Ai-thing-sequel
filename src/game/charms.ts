// Charm system - equippable abilities that modify player stats and mechanics
import { Player, PLAYER_CONSTANTS } from './types';

export type CharmId = 
  | 'wayward_compass'
  | 'gathering_swarm'
  | 'stalwart_shell'
  | 'soul_catcher'
  | 'shaman_stone'
  | 'soul_eater'
  | 'dashmaster'
  | 'sprintmaster'
  | 'grubsong'
  | 'quick_slash'
  | 'steady_body'
  | 'quick_focus'
  | 'deep_focus'
  | 'lifeblood_heart'
  | 'longnail'
  | 'mark_of_pride'
  | 'fury_of_the_fallen'
  | 'thorns_of_agony'
  | 'grubberflys_elegy'
  | 'spell_twister';

export interface Charm {
  id: CharmId;
  name: string;
  description: string;
  notchCost: number;
  acquired: boolean;
  equipped: boolean;
}

export interface CharmEffects {
  // Attack modifiers
  attackSpeedMultiplier: number;
  attackRangeMultiplier: number;
  knockbackReduction: number;
  
  // Soul modifiers
  soulGainMultiplier: number;
  spellCostMultiplier: number;
  spellDamageMultiplier: number;
  
  // Healing modifiers
  healSpeedMultiplier: number;
  healAmountMultiplier: number;
  
  // Movement modifiers
  dashCooldownMultiplier: number;
  walkSpeedMultiplier: number;
  
  // Defensive modifiers
  invincibilityMultiplier: number;
  lifebloodMasks: number;
  
  // Special effects
  hasGatheringSwarm: boolean;
  hasWaywardCompass: boolean;
  hasThornsOfAgony: boolean;
  hasGrubsong: boolean;
  hasFuryOfFallen: boolean;
  hasGrubberflysElegy: boolean;
}

// Charm data - matching Hollow Knight's actual charms
export const CHARM_DATA: Record<CharmId, Omit<Charm, 'acquired' | 'equipped'>> = {
  wayward_compass: {
    id: 'wayward_compass',
    name: 'Wayward Compass',
    description: 'Whispers its location to the bearer whenever a map is open.',
    notchCost: 1,
  },
  gathering_swarm: {
    id: 'gathering_swarm',
    name: 'Gathering Swarm',
    description: 'A swarm will collect any loose Geo and bring it to you.',
    notchCost: 1,
  },
  stalwart_shell: {
    id: 'stalwart_shell',
    name: 'Stalwart Shell',
    description: 'Increases invincibility time after taking damage.',
    notchCost: 2,
  },
  soul_catcher: {
    id: 'soul_catcher',
    name: 'Soul Catcher',
    description: 'Increases the amount of Soul gained when striking enemies.',
    notchCost: 2,
  },
  shaman_stone: {
    id: 'shaman_stone',
    name: 'Shaman Stone',
    description: 'Increases the power of spells, dealing more damage to foes.',
    notchCost: 3,
  },
  soul_eater: {
    id: 'soul_eater',
    name: 'Soul Eater',
    description: 'Greatly increases the amount of Soul gained when striking enemies.',
    notchCost: 4,
  },
  dashmaster: {
    id: 'dashmaster',
    name: 'Dashmaster',
    description: 'Reduces dash cooldown, allowing for more frequent dashes.',
    notchCost: 2,
  },
  sprintmaster: {
    id: 'sprintmaster',
    name: 'Sprintmaster',
    description: 'Increases walking speed.',
    notchCost: 1,
  },
  grubsong: {
    id: 'grubsong',
    name: 'Grubsong',
    description: 'Gain Soul when taking damage.',
    notchCost: 1,
  },
  quick_slash: {
    id: 'quick_slash',
    name: 'Quick Slash',
    description: 'Increases attack speed, allowing the bearer to strike more rapidly.',
    notchCost: 3,
  },
  steady_body: {
    id: 'steady_body',
    name: 'Steady Body',
    description: 'Prevents the bearer from being knocked back when striking enemies.',
    notchCost: 1,
  },
  quick_focus: {
    id: 'quick_focus',
    name: 'Quick Focus',
    description: 'Increases the speed of focusing Soul, allowing healing to be performed faster.',
    notchCost: 3,
  },
  deep_focus: {
    id: 'deep_focus',
    name: 'Deep Focus',
    description: 'Heals two masks instead of one when focusing, but takes longer.',
    notchCost: 4,
  },
  lifeblood_heart: {
    id: 'lifeblood_heart',
    name: 'Lifeblood Heart',
    description: 'Grants two Lifeblood masks when resting at a bench.',
    notchCost: 2,
  },
  longnail: {
    id: 'longnail',
    name: 'Longnail',
    description: 'Increases the range of the bearer\'s nail.',
    notchCost: 2,
  },
  mark_of_pride: {
    id: 'mark_of_pride',
    name: 'Mark of Pride',
    description: 'Greatly increases the range of the bearer\'s nail.',
    notchCost: 3,
  },
  fury_of_the_fallen: {
    id: 'fury_of_the_fallen',
    name: 'Fury of the Fallen',
    description: 'When at one mask, the bearer\'s nail deals more damage.',
    notchCost: 2,
  },
  thorns_of_agony: {
    id: 'thorns_of_agony',
    name: 'Thorns of Agony',
    description: 'When taking damage, sprout thorny vines that damage enemies.',
    notchCost: 1,
  },
  grubberflys_elegy: {
    id: 'grubberflys_elegy',
    name: "Grubberfly's Elegy",
    description: 'When at full health, fire a beam of light with each nail swing.',
    notchCost: 3,
  },
  spell_twister: {
    id: 'spell_twister',
    name: 'Spell Twister',
    description: 'Reduces the Soul cost of casting spells.',
    notchCost: 2,
  },
};

export interface CharmState {
  charms: Map<CharmId, Charm>;
  maxNotches: number;
  usedNotches: number;
  overcharmed: boolean;
}

export function createCharmState(): CharmState {
  const charms = new Map<CharmId, Charm>();
  
  // Starting charms - player begins with a few basics, rest must be bought
  const startingCharms: CharmId[] = [
    'soul_catcher',
    'steady_body',
    'grubsong',
    'dashmaster',
  ];
  
  for (const [id, data] of Object.entries(CHARM_DATA)) {
    charms.set(id as CharmId, {
      ...data,
      acquired: startingCharms.includes(id as CharmId),
      equipped: false,
    });
  }
  
  return {
    charms,
    maxNotches: 6, // Starting notches (can increase to 11 max)
    usedNotches: 0,
    overcharmed: false,
  };
}

export function equipCharm(state: CharmState, charmId: CharmId): boolean {
  const charm = state.charms.get(charmId);
  if (!charm || !charm.acquired || charm.equipped) return false;
  
  const newNotches = state.usedNotches + charm.notchCost;
  
  // Can overcharm (exceed notches but take double damage)
  if (newNotches > state.maxNotches + 2) return false;
  
  charm.equipped = true;
  state.usedNotches = newNotches;
  state.overcharmed = newNotches > state.maxNotches;
  
  return true;
}

export function unequipCharm(state: CharmState, charmId: CharmId): boolean {
  const charm = state.charms.get(charmId);
  if (!charm || !charm.equipped) return false;
  
  charm.equipped = false;
  state.usedNotches -= charm.notchCost;
  state.overcharmed = state.usedNotches > state.maxNotches;
  
  return true;
}

export function getEquippedCharms(state: CharmState): Charm[] {
  const equipped: Charm[] = [];
  state.charms.forEach(charm => {
    if (charm.equipped) equipped.push(charm);
  });
  return equipped;
}

export function calculateCharmEffects(state: CharmState): CharmEffects {
  const effects: CharmEffects = {
    attackSpeedMultiplier: 1,
    attackRangeMultiplier: 1,
    knockbackReduction: 0,
    soulGainMultiplier: 1,
    spellCostMultiplier: 1,
    spellDamageMultiplier: 1,
    healSpeedMultiplier: 1,
    healAmountMultiplier: 1,
    dashCooldownMultiplier: 1,
    walkSpeedMultiplier: 1,
    invincibilityMultiplier: 1,
    lifebloodMasks: 0,
    hasGatheringSwarm: false,
    hasWaywardCompass: false,
    hasThornsOfAgony: false,
    hasGrubsong: false,
    hasFuryOfFallen: false,
    hasGrubberflysElegy: false,
  };
  
  const equipped = getEquippedCharms(state);
  
  for (const charm of equipped) {
    switch (charm.id) {
      case 'wayward_compass':
        effects.hasWaywardCompass = true;
        break;
      case 'gathering_swarm':
        effects.hasGatheringSwarm = true;
        break;
      case 'stalwart_shell':
        effects.invincibilityMultiplier *= 1.5;
        break;
      case 'soul_catcher':
        effects.soulGainMultiplier += 0.2; // +3 soul per hit (11 -> 14)
        break;
      case 'shaman_stone':
        effects.spellDamageMultiplier *= 1.33;
        break;
      case 'soul_eater':
        effects.soulGainMultiplier += 0.5; // +6 soul per hit (11 -> 17)
        break;
      case 'dashmaster':
        effects.dashCooldownMultiplier *= 0.6;
        break;
      case 'sprintmaster':
        effects.walkSpeedMultiplier *= 1.2;
        break;
      case 'grubsong':
        effects.hasGrubsong = true;
        break;
      case 'quick_slash':
        effects.attackSpeedMultiplier *= 0.65; // 35% faster attacks
        break;
      case 'steady_body':
        effects.knockbackReduction = 1; // Full knockback prevention
        break;
      case 'quick_focus':
        effects.healSpeedMultiplier *= 0.65;
        break;
      case 'deep_focus':
        effects.healSpeedMultiplier *= 1.65;
        effects.healAmountMultiplier *= 2;
        break;
      case 'lifeblood_heart':
        effects.lifebloodMasks += 2;
        break;
      case 'longnail':
        effects.attackRangeMultiplier *= 1.15;
        break;
      case 'mark_of_pride':
        effects.attackRangeMultiplier *= 1.25;
        break;
      case 'fury_of_the_fallen':
        effects.hasFuryOfFallen = true;
        break;
      case 'thorns_of_agony':
        effects.hasThornsOfAgony = true;
        break;
      case 'grubberflys_elegy':
        effects.hasGrubberflysElegy = true;
        break;
      case 'spell_twister':
        effects.spellCostMultiplier *= 0.67;
        break;
    }
  }
  
  return effects;
}

// Apply charm effects to player constants (called each frame)
export function getModifiedPlayerConstants(effects: CharmEffects, player: Player) {
  const P = PLAYER_CONSTANTS;
  const isFuryActive = effects.hasFuryOfFallen && player.stats.currentHealth === 1;
  const isElegyActive = effects.hasGrubberflysElegy && player.stats.currentHealth === player.stats.maxHealth;
  
  return {
    WALK_SPEED: P.WALK_SPEED * effects.walkSpeedMultiplier,
    JUMP_FORCE: P.JUMP_FORCE,
    JUMP_HOLD_FORCE: P.JUMP_HOLD_FORCE,
    JUMP_HOLD_TIME: P.JUMP_HOLD_TIME,
    DOUBLE_JUMP_FORCE: P.DOUBLE_JUMP_FORCE,
    DASH_SPEED: P.DASH_SPEED,
    DASH_DURATION: P.DASH_DURATION,
    DASH_COOLDOWN: P.DASH_COOLDOWN * effects.dashCooldownMultiplier,
    WALL_SLIDE_SPEED: P.WALL_SLIDE_SPEED,
    WALL_JUMP_FORCE_X: P.WALL_JUMP_FORCE_X,
    WALL_JUMP_FORCE_Y: P.WALL_JUMP_FORCE_Y,
    ATTACK_DURATION: P.ATTACK_DURATION * effects.attackSpeedMultiplier,
    ATTACK_COOLDOWN: P.ATTACK_COOLDOWN * effects.attackSpeedMultiplier,
    ATTACK_RANGE: P.ATTACK_RANGE * effects.attackRangeMultiplier,
    HEAL_TIME: P.HEAL_TIME * effects.healSpeedMultiplier,
    HEAL_AMOUNT: Math.floor(P.HEAL_AMOUNT * effects.healAmountMultiplier),
    SOUL_PER_HIT: Math.floor(P.SOUL_PER_HIT * effects.soulGainMultiplier),
    SOUL_FOR_HEAL: P.SOUL_FOR_HEAL,
    SOUL_FOR_SPELL: Math.floor(P.SOUL_FOR_SPELL * effects.spellCostMultiplier),
    INVINCIBILITY_DURATION: P.INVINCIBILITY_DURATION * effects.invincibilityMultiplier,
    KNOCKBACK_FORCE: effects.knockbackReduction > 0 ? 0 : P.KNOCKBACK_FORCE,
    POGO_FORCE: P.POGO_FORCE,
    WIDTH: P.WIDTH,
    HEIGHT: P.HEIGHT,
    NAIL_DAMAGE_MULTIPLIER: isFuryActive ? 1.75 : 1,
    SHOULD_FIRE_ELEGY: isElegyActive,
  };
}
