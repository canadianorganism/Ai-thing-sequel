/**
 * Adaptive AI System
 * 
 * A portable, game-agnostic adaptive difficulty system that:
 * 1. Tracks player performance metrics (deaths, damage taken, hits landed, time in areas)
 * 2. Adapts enemy attack patterns to counter player tendencies
 * 3. Adjusts damage dealt/received invisibly based on player skill
 * 4. Provides contextual hints when players struggle
 * 
 * To port to another game:
 *   - Create an AdaptiveAI instance
 *   - Call the record* methods when events happen
 *   - Use getModifiers() to scale damage/enemy behavior
 *   - Use getHint() to show contextual help
 */

export interface PlayerMetrics {
  // Combat performance
  totalAttacks: number;
  attacksLanded: number;
  totalDamageTaken: number;
  totalDamageDealt: number;
  
  // Death tracking
  deaths: number;
  deathsInCurrentArea: number;
  currentAreaId: string;
  lastDeathTime: number;
  consecutiveDeaths: number; // deaths without significant progress
  
  // Behavioral patterns (rolling window, 0-1)
  dodgeRate: number;       // how often player avoids damage
  aggressionRate: number;  // how often player attacks vs retreats
  dashUsageRate: number;   // how often player dashes
  jumpUsageRate: number;   // how often player jumps during combat
  healFrequency: number;   // how often player heals
  
  // Timing
  timeInCurrentArea: number;
  totalPlayTime: number;
  lastCombatTime: number;
  
  // Rolling windows for pattern detection
  recentActions: PlayerAction[];
}

export type PlayerAction = 
  | { type: 'attack'; direction: string; timestamp: number }
  | { type: 'dash'; timestamp: number }
  | { type: 'jump'; timestamp: number }
  | { type: 'heal'; timestamp: number }
  | { type: 'hit_taken'; enemyType: string; timestamp: number }
  | { type: 'hit_landed'; enemyType: string; timestamp: number }
  | { type: 'death'; areaId: string; timestamp: number }
  | { type: 'dodge'; timestamp: number };

export interface DifficultyModifiers {
  /** Difficulty percentage: 50% = base game difficulty, 0% = easiest, 100% = hardest */
  difficultyPercent: number;
  /** Multiplier on damage player deals (>1 = easier) */
  playerDamageMultiplier: number;
  /** Multiplier on damage player receives (<1 = easier) */
  enemyDamageMultiplier: number;
  /** How aggressively enemies pursue (0-1, lower = easier) */
  enemyAggressionScale: number;
  /** Multiplier on enemy attack frequency */
  enemyAttackFrequency: number;
  /** Multiplier on rare item drop rates (>1 = more generous, <1 = stingier) */
  rareDropRateMultiplier: number;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Base drop weight multipliers per rarity tier (applied before difficulty scaling) */
const RARITY_SENSITIVITY: Record<ItemRarity, number> = {
  common: 0.2,     // barely affected by difficulty
  uncommon: 0.5,
  rare: 1.0,       // standard scaling
  epic: 1.5,
  legendary: 2.0,  // most affected by difficulty
};

export interface EnemyCounterStrategy {
  /** Preferred attack type for this enemy */
  preferredAttack: 'ground_slam' | 'charge' | 'ranged' | 'leap' | 'normal';
  /** How often to use the counter-attack (0-1) */
  counterProbability: number;
}

export interface AdaptiveHint {
  message: string;
  priority: number; // higher = more urgent
  category: 'combat' | 'exploration' | 'ability' | 'boss';
}

const ACTION_WINDOW_SIZE = 50;
const METRICS_SMOOTHING = 0.05; // exponential moving average factor

export class AdaptiveAI {
  private metrics: PlayerMetrics;
  private hintCooldown: number = 0;
  private lastHint: string = '';
  private shownHints: Set<string> = new Set();
  
