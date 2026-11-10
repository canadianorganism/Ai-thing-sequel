import {
  Player,
  PlayerState,
  InputState,
  Room,
  PLAYER_CONSTANTS,
  AttackDirection,
  Projectile,
  Particle,
} from './types';
import {
  applyPhysics,
  resolveCollisions,
  checkGrounded,
  checkWallContact,
  checkHazardCollision,
  getAttackHitbox,
  rectanglesOverlap,
  getWorldHitbox,
} from './physics';

export function createPlayer(x: number, y: number): Player {
  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    hitbox: { x: 0, y: 0, width: PLAYER_CONSTANTS.WIDTH, height: PLAYER_CONSTANTS.HEIGHT },
    state: 'idle',
    facing: 'right',
    stats: {
      maxHealth: 5,
      currentHealth: 5,
      maxSoul: 99,
      currentSoul: 0,
      geo: 0,
      nailDamage: 1,
      hasDoubleJump: true, // Start with abilities for demo
      hasDash: true,
      hasWallJump: true,
    },
    isGrounded: false,
    isOnWall: false,
    wallDirection: null,
    canDoubleJump: true,
    dashCooldown: 0,
    attackCooldown: 0,
    invincibilityFrames: 0,
    healTimer: 0,
    currentAttackDirection: null,
  };
}

// Jump buffer and coyote time
let jumpBufferTimer = 0;
let coyoteTimer = 0;
let jumpHoldTimer = 0;
const JUMP_BUFFER_TIME = 0.1;
const COYOTE_TIME = 0.08;

