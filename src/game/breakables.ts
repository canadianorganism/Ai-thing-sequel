import { Interactable, Particle, Vector2 } from './types';

export interface BreakableWall {
  id: string;
  position: Vector2;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  broken: boolean;
  containsGeo: number;
  crackLevel: number; // 0-3 based on damage
}

export interface GeoPickup {
  id: string;
  position: Vector2;
  velocity: Vector2;
  value: number;
  lifetime: number;
  collected: boolean;
}

// Create a breakable wall
export function createBreakableWall(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  geoReward: number = 10
): BreakableWall {
  return {
    id,
    position: { x, y },
    width,
    height,
    health: 3,
    maxHealth: 3,
    broken: false,
    containsGeo: geoReward,
    crackLevel: 0,
  };
}

// Damage a breakable wall
export function damageBreakableWall(
  wall: BreakableWall,
  damage: number,
  createParticles: (particles: Omit<Particle, 'id'>[]) => void
): { broken: boolean; geoDropped: GeoPickup[] } {
  if (wall.broken) return { broken: false, geoDropped: [] };
  
  wall.health -= damage;
  wall.crackLevel = Math.min(3, Math.floor((1 - wall.health / wall.maxHealth) * 4));
  
  // Create crack particles
  const particles: Omit<Particle, 'id'>[] = [];
  for (let i = 0; i < 5; i++) {
    particles.push({
      position: {
        x: wall.position.x + Math.random() * wall.width,
        y: wall.position.y + Math.random() * wall.height,
      },
      velocity: {
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
      },
      color: '#5a5a6a',
      size: 3 + Math.random() * 4,
      lifetime: 0.3,
      maxLifetime: 0.3,
      type: 'dust',
    });
  }
  createParticles(particles);
  
  if (wall.health <= 0) {
    wall.broken = true;
    
    // Create explosion of debris particles
    const debrisParticles: Omit<Particle, 'id'>[] = [];
    for (let i = 0; i < 15; i++) {
      debrisParticles.push({
        position: {
          x: wall.position.x + wall.width / 2,
          y: wall.position.y + wall.height / 2,
        },
        velocity: {
          x: (Math.random() - 0.5) * 300,
          y: (Math.random() - 0.5) * 300 - 100,
        },
        color: i % 2 === 0 ? '#4a4a5a' : '#3a3a4a',
        size: 6 + Math.random() * 8,
        lifetime: 0.6,
        maxLifetime: 0.6,
        type: 'death',
      });
    }
    createParticles(debrisParticles);
    
    // Drop geo pickups
    const geoDropped: GeoPickup[] = [];
    const numGeo = Math.ceil(wall.containsGeo / 5);
    const geoValue = Math.floor(wall.containsGeo / numGeo);
    
    for (let i = 0; i < numGeo; i++) {
      geoDropped.push({
        id: `geo_${wall.id}_${i}`,
        position: {
          x: wall.position.x + wall.width / 2 + (Math.random() - 0.5) * 20,
          y: wall.position.y + wall.height / 2,
        },
        velocity: {
          x: (Math.random() - 0.5) * 150,
          y: -200 - Math.random() * 100,
        },
        value: geoValue,
        lifetime: 10,
        collected: false,
      });
    }
    
    return { broken: true, geoDropped };
  }
  
  return { broken: false, geoDropped: [] };
}

// Update geo pickups (physics, collection)
export function updateGeoPickups(
  geoPickups: GeoPickup[],
  playerPosition: Vector2,
  playerHitbox: { width: number; height: number },
  deltaTime: number,
  onCollect: (value: number) => void
): void {
  for (let i = geoPickups.length - 1; i >= 0; i--) {
    const geo = geoPickups[i];
    if (geo.collected) {
      geoPickups.splice(i, 1);
      continue;
    }
    
    // Apply gravity
    geo.velocity.y += 600 * deltaTime;
    geo.velocity.y = Math.min(geo.velocity.y, 400);
    
    // Apply friction
    geo.velocity.x *= 0.98;
    
    // Update position
    geo.position.x += geo.velocity.x * deltaTime;
    geo.position.y += geo.velocity.y * deltaTime;
    
    // Ground collision (simplified)
    if (geo.velocity.y > 0) {
      geo.velocity.y *= -0.5;
      if (Math.abs(geo.velocity.y) < 20) {
        geo.velocity.y = 0;
      }
    }
    
    // Lifetime
    geo.lifetime -= deltaTime;
    if (geo.lifetime <= 0) {
      geoPickups.splice(i, 1);
      continue;
    }
    
    // Collection check - magnetic pull when close
    const dx = (playerPosition.x + playerHitbox.width / 2) - geo.position.x;
    const dy = (playerPosition.y + playerHitbox.height / 2) - geo.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 60) {
      // Magnetic pull
      const pullSpeed = 400;
      geo.position.x += (dx / dist) * pullSpeed * deltaTime;
      geo.position.y += (dy / dist) * pullSpeed * deltaTime;
    }
    
    if (dist < 20) {
      geo.collected = true;
      onCollect(geo.value);
    }
  }
}

// Check if attack hits breakable wall
export function checkBreakableWallHit(
  wall: BreakableWall,
  attackHitbox: { x: number; y: number; width: number; height: number }
): boolean {
  if (wall.broken) return false;
  
  return (
    attackHitbox.x < wall.position.x + wall.width &&
    attackHitbox.x + attackHitbox.width > wall.position.x &&
    attackHitbox.y < wall.position.y + wall.height &&
    attackHitbox.y + attackHitbox.height > wall.position.y
  );
}