  constructor() {
    this.metrics = {
      totalAttacks: 0,
      attacksLanded: 0,
      totalDamageTaken: 0,
      totalDamageDealt: 0,
      deaths: 0,
      deathsInCurrentArea: 0,
      currentAreaId: '',
      lastDeathTime: 0,
      consecutiveDeaths: 0,
      dodgeRate: 0.5,
      aggressionRate: 0.5,
      dashUsageRate: 0.3,
      jumpUsageRate: 0.3,
      healFrequency: 0.2,
      timeInCurrentArea: 0,
      totalPlayTime: 0,
      lastCombatTime: 0,
      recentActions: [],
    };
  }
  
  // ─── Event Recording ───────────────────────────────────
  
  recordAttack(direction: string): void {
    this.metrics.totalAttacks++;
    this.pushAction({ type: 'attack', direction, timestamp: Date.now() });
    this.metrics.aggressionRate = ema(this.metrics.aggressionRate, 1, METRICS_SMOOTHING);
  }
  
  recordHitLanded(enemyType: string, damage: number): void {
    this.metrics.attacksLanded++;
    this.metrics.totalDamageDealt += damage;
    this.metrics.lastCombatTime = Date.now();
    this.pushAction({ type: 'hit_landed', enemyType, timestamp: Date.now() });
  }
  
  recordDamageTaken(enemyType: string, damage: number): void {
    this.metrics.totalDamageTaken += damage;
    this.metrics.lastCombatTime = Date.now();
    this.metrics.dodgeRate = ema(this.metrics.dodgeRate, 0, METRICS_SMOOTHING);
    this.pushAction({ type: 'hit_taken', enemyType, timestamp: Date.now() });
  }
  
  recordDodge(): void {
    this.metrics.dodgeRate = ema(this.metrics.dodgeRate, 1, METRICS_SMOOTHING);
    this.pushAction({ type: 'dodge', timestamp: Date.now() });
  }
  
  recordDash(): void {
    this.metrics.dashUsageRate = ema(this.metrics.dashUsageRate, 1, METRICS_SMOOTHING);
    this.pushAction({ type: 'dash', timestamp: Date.now() });
  }
  
  recordJump(): void {
    this.metrics.jumpUsageRate = ema(this.metrics.jumpUsageRate, 1, METRICS_SMOOTHING);
    this.pushAction({ type: 'jump', timestamp: Date.now() });
  }
  
  recordHeal(): void {
    this.metrics.healFrequency = ema(this.metrics.healFrequency, 1, METRICS_SMOOTHING);
    this.pushAction({ type: 'heal', timestamp: Date.now() });
  }
  
  recordDeath(areaId: string): void {
    this.metrics.deaths++;
    this.metrics.deathsInCurrentArea++;
    this.metrics.consecutiveDeaths++;
    this.metrics.lastDeathTime = Date.now();
    this.pushAction({ type: 'death', areaId, timestamp: Date.now() });
  }
  
  recordAreaChange(areaId: string): void {
    if (areaId !== this.metrics.currentAreaId) {
      // Successfully moved to new area = progress
      this.metrics.consecutiveDeaths = 0;
      this.metrics.deathsInCurrentArea = 0;
      this.metrics.timeInCurrentArea = 0;
      this.metrics.currentAreaId = areaId;
    }
  }
  
  update(deltaTime: number): void {
    this.metrics.totalPlayTime += deltaTime;
    this.metrics.timeInCurrentArea += deltaTime;
    if (this.hintCooldown > 0) this.hintCooldown -= deltaTime;
    
    // Decay rates back toward neutral over time
    this.metrics.aggressionRate = ema(this.metrics.aggressionRate, 0.5, 0.005);
    this.metrics.dashUsageRate = ema(this.metrics.dashUsageRate, 0.3, 0.005);
    this.metrics.jumpUsageRate = ema(this.metrics.jumpUsageRate, 0.3, 0.005);
    this.metrics.healFrequency = ema(this.metrics.healFrequency, 0.2, 0.005);
  }
  
  // ─── Difficulty Modifiers ──────────────────────────────
  