export function updatePlayer(
  player: Player,
  input: InputState,
  room: Room,
  deltaTime: number,
  createProjectile: (proj: Omit<Projectile, 'id'>) => void,
  createParticles: (particles: Omit<Particle, 'id'>[]) => void,
  constants?: Partial<typeof PLAYER_CONSTANTS & { NAIL_DAMAGE_MULTIPLIER: number; SHOULD_FIRE_ELEGY: boolean }>
): void {
  const { stats } = player;
  const P = { ...PLAYER_CONSTANTS, ...constants };
  
  // Update timers
  if (player.invincibilityFrames > 0) {
    player.invincibilityFrames -= deltaTime;
  }
  if (player.dashCooldown > 0) {
    player.dashCooldown -= deltaTime;
  }
  if (player.attackCooldown > 0) {
    player.attackCooldown -= deltaTime;
  }
  
  // Track if was grounded last frame for coyote time
  const wasGrounded = player.isGrounded;
  
  // Check ground and wall contact
  player.isGrounded = checkGrounded(player.position, player.hitbox, room.platforms);
  
  const touchingLeftWall = checkWallContact(player.position, player.hitbox, room.platforms, 'left');
  const touchingRightWall = checkWallContact(player.position, player.hitbox, room.platforms, 'right');
  
  player.isOnWall = (touchingLeftWall || touchingRightWall) && !player.isGrounded;
  player.wallDirection = touchingLeftWall ? 'left' : touchingRightWall ? 'right' : null;
  
  // Coyote time
  if (wasGrounded && !player.isGrounded && player.velocity.y >= 0) {
    coyoteTimer = COYOTE_TIME;
  } else if (player.isGrounded) {
    coyoteTimer = 0;
  } else {
    coyoteTimer = Math.max(0, coyoteTimer - deltaTime);
  }
  
  // Reset double jump when grounded or wall sliding
  if (player.isGrounded || player.isOnWall) {
    player.canDoubleJump = true;
  }
  
  // Jump buffer
  if (input.jumpPressed) {
    jumpBufferTimer = JUMP_BUFFER_TIME;
  } else {
    jumpBufferTimer = Math.max(0, jumpBufferTimer - deltaTime);
  }
  
  // Handle different states
  switch (player.state) {
    case 'damaged':
      // Knockback state - limited control
      applyPhysics(player, deltaTime);
      resolveCollisions(player.position, player.velocity, player.hitbox, room.platforms);
      
      // Recover after a short time
      if (player.invincibilityFrames < P.INVINCIBILITY_DURATION - 0.3) {
        player.state = player.isGrounded ? 'idle' : 'falling';
      }
      break;
      
    case 'dashing':
      // Dash movement - no gravity
      player.position.x += player.velocity.x * deltaTime;
      resolveCollisions(player.position, player.velocity, player.hitbox, room.platforms);
      
      if (player.dashCooldown <= P.DASH_COOLDOWN - P.DASH_DURATION) {
        player.state = player.isGrounded ? 'idle' : 'falling';
        player.velocity.x = 0;
      }
      break;
      
    case 'healing':
      // Healing - must stay still
      player.velocity.x = 0;
      applyPhysics(player, deltaTime);
      resolveCollisions(player.position, player.velocity, player.hitbox, room.platforms);
      
      if (input.focus && player.isGrounded && stats.currentSoul >= P.SOUL_FOR_HEAL) {
        player.healTimer += deltaTime;
        
        // Create healing particles
        if (Math.random() < deltaTime * 10) {
          createParticles([{
            position: { 
              x: player.position.x + player.hitbox.width / 2 + (Math.random() - 0.5) * 40,
              y: player.position.y + player.hitbox.height + 10
            },
            velocity: { x: (Math.random() - 0.5) * 50, y: -100 - Math.random() * 50 },
            color: '#ffffff',
            size: 4 + Math.random() * 4,
            lifetime: 0.8,
            maxLifetime: 0.8,
            type: 'heal',
          }]);
        }
        
        if (player.healTimer >= P.HEAL_TIME) {
          stats.currentHealth = Math.min(stats.maxHealth, stats.currentHealth + P.HEAL_AMOUNT);
          stats.currentSoul -= P.SOUL_FOR_HEAL;
          player.healTimer = 0;
          player.state = 'idle';
        }
      } else {
        player.healTimer = 0;
        player.state = player.isGrounded ? 'idle' : 'falling';
      }
      break;
      
    case 'attacking':
      // Can still move while attacking
      handleMovement(player, input, deltaTime);
      applyPhysics(player, deltaTime);
      resolveCollisions(player.position, player.velocity, player.hitbox, room.platforms);
      
      if (player.attackCooldown <= P.ATTACK_COOLDOWN - P.ATTACK_DURATION) {
        player.state = player.isGrounded ? 'idle' : 'falling';
        player.currentAttackDirection = null;
      }
      break;
      
    case 'wall_sliding':
      // Wall slide
      player.velocity.y = Math.min(player.velocity.y + PLAYER_CONSTANTS.WALL_SLIDE_SPEED * deltaTime * 0.5, P.WALL_SLIDE_SPEED);
      
      // Wall jump
      if (jumpBufferTimer > 0 && stats.hasWallJump) {
        const wallJumpDir = player.wallDirection === 'left' ? 1 : -1;
        player.velocity.x = P.WALL_JUMP_FORCE_X * wallJumpDir;
        player.velocity.y = -P.WALL_JUMP_FORCE_Y;
        player.facing = wallJumpDir === 1 ? 'right' : 'left';
        player.state = 'jumping';
        jumpBufferTimer = 0;
        jumpHoldTimer = P.JUMP_HOLD_TIME;
      }
      // Dash off wall
      else if (input.dashPressed && stats.hasDash && player.dashCooldown <= 0) {
        startDash(player, input);
      }
      // Let go of wall
      else if (!player.isOnWall || player.isGrounded) {
        player.state = player.isGrounded ? 'idle' : 'falling';
      }
      
      applyPhysics(player, deltaTime, false);
      player.position.y += player.velocity.y * deltaTime;
      resolveCollisions(player.position, player.velocity, player.hitbox, room.platforms);
      break;
      
    default:
      // Normal movement states
      handleMovement(player, input, deltaTime);

      // If we enter a special state (attack/dash/heal/wall-slide) during this branch,
      // we must not overwrite it with the locomotion state calculation later.
      let lockLocomotionState = false;
      
      // Jumping
      const canJump = player.isGrounded || coyoteTimer > 0;
      if (jumpBufferTimer > 0 && canJump) {
        player.velocity.y = -P.JUMP_FORCE;
        player.state = 'jumping';
        jumpBufferTimer = 0;
        coyoteTimer = 0;
        jumpHoldTimer = P.JUMP_HOLD_TIME;
        
        // Jump dust particles
        createParticles([{
          position: { x: player.position.x + player.hitbox.width / 2, y: player.position.y + player.hitbox.height },
          velocity: { x: -30, y: 0 },
          color: '#888888',
          size: 8,
          lifetime: 0.3,
          maxLifetime: 0.3,
          type: 'dust',
        }, {
          position: { x: player.position.x + player.hitbox.width / 2, y: player.position.y + player.hitbox.height },
          velocity: { x: 30, y: 0 },
          color: '#888888',
          size: 8,
          lifetime: 0.3,
          maxLifetime: 0.3,
          type: 'dust',
        }]);
      }
      // Variable jump height
      else if (input.jump && jumpHoldTimer > 0 && player.velocity.y < 0) {
        player.velocity.y -= P.JUMP_HOLD_FORCE * deltaTime;
        jumpHoldTimer -= deltaTime;
      }
      // Double jump
      else if (input.jumpPressed && !player.isGrounded && player.canDoubleJump && stats.hasDoubleJump) {
        player.velocity.y = -P.DOUBLE_JUMP_FORCE;
        player.canDoubleJump = false;
        player.state = 'jumping';
        jumpHoldTimer = 0;
        
        // Double jump effect
        createParticles([{
          position: { x: player.position.x + player.hitbox.width / 2, y: player.position.y + player.hitbox.height / 2 },
          velocity: { x: 0, y: 0 },
          color: '#ffffff',
          size: 20,
          lifetime: 0.2,
          maxLifetime: 0.2,
          type: 'soul',
        }]);
      }
      // Cut jump short when releasing
      else if (!input.jump && player.velocity.y < 0) {
        jumpHoldTimer = 0;
        player.velocity.y *= 0.5;
      }
      
      // Dashing
      if (input.dashPressed && stats.hasDash && player.dashCooldown <= 0) {
        startDash(player, input);
        lockLocomotionState = true;
      }
      
      // Attacking
      if (input.attackPressed) {
        console.log('[Player] attackPressed=true, attackCooldown=', player.attackCooldown, 'state=', player.state);
        if (player.attackCooldown <= 0) {
          console.log('[Player] Starting attack!');
          startAttack(player, input);
          lockLocomotionState = true;
        } else {
          console.log('[Player] Attack blocked by cooldown');
        }
      }
      
      // Healing / Casting
      if (input.focus && player.isGrounded && stats.currentSoul >= P.SOUL_FOR_HEAL) {
        if (!input.up && !input.down && !input.left && !input.right) {
          player.state = 'healing';
          player.healTimer = 0;
          lockLocomotionState = true;
        }
      }
      
      // Spell casting
      if (input.castPressed && stats.currentSoul >= P.SOUL_FOR_SPELL) {
        if (input.up) {
          // Howling Wraiths / Abyss Shriek (not implemented - would need more work)
        } else if (input.down && !player.isGrounded) {
          // Desolate Dive / Descending Dark (not implemented)
        } else {
          // Vengeful Spirit
          castVengefulSpirit(player, createProjectile);
        }
      }
      
      // Wall slide detection
      if (player.isOnWall && !player.isGrounded && player.velocity.y > 0) {
        const holdingTowardWall = 
          (player.wallDirection === 'left' && input.left) ||
          (player.wallDirection === 'right' && input.right);
        
        if (holdingTowardWall && stats.hasWallJump) {
          player.state = 'wall_sliding';
          player.facing = player.wallDirection === 'left' ? 'right' : 'left';
          lockLocomotionState = true;
        }
      }
      
      // Apply physics
      applyPhysics(player, deltaTime);
      const collision = resolveCollisions(player.position, player.velocity, player.hitbox, room.platforms);

      // Preserve any special state entered above.
      if (lockLocomotionState) break;
      
      // Update state based on movement
      if (player.isGrounded) {
        if (Math.abs(player.velocity.x) > 10) {
          player.state = 'walking';
        } else {
          player.state = 'idle';
        }
      } else if (player.velocity.y < 0) {
        player.state = 'jumping';
      } else {
        player.state = 'falling';
      }
      break;
  }
  
  // Check hazards
  const hazard = checkHazardCollision(player.position, player.hitbox, room.hazards);
  if (hazard && player.invincibilityFrames <= 0) {
    damagePlayer(player, hazard.damage, { x: 0, y: -1 });
  }
  
  // Keep player in bounds
  if (player.position.x < 0) {
    player.position.x = 0;
    player.velocity.x = 0;
  }
  if (player.position.x + player.hitbox.width > room.width) {
    player.position.x = room.width - player.hitbox.width;
    player.velocity.x = 0;
  }
}

