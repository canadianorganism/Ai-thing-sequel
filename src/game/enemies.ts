import {
  Enemy,
  EnemyType,
  EnemyState,
  Player,
  Room,
  Particle,
  ENEMY_STATS,
  Vector2,
} from './types';
import type { EnemyCounterStrategy, DifficultyModifiers } from './adaptiveAI';
import {
  applyPhysics,
  resolveCollisions,
  checkGrounded,
  distance,
  directionTo,
  rectanglesOverlap,
  getWorldHitbox,
} from './physics';

let enemyIdCounter = 0;

export function createEnemy(type: EnemyType, x: number, y: number): Enemy {
  const stats = ENEMY_STATS[type];
  const hitboxes: Record<EnemyType, { width: number; height: number }> = {
    crawlid: { width: 40, height: 24 },
    vengefly: { width: 36, height: 36 },
    tiktik: { width: 28, height: 28 },
    gruzzer: { width: 32, height: 32 },
    husk_guard: { width: 48, height: 64 },
    leaping_husk: { width: 36, height: 52 },
    gruz_mother: { width: 80, height: 60 },
    false_knight: { width: 120, height: 140 },
    shade: { width: 40, height: 50 },
  };
  
  const hb = hitboxes[type];
  
  return {
    id: `enemy_${enemyIdCounter++}`,
    type,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    hitbox: { x: 0, y: 0, width: hb.width, height: hb.height },
    state: 'patrol',
    facing: Math.random() > 0.5 ? 'left' : 'right',
    health: stats.health,
    maxHealth: stats.health,
    damage: stats.damage,
    staggerTimer: 0,
    attackTimer: 0,
    patrolTimer: Math.random() * 3,
  };
}

export function updateEnemy(
  enemy: Enemy,
  player: Player,
  room: Room,
  deltaTime: number,
  createParticles: (particles: Omit<Particle, 'id'>[]) => void,
  counterStrategy?: EnemyCounterStrategy,
  aiModifiers?: DifficultyModifiers
): void {
  // Update timers
  if (enemy.staggerTimer > 0) {
    enemy.staggerTimer -= deltaTime;
    if (enemy.staggerTimer <= 0) {
      enemy.state = 'patrol';
    }
    return;
  }
  
  enemy.attackTimer -= deltaTime;
  enemy.patrolTimer -= deltaTime;
  
  // Get distance to player
  const playerCenter = {
    x: player.position.x + player.hitbox.width / 2,
    y: player.position.y + player.hitbox.height / 2,
  };
  const enemyCenter = {
    x: enemy.position.x + enemy.hitbox.width / 2,
    y: enemy.position.y + enemy.hitbox.height / 2,
  };
  const dist = distance(playerCenter, enemyCenter);
  
  // Apply AI aggression scaling to attack timer reduction
  const attackTimerScale = aiModifiers?.enemyAttackFrequency ?? 1;
  
  // Enemy-specific behavior
  switch (enemy.type) {
    case 'crawlid':
      updateCrawlid(enemy, room, deltaTime);
      break;
    case 'vengefly':
      updateVengefly(enemy, player, playerCenter, enemyCenter, dist, deltaTime, aiModifiers);
      break;
    case 'tiktik':
      updateTiktik(enemy, room, deltaTime);
      break;
    case 'gruzzer':
      updateGruzzer(enemy, room, deltaTime);
      break;
    case 'husk_guard':
      updateHuskGuard(enemy, player, playerCenter, dist, room, deltaTime, aiModifiers);
      break;
    case 'leaping_husk':
      updateLeapingHusk(enemy, player, playerCenter, dist, room, deltaTime, aiModifiers);
      break;
    case 'gruz_mother':
      updateGruzMother(enemy, player, room, deltaTime);
      break;
    case 'false_knight':
      updateFalseKnight(enemy, player, room, deltaTime, createParticles, counterStrategy, aiModifiers);
      break;
    case 'shade':
      updateShade(enemy, player, playerCenter, enemyCenter, dist, room, deltaTime, aiModifiers);
      break;
  }
  
  // Keep in bounds
  if (enemy.position.x < 0) {
    enemy.position.x = 0;
    enemy.velocity.x = Math.abs(enemy.velocity.x);
    enemy.facing = 'right';
  }
  if (enemy.position.x + enemy.hitbox.width > room.width) {
    enemy.position.x = room.width - enemy.hitbox.width;
    enemy.velocity.x = -Math.abs(enemy.velocity.x);
    enemy.facing = 'left';
  }
}