  getModifiers(): DifficultyModifiers {
    const struggleScore = this.getStruggleScore();
    
    // Convert struggle score to difficulty percentage
    // struggleScore 0 (dominating) → difficulty goes UP (harder, toward 100%)
    // struggleScore 1 (struggling) → difficulty goes DOWN (easier, toward 0%)
    // struggleScore ~0.5 (balanced) → difficulty stays at 50% (base game)
    const difficultyPercent = clamp(Math.round((1 - struggleScore) * 100), 0, 100);
    
    // Normalize to 0-1 for modifier calculations (0 = easiest, 1 = hardest)
    const t = difficultyPercent / 100;
    
    // At 50% (base), all multipliers are 1.0 (original game difficulty)
    // At 0% (easiest): player deals 1.5x, takes 0.5x, enemies slow & passive, rare drops 2x
    // At 100% (hardest): player deals 0.7x, takes 1.3x, enemies fast & aggressive, rare drops 0.5x
    const playerDamageMultiplier = lerp(1.5, 0.7, t);
    const enemyDamageMultiplier = lerp(0.5, 1.3, t);
    const enemyAggressionScale = lerp(0.5, 1.3, t);
    const enemyAttackFrequency = lerp(0.5, 1.3, t);
    const rareDropRateMultiplier = lerp(2.0, 0.5, t);
    
    return {
      difficultyPercent,
      playerDamageMultiplier,
      enemyDamageMultiplier,
      enemyAggressionScale,
      enemyAttackFrequency,
      rareDropRateMultiplier,
    };
  }
  
  /** 0 = player is dominating, 1 = player is really struggling. Baseline 0.5 = balanced (50% difficulty). */
  private getStruggleScore(): number {
    // Start at neutral baseline so a fresh game sits at 50% difficulty
    let score = 0.5;

    // Deaths in current area push toward struggling (each death adds 0.1, capped at +0.4)
    score += Math.min(this.metrics.deathsInCurrentArea * 0.1, 0.4);

    // Consecutive deaths without progress (0.07 each, capped at +0.2)
    score += Math.min(this.metrics.consecutiveDeaths * 0.07, 0.2);

    // Low hit accuracy (if < 30% of attacks land) → struggling
    if (this.metrics.totalAttacks > 10) {
      const accuracy = this.metrics.attacksLanded / this.metrics.totalAttacks;
      if (accuracy < 0.3) score += 0.1;
      else if (accuracy > 0.7) score -= 0.1; // dominating
    }

    // Damage ratio: taking more than dealing → struggling; dealing way more → dominating
    if (this.metrics.totalDamageDealt > 0) {
      const ratio = this.metrics.totalDamageTaken / this.metrics.totalDamageDealt;
      if (ratio > 2) score += 0.1;
      else if (ratio < 0.5) score -= 0.1;
    }

    return clamp(score, 0, 1);
  }
  
  // ─── Enemy Counter Strategy ────────────────────────────
  
  getEnemyCounterStrategy(enemyType: string): EnemyCounterStrategy {
    const m = this.metrics;
    
    // Determine what the player does most and pick counters
    // High dash usage → use attacks that cover ground (charge/leap)
    // High jump usage → use ground slams / anti-air
    // High aggression → use ranged attacks to force retreat
    // Low aggression (passive) → charge to close distance
    
    let preferred: EnemyCounterStrategy['preferredAttack'] = 'normal';
    let counterProb = 0.3; // base 30% chance to use counter
    
    if (m.dashUsageRate > 0.5) {
      preferred = 'charge';
      counterProb = 0.4 + m.dashUsageRate * 0.3;
    } else if (m.jumpUsageRate > 0.5) {
      preferred = 'ground_slam';
      counterProb = 0.4 + m.jumpUsageRate * 0.3;
    } else if (m.aggressionRate > 0.7) {
      preferred = 'ranged';
      counterProb = 0.35 + m.aggressionRate * 0.2;
    } else if (m.aggressionRate < 0.3) {
      preferred = 'leap';
      counterProb = 0.4 + (1 - m.aggressionRate) * 0.2;
    }
    
    return { preferredAttack: preferred, counterProbability: clamp(counterProb, 0, 0.8) };
  }
  
  // ─── Hint System ───────────────────────────────────────
  