function handleMovement(player: Player, input: InputState, deltaTime: number): void {
  const P = PLAYER_CONSTANTS;
  
  if (input.left && !input.right) {
    player.velocity.x = -P.WALK_SPEED;
    player.facing = 'left';
  } else if (input.right && !input.left) {
    player.velocity.x = P.WALK_SPEED;
    player.facing = 'right';
  } else {
    // Deceleration
    player.velocity.x *= 0.7;
    if (Math.abs(player.velocity.x) < 10) {
      player.velocity.x = 0;
    }
  }
}

function startDash(player: Player, input: InputState): void {
  const P = PLAYER_CONSTANTS;
  
  player.state = 'dashing';
  player.dashCooldown = P.DASH_COOLDOWN;
  player.velocity.y = 0;
  
  // Dash direction
  const dashDir = player.facing === 'right' ? 1 : -1;
  player.velocity.x = P.DASH_SPEED * dashDir;
}

function startAttack(player: Player, input: InputState): void {
  const P = PLAYER_CONSTANTS;
  
  player.state = 'attacking';
  player.attackCooldown = P.ATTACK_COOLDOWN;
  
  // Determine attack direction
  let direction: AttackDirection;
  if (input.up) {
    direction = 'up';
  } else if (input.down && !player.isGrounded) {
    direction = 'down';
  } else {
    direction = player.facing;
  }
  
  player.currentAttackDirection = direction;
}

