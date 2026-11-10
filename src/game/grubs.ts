// Grub container system - breakable jars containing trapped grubs
import { Vector2, Particle, TILE_SIZE } from './types';

const T = TILE_SIZE;

export interface GrubContainer {
  id: string;
  roomId: string;
  position: Vector2;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  broken: boolean;
  collected: boolean;
  crackLevel: number;
}

export function createGrubContainer(id: string, roomId: string, x: number, y: number): GrubContainer {
  return {
    id,
    roomId,
    position: { x, y },
    width: T * 1.5,
    height: T * 2,
    health: 3,
    maxHealth: 3,
    broken: false,
    collected: false,
    crackLevel: 0,
  };
}

// All 10 grub placements across the Forgotten Crossroads
export function createAllGrubs(): GrubContainer[] {
  return [
    // Room 1 - Entry Hall (2 grubs)
    createGrubContainer('grub_1', 'crossroads_1', T * 9, T * 25 - T * 8 - T * 2),    // On platform at T*8, height-T*7
    createGrubContainer('grub_2', 'crossroads_1', T * 51, T * 25 - T * 7 - T * 2),   // On platform at T*50, height-T*6

    // Room 2 - Hub (3 grubs)
    createGrubContainer('grub_3', 'crossroads_2', T * 6, T * 40 - T * 8 - T * 2),    // Left side platform at T*4, height-T*7
    createGrubContainer('grub_4', 'crossroads_2', T * 36, T * 40 - T * 12 - T * 2),  // Right side platform at T*35, height-T*11
    createGrubContainer('grub_5', 'crossroads_2', T * 12, T * 40 - T * 33 - T * 2),  // High left platform at T*10, height-T*32

    // Room 3 - Gruzzer Nest (2 grubs)
    createGrubContainer('grub_6', 'crossroads_3', T * 19, T * 22 - T * 11 - T * 2),  // On platform at T*18, height-T*10
    createGrubContainer('grub_7', 'crossroads_3', T * 13, T * 22 - T * 15 - T * 2),  // On one-way ledge at T*12, height-T*14

    // Room 4 - Upper Passage (2 grubs)
    createGrubContainer('grub_8', 'crossroads_upper', T * 9, T * 30 - T * 16 - T * 2),   // On platform at T*8, height-T*15
    createGrubContainer('grub_9', 'crossroads_upper', T * 24, T * 30 - T * 24 - T * 2),  // High central platform at T*22, height-T*23

    // Boss Room (1 grub - reward for beating boss area)
    createGrubContainer('grub_10', 'crossroads_boss', T * 14, T * 25 - T * 15 - T * 2),  // On observation platform at T*12, height-T*14
  ];
}

export function damageGrubContainer(
  grub: GrubContainer,
  damage: number,
  createParticles: (particles: Omit<Particle, 'id'>[]) => void
): boolean {
  if (grub.broken) return false;

  grub.health -= damage;
  grub.crackLevel = Math.min(3, Math.floor((1 - grub.health / grub.maxHealth) * 4));

  // Crack particles
  const particles: Omit<Particle, 'id'>[] = [];
  for (let i = 0; i < 5; i++) {
    particles.push({
      position: {
        x: grub.position.x + Math.random() * grub.width,
        y: grub.position.y + Math.random() * grub.height,
      },
      velocity: {
        x: (Math.random() - 0.5) * 120,
        y: (Math.random() - 0.5) * 80,
      },
      color: '#7a9a5a',
      size: 3 + Math.random() * 3,
      lifetime: 0.3,
      maxLifetime: 0.3,
      type: 'dust',
    });
  }
  createParticles(particles);

  if (grub.health <= 0) {
    grub.broken = true;
    grub.collected = true;

    // Burst of green/white particles for grub release
    const burstParticles: Omit<Particle, 'id'>[] = [];
    for (let i = 0; i < 20; i++) {
      burstParticles.push({
        position: {
          x: grub.position.x + grub.width / 2,
          y: grub.position.y + grub.height / 2,
        },
        velocity: {
          x: (Math.random() - 0.5) * 250,
          y: -100 - Math.random() * 200,
        },
        color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#88cc66' : '#aaee88',
        size: 4 + Math.random() * 6,
        lifetime: 0.8,
        maxLifetime: 0.8,
        type: 'heal',
      });
    }
    createParticles(burstParticles);

    return true;
  }
  return false;
}

export function checkGrubHit(
  grub: GrubContainer,
  attackHitbox: { x: number; y: number; width: number; height: number }
): boolean {
  if (grub.broken) return false;
  return (
    attackHitbox.x < grub.position.x + grub.width &&
    attackHitbox.x + attackHitbox.width > grub.position.x &&
    attackHitbox.y < grub.position.y + grub.height &&
    attackHitbox.y + attackHitbox.height > grub.position.y
  );
}
