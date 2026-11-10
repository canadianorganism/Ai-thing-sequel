/* eslint-disable */
// Auto-extracted from AdaptiveAIDownload.tsx — single source of truth for the engine.
const ADAPTIVE_AI_SOURCE = `/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSAL ADAPTIVE AI ENGINE v2.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * A self-configuring, game-agnostic AI system that latches onto ANY game's
 * code and adapts its behavior to work with that game's features.
 *
 * WORKS WITH ANY LANGUAGE:
 *   • TypeScript / JavaScript — use directly as an ES module or script tag
 *   • Python — use the JSON protocol: send events as JSON, read modifiers back
 *   • C# / Unity — call via JS interop or use the JSON HTTP/WebSocket protocol
 *   • C++ / Unreal — call via embedded V8/QuickJS or use JSON protocol over IPC
 *   • GDScript / Godot — use JavaScriptBridge or JSON file exchange
 *   • Rust, Go, Java, Kotlin, Swift, Lua, Ruby, PHP, Haskell, Zig, Odin —
 *     ALL supported via the universal JSON protocol (stdin/stdout, file, HTTP,
 *     WebSocket, UDP, shared memory, or any IPC mechanism)
 *
 * WORKS WITH ANY ENGINE:
 *   • 2D AND 3D — Canvas, WebGL, Phaser, PixiJS, Three.js, Babylon.js,
 *     PlayCanvas, A-Frame, Unity, Godot, Unreal, CryEngine, GameMaker,
 *     RPG Maker, Pygame, LÖVE2D, MonoGame, Raylib, SDL, SFML, custom engines
 *   • Any dimension — side-scrollers, top-down, isometric, first-person 3D,
 *     third-person 3D, VR/XR, open-world, voxel-based, 2.5D, etc.
 *
 * WORKS WITH ANY GENRE:
 *   • Platformers, RPGs, FPS, TPS, roguelikes, puzzle, strategy, racing,
 *     fighting, simulation, tower defense, visual novels, open-world survival,
 *     space sims, flight sims, sports, MOBAs, battle royale, and more
 *   • Past and future games — the plugin architecture auto-discovers
 *     game features and adapts its modules accordingly.
 *
 * INTEGRATION METHODS:
 *   1. Direct import (JS/TS) — import and call methods directly
 *   2. JSON Protocol — send/receive JSON over any transport:
 *      Send:  { "action": "recordEvent", "data": { "type": "death", ... } }
 *      Read:  { "modifiers": { "playerDamageMultiplier": 1.2, ... } }
 *   3. HTTP API — run as a local server, POST events, GET modifiers
 *   4. File exchange — write events to input.json, read modifiers.json
 *   5. Stdin/Stdout — pipe JSON lines for CLI/subprocess integration
 *
 * ZERO DEPENDENCIES. SINGLE FILE. DROP IN AND GO.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── CORE TYPES ─────────────────────────────────────────────────────────────

/** Any game event the AI should know about */
interface GameEvent {
  type: string;          // e.g. 'player_hit', 'enemy_killed', 'level_complete'
  category?: string;     // e.g. 'combat', 'exploration', 'puzzle', 'social'
  source?: string;       // who/what caused it
  target?: string;       // who/what was affected
  value?: number;        // numeric payload (damage, score, etc.)
  metadata?: Record<string, any>; // anything else
  timestamp: number;
}

/** Describes a game feature the AI can adapt to */
interface GameFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  enabled: boolean;
  config?: Record<string, any>;
}

type FeatureCategory =
  | 'combat'        // damage, enemies, weapons, abilities
  | 'progression'   // levels, XP, unlocks, skill trees
  | 'economy'       // currency, shops, loot, crafting
  | 'narrative'     // dialogue, choices, branching story
  | 'movement'      // platforming, driving, flying (2D or 3D)
  | 'movement_3d'   // full 3D movement: flying, swimming, zero-g, 6DOF
  | 'social'        // NPCs, companions, multiplayer
  | 'puzzle'        // logic, physics puzzles, minigames
  | 'survival'      // hunger, health, resources, crafting
  | 'strategy'      // unit management, base building, tactics
  | 'camera'        // 3D camera: first-person, third-person, isometric, free
  | 'physics_3d'    // 3D physics: raycasts, collisions, rigid bodies
  | 'spatial'       // 3D spatial awareness: navmesh, pathfinding, line-of-sight
  | 'custom';       // anything else

/** Modifiers the AI outputs — apply these to your game systems */
interface AdaptiveModifiers {
  // Combat
  playerDamageMultiplier: number;    // >1 = player deals more damage (easier)
  enemyDamageMultiplier: number;     // <1 = player takes less damage (easier)
  enemyAggressionScale: number;      // 0-1.5, lower = less aggressive
  enemyAttackFrequency: number;      // multiplier on attack cooldowns
  enemyAccuracyScale: number;        // multiplier on enemy aim/tracking

  // Progression
  xpMultiplier: number;              // >1 = faster leveling
  lootQualityBonus: number;          // 0-1, added to loot roll
  resourceMultiplier: number;        // >1 = more drops/pickups

  // Economy
  priceMultiplier: number;           // <1 = cheaper shops
  currencyMultiplier: number;        // >1 = earn more

  // Puzzle / Exploration
  hintUrgency: number;               // 0-1, how strongly to suggest hints
  timeLimitMultiplier: number;       // >1 = more time on timed sections

  // Movement / Physics (2D and 3D)
  playerSpeedMultiplier: number;     // slight speed adjustments
  forgivenessWindow: number;         // extra frames for jump timing etc.

  // 3D-Specific
  enemyDetectionRange: number;       // multiplier on enemy sight/hearing range (<1 = easier)
  enemyPathfindingSkill: number;     // 0-1, how well enemies navigate 3D space
  aimAssistStrength: number;         // 0-1, auto-aim strength for FPS/TPS games
  cameraRecoverySpeed: number;       // >1 = camera recenters faster after disorientation
  verticalCombatScale: number;       // multiplier for aerial/vertical combat difficulty
  navmeshPrecision: number;          // how tightly enemies follow optimal paths (lower = sloppier)

  // Custom — games can read any key they want
  custom: Record<string, number>;
}

/** Counter-strategy for enemy behavior */
interface CounterStrategy {
  preferredBehavior: string;   // game-defined behavior name
  probability: number;         // 0-1 chance to use it
  reason: string;              // why (for debugging)
}

/** Contextual hint for the player */
interface AdaptiveHint {
  message: string;
  priority: number;            // 1-5, higher = more urgent
  category: string;
  triggerReason: string;       // why this hint was chosen
}

/** Stat recommendation for RPG/stat-based games */
interface StatRecommendation {
  statName: string;
  currentValue: number;
  recommendedIncrease: number;
  reason: string;
}

/** Character/name integration */
interface CharacterDialogue {
  originalLine: string;
  adaptedLine: string;
  characterName: string;
  playerName: string;
}

// ─── VOICE REPLICATION TYPES ────────────────────────────────────────────────

type VoiceEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'excited' | 'tender' | 'commanding' | 'whispering' | 'sarcastic';

interface VoiceAnalysisOptions {
  sampleRate?: number;
  fftSize?: number;
  analysisDepth?: 'quick' | 'standard' | 'full';
  captureEmotionalRange?: boolean;
  captureBreathingPattern?: boolean;
}

interface VoiceProfile {
  actorId: string;
  pitchRange: { min: number; max: number; mean: number };
  pitchContour: number[];
  spectralEnvelope: number[];
  cadence: VoiceCadence;
  timbreFingerprint: number[];
  emotionalRange?: EmotionalRange;
  breathingPattern?: BreathingPattern;
  sampleRate: number;
  analyzedDuration: number;
  createdAt: number;
}

interface VoiceCadence {
  averageSyllablesPerSecond: number;
  pausePattern: number[];
  rhythmVariance: number;
  averagePhraseLength: number;
}

interface EmotionalRange {
  neutralBaseline: number;
  excitedPitchShift: number;
  sadPitchShift: number;
  angryPitchShift: number;
  fearfulPitchShift: number;
  tenderness: number;
  expressiveness: number;
}

interface BreathingPattern {
  averageBreathInterval: number;
  breathDuration: number;
  pattern: number[];
}

interface VoiceSynthesisParams {
  actorId: string;
  targetPitch: number;
  pitchVariance: number;
  speakingRate: number;
  timbreFingerprint: number[];
  spectralEnvelope: number[];
  prosodyCurve: number[];
  wordTimings: number[];
  breathPoints: number[];
  emotion: VoiceEmotion;
  emphasis: number[];
  volumeEnvelope: number[];
}


interface PlayerProfile {
  // Performance metrics (all 0-1 normalized)
  overallSkill: number;
  combatSkill: number;
  explorationSkill: number;
  puzzleSkill: number;
  resourceManagement: number;

  // Behavioral tendencies (0-1)
  aggression: number;        // attacks often vs plays safe
  patience: number;          // waits for openings vs rushes
  exploration: number;       // explores thoroughly vs rushes objectives
  risktaking: number;        // takes risks vs plays conservative
  adaptability: number;      // how fast player adjusts to new mechanics

  // Playstyle fingerprint
  preferredActions: Map<string, number>;  // action → frequency
  weaknesses: string[];                    // areas where player struggles
  strengths: string[];                     // areas where player excels

  // Session data
  totalEvents: number;
  sessionCount: number;
  totalPlayTime: number;
  deaths: number;
  deathsInCurrentArea: number;
  currentAreaId: string;
  consecutiveFailures: number;
  lastEventTime: number;
}

// ─── PLUGIN SYSTEM ──────────────────────────────────────────────────────────

/** Games register plugins to teach the AI about their specific features */
interface AdaptivePlugin {
  id: string;
  name: string;
  features: FeatureCategory[];

  /** Called when the AI initializes — register your game's events here */
  onInit?(ai: UniversalAdaptiveAI): void;

  /** Called every update tick */
  onUpdate?(ai: UniversalAdaptiveAI, dt: number): void;

  /** Process a game event and return any modifier adjustments */
  processEvent?(ai: UniversalAdaptiveAI, event: GameEvent): Partial<AdaptiveModifiers> | null;

  /** Return game-specific hints */
  getHints?(ai: UniversalAdaptiveAI): AdaptiveHint[];

  /** Return stat recommendations (for RPGs) */
  getStatRecommendations?(ai: UniversalAdaptiveAI, stats: Record<string, number>): StatRecommendation[];

  /** Adapt a dialogue line to include the player's name */
  adaptDialogue?(line: string, characterName: string, playerName: string): string;
}

// ─── MAIN ENGINE ────────────────────────────────────────────────────────────

class UniversalAdaptiveAI {
  private profile: PlayerProfile;
  private plugins: Map<string, AdaptivePlugin> = new Map();
  private features: Map<string, GameFeature> = new Map();
  private eventLog: GameEvent[] = [];
  private modifierOverrides: Partial<AdaptiveModifiers> = {};
  private hintCooldown: number = 0;
  private shownHints: Set<string> = new Set();
  private playerName: string = 'Player';
  private eventHandlers: Map<string, ((event: GameEvent) => void)[]> = new Map();
  
  // Configuration
  private config = {
    maxEventLog: 500,
    smoothingFactor: 0.05,
    hintCooldownSeconds: 45,
    maxDifficultySwing: 0.35,   // ±35% max adjustment
    adaptationSpeed: 0.02,       // how fast the AI learns
    enableLogging: false,
  };

  constructor(options?: Partial<typeof UniversalAdaptiveAI.prototype.config>) {
    if (options) Object.assign(this.config, options);
    this.profile = this.createDefaultProfile();
  }

  // ─── SETUP ──────────────────────────────────────────────

  /** Register a plugin to handle game-specific features */
  registerPlugin(plugin: AdaptivePlugin): this {
    this.plugins.set(plugin.id, plugin);
    plugin.onInit?.(this);
    this.log(\`Plugin registered: \${plugin.name}\`);
    return this;
  }

  /** Declare a game feature so the AI knows what systems exist */
  registerFeature(feature: GameFeature): this {
    this.features.set(feature.id, feature);
    this.log(\`Feature registered: \${feature.name} [\${feature.category}]\`);
    return this;
  }

  /** Set the player's name for dialogue integration */
  setPlayerName(name: string): this {
    this.playerName = name;
    return this;
  }

  /** Listen for specific event types */
  on(eventType: string, handler: (event: GameEvent) => void): this {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
    return this;
  }

  // ─── EVENT RECORDING ────────────────────────────────────

  /** Record ANY game event — the AI figures out what to do with it */
  recordEvent(event: Omit<GameEvent, 'timestamp'> & { timestamp?: number }): void {
    const fullEvent: GameEvent = { ...event, timestamp: event.timestamp ?? Date.now() };
    this.eventLog.push(fullEvent);
    if (this.eventLog.length > this.config.maxEventLog) {
      this.eventLog = this.eventLog.slice(-this.config.maxEventLog);
    }

    // Update profile based on event
    this.processEventForProfile(fullEvent);

    // Notify plugins
    for (const plugin of this.plugins.values()) {
      const mods = plugin.processEvent?.(this, fullEvent);
      if (mods) Object.assign(this.modifierOverrides, mods);
    }

    // Notify listeners
    const handlers = this.eventHandlers.get(fullEvent.type);
    if (handlers) handlers.forEach(h => h(fullEvent));
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) wildcardHandlers.forEach(h => h(fullEvent));

    this.profile.totalEvents++;
    this.profile.lastEventTime = fullEvent.timestamp;
  }

  // Convenience methods that call recordEvent internally
  recordAttack(direction?: string, weapon?: string): void {
    this.recordEvent({ type: 'player_attack', category: 'combat', metadata: { direction, weapon } });
    this.profile.aggression = ema(this.profile.aggression, 1, this.config.smoothingFactor);
  }
  recordHitLanded(target: string, damage: number): void {
    this.recordEvent({ type: 'hit_landed', category: 'combat', target, value: damage });
  }
  recordDamageTaken(source: string, damage: number): void {
    this.recordEvent({ type: 'damage_taken', category: 'combat', source, value: damage });
    this.profile.combatSkill = ema(this.profile.combatSkill, 0, this.config.smoothingFactor * 2);
  }
  recordDodge(): void {
    this.recordEvent({ type: 'dodge', category: 'combat' });
    this.profile.combatSkill = ema(this.profile.combatSkill, 1, this.config.smoothingFactor);
  }
  recordDeath(areaId?: string): void {
    this.profile.deaths++;
    this.profile.deathsInCurrentArea++;
    this.profile.consecutiveFailures++;
    this.recordEvent({ type: 'death', category: 'combat', metadata: { areaId } });
  }
  recordLevelComplete(levelId: string, score?: number): void {
    this.profile.consecutiveFailures = 0;
    this.recordEvent({ type: 'level_complete', category: 'progression', metadata: { levelId, score } });
  }
  recordAreaChange(areaId: string): void {
    if (areaId !== this.profile.currentAreaId) {
      this.profile.consecutiveFailures = 0;
      this.profile.deathsInCurrentArea = 0;
      this.profile.currentAreaId = areaId;
      this.recordEvent({ type: 'area_change', category: 'exploration', metadata: { areaId } });
    }
  }
  recordPuzzleSolved(puzzleId: string, timeSpent?: number): void {
    this.profile.puzzleSkill = ema(this.profile.puzzleSkill, 1, this.config.smoothingFactor);
    this.profile.consecutiveFailures = 0;
    this.recordEvent({ type: 'puzzle_solved', category: 'puzzle', metadata: { puzzleId, timeSpent } });
  }
  recordPuzzleFailed(puzzleId: string): void {
    this.profile.puzzleSkill = ema(this.profile.puzzleSkill, 0, this.config.smoothingFactor);
    this.profile.consecutiveFailures++;
    this.recordEvent({ type: 'puzzle_failed', category: 'puzzle', metadata: { puzzleId } });
  }
  recordPurchase(itemId: string, cost: number): void {
    this.recordEvent({ type: 'purchase', category: 'economy', metadata: { itemId, cost } });
  }
  recordAbilityUsed(abilityId: string): void {
    this.recordEvent({ type: 'ability_used', category: 'combat', metadata: { abilityId } });
    const freq = this.profile.preferredActions.get(abilityId) ?? 0;
    this.profile.preferredActions.set(abilityId, freq + 1);
  }
  recordCustom(type: string, data?: Record<string, any>): void {
    this.recordEvent({ type, category: 'custom', metadata: data });
  }

  // ─── UPDATE LOOP ────────────────────────────────────────

  /** Call every frame with delta time in seconds */
  update(dt: number): void {
    this.profile.totalPlayTime += dt;
    if (this.hintCooldown > 0) this.hintCooldown -= dt;

    // Decay behavioral metrics toward neutral
    this.profile.aggression = ema(this.profile.aggression, 0.5, 0.003);
    this.profile.patience = ema(this.profile.patience, 0.5, 0.003);

    // Slowly adjust overall skill toward combat skill average
    this.profile.overallSkill = ema(
      this.profile.overallSkill,
      (this.profile.combatSkill + this.profile.puzzleSkill + this.profile.explorationSkill) / 3,
      0.001
    );

    // Update plugins
    for (const plugin of this.plugins.values()) {
      plugin.onUpdate?.(this, dt);
    }
  }

  // ─── MODIFIER OUTPUT ───────────────────────────────────

  /** Get all difficulty modifiers — apply these to your game systems */
  getModifiers(): AdaptiveModifiers {
    const s = this.getStruggleScore();
    const swing = this.config.maxDifficultySwing;

    const base: AdaptiveModifiers = {
      // Combat — scale with struggle
      playerDamageMultiplier:  lerp(1 - swing * 0.4, 1 + swing, s),
      enemyDamageMultiplier:   lerp(1 + swing * 0.4, 1 - swing, s),
      enemyAggressionScale:    lerp(1 + swing * 0.3, 1 - swing, s),
      enemyAttackFrequency:    lerp(1 + swing * 0.4, 1 - swing, s),
      enemyAccuracyScale:      lerp(1 + swing * 0.3, 1 - swing * 0.8, s),

      // Progression — help struggling players progress faster
      xpMultiplier:            lerp(0.9, 1 + swing, s),
      lootQualityBonus:        lerp(0, swing * 0.5, s),
      resourceMultiplier:      lerp(0.9, 1 + swing * 0.8, s),

      // Economy
      priceMultiplier:         lerp(1.1, 1 - swing * 0.5, s),
      currencyMultiplier:      lerp(0.9, 1 + swing * 0.6, s),

      // Puzzle / Exploration
      hintUrgency:             lerp(0, 1, s),
      timeLimitMultiplier:     lerp(0.95, 1 + swing, s),

      // Movement (2D and 3D)
      playerSpeedMultiplier:   lerp(0.98, 1.05, s),
      forgivenessWindow:       lerp(0, 4, s), // extra frames

      // 3D-Specific
      enemyDetectionRange:     lerp(1.1, 0.7, s),   // enemies see/hear less when struggling
      enemyPathfindingSkill:   lerp(0.9, 0.5, s),    // enemies navigate worse
      aimAssistStrength:       lerp(0, 0.6, s),       // more auto-aim help
      cameraRecoverySpeed:     lerp(1.0, 1.5, s),     // camera helps more
      verticalCombatScale:     lerp(1.1, 0.7, s),     // aerial fights get easier
      navmeshPrecision:        lerp(1.0, 0.6, s),     // enemies take worse paths

      custom: {},
    };

    // Apply plugin overrides
    for (const [key, val] of Object.entries(this.modifierOverrides)) {
      if (key === 'custom' && typeof val === 'object') {
        Object.assign(base.custom, val);
      } else if (key in base) {
        (base as any)[key] = val;
      }
    }

    return base;
  }

  // ─── ENEMY COUNTER STRATEGY ─────────────────────────────

  /** Returns what behavior an enemy should prefer to counter the player */
  getCounterStrategy(enemyId: string, availableBehaviors: string[]): CounterStrategy {
    if (availableBehaviors.length === 0) {
      return { preferredBehavior: 'default', probability: 0, reason: 'no behaviors available' };
    }

    const p = this.profile;
    let preferred = availableBehaviors[0];
    let reason = 'default selection';
    let prob = 0.3;

    // Map player tendencies to counter-behaviors
    const counterMap: Record<string, { tendency: number; threshold: number }> = {};
    for (const b of availableBehaviors) {
      const bLower = b.toLowerCase();
      if (bLower.includes('slam') || bLower.includes('aoe') || bLower.includes('ground')) {
        counterMap[b] = { tendency: p.aggression, threshold: 0.6 };
      } else if (bLower.includes('charge') || bLower.includes('rush') || bLower.includes('dash')) {
        counterMap[b] = { tendency: 1 - p.patience, threshold: 0.5 };
      } else if (bLower.includes('ranged') || bLower.includes('projectile') || bLower.includes('shoot')) {
        counterMap[b] = { tendency: p.aggression, threshold: 0.7 };
      } else if (bLower.includes('grab') || bLower.includes('hold') || bLower.includes('trap')) {
        counterMap[b] = { tendency: p.risktaking, threshold: 0.5 };
      } else if (bLower.includes('teleport') || bLower.includes('blink') || bLower.includes('phase')) {
        counterMap[b] = { tendency: p.adaptability > 0.7 ? 0.3 : 0.8, threshold: 0.5 };
      }
    }

    // Pick the behavior that best counters the player's tendencies
    let bestScore = -1;
    for (const [behavior, data] of Object.entries(counterMap)) {
      if (data.tendency > data.threshold && data.tendency > bestScore) {
        bestScore = data.tendency;
        preferred = behavior;
        reason = \`counters player tendency (score: \${data.tendency.toFixed(2)})\`;
        prob = 0.3 + data.tendency * 0.4;
      }
    }

    // If the player is adapting well, mix it up randomly
    if (p.adaptability > 0.7) {
      const randomIdx = Math.floor(Math.random() * availableBehaviors.length);
      if (Math.random() < p.adaptability * 0.3) {
        preferred = availableBehaviors[randomIdx];
        reason = 'randomized — player adapts quickly';
        prob = 0.5;
      }
    }

    return {
      preferredBehavior: preferred,
      probability: clamp(prob, 0, 0.85),
      reason,
    };
  }

  // ─── HINT SYSTEM ────────────────────────────────────────

  /** Get the most relevant hint right now, or null if none needed */
  getHint(): AdaptiveHint | null {
    if (this.hintCooldown > 0) return null;
    const p = this.profile;
    let hint: AdaptiveHint | null = null;

    // Collect hints from plugins first
    for (const plugin of this.plugins.values()) {
      const pluginHints = plugin.getHints?.(this) ?? [];
      for (const h of pluginHints) {
        if (!this.shownHints.has(h.message) && (!hint || h.priority > hint.priority)) {
          hint = h;
        }
      }
    }

    // Built-in hints based on struggle
    if (!hint && p.consecutiveFailures >= 3) {
      hint = this.pickUnshown([
        { message: 'Try a different approach — observe enemy patterns before attacking.', priority: 3, category: 'combat', triggerReason: \`\${p.consecutiveFailures} consecutive failures\` },
        { message: 'Explore other areas first — you might find upgrades that help here.', priority: 2, category: 'exploration', triggerReason: 'repeated failures in area' },
        { message: 'Take your time. Patience often reveals openings.', priority: 1, category: 'combat', triggerReason: 'struggle detected' },
      ]);
    }

    if (!hint && p.deathsInCurrentArea >= 5) {
      hint = this.pickUnshown([
        { message: 'This area is tough. Consider leveling up or finding better equipment first.', priority: 3, category: 'progression', triggerReason: \`\${p.deathsInCurrentArea} deaths in area\` },
      ]);
    }

    if (hint) {
      this.hintCooldown = this.config.hintCooldownSeconds;
      this.shownHints.add(hint.message);
    }

    return hint;
  }

  // ─── STAT RECOMMENDATIONS (RPGs) ───────────────────────

  /** Given a game's stat system, recommend how to allocate points */
  getStatRecommendations(currentStats: Record<string, number>): StatRecommendation[] {
    const recommendations: StatRecommendation[] = [];
    const p = this.profile;

    // Ask plugins first
    for (const plugin of this.plugins.values()) {
      const pluginRecs = plugin.getStatRecommendations?.(this, currentStats) ?? [];
      recommendations.push(...pluginRecs);
    }

    // Built-in logic: recommend stats that counter weaknesses
    if (p.combatSkill < 0.3 && 'defense' in currentStats) {
      recommendations.push({
        statName: 'defense',
        currentValue: currentStats['defense'] ?? 0,
        recommendedIncrease: 2,
        reason: 'You take a lot of damage — boosting defense will help survive longer.',
      });
    }
    if (p.combatSkill < 0.4 && 'health' in currentStats) {
      recommendations.push({
        statName: 'health',
        currentValue: currentStats['health'] ?? 0,
        recommendedIncrease: 3,
        reason: 'More health gives you room to learn enemy patterns.',
      });
    }
    if (p.aggression > 0.7 && 'attack' in currentStats) {
      recommendations.push({
        statName: 'attack',
        currentValue: currentStats['attack'] ?? 0,
        recommendedIncrease: 2,
        reason: 'Your aggressive playstyle benefits from higher attack power.',
      });
    }
    if (p.patience > 0.7 && 'magic' in currentStats) {
      recommendations.push({
        statName: 'magic',
        currentValue: currentStats['magic'] ?? 0,
        recommendedIncrease: 2,
        reason: 'Patient players benefit from ranged/magic attacks.',
      });
    }

    return recommendations;
  }

  // ─── DIALOGUE ADAPTATION ──────────────────────────────

  /** Adapt a dialogue line to include the player's name naturally */
  adaptDialogue(line: string, characterName: string): CharacterDialogue {
    let adapted = line;

    // Let plugins try first
    for (const plugin of this.plugins.values()) {
      const result = plugin.adaptDialogue?.(line, characterName, this.playerName);
      if (result) {
        adapted = result;
        break;
      }
    }

    // Built-in: replace common placeholders
    if (adapted === line) {
      adapted = adapted
        .replace(/\\{player\\}/gi, this.playerName)
        .replace(/\\{PLAYER\\}/g, this.playerName.toUpperCase())
        .replace(/\\{player_name\\}/gi, this.playerName)
        .replace(/\\$PLAYER/g, this.playerName)
        .replace(/%PLAYER%/g, this.playerName);

      // Smart insertion: if no placeholder exists, try to weave it in
      if (adapted === line && !line.includes(this.playerName)) {
        // Add name address at natural points
        if (/^(Hey|Hello|Hi|Greetings|Welcome|Listen|Look|Ah|Oh)([,!.])/i.test(line)) {
          adapted = line.replace(
            /^(Hey|Hello|Hi|Greetings|Welcome|Listen|Look|Ah|Oh)([,!.])/i,
            \`$1, \${this.playerName}$2\`
          );
        }
      }
    }

    return {
      originalLine: line,
      adaptedLine: adapted,
      characterName,
      playerName: this.playerName,
    };
  }

  // ─── VOICE REPLICATION ENGINE ─────────────────────────

  /**
   * Analyze a voice actor's audio sample and build a voice profile.
   * The profile captures pitch, timbre, cadence, and emotional range
   * so the AI can replicate the voice for dynamic dialogue.
   *
   * @param audioBuffer - Raw audio data (WAV/MP3 ArrayBuffer)
   * @param actorId - Unique identifier for this voice actor
   * @param options - Analysis configuration
   * @returns VoiceProfile that can be used for synthesis
   */
  async analyzeVoice(
    audioBuffer: ArrayBuffer,
    actorId: string,
    options?: VoiceAnalysisOptions
  ): Promise<VoiceProfile> {
    const opts: Required<VoiceAnalysisOptions> = {
      sampleRate: options?.sampleRate ?? 44100,
      fftSize: options?.fftSize ?? 2048,
      analysisDepth: options?.analysisDepth ?? 'full',
      captureEmotionalRange: options?.captureEmotionalRange ?? true,
      captureBreathingPattern: options?.captureBreathingPattern ?? true,
    };

    // Decode audio using Web Audio API (or Node AudioContext polyfill)
    const ctx = typeof AudioContext !== 'undefined'
      ? new AudioContext({ sampleRate: opts.sampleRate })
      : typeof (globalThis as any).OfflineAudioContext !== 'undefined'
        ? new (globalThis as any).OfflineAudioContext(1, 1, opts.sampleRate)
        : null;

    if (!ctx) {
      this.log('AudioContext not available — using statistical analysis fallback');
      return this.buildStatisticalVoiceProfile(audioBuffer, actorId, opts);
    }

    const decoded = await ctx.decodeAudioData(audioBuffer.slice(0));
    const channelData = decoded.getChannelData(0);

    // Extract fundamental frequency (F0) contour
    const pitchContour = this.extractPitchContour(channelData, opts.sampleRate, opts.fftSize);

    // Extract spectral envelope (timbre fingerprint)
    const spectralEnvelope = this.extractSpectralEnvelope(channelData, opts.sampleRate, opts.fftSize);

    // Extract cadence — rhythm and pacing of speech
    const cadence = this.extractCadence(channelData, opts.sampleRate);

    // Extract emotional markers if requested
    const emotionalRange = opts.captureEmotionalRange
      ? this.extractEmotionalMarkers(pitchContour, cadence, spectralEnvelope)
      : undefined;

    // Extract breathing pattern if requested
    const breathingPattern = opts.captureBreathingPattern
      ? this.extractBreathingPattern(channelData, opts.sampleRate)
      : undefined;

    const profile: VoiceProfile = {
      actorId,
      pitchRange: { min: Math.min(...pitchContour), max: Math.max(...pitchContour), mean: avg(pitchContour) },
      pitchContour,
      spectralEnvelope,
      cadence,
      timbreFingerprint: this.computeTimbreFingerprint(spectralEnvelope),
      emotionalRange,
      breathingPattern,
      sampleRate: opts.sampleRate,
      analyzedDuration: decoded.duration,
      createdAt: Date.now(),
    };

    // Store in internal voice bank
    this.voiceBank.set(actorId, profile);
    this.log(\`Voice profile created for "\${actorId}" (\${decoded.duration.toFixed(1)}s sample)\`);

    return profile;
  }

  /**
   * Generate speech parameters that replicate a voice actor's delivery.
   * Feed these into your game's TTS/speech synthesis system.
   *
   * @param actorId - The voice actor to replicate
   * @param dialogueLine - The text to speak
   * @param emotion - Desired emotional tone
   * @returns VoiceSynthesisParams for your TTS engine
   */
  replicateVoice(
    actorId: string,
    dialogueLine: string,
    emotion: VoiceEmotion = 'neutral'
  ): VoiceSynthesisParams {
    const profile = this.voiceBank.get(actorId);
    if (!profile) {
      this.log(\`No voice profile for "\${actorId}" — using defaults\`);
      return this.getDefaultVoiceParams(dialogueLine, emotion);
    }

    // Calculate target pitch based on emotion and actor's range
    const emotionPitchOffset = this.getEmotionPitchOffset(emotion, profile);
    const targetPitch = clamp(
      profile.pitchRange.mean + emotionPitchOffset,
      profile.pitchRange.min * 0.9,
      profile.pitchRange.max * 1.1
    );

    // Calculate speaking rate from cadence analysis
    const baseRate = profile.cadence.averageSyllablesPerSecond;
    const emotionRateMultiplier = this.getEmotionRateMultiplier(emotion);
    const targetRate = baseRate * emotionRateMultiplier;

    // Compute per-word timing based on cadence patterns
    const words = dialogueLine.split(/\\s+/);
    const wordTimings = this.generateWordTimings(words, profile.cadence, emotion);

    // Generate prosody curve (pitch variation over the sentence)
    const prosodyCurve = this.generateProsodyCurve(
      words.length,
      profile.pitchContour,
      emotion
    );

    // Build breathing/pause insertions
    const breathPoints = this.calculateBreathPoints(words, profile.breathingPattern);

    return {
      actorId,
      targetPitch,
      pitchVariance: (profile.pitchRange.max - profile.pitchRange.min) * 0.3,
      speakingRate: targetRate,
      timbreFingerprint: profile.timbreFingerprint,
      spectralEnvelope: profile.spectralEnvelope,
      prosodyCurve,
      wordTimings,
      breathPoints,
      emotion,
      emphasis: this.detectEmphasisWords(dialogueLine),
      volumeEnvelope: this.generateVolumeEnvelope(words.length, emotion),
    };
  }

  /**
   * Compare two voice profiles to measure similarity (0-1).
   * Useful for validating that synthesized speech matches the original.
   */
  compareVoices(profileA: VoiceProfile, profileB: VoiceProfile): number {
    let similarity = 0;
    let weights = 0;

    // Pitch similarity (30% weight)
    const pitchSim = 1 - Math.abs(profileA.pitchRange.mean - profileB.pitchRange.mean) / 300;
    similarity += clamp(pitchSim, 0, 1) * 0.3;
    weights += 0.3;

    // Timbre similarity via spectral correlation (40% weight)
    const timbreSim = this.correlateArrays(
      profileA.timbreFingerprint,
      profileB.timbreFingerprint
    );
    similarity += clamp(timbreSim, 0, 1) * 0.4;
    weights += 0.4;

    // Cadence similarity (30% weight)
    const cadenceRatio = Math.min(
      profileA.cadence.averageSyllablesPerSecond,
      profileB.cadence.averageSyllablesPerSecond
    ) / Math.max(
      profileA.cadence.averageSyllablesPerSecond,
      profileB.cadence.averageSyllablesPerSecond
    );
    similarity += cadenceRatio * 0.3;
    weights += 0.3;

    return clamp(similarity / weights, 0, 1);
  }

  /** Get all stored voice profiles */
  getVoiceBank(): Map<string, VoiceProfile> { return this.voiceBank; }

  /** Export a voice profile as JSON for saving */
  exportVoiceProfile(actorId: string): string | null {
    const profile = this.voiceBank.get(actorId);
    return profile ? JSON.stringify(profile) : null;
  }

  /** Import a previously exported voice profile */
  importVoiceProfile(json: string): void {
    const profile: VoiceProfile = JSON.parse(json);
    this.voiceBank.set(profile.actorId, profile);
    this.log(\`Voice profile imported: \${profile.actorId}\`);
  }

  // ─── VOICE ANALYSIS INTERNALS ─────────────────────────

  private voiceBank: Map<string, VoiceProfile> = new Map();

  private extractPitchContour(samples: Float32Array, sampleRate: number, fftSize: number): number[] {
    const contour: number[] = [];
    const hopSize = Math.floor(fftSize / 4);
    for (let i = 0; i < samples.length - fftSize; i += hopSize) {
      const frame = samples.slice(i, i + fftSize);
      const f0 = this.detectPitchAutocorrelation(frame, sampleRate);
      if (f0 > 50 && f0 < 600) contour.push(f0);
    }
    return contour.length > 0 ? contour : [150]; // fallback
  }

  private detectPitchAutocorrelation(frame: Float32Array, sampleRate: number): number {
    const n = frame.length;
    let bestCorr = -1;
    let bestLag = 0;
    const minLag = Math.floor(sampleRate / 600); // max 600 Hz
    const maxLag = Math.floor(sampleRate / 50);  // min 50 Hz

    for (let lag = minLag; lag < Math.min(maxLag, n / 2); lag++) {
      let corr = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let j = 0; j < n - lag; j++) {
        corr += frame[j] * frame[j + lag];
        norm1 += frame[j] * frame[j];
        norm2 += frame[j + lag] * frame[j + lag];
      }
      const normalized = norm1 > 0 && norm2 > 0 ? corr / Math.sqrt(norm1 * norm2) : 0;
      if (normalized > bestCorr) {
        bestCorr = normalized;
        bestLag = lag;
      }
    }
    return bestCorr > 0.3 ? sampleRate / bestLag : 0;
  }

  private extractSpectralEnvelope(samples: Float32Array, sampleRate: number, fftSize: number): number[] {
    const numBins = 64;
    const envelope = new Array(numBins).fill(0);
    const hopSize = Math.floor(fftSize / 2);
    let frameCount = 0;

    for (let i = 0; i < samples.length - fftSize; i += hopSize) {
      const frame = samples.slice(i, i + fftSize);
      // Simple power spectrum estimation
      for (let b = 0; b < numBins; b++) {
        const freqStart = Math.floor((b / numBins) * fftSize / 2);
        const freqEnd = Math.floor(((b + 1) / numBins) * fftSize / 2);
        let power = 0;
        for (let j = freqStart; j < Math.min(freqEnd, frame.length); j++) {
          power += frame[j] * frame[j];
        }
        envelope[b] += power / (freqEnd - freqStart || 1);
      }
      frameCount++;
    }

    return envelope.map(v => v / (frameCount || 1));
  }

  private extractCadence(samples: Float32Array, sampleRate: number): VoiceCadence {
    // Detect speech segments vs silence
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
    const energies: number[] = [];
    for (let i = 0; i < samples.length - windowSize; i += windowSize) {
      let e = 0;
      for (let j = 0; j < windowSize; j++) e += samples[i + j] * samples[i + j];
      energies.push(e / windowSize);
    }

    const threshold = avg(energies.map(e => e)) * 0.3;
    const speechSegments: number[] = [];
    const pauseDurations: number[] = [];
    let inSpeech = false;
    let segStart = 0;

    for (let i = 0; i < energies.length; i++) {
      if (energies[i] > threshold && !inSpeech) {
        inSpeech = true;
        if (segStart > 0) pauseDurations.push((i - segStart) * 0.02);
        segStart = i;
      } else if (energies[i] <= threshold && inSpeech) {
        inSpeech = false;
        speechSegments.push((i - segStart) * 0.02);
        segStart = i;
      }
    }

    const totalDuration = samples.length / sampleRate;
    const estSyllables = speechSegments.length * 2.5; // rough estimate

    return {
      averageSyllablesPerSecond: estSyllables / totalDuration,
      pausePattern: pauseDurations.slice(0, 20),
      rhythmVariance: variance(speechSegments),
      averagePhraseLength: avg(speechSegments),
    };
  }

  private extractEmotionalMarkers(
    pitchContour: number[], cadence: VoiceCadence, spectral: number[]
  ): EmotionalRange {
    const pitchVar = variance(pitchContour);
    const avgPitch = avg(pitchContour);

    return {
      neutralBaseline: avgPitch,
      excitedPitchShift: pitchVar > 1000 ? avgPitch * 0.2 : avgPitch * 0.1,
      sadPitchShift: -(avgPitch * 0.15),
      angryPitchShift: avgPitch * 0.12,
      fearfulPitchShift: avgPitch * 0.18,
      tenderness: -(avgPitch * 0.08),
      expressiveness: clamp(pitchVar / 2000, 0, 1),
    };
  }

  private extractBreathingPattern(samples: Float32Array, sampleRate: number): BreathingPattern {
    const windowSize = Math.floor(sampleRate * 0.1);
    const energies: number[] = [];
    for (let i = 0; i < samples.length - windowSize; i += windowSize) {
      let e = 0;
      for (let j = 0; j < windowSize; j++) e += Math.abs(samples[i + j]);
      energies.push(e / windowSize);
    }

    const threshold = avg(energies) * 0.1;
    const breathGaps: number[] = [];
    let gapStart = -1;

    for (let i = 0; i < energies.length; i++) {
      if (energies[i] < threshold && gapStart < 0) gapStart = i;
      else if (energies[i] >= threshold && gapStart >= 0) {
        breathGaps.push((i - gapStart) * 0.1);
        gapStart = -1;
      }
    }

    return {
      averageBreathInterval: avg(breathGaps) || 3.0,
      breathDuration: 0.15,
      pattern: breathGaps.slice(0, 10),
    };
  }

  private computeTimbreFingerprint(spectral: number[]): number[] {
    // Reduce to 16-dimensional fingerprint via averaging
    const fp: number[] = [];
    const binSize = Math.floor(spectral.length / 16);
    for (let i = 0; i < 16; i++) {
      let sum = 0;
      for (let j = 0; j < binSize; j++) sum += spectral[i * binSize + j] || 0;
      fp.push(sum / binSize);
    }
    // Normalize
    const maxVal = Math.max(...fp, 0.001);
    return fp.map(v => v / maxVal);
  }

  private buildStatisticalVoiceProfile(
    buffer: ArrayBuffer, actorId: string, opts: Required<VoiceAnalysisOptions>
  ): VoiceProfile {
    // Fallback when AudioContext isn't available (e.g. Node.js)
    const bytes = new Uint8Array(buffer);
    const pseudoPitch = 80 + (bytes[0] ?? 100) + (bytes[1] ?? 50) * 0.5;
    return {
      actorId,
      pitchRange: { min: pseudoPitch * 0.7, max: pseudoPitch * 1.5, mean: pseudoPitch },
      pitchContour: [pseudoPitch],
      spectralEnvelope: new Array(64).fill(0.5),
      cadence: { averageSyllablesPerSecond: 4.5, pausePattern: [0.3], rhythmVariance: 0.1, averagePhraseLength: 0.8 },
      timbreFingerprint: new Array(16).fill(0.5),
      sampleRate: opts.sampleRate,
      analyzedDuration: buffer.byteLength / (opts.sampleRate * 2),
      createdAt: Date.now(),
    };
  }

  private getEmotionPitchOffset(emotion: VoiceEmotion, profile: VoiceProfile): number {
    const range = profile.emotionalRange;
    if (!range) return 0;
    const map: Record<VoiceEmotion, number> = {
      neutral: 0,
      happy: range.excitedPitchShift * 0.7,
      sad: range.sadPitchShift,
      angry: range.angryPitchShift,
      fearful: range.fearfulPitchShift,
      excited: range.excitedPitchShift,
      tender: range.tenderness,
      commanding: range.angryPitchShift * 0.5,
      whispering: range.sadPitchShift * 0.6,
      sarcastic: range.excitedPitchShift * 0.3,
    };
    return map[emotion] ?? 0;
  }

  private getEmotionRateMultiplier(emotion: VoiceEmotion): number {
    const map: Record<VoiceEmotion, number> = {
      neutral: 1.0, happy: 1.1, sad: 0.85, angry: 1.15,
      fearful: 1.2, excited: 1.25, tender: 0.9,
      commanding: 0.8, whispering: 0.75, sarcastic: 0.95,
    };
    return map[emotion] ?? 1.0;
  }

  private generateWordTimings(
    words: string[], cadence: VoiceCadence, emotion: VoiceEmotion
  ): number[] {
    const baseTime = 1 / cadence.averageSyllablesPerSecond;
    const rateMult = this.getEmotionRateMultiplier(emotion);
    return words.map(w => {
      const syllables = Math.max(1, Math.ceil(w.length / 3));
      return (syllables * baseTime) / rateMult;
    });
  }

  private generateProsodyCurve(wordCount: number, pitchContour: number[], emotion: VoiceEmotion): number[] {
    const curve: number[] = [];
    for (let i = 0; i < wordCount; i++) {
      const t = i / Math.max(wordCount - 1, 1);
      // Natural sentence intonation: slight rise then fall
      let mod = Math.sin(t * Math.PI) * 0.15;
      // Statement fall at end
      if (t > 0.8) mod -= (t - 0.8) * 0.5;
      // Emotional modulation
      if (emotion === 'excited' || emotion === 'happy') mod += 0.1;
      if (emotion === 'sad') mod -= 0.1;
      curve.push(mod);
    }
    return curve;
  }

  private calculateBreathPoints(words: string[], pattern?: BreathingPattern): number[] {
    const interval = pattern?.averageBreathInterval ?? 3.0;
    const points: number[] = [];
    let elapsed = 0;
    for (let i = 0; i < words.length; i++) {
      elapsed += words[i].length * 0.08;
      if (elapsed >= interval) {
        points.push(i);
        elapsed = 0;
      }
    }
    return points;
  }

  private detectEmphasisWords(line: string): number[] {
    const words = line.split(/\\s+/);
    const indices: number[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      // ALL CAPS, exclamation, quoted, or important keywords
      if (w === w.toUpperCase() && w.length > 1) indices.push(i);
      else if (w.includes('!')) indices.push(i);
      else if (/^["']/.test(w)) indices.push(i);
      else if (/^(never|always|must|now|stop|help|run|kill|die|fight|here|look|watch)$/i.test(w.replace(/[^a-z]/gi, ''))) {
        indices.push(i);
      }
    }
    return indices;
  }

  private generateVolumeEnvelope(wordCount: number, emotion: VoiceEmotion): number[] {
    const env: number[] = [];
    for (let i = 0; i < wordCount; i++) {
      const t = i / Math.max(wordCount - 1, 1);
      let vol = 0.8 + Math.sin(t * Math.PI * 0.5) * 0.15;
      if (emotion === 'whispering') vol *= 0.5;
      if (emotion === 'commanding') vol *= 1.2;
      if (emotion === 'angry') vol *= 1.15;
      env.push(clamp(vol, 0, 1));
    }
    return env;
  }

  private correlateArrays(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;
    let sumAB = 0, sumA = 0, sumB = 0;
    for (let i = 0; i < len; i++) {
      sumAB += a[i] * b[i];
      sumA += a[i] * a[i];
      sumB += b[i] * b[i];
    }
    return sumA > 0 && sumB > 0 ? sumAB / Math.sqrt(sumA * sumB) : 0;
  }

  // ─── ACCESSORS ──────────────────────────────────────────

  getProfile(): Readonly<PlayerProfile> { return this.profile; }
  getStruggleLevel(): number { return this.getStruggleScore(); }
  getPlayerName(): string { return this.playerName; }
  getFeature(id: string): GameFeature | undefined { return this.features.get(id); }
  hasFeature(category: FeatureCategory): boolean {
    for (const f of this.features.values()) {
      if (f.category === category && f.enabled) return true;
    }
    return false;
  }
  getRecentEvents(count?: number, type?: string): GameEvent[] {
    let events = this.eventLog;
    if (type) events = events.filter(e => e.type === type);
    return events.slice(-(count ?? 20));
  }

  /** Export profile as JSON for saving */
  exportProfile(): string {
    return JSON.stringify({
      ...this.profile,
      preferredActions: Object.fromEntries(this.profile.preferredActions),
    });
  }

  /** Import a previously exported profile */
  importProfile(json: string): void {
    const data = JSON.parse(json);
    this.profile = {
      ...data,
      preferredActions: new Map(Object.entries(data.preferredActions ?? {})),
    };
  }

  // ─── INTERNAL ───────────────────────────────────────────

  private getStruggleScore(): number {
    let score = 0;
    const p = this.profile;

    // Deaths in current area
    score += Math.min(p.deathsInCurrentArea * 0.12, 0.5);

    // Consecutive failures
    score += Math.min(p.consecutiveFailures * 0.1, 0.35);

    // Low combat skill
    if (p.combatSkill < 0.3) score += 0.15;

    // Low overall skill
    if (p.overallSkill < 0.3) score += 0.1;

    // Invert — high skill means low struggle
    score = Math.max(score - (p.overallSkill - 0.5) * 0.2, 0);

    return clamp(score, 0, 1);
  }

  private processEventForProfile(event: GameEvent): void {
    const a = this.config.adaptationSpeed;
    switch (event.type) {
      case 'hit_landed':
        this.profile.combatSkill = ema(this.profile.combatSkill, 1, a);
        break;
      case 'damage_taken':
        // already handled in recordDamageTaken
        break;
      case 'dodge':
        this.profile.combatSkill = ema(this.profile.combatSkill, 1, a * 1.5);
        break;
      case 'level_complete':
      case 'area_change':
        this.profile.explorationSkill = ema(this.profile.explorationSkill, 1, a);
        break;
      case 'puzzle_solved':
        // already handled in convenience method
        break;
    }
  }

  private pickUnshown(candidates: AdaptiveHint[]): AdaptiveHint | null {
    for (const h of candidates) {
      if (!this.shownHints.has(h.message)) return h;
    }
    return null;
  }

  private createDefaultProfile(): PlayerProfile {
    return {
      overallSkill: 0.5,
      combatSkill: 0.5,
      explorationSkill: 0.5,
      puzzleSkill: 0.5,
      resourceManagement: 0.5,
      aggression: 0.5,
      patience: 0.5,
      exploration: 0.5,
      risktaking: 0.5,
      adaptability: 0.5,
      preferredActions: new Map(),
      weaknesses: [],
      strengths: [],
      totalEvents: 0,
      sessionCount: 0,
      totalPlayTime: 0,
      deaths: 0,
      deathsInCurrentArea: 0,
      currentAreaId: '',
      consecutiveFailures: 0,
      lastEventTime: 0,
    };
  }

  private log(msg: string): void {
    if (this.config.enableLogging) console.log(\`[AdaptiveAI] \${msg}\`);
  }
}

// ─── MATH HELPERS ─────────────────────────────────────────────────────────

function ema(current: number, target: number, alpha: number): number {
  return current + alpha * (target - current);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length;
}

// ─── PREBUILT PLUGINS ─────────────────────────────────────────────────────

/** Drop-in plugin for platformer games */
const PlatformerPlugin: AdaptivePlugin = {
  id: 'platformer',
  name: 'Platformer Plugin',
  features: ['combat', 'movement'],
  getHints(ai) {
    const p = ai.getProfile();
    const hints: AdaptiveHint[] = [];
    if (p.consecutiveFailures >= 3 && p.combatSkill < 0.4) {
      hints.push({ message: 'Try attacking from above — downward strikes keep you safe.', priority: 2, category: 'combat', triggerReason: 'low combat skill + repeated deaths' });
    }
    return hints;
  },
};

/** Drop-in plugin for RPG stat systems */
const RPGPlugin: AdaptivePlugin = {
  id: 'rpg',
  name: 'RPG Plugin',
  features: ['progression', 'combat', 'economy'],
  getStatRecommendations(ai, stats) {
    const p = ai.getProfile();
    const recs: StatRecommendation[] = [];
    if (p.deaths > 10 && (stats['vitality'] ?? stats['constitution'] ?? 0) < 20) {
      const statName = 'vitality' in stats ? 'vitality' : 'constitution' in stats ? 'constitution' : 'health';
      recs.push({
        statName,
        currentValue: stats[statName] ?? 0,
        recommendedIncrease: 3,
        reason: 'Survivability is key — more health lets you learn boss patterns.',
      });
    }
    return recs;
  },
};

/** Drop-in plugin for puzzle games */
const PuzzlePlugin: AdaptivePlugin = {
  id: 'puzzle',
  name: 'Puzzle Plugin',
  features: ['puzzle'],
  getHints(ai) {
    const p = ai.getProfile();
    const hints: AdaptiveHint[] = [];
    if (p.consecutiveFailures >= 2 && p.puzzleSkill < 0.4) {
      hints.push({ message: 'Look for patterns in the environment — the solution is often visual.', priority: 2, category: 'puzzle', triggerReason: 'repeated puzzle failures' });
    }
    return hints;
  },
};

/** Drop-in plugin for 3D first-person / third-person games (FPS, TPS, open-world) */
const ThreeDGamePlugin: AdaptivePlugin = {
  id: '3d_game',
  name: '3D Game Plugin',
  features: ['combat', 'movement_3d', 'camera', 'physics_3d', 'spatial'],
  processEvent(ai, event) {
    const mods: Partial<AdaptiveModifiers> = {};
    // If player keeps dying to enemies they can't see, reduce detection range
    if (event.type === 'death' && event.metadata?.cause === 'ambush') {
      mods.enemyDetectionRange = Math.max(0.5, (ai.getModifiers().enemyDetectionRange ?? 1) - 0.1);
    }
    // If player is missing shots frequently in FPS, increase aim assist
    if (event.type === 'shot_missed') {
      const profile = ai.getProfile();
      if (profile.combatSkill < 0.4) {
        mods.aimAssistStrength = Math.min(0.8, (ai.getModifiers().aimAssistStrength ?? 0) + 0.05);
      }
    }
    return Object.keys(mods).length > 0 ? mods : null;
  },
  getHints(ai) {
    const p = ai.getProfile();
    const hints: AdaptiveHint[] = [];
    if (p.consecutiveFailures >= 3 && p.combatSkill < 0.4) {
      hints.push({
        message: 'Try using cover and corners — don\\'t fight in the open.',
        priority: 3, category: 'combat',
        triggerReason: 'low combat skill in 3D environment'
      });
    }
    if (p.consecutiveFailures >= 2) {
      hints.push({
        message: 'Check your surroundings — enemies can come from above, below, and behind.',
        priority: 2, category: 'combat',
        triggerReason: 'deaths in 3D space'
      });
    }
    if (p.deathsInCurrentArea >= 4) {
      hints.push({
        message: 'Try adjusting your camera sensitivity for better aim control.',
        priority: 1, category: 'combat',
        triggerReason: 'repeated deaths suggesting aim issues'
      });
    }
    return hints;
  },
};

/** Drop-in plugin for VR/XR games */
const VRPlugin: AdaptivePlugin = {
  id: 'vr',
  name: 'VR/XR Plugin',
  features: ['movement_3d', 'camera', 'spatial', 'combat'],
  processEvent(ai, event) {
    const mods: Partial<AdaptiveModifiers> = {};
    // Reduce motion intensity for struggling VR players to prevent discomfort
    if (event.type === 'death') {
      mods.custom = { motionIntensity: Math.max(0.5, 1 - ai.getProfile().consecutiveFailures * 0.1) };
    }
    return Object.keys(mods).length > 0 ? mods : null;
  },
  getHints(ai) {
    const hints: AdaptiveHint[] = [];
    const p = ai.getProfile();
    if (p.consecutiveFailures >= 2) {
      hints.push({
        message: 'Use room-scale movement to physically dodge — leaning and ducking works!',
        priority: 2, category: 'combat',
        triggerReason: 'VR combat struggles'
      });
    }
    return hints;
  },
};

/** Drop-in plugin for open-world / sandbox 3D games */
const OpenWorldPlugin: AdaptivePlugin = {
  id: 'open_world',
  name: 'Open World Plugin',
  features: ['spatial', 'movement_3d', 'combat', 'progression', 'survival'],
  processEvent(ai, event) {
    const mods: Partial<AdaptiveModifiers> = {};
    // If player keeps dying in high-level areas, subtly guide toward appropriate zones
    if (event.type === 'death' && event.metadata?.areaLevel) {
      const levelDiff = (event.metadata.areaLevel as number) - (event.metadata.playerLevel as number ?? 1);
      if (levelDiff > 5) {
        mods.custom = { zoneWarningUrgency: Math.min(1, levelDiff * 0.1) };
      }
    }
    return Object.keys(mods).length > 0 ? mods : null;
  },
  getHints(ai) {
    const hints: AdaptiveHint[] = [];
    const p = ai.getProfile();
    if (p.deathsInCurrentArea >= 3) {
      hints.push({
        message: 'This area might be above your level. Explore nearby regions for better gear first.',
        priority: 3, category: 'exploration',
        triggerReason: 'repeated deaths suggest area too difficult'
      });
    }
    return hints;
  },
};

// ─── JSON PROTOCOL (for non-JS languages) ────────────────────────────────
//
// This allows ANY language (Python, C#, C++, Rust, Go, Java, Lua, etc.)
// to communicate with the AI engine via JSON messages.
//
// Usage patterns:
//   1. Subprocess: spawn this as a Node.js process, pipe JSON via stdin/stdout
//   2. File: write events to input.json, read modifiers from output.json
//   3. HTTP: run as local HTTP server on any port
//   4. WebSocket: real-time bidirectional communication
//   5. Shared memory / IPC: serialize JSON to any transport

class AdaptiveAIProtocol {
  private ai: UniversalAdaptiveAI;

  constructor(ai: UniversalAdaptiveAI) {
    this.ai = ai;
  }

  /** Process a JSON message string from any language. Returns JSON response. */
  processMessage(jsonString: string): string {
    try {
      const msg = JSON.parse(jsonString);
      const action = msg.action || msg.command || msg.type;
      const data = msg.data || msg.payload || msg;

      switch (action) {
        case 'recordEvent':
          this.ai.recordEvent(data);
          return JSON.stringify({ status: 'ok' });

        case 'recordAttack':
          this.ai.recordAttack(data.direction, data.weapon);
          return JSON.stringify({ status: 'ok' });

        case 'recordHitLanded':
          this.ai.recordHitLanded(data.target, data.damage);
          return JSON.stringify({ status: 'ok' });

        case 'recordDamageTaken':
          this.ai.recordDamageTaken(data.source, data.damage);
          return JSON.stringify({ status: 'ok' });

        case 'recordDodge':
          this.ai.recordDodge();
          return JSON.stringify({ status: 'ok' });

        case 'recordDeath':
          this.ai.recordDeath(data.areaId);
          return JSON.stringify({ status: 'ok' });

        case 'recordAreaChange':
          this.ai.recordAreaChange(data.areaId);
          return JSON.stringify({ status: 'ok' });

        case 'recordLevelComplete':
          this.ai.recordLevelComplete(data.levelId, data.score);
          return JSON.stringify({ status: 'ok' });

        case 'recordPuzzleSolved':
          this.ai.recordPuzzleSolved(data.puzzleId, data.timeSpent);
          return JSON.stringify({ status: 'ok' });

        case 'recordCustom':
          this.ai.recordCustom(data.eventType || data.type, data.metadata);
          return JSON.stringify({ status: 'ok' });

        case 'update':
          this.ai.update(data.deltaTime || data.dt || 0.016);
          return JSON.stringify({ status: 'ok' });

        case 'getModifiers':
          return JSON.stringify({ modifiers: this.ai.getModifiers() });

        case 'getCounterStrategy':
          return JSON.stringify({
            strategy: this.ai.getCounterStrategy(data.enemyId, data.behaviors || [])
          });

        case 'getHint':
          return JSON.stringify({ hint: this.ai.getHint() });

        case 'getProfile':
          return JSON.stringify({ profile: this.ai.exportProfile() });

        case 'getStatRecommendations':
          return JSON.stringify({
            recommendations: this.ai.getStatRecommendations(data.stats || {})
          });

        case 'adaptDialogue':
          return JSON.stringify({
            dialogue: this.ai.adaptDialogue(data.line, data.character)
          });

        case 'setPlayerName':
          this.ai.setPlayerName(data.name);
          return JSON.stringify({ status: 'ok' });

        case 'importProfile':
          this.ai.importProfile(typeof data === 'string' ? data : JSON.stringify(data));
          return JSON.stringify({ status: 'ok' });

        case 'exportProfile':
          return JSON.stringify({ profile: this.ai.exportProfile() });

        default:
          return JSON.stringify({ error: \`Unknown action: \${action}\`, availableActions: [
            'recordEvent', 'recordAttack', 'recordHitLanded', 'recordDamageTaken',
            'recordDodge', 'recordDeath', 'recordAreaChange', 'recordLevelComplete',
            'recordPuzzleSolved', 'recordCustom', 'update', 'getModifiers',
            'getCounterStrategy', 'getHint', 'getProfile', 'getStatRecommendations',
            'adaptDialogue', 'setPlayerName', 'importProfile', 'exportProfile'
          ]});
      }
    } catch (e) {
      return JSON.stringify({ error: \`Invalid JSON: \${(e as Error).message}\` });
    }
  }

  /** Start stdin/stdout JSON line protocol (for subprocess integration) */
  startStdinProtocol(): void {
    if (typeof process === 'undefined' || !process.stdin) {
      console.error('stdin not available — use processMessage() directly');
      return;
    }
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line: string) => {
      const response = this.processMessage(line);
      process.stdout.write(response + '\\n');
    });
    console.error('[AdaptiveAI] JSON protocol ready on stdin/stdout');
  }

  /** Start a simple HTTP JSON API server (Node.js only) */
  startHTTPServer(port: number = 3210): void {
    if (typeof require === 'undefined') {
      console.error('HTTP server requires Node.js');
      return;
    }
    const http = require('http');
    const server = http.createServer((req: any, res: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: string) => body += chunk);
        req.on('end', () => {
          const response = this.processMessage(body);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(response);
        });
      } else if (req.method === 'GET') {
        const response = this.processMessage(JSON.stringify({ action: 'getModifiers' }));
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(response);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end('{}');
      }
    });
    server.listen(port, () => console.log(\`[AdaptiveAI] HTTP server on http://localhost:\${port}\`));
  }
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────

// Use as ES module:
//   import { UniversalAdaptiveAI, AdaptiveAIProtocol, ThreeDGamePlugin } from './adaptiveAI';
//
// Use as script tag (assign to window):
//   <script src="adaptiveAI.js"></script>
//   const ai = new window.UniversalAdaptiveAI();
//
// Use from ANY language via JSON protocol:
//   const protocol = new AdaptiveAIProtocol(ai);
//   protocol.startStdinProtocol();    // pipe JSON from Python/C#/Rust/etc.
//   protocol.startHTTPServer(3210);   // POST JSON from any HTTP client
//
// Python example:
//   import subprocess, json
//   proc = subprocess.Popen(['node', 'UniversalAdaptiveAI.js'],
//     stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
//   proc.stdin.write(json.dumps({"action": "recordDeath", "data": {"areaId": "boss_1"}}) + "\\n")
//   proc.stdin.flush()
//   modifiers = json.loads(proc.stdout.readline())
//
// C# example:
//   var client = new HttpClient();
//   var json = "{\\"action\\":\\"getModifiers\\"}";
//   var response = await client.PostAsync("http://localhost:3210", new StringContent(json));
//
// C++ example (with libcurl):
//   curl_easy_setopt(curl, CURLOPT_URL, "http://localhost:3210");
//   curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "{\\"action\\":\\"getModifiers\\"}");

// export { UniversalAdaptiveAI, AdaptiveAIProtocol, PlatformerPlugin, RPGPlugin, PuzzlePlugin, ThreeDGamePlugin, VRPlugin, OpenWorldPlugin };
// export type { GameEvent, AdaptiveModifiers, CounterStrategy, AdaptiveHint, StatRecommendation, CharacterDialogue, AdaptivePlugin, GameFeature };

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * QUICK START EXAMPLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * const ai = new UniversalAdaptiveAI({ enableLogging: true });
 *
 * // Register plugins for your game type
 * ai.registerPlugin(PlatformerPlugin);
 * ai.registerPlugin(RPGPlugin);
 *
 * // Set player name for dialogue
 * ai.setPlayerName('Luna');
 *
 * // In your game loop:
 * function update(dt) {
 *   ai.update(dt);
 *   const mods = ai.getModifiers();
 *
 *   // Apply to combat
 *   player.damage = baseDamage * mods.playerDamageMultiplier;
 *   enemy.damage = baseEnemyDamage * mods.enemyDamageMultiplier;
 *
 *   // Apply to enemy behavior
 *   const strategy = ai.getCounterStrategy('boss_1', ['charge', 'slam', 'ranged']);
 *   if (Math.random() < strategy.probability) {
 *     enemy.useAttack(strategy.preferredBehavior);
 *   }
 *
 *   // Show hints
 *   const hint = ai.getHint();
 *   if (hint) ui.showNotification(hint.message);
 *
 *   // Adapt dialogue
 *   const dialogue = ai.adaptDialogue("Hey, traveler! Welcome.", "Elder");
 *   npc.say(dialogue.adaptedLine); // "Hey, Luna! Welcome."
 *
 *   // Voice replication — analyze a voice actor's audio sample
 *   const audioBuffer = await fetch('elder_voice.wav').then(r => r.arrayBuffer());
 *   const voiceProfile = await ai.analyzeVoice(audioBuffer, 'elder_npc');
 *
 *   // Generate synthesis params that replicate the actor's voice
 *   const voiceParams = ai.replicateVoice('elder_npc', dialogue.adaptedLine, 'tender');
 *   ttsEngine.speak(voiceParams); // Your TTS engine uses these params
 *
 *   // Compare voice similarity (0-1) to validate synthesis quality
 *   const similarity = ai.compareVoices(voiceProfile, synthesizedProfile);
 *   console.log('Voice match:', (similarity * 100).toFixed(1) + '%');
 *
 *   // Save/load voice profiles
 *   localStorage.setItem('elder_voice', ai.exportVoiceProfile('elder_npc'));
 *   ai.importVoiceProfile(localStorage.getItem('elder_voice'));
 *
 *   // Get stat recommendations
 *   const recs = ai.getStatRecommendations({ attack: 10, defense: 5, health: 100 });
 *   recs.forEach(r => console.log(r.statName, '+' + r.recommendedIncrease, r.reason));
 * }
 *
 * // Record events as they happen:
 * ai.recordAttack('right', 'sword');
 * ai.recordHitLanded('skeleton', 25);
 * ai.recordDamageTaken('skeleton', 10);
 * ai.recordDodge();
 * ai.recordDeath('dungeon_3');
 * ai.recordLevelComplete('dungeon_3');
 * ai.recordPuzzleSolved('lever_puzzle');
 * ai.recordAbilityUsed('fireball');
 * ai.recordCustom('crafted_item', { item: 'iron_sword' });
 *
 * // Save/load player profile
 * localStorage.setItem('ai_profile', ai.exportProfile());
 * ai.importProfile(localStorage.getItem('ai_profile'));
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── AUTO-START CLI MODE ──────────────────────────────────────────────────
// When run directly with Node.js, automatically starts the JSON protocol.
// Usage: node UniversalAdaptiveAI.js [--http PORT] [--stdin]
//
// This lets ANY language communicate with the AI:
//   Python:  subprocess.Popen(['node', 'UniversalAdaptiveAI.js', '--stdin'])
//   C#:      Process.Start("node", "UniversalAdaptiveAI.js --http 3210")
//   Rust:    Command::new("node").arg("UniversalAdaptiveAI.js").arg("--stdin")
//   Go:      exec.Command("node", "UniversalAdaptiveAI.js", "--stdin")
//   Java:    Runtime.getRuntime().exec("node UniversalAdaptiveAI.js --stdin")

if (typeof process !== 'undefined' && process.argv) {
  const args = process.argv.slice(2);
  const ai = new UniversalAdaptiveAI({ enableLogging: true });
  const protocol = new AdaptiveAIProtocol(ai);

  if (args.includes('--http')) {
    const portIdx = args.indexOf('--http') + 1;
    const port = parseInt(args[portIdx]) || 3210;
    protocol.startHTTPServer(port);
  } else if (args.includes('--stdin') || args.length === 0) {
    protocol.startStdinProtocol();
  }
}
`;

export { ADAPTIVE_AI_SOURCE };

export function getJSSource(): string {
    // Strip TypeScript type annotations for plain JS compatibility
    return ADAPTIVE_AI_SOURCE
      .replace(/interface \w+ \{[^}]*\}/gs, '')
      .replace(/type \w+ =[^;]*;/g, '')
      .replace(/:\s*(string|number|boolean|void|any|null|undefined|Record<[^>]+>|Map<[^>]+>|Set<[^>]+>|Partial<[^>]+>|Readonly<[^>]+>|Required<[^>]+>|Omit<[^>]+>|Promise<[^>]+>|Float32Array|ArrayBuffer|VoiceProfile|VoiceSynthesisParams|VoiceEmotion|VoiceCadence|EmotionalRange|BreathingPattern|VoiceAnalysisOptions|PlayerProfile|GameEvent|GameFeature|FeatureCategory|AdaptiveModifiers|CounterStrategy|AdaptiveHint|StatRecommendation|CharacterDialogue|AdaptivePlugin|PlayerAction)(\[])?/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\bas\b\s+\w+/g, '')
      .replace(/\n\n\n+/g, '\n\n');
}