function updateCrawlid(enemy: Enemy, room: Room, deltaTime: number): void {
  const speed = 60;
  
  // Simple patrol - walk back and forth
  enemy.velocity.x = enemy.facing === 'right' ? speed : -speed;
  
  // Apply physics
  applyPhysics(enemy, deltaTime);
  const collision = resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
  
  // Turn around at walls or edges
  if (collision.hitWall) {
    enemy.facing = enemy.facing === 'right' ? 'left' : 'right';
  }
  
  // Check for edge (don't walk off platforms)
  const edgeCheck = {
    x: enemy.facing === 'right' 
      ? enemy.position.x + enemy.hitbox.width + 4 
      : enemy.position.x - 4,
    y: enemy.position.y + enemy.hitbox.height + 4,
    width: 4,
    height: 4,
  };
  
  let hasFloor = false;
  for (const platform of room.platforms) {
    if (rectanglesOverlap(edgeCheck, platform)) {
      hasFloor = true;
      break;
    }
  }
  
  if (!hasFloor && checkGrounded(enemy.position, enemy.hitbox, room.platforms)) {
    enemy.facing = enemy.facing === 'right' ? 'left' : 'right';
  }
}

function updateVengefly(
  enemy: Enemy,
  player: Player,
  playerCenter: Vector2,
  enemyCenter: Vector2,
  dist: number,
  deltaTime: number,
  aiModifiers?: DifficultyModifiers
): void {
  const aggroRange = 200 * (aiModifiers?.enemyAggressionScale ?? 1);
  const speed = 150 * (aiModifiers?.enemyAggressionScale ?? 1);
  
  if (dist < aggroRange && player.state !== 'dead') {
    // Chase player
    enemy.state = 'chase';
    const dir = directionTo(enemyCenter, playerCenter);
    enemy.velocity.x = dir.x * speed;
    enemy.velocity.y = dir.y * speed;
    enemy.facing = dir.x > 0 ? 'right' : 'left';
  } else {
    // Idle hovering
    enemy.state = 'patrol';
    enemy.velocity.x *= 0.95;
    enemy.velocity.y = Math.sin(Date.now() / 500) * 30;
  }
  
  // Apply movement (no gravity for flying enemies)
  enemy.position.x += enemy.velocity.x * deltaTime;
  enemy.position.y += enemy.velocity.y * deltaTime;
}

function updateTiktik(enemy: Enemy, room: Room, deltaTime: number): void {
  // Tiktiks crawl on surfaces - simplified to ground-only for now
  const speed = 50;
  
  enemy.velocity.x = enemy.facing === 'right' ? speed : -speed;
  
  applyPhysics(enemy, deltaTime);
  const collision = resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
  
  if (collision.hitWall) {
    enemy.facing = enemy.facing === 'right' ? 'left' : 'right';
  }
}

function updateGruzzer(enemy: Enemy, room: Room, deltaTime: number): void {
  const speed = 100;
  const bounceForce = 200;
  
  // Gruzzers bounce around erratically
  if (enemy.patrolTimer <= 0) {
    enemy.velocity.x = (Math.random() - 0.5) * speed * 2;
    enemy.velocity.y = -bounceForce - Math.random() * 100;
    enemy.patrolTimer = 1 + Math.random() * 2;
  }
  
  applyPhysics(enemy, deltaTime);
  const collision = resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
  
  if (collision.grounded) {
    enemy.velocity.y = -bounceForce;
  }
  if (collision.hitWall) {
    enemy.velocity.x *= -1;
    enemy.facing = enemy.velocity.x > 0 ? 'right' : 'left';
  }
}

function updateHuskGuard(
  enemy: Enemy,
  player: Player,
  playerCenter: Vector2,
  dist: number,
  room: Room,
  deltaTime: number,
  aiModifiers?: DifficultyModifiers
): void {
  const aggroRange = 150 * (aiModifiers?.enemyAggressionScale ?? 1);
  const speed = 40;
  
  // Face player when close
  if (dist < aggroRange) {
    enemy.facing = playerCenter.x > enemy.position.x ? 'right' : 'left';
    
    // Slow approach
    if (dist > 60) {
      enemy.velocity.x = enemy.facing === 'right' ? speed : -speed;
    } else {
      enemy.velocity.x = 0;
    }
  } else {
    // Patrol
    if (enemy.patrolTimer <= 0) {
      enemy.facing = enemy.facing === 'right' ? 'left' : 'right';
      enemy.patrolTimer = 2 + Math.random() * 2;
    }
    enemy.velocity.x = enemy.facing === 'right' ? speed * 0.5 : -speed * 0.5;
  }
  
  applyPhysics(enemy, deltaTime);
  resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
}