  getHint(): AdaptiveHint | null {
    if (this.hintCooldown > 0) return null;
    
    const m = this.metrics;
    let hint: AdaptiveHint | null = null;
    
    // Boss-specific hints after multiple deaths
    if (m.deathsInCurrentArea >= 3) {
      if (m.currentAreaId.includes('boss') || m.currentAreaId.includes('false_knight') || m.currentAreaId.includes('crossroads_boss')) {
        hint = this.pickUnshownHint([
          { message: 'Try dashing through attacks to use your invincibility frames.', priority: 3, category: 'boss' },
          { message: 'Heal only when the boss pauses after a big attack.', priority: 3, category: 'boss' },
          { message: 'Downward attacks (pogo) can keep you safe while dealing damage.', priority: 2, category: 'boss' },
          { message: 'Focus on dodging first — learn the patterns before attacking.', priority: 2, category: 'boss' },
        ]);
      }
    }
    
    // General combat hints after deaths
    if (!hint && m.consecutiveDeaths >= 2) {
      if (m.healFrequency < 0.1 && m.totalPlayTime > 30) {
        hint = this.pickUnshownHint([
          { message: 'Hold FOCUS (V/B) when you have soul to heal. Hit enemies to gain soul.', priority: 2, category: 'combat' },
        ]);
      }
      if (m.dashUsageRate < 0.15) {
        hint = hint || this.pickUnshownHint([
          { message: 'Use DASH (C/K) to dodge through enemies — you\'re invincible during a dash!', priority: 2, category: 'ability' },
        ]);
      }
      if (m.dodgeRate < 0.3) {
        hint = hint || this.pickUnshownHint([
          { message: 'Try to stay mobile. Jump and dash to avoid enemy attacks.', priority: 1, category: 'combat' },
        ]);
      }
    }
    
    // Exploration hints after long time in area
    if (!hint && m.timeInCurrentArea > 120 && m.deathsInCurrentArea === 0) {
      hint = this.pickUnshownHint([
        { message: 'Look for breakable walls — attack suspicious surfaces to find secrets.', priority: 1, category: 'exploration' },
        { message: 'Try pressing UP near interesting objects to interact.', priority: 1, category: 'exploration' },
      ]);
    }
    
    if (hint) {
      this.hintCooldown = 45; // Don't show another hint for 45 seconds
      this.lastHint = hint.message;
    }
    
    return hint;
  }
  
  private pickUnshownHint(candidates: AdaptiveHint[]): AdaptiveHint | null {
    for (const h of candidates) {
      if (!this.shownHints.has(h.message)) {
        this.shownHints.add(h.message);
        return h;
      }
    }
    return null;
  }
  
  // ─── Utility ───────────────────────────────────────────
  
  private pushAction(action: PlayerAction): void {
    this.metrics.recentActions.push(action);
    if (this.metrics.recentActions.length > ACTION_WINDOW_SIZE) {
      this.metrics.recentActions.shift();
    }
  }
  
  getMetrics(): Readonly<PlayerMetrics> {
    return this.metrics;
  }
  
  getStruggleLevel(): number {
    return this.getStruggleScore();
  }

  /** Get current difficulty as a percentage (50% = base game difficulty) */
  getDifficultyPercent(): number {
    return this.getModifiers().difficultyPercent;
  }

  /**
   * Calculate the adjusted drop chance for an item based on its rarity and current difficulty.
   * 
   * @param baseChance - The base drop probability (0-1) at normal (50%) difficulty
   * @param rarity - The item's rarity tier, which determines how much difficulty affects it
   * @returns The adjusted drop probability (clamped 0-1)
   * 
   * Example: A legendary item with 2% base chance at 0% difficulty → ~4%, at 100% → ~1%
   */
  getAdjustedDropChance(baseChance: number, rarity: ItemRarity = 'rare'): number {
    const mods = this.getModifiers();
    const sensitivity = RARITY_SENSITIVITY[rarity];
    // Scale the multiplier effect by rarity sensitivity
    // At sensitivity 0, multiplier has no effect; at 2, effect is doubled
    const effectiveMultiplier = 1 + (mods.rareDropRateMultiplier - 1) * sensitivity;
    return clamp(baseChance * effectiveMultiplier, 0, 1);
  }
}

// ─── Math Helpers ──────────────────────────────────────

function ema(current: number, newValue: number, alpha: number): number {
  return current + alpha * (newValue - current);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
