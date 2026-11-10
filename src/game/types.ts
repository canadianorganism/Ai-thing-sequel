// Core game types for Hollow Knight demo

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hitbox extends Rectangle {
  offset?: Vector2;
}

// Player state machine
export type PlayerState = 
  | 'idle'
  | 'walking'
  | 'jumping'
  | 'falling'
  | 'dashing'
  | 'wall_sliding'
  | 'wall_jumping'
  | 'attacking'
  | 'casting'
  | 'healing'
  | 'damaged'
  | 'dead';

export type FacingDirection = 'left' | 'right';
export type AttackDirection = 'left' | 'right' | 'up' | 'down';

export interface PlayerStats {
  maxHealth: number;
  currentHealth: number;
  maxSoul: number;
  currentSoul: number;
  geo: number;
  nailDamage: number;
  hasDoubleJump: boolean;
  hasDash: boolean;
  hasWallJump: boolean;
}

export interface Player {
  position: Vector2;
  velocity: Vector2;
  hitbox: Hitbox;
  state: PlayerState;
  facing: FacingDirection;
  stats: PlayerStats;
  isGrounded: boolean;
  isOnWall: boolean;
  wallDirection: FacingDirection | null;
  canDoubleJump: boolean;
  dashCooldown: number;
  attackCooldown: number;
  invincibilityFrames: number;
  healTimer: number;
  currentAttackDirection: AttackDirection | null;
}

// Enemy types
export type EnemyType = 
  | 'crawlid'
  | 'vengefly'
  | 'tiktik'
  | 'gruzzer'
  | 'husk_guard'
  | 'leaping_husk'
  | 'gruz_mother'
  | 'false_knight'
  | 'shade';

export type EnemyState = 
  | 'idle'
  | 'patrol'
  | 'chase'
  | 'attack'
  | 'stunned'
  | 'dead';

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Vector2;
  velocity: Vector2;
  hitbox: Hitbox;
  state: EnemyState;
  facing: FacingDirection;
  health: number;
  maxHealth: number;
  damage: number;
  staggerTimer: number;
  attackTimer: number;
  patrolTimer: number;
  targetPosition?: Vector2;
}

// Projectiles (spells, enemy attacks)
export type ProjectileType = 'vengeful_spirit' | 'shade_soul' | 'enemy_projectile';

export interface Projectile {
  id: string;
  type: ProjectileType;
  position: Vector2;
  velocity: Vector2;
  hitbox: Hitbox;
  damage: number;
  lifetime: number;
  fromPlayer: boolean;
}

// Level elements
export type TileType = 
  | 'empty'
  | 'solid'
  | 'platform'
  | 'spike'
  | 'breakable'
  | 'bounce';

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export interface Platform extends Rectangle {
  type: 'solid' | 'one_way';
}

export interface Hazard extends Rectangle {
  type: 'spike' | 'acid';
  damage: number;
}

export interface Interactable extends Rectangle {
  type: 'bench' | 'geo_deposit' | 'soul_totem' | 'npc' | 'door' | 'transition';
  id: string;
  data?: Record<string, unknown>;
}

// Room/Level structure
export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  platforms: Platform[];
  hazards: Hazard[];
  enemies: Enemy[];
  interactables: Interactable[];
  spawnPoint: Vector2;
  backgroundColor: string;
  transitions: RoomTransition[];
}

export interface RoomTransition {
  from: Rectangle;
  toRoom: string;
  toPosition: Vector2;
  direction: 'left' | 'right' | 'up' | 'down';
}

// Input
export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  dash: boolean;
  cast: boolean;
  focus: boolean;
  pause: boolean;
  map: boolean;
  mapHeld: boolean;
  reset: boolean;
  // For detecting fresh presses
  jumpPressed: boolean;
  attackPressed: boolean;
  dashPressed: boolean;
  castPressed: boolean;
}

// Game state
export interface GameState {
  player: Player;
  currentRoom: Room;
  projectiles: Projectile[];
  particles: Particle[];
  camera: Camera;
  isPaused: boolean;
  dialogueActive: boolean;
  currentDialogue: DialogueLine[] | null;
  dialogueIndex: number;
  gameTime: number;
  benchPosition: Vector2 | null;
  visitedRooms: Set<string>;
}

export interface Camera {
  position: Vector2;
  target: Vector2;
  bounds: Rectangle;
  shake: number;
}

// Visual effects
export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  color: string;
  size: number;
  lifetime: number;
  maxLifetime: number;
  type: 'soul' | 'hit' | 'heal' | 'death' | 'dust' | 'spark';
}

// Dialogue
export interface DialogueLine {
  speaker?: string;
  text: string;
  portrait?: string;
}

// Animation
export interface AnimationFrame {
  duration: number;
  hitbox?: Hitbox;
}

export interface Animation {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
}

// Constants
export const TILE_SIZE = 32;
export const GRAVITY = 1800;
export const MAX_FALL_SPEED = 800;

// Player constants (matching Hollow Knight feel)
export const PLAYER_CONSTANTS = {
  WALK_SPEED: 280,
  JUMP_FORCE: 520,
  JUMP_HOLD_FORCE: 280,
  JUMP_HOLD_TIME: 0.2,
  DOUBLE_JUMP_FORCE: 480,
  DASH_SPEED: 600,
  DASH_DURATION: 0.25,
  DASH_COOLDOWN: 0.6,
  WALL_SLIDE_SPEED: 120,
  WALL_JUMP_FORCE_X: 350,
  WALL_JUMP_FORCE_Y: 480,
  ATTACK_DURATION: 0.35,
  ATTACK_COOLDOWN: 0.4,
  ATTACK_RANGE: 48,
  HEAL_TIME: 1.0,
  HEAL_AMOUNT: 1,
  SOUL_PER_HIT: 11,
  SOUL_FOR_HEAL: 33,
  SOUL_FOR_SPELL: 33,
  INVINCIBILITY_DURATION: 1.2,
  KNOCKBACK_FORCE: 300,
  POGO_FORCE: 480,
  WIDTH: 32,
  HEIGHT: 56,
};

// Enemy stats matching original game
export const ENEMY_STATS: Record<EnemyType, { health: number; damage: number }> = {
  crawlid: { health: 1, damage: 1 },
  vengefly: { health: 2, damage: 1 },
  tiktik: { health: 1, damage: 1 },
  gruzzer: { health: 2, damage: 1 },
  husk_guard: { health: 15, damage: 1 },
  leaping_husk: { health: 5, damage: 1 },
  gruz_mother: { health: 40, damage: 1 },
  false_knight: { health: 30, damage: 2 },
  shade: { health: 15, damage: 2 },
};