function updateLeapingHusk(
  enemy: Enemy,
  player: Player,
  playerCenter: Vector2,
  dist: number,
  room: Room,
  deltaTime: number,
  aiModifiers?: DifficultyModifiers
): void {
  const aggroRange = 180 * (aiModifiers?.enemyAggressionScale ?? 1);
  const leapForceX = 250;
  const leapForceY = 400;
  
  const grounded = checkGrounded(enemy.position, enemy.hitbox, room.platforms);
  
  if (dist < aggroRange && grounded && enemy.attackTimer <= 0 && player.state !== 'dead') {
    // Leap at player
    enemy.state = 'attack';
    enemy.facing = playerCenter.x > enemy.position.x ? 'right' : 'left';
    enemy.velocity.x = enemy.facing === 'right' ? leapForceX : -leapForceX;
    enemy.velocity.y = -leapForceY;
    enemy.attackTimer = 1.5;
  } else if (grounded && enemy.state === 'attack') {
    enemy.state = 'patrol';
    enemy.velocity.x = 0;
  }
  
  applyPhysics(enemy, deltaTime);
  const collision = resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
  
  if (collision.hitWall) {
    enemy.velocity.x *= -0.5;
  }
}

function updateGruzMother(enemy: Enemy, player: Player, room: Room, deltaTime: number): void {
  const speed = 180;
  
  // Gruz Mother bounces around the arena
  if (enemy.patrolTimer <= 0) {
    const angle = Math.random() * Math.PI * 2;
    enemy.velocity.x = Math.cos(angle) * speed;
    enemy.velocity.y = Math.sin(angle) * speed - 100;
    enemy.patrolTimer = 0.8 + Math.random() * 0.5;
  }
  
  // Apply movement
  enemy.position.x += enemy.velocity.x * deltaTime;
  enemy.position.y += enemy.velocity.y * deltaTime;
  
  // Bounce off walls
  if (enemy.position.x < 0 || enemy.position.x + enemy.hitbox.width > room.width) {
    enemy.velocity.x *= -1;
    enemy.position.x = Math.max(0, Math.min(room.width - enemy.hitbox.width, enemy.position.x));
  }
  
  // Bounce off ceiling/floor
  applyPhysics(enemy, deltaTime, true);
  const collision = resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
  if (collision.grounded || collision.hitCeiling) {
    enemy.velocity.y *= -0.8;
  }
  
  enemy.facing = enemy.velocity.x > 0 ? 'right' : 'left';
}

// False Knight phase tracking
let falseKnightPhase = 0;
let falseKnightStaggerHits = 0;

function updateFalseKnight(
  enemy: Enemy,
  player: Player,
  room: Room,
  deltaTime: number,
  createParticles: (particles: Omit<Particle, 'id'>[]) => void,
  counterStrategy?: EnemyCounterStrategy,
  aiModifiers?: DifficultyModifiers
): void {
  const playerCenter = {
    x: player.position.x + player.hitbox.width / 2,
    y: player.position.y + player.hitbox.height / 2,
  };
  
  // Stagger phase - head vulnerable
  if (enemy.staggerTimer > 0) {
    enemy.staggerTimer -= deltaTime;
    enemy.velocity.x = 0;
    applyPhysics(enemy, deltaTime);
    resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
    return;
  }
  
  const grounded = checkGrounded(enemy.position, enemy.hitbox, room.platforms);
  
  // Attack patterns - adaptive AI influences which attack is chosen
  const atkFreq = aiModifiers?.enemyAttackFrequency ?? 1;
  if (enemy.attackTimer <= 0 && grounded) {
    let pattern: number;
    
    // Use counter strategy if available
    if (counterStrategy && Math.random() < counterStrategy.counterProbability) {
      // Pick the attack that counters the player's behavior
      switch (counterStrategy.preferredAttack) {
        case 'ground_slam': pattern = 0; break; // counter jumpers
        case 'charge': pattern = 1; break;      // counter dashers  
        case 'ranged': pattern = 2; break;       // counter aggressive players
        case 'leap': pattern = 0; break;         // close distance on passive players
        default: pattern = Math.floor(Math.random() * 3);
      }
    } else {
      pattern = Math.floor(Math.random() * 3);
    }
    
    switch (pattern) {
      case 0:
        // Jump slam
        enemy.state = 'attack';
        enemy.facing = playerCenter.x > enemy.position.x ? 'right' : 'left';
        enemy.velocity.y = -600;
        enemy.velocity.x = (enemy.facing === 'right' ? 1 : -1) * 200;
        enemy.attackTimer = 2 / atkFreq;
        break;
      case 1:
        // Mace swing - charge forward
        enemy.state = 'attack';
        enemy.facing = playerCenter.x > enemy.position.x ? 'right' : 'left';
        enemy.velocity.x = (enemy.facing === 'right' ? 1 : -1) * 400;
        enemy.attackTimer = 1.5 / atkFreq;
        break;
      case 2:
        // Rage - cause falling debris (simplified)
        enemy.state = 'attack';
        enemy.attackTimer = 2.5 / atkFreq;
        // Create debris particles
        for (let i = 0; i < 5; i++) {
          createParticles([{
            position: { 
              x: Math.random() * room.width, 
              y: 0 
            },
            velocity: { x: 0, y: 300 },
            color: '#666666',
            size: 20,
            lifetime: 2,
            maxLifetime: 2,
            type: 'dust',
          }]);
        }
        break;
    }
  }
  
  // Physics
  applyPhysics(enemy, deltaTime);
  const collision = resolveCollisions(enemy.position, enemy.velocity, enemy.hitbox, room.platforms);
  
  // Slam shockwave on landing
  if (collision.grounded && enemy.state === 'attack' && Math.abs(enemy.velocity.y) < 10) {
    // Create shockwave particles
    createParticles([{
      position: { x: enemy.position.x - 40, y: enemy.position.y + enemy.hitbox.height - 10 },
      velocity: { x: -200, y: -50 },
      color: '#ffaa00',
      size: 15,
      lifetime: 0.4,
      maxLifetime: 0.4,
      type: 'spark',
    }, {
      position: { x: enemy.position.x + enemy.hitbox.width + 40, y: enemy.position.y + enemy.hitbox.height - 10 },
      velocity: { x: 200, y: -50 },
      color: '#ffaa00',
      size: 15,
      lifetime: 0.4,
      maxLifetime: 0.4,
      type: 'spark',
    }]);
  }
  
  if (collision.hitWall) {
    enemy.velocity.x *= -0.5;
  }
  
  // Slow down when grounded
  if (grounded) {
    enemy.velocity.x *= 0.9;
  }
}