function castVengefulSpirit(
  player: Player,
  createProjectile: (proj: Omit<Projectile, 'id'>) => void
): void {
  const P = PLAYER_CONSTANTS;
  
  player.stats.currentSoul -= P.SOUL_FOR_SPELL;
  
  const direction = player.facing === 'right' ? 1 : -1;
  const spawnX = player.position.x + player.hitbox.width / 2 + direction * 30;
  const spawnY = player.position.y + player.hitbox.height / 2 - 10;
  
  createProjectile({
    type: 'vengeful_spirit',
    position: { x: spawnX, y: spawnY },
    velocity: { x: 600 * direction, y: 0 },
    hitbox: { x: 0, y: 0, width: 60, height: 30 },
    damage: player.stats.nailDamage * 3,
    lifetime: 1.5,
    fromPlayer: true,
  });
}

import { CharmEffects } from './charms';

export function damagePlayer(
  player: Player,
  damage: number,
  knockbackDir: { x: number; y: number },
  charmEffects?: CharmEffects,
  createParticles?: (particles: Omit<Particle, 'id'>[]) => void
): void {
  if (player.invincibilityFrames > 0 || player.state === 'dead') return;
  
  player.stats.currentHealth -= damage;
  
  const invincibilityMultiplier = charmEffects?.invincibilityMultiplier || 1;
  player.invincibilityFrames = PLAYER_CONSTANTS.INVINCIBILITY_DURATION * invincibilityMultiplier;
  player.state = 'damaged';
  
  // Apply knockback (reduced by Steady Body charm)
  const knockbackReduction = charmEffects?.knockbackReduction || 0;
  const knockbackForce = PLAYER_CONSTANTS.KNOCKBACK_FORCE * (1 - knockbackReduction);
  player.velocity.x = knockbackDir.x * knockbackForce;
  player.velocity.y = knockbackDir.y * knockbackForce - 200;
  
  // Grubsong: Gain soul when taking damage
  if (charmEffects?.hasGrubsong) {
    addSoul(player, 15);
  }
  
  // Thorns of Agony: Create damaging thorns (visual only here, damage handled in Game.ts)
  if (charmEffects?.hasThornsOfAgony && createParticles) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      createParticles([{
        position: { 
          x: player.position.x + player.hitbox.width / 2,
          y: player.position.y + player.hitbox.height / 2
        },
        velocity: { 
          x: Math.cos(angle) * 300,
          y: Math.sin(angle) * 300
        },
        color: '#4a4a5a',
        size: 8,
        lifetime: 0.3,
        maxLifetime: 0.3,
        type: 'spark',
      }]);
    }
  }
  
  // Cancel healing
  player.healTimer = 0;
  
  if (player.stats.currentHealth <= 0) {
    player.state = 'dead';
  }
}

export function pogoPlayer(player: Player): void {
  player.velocity.y = -PLAYER_CONSTANTS.POGO_FORCE;
  player.canDoubleJump = true;
}

export function addSoul(player: Player, amount: number): void {
  player.stats.currentSoul = Math.min(player.stats.maxSoul, player.stats.currentSoul + amount);
}

export function addGeo(player: Player, amount: number): void {
  player.stats.geo += amount;
}
