import { 
  Vector2, 
  Rectangle, 
  Platform, 
  Hazard,
  GRAVITY,
  MAX_FALL_SPEED,
  Room,
  Player,
  Enemy,
  PLAYER_CONSTANTS,
} from './types';

// Check if two rectangles overlap
export function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Get the actual hitbox position based on entity position
export function getWorldHitbox(position: Vector2, hitbox: Rectangle): Rectangle {
  return {
    x: position.x + (hitbox.x || 0),
    y: position.y + (hitbox.y || 0),
    width: hitbox.width,
    height: hitbox.height,
  };
}

// Check collision with all platforms in room
export function checkPlatformCollision(
  position: Vector2,
  hitbox: Rectangle,
  platforms: Platform[]
): { collided: boolean; platform?: Platform; normal?: Vector2 } {
  const worldHitbox = getWorldHitbox(position, hitbox);
  
  for (const platform of platforms) {
    if (rectanglesOverlap(worldHitbox, platform)) {
      // Calculate collision normal (which side we hit)
      const overlapLeft = (worldHitbox.x + worldHitbox.width) - platform.x;
      const overlapRight = (platform.x + platform.width) - worldHitbox.x;
      const overlapTop = (worldHitbox.y + worldHitbox.height) - platform.y;
      const overlapBottom = (platform.y + platform.height) - worldHitbox.y;
      
      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);
      
      let normal: Vector2;
      if (minOverlapX < minOverlapY) {
        normal = { x: overlapLeft < overlapRight ? -1 : 1, y: 0 };
      } else {
        normal = { x: 0, y: overlapTop < overlapBottom ? -1 : 1 };
      }
      
      return { collided: true, platform, normal };
    }
  }
  
  return { collided: false };
}

// Check if standing on ground
export function checkGrounded(
  position: Vector2,
  hitbox: Rectangle,
  platforms: Platform[]
): boolean {
  // Check slightly below feet
  const feetCheck: Rectangle = {
    x: position.x + hitbox.x + 2,
    y: position.y + hitbox.y + hitbox.height,
    width: hitbox.width - 4,
    height: 4,
  };
  
  for (const platform of platforms) {
    if (rectanglesOverlap(feetCheck, platform)) {
      return true;
    }
  }
  
  return false;
}

// Check if touching wall
export function checkWallContact(
  position: Vector2,
  hitbox: Rectangle,
  platforms: Platform[],
  direction: 'left' | 'right'
): boolean {
  const wallCheck: Rectangle = {
    x: direction === 'left' 
      ? position.x + hitbox.x - 4 
      : position.x + hitbox.x + hitbox.width,
    y: position.y + hitbox.y + 8,
    width: 4,
    height: hitbox.height - 16,
  };
  
  for (const platform of platforms) {
    if (platform.type === 'solid' && rectanglesOverlap(wallCheck, platform)) {
      return true;
    }
  }
  
  return false;
}

// Apply gravity and movement
export function applyPhysics(
  entity: { position: Vector2; velocity: Vector2 },
  deltaTime: number,
  applyGravity: boolean = true
): void {
  // Apply gravity
  if (applyGravity) {
    entity.velocity.y += GRAVITY * deltaTime;
    entity.velocity.y = Math.min(entity.velocity.y, MAX_FALL_SPEED);
  }
  
  // Apply velocity to position
  entity.position.x += entity.velocity.x * deltaTime;
  entity.position.y += entity.velocity.y * deltaTime;
}

// Resolve collision with platforms
export function resolveCollisions(
  position: Vector2,
  velocity: Vector2,
  hitbox: Rectangle,
  platforms: Platform[]
): { grounded: boolean; hitCeiling: boolean; hitWall: boolean } {
  const result = { grounded: false, hitCeiling: false, hitWall: false };
  const worldHitbox = getWorldHitbox(position, hitbox);
  
  for (const platform of platforms) {
    if (!rectanglesOverlap(worldHitbox, platform)) continue;
    
    // For one-way platforms, only collide from above
    if (platform.type === 'one_way') {
      const feetY = worldHitbox.y + worldHitbox.height;
      const platformTop = platform.y;
      
      if (velocity.y > 0 && feetY - velocity.y * 0.016 <= platformTop + 4) {
        position.y = platform.y - hitbox.y - hitbox.height;
        velocity.y = 0;
        result.grounded = true;
      }
      continue;
    }
    
    // Solid platform - resolve all sides
    const overlapLeft = (worldHitbox.x + worldHitbox.width) - platform.x;
    const overlapRight = (platform.x + platform.width) - worldHitbox.x;
    const overlapTop = (worldHitbox.y + worldHitbox.height) - platform.y;
    const overlapBottom = (platform.y + platform.height) - worldHitbox.y;
    
    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);
    
    if (minOverlapX < minOverlapY) {
      // Horizontal collision
      if (overlapLeft < overlapRight) {
        position.x = platform.x - hitbox.x - hitbox.width;
      } else {
        position.x = platform.x + platform.width - hitbox.x;
      }
      velocity.x = 0;
      result.hitWall = true;
    } else {
      // Vertical collision
      if (overlapTop < overlapBottom) {
        position.y = platform.y - hitbox.y - hitbox.height;
        velocity.y = 0;
        result.grounded = true;
      } else {
        position.y = platform.y + platform.height - hitbox.y;
        velocity.y = 0;
        result.hitCeiling = true;
      }
    }
  }
  
  return result;
}

// Check hazard collision
export function checkHazardCollision(
  position: Vector2,
  hitbox: Rectangle,
  hazards: Hazard[]
): Hazard | null {
  const worldHitbox = getWorldHitbox(position, hitbox);
  
  for (const hazard of hazards) {
    if (rectanglesOverlap(worldHitbox, hazard)) {
      return hazard;
    }
  }
  
  return null;
}

// Get attack hitbox based on direction
export function getAttackHitbox(
  position: Vector2,
  hitbox: Rectangle,
  direction: 'left' | 'right' | 'up' | 'down',
  range: number = PLAYER_CONSTANTS.ATTACK_RANGE
): Rectangle {
  const width = direction === 'up' || direction === 'down' ? hitbox.width + 16 : range;
  const height = direction === 'up' || direction === 'down' ? range : hitbox.height - 8;
  
  let x = position.x + hitbox.x;
  let y = position.y + hitbox.y;
  
  switch (direction) {
    case 'left':
      x -= range;
      y += 8;
      break;
    case 'right':
      x += hitbox.width;
      y += 8;
      break;
    case 'up':
      x -= 8;
      y -= range;
      break;
    case 'down':
      x -= 8;
      y += hitbox.height;
      break;
  }
  
  return { x, y, width, height };
}

// Distance between two points
export function distance(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Normalize a vector
export function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

// Direction from one point to another
export function directionTo(from: Vector2, to: Vector2): Vector2 {
  return normalize({ x: to.x - from.x, y: to.y - from.y });
}