export function damageEnemy(
  enemy: Enemy,
  damage: number,
  knockbackDir: Vector2,
  createParticles: (particles: Omit<Particle, 'id'>[]) => void
): boolean {
  enemy.health -= damage;
  
  // Create hit particles
  createParticles([{
    position: { 
      x: enemy.position.x + enemy.hitbox.width / 2,
      y: enemy.position.y + enemy.hitbox.height / 2
    },
    velocity: { x: knockbackDir.x * 100, y: knockbackDir.y * 100 },
    color: '#ff6600',
    size: 12,
    lifetime: 0.3,
    maxLifetime: 0.3,
    type: 'hit',
  }]);
  
  if (enemy.health <= 0) {
    enemy.state = 'dead';
    return true;
  }
  
  // Stagger
  enemy.staggerTimer = 0.15;
  enemy.state = 'stunned';
  
  // Knockback
  enemy.velocity.x = knockbackDir.x * 150;
  enemy.velocity.y = knockbackDir.y * 100 - 50;
  
  // False Knight stagger mechanic
  if (enemy.type === 'false_knight') {
    falseKnightStaggerHits++;
    if (falseKnightStaggerHits >= 8) {
      enemy.staggerTimer = 3; // Longer stagger for head phase
      falseKnightStaggerHits = 0;
    }
  }
  
  return false;
}

function updateShade(
  enemy: Enemy,
  player: Player,
  playerCenter: Vector2,
  enemyCenter: Vector2,
  dist: number,
  room: Room,
  deltaTime: number,
  aiModifiers?: DifficultyModifiers
): void {
  const aggroRange = 250 * (aiModifiers?.enemyAggressionScale ?? 1);
  const speed = 120 * (aiModifiers?.enemyAggressionScale ?? 1);
  
  if (dist < aggroRange && player.state !== 'dead') {
    // Chase player aggressively
    enemy.state = 'chase';
    const dir = directionTo(enemyCenter, playerCenter);
    enemy.velocity.x = dir.x * speed;
    enemy.velocity.y = dir.y * speed * 0.6;
    enemy.facing = dir.x > 0 ? 'right' : 'left';
  } else {
    // Float in place
    enemy.state = 'patrol';
    enemy.velocity.x *= 0.9;
    enemy.velocity.y = Math.sin(Date.now() / 400) * 40;
  }
  
  // Float (no gravity)
  enemy.position.x += enemy.velocity.x * deltaTime;
  enemy.position.y += enemy.velocity.y * deltaTime;
  
  // Keep in room bounds
  enemy.position.x = Math.max(0, Math.min(room.width - enemy.hitbox.width, enemy.position.x));
  enemy.position.y = Math.max(0, Math.min(room.height - enemy.hitbox.height, enemy.position.y));
}

export function checkEnemyHit(
  enemy: Enemy,
  attackHitbox: { x: number; y: number; width: number; height: number }
): boolean {
  const enemyWorldHitbox = getWorldHitbox(enemy.position, enemy.hitbox);
  return rectanglesOverlap(attackHitbox, enemyWorldHitbox);
}
