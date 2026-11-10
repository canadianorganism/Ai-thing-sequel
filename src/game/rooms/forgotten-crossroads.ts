import { Room, Platform, Hazard, Interactable, Enemy, TILE_SIZE } from '../types';
import { createEnemy } from '../enemies';
import { createDirtmouth } from './dirtmouth';

const T = TILE_SIZE;

// Helper to create cave-like irregular platforms
function createCavePlatform(x: number, y: number, width: number, height: number, type: 'solid' | 'one_way' = 'solid'): Platform {
  return { x, y, width, height, type };
}

// Room 1: Entry Hall - Large horizontal cave with stalactites
export function createRoom1(): Room {
  const width = T * 60;
  const height = T * 25;
  
  return {
    id: 'crossroads_1',
    name: 'Forgotten Crossroads - Entry',
    width,
    height,
    backgroundColor: '#0f1219',
    spawnPoint: { x: T * 4, y: height - T * 5 },
    platforms: [
      // Main ground - uneven cave floor
      createCavePlatform(0, height - T * 2, T * 15, T * 2),
      createCavePlatform(T * 15, height - T * 3, T * 5, T * 3), // raised section
      createCavePlatform(T * 20, height - T * 2, T * 12, T * 2),
      createCavePlatform(T * 32, height - T * 2, T * 3, T * 2), // Floor under spikes
      createCavePlatform(T * 35, height - T * 2, T * 23, T * 2),
      
      // Left wall
      createCavePlatform(0, 0, T * 2, height - T * 8),
      // Right wall
      createCavePlatform(width - T * 2, 0, T * 2, height - T * 10),
      
      // Ceiling with stalactites
      createCavePlatform(0, 0, width, T * 2),
      createCavePlatform(T * 10, T * 2, T * 3, T * 4),
      createCavePlatform(T * 25, T * 2, T * 2, T * 3),
      createCavePlatform(T * 40, T * 2, T * 4, T * 5),
      
      // Natural rock formations / platforms
      createCavePlatform(T * 8, height - T * 7, T * 5, T),
      createCavePlatform(T * 16, height - T * 10, T * 4, T),
      createCavePlatform(T * 24, height - T * 8, T * 6, T),
      createCavePlatform(T * 34, height - T * 6, T * 4, T),
      createCavePlatform(T * 42, height - T * 9, T * 5, T),
      createCavePlatform(T * 50, height - T * 6, T * 4, T),
      
      // One-way mossy ledges
      createCavePlatform(T * 12, height - T * 13, T * 4, T / 2, 'one_way'),
      createCavePlatform(T * 30, height - T * 12, T * 5, T / 2, 'one_way'),
      createCavePlatform(T * 46, height - T * 14, T * 4, T / 2, 'one_way'),
      
      // Rock pillars
      createCavePlatform(T * 28, height - T * 6, T * 2, T * 4),
      createCavePlatform(T * 45, height - T * 5, T * 2, T * 3),
    ],
    hazards: [
      { x: T * 32, y: height - T * 2.5, width: T * 3, height: T / 2, type: 'spike', damage: 1 },
    ],
    enemies: [
      createEnemy('crawlid', T * 10, height - T * 3),
      createEnemy('crawlid', T * 22, height - T * 3),
      createEnemy('crawlid', T * 38, height - T * 3),
      createEnemy('vengefly', T * 18, height - T * 14),
      createEnemy('vengefly', T * 35, height - T * 16),
      createEnemy('tiktik', T * 45, height - T * 3),
      createEnemy('gruzzer', T * 28, height - T * 12),
    ],
    interactables: [
      {
        type: 'bench',
        id: 'bench_entry',
        x: T * 5,
        y: height - T * 4,
        width: T * 2,
        height: T * 2,
      },
    ],
    transitions: [
      {
        from: { x: width - T * 3, y: height - T * 8, width: T * 3, height: T * 6 },
        toRoom: 'crossroads_2',
        toPosition: { x: T * 5, y: T * 35 },
        direction: 'right',
      },
      {
        from: { x: 0, y: height - T * 8, width: T * 3, height: T * 6 },
        toRoom: 'dirtmouth',
        toPosition: { x: T * 25, y: T * 8 },
        direction: 'left',
      },
    ],
  };
}

// Room 2: The Crossroads Hub - Large vertical chamber
export function createRoom2(): Room {
  const width = T * 45;
  const height = T * 40;
  
  return {
    id: 'crossroads_2',
    name: 'Forgotten Crossroads - Hub',
    width,
    height,
    backgroundColor: '#0f1219',
    spawnPoint: { x: T * 6, y: height - T * 5 },
    platforms: [
      // Bottom floor with gaps for side transitions
      createCavePlatform(T * 5, height - T * 2, T * 13, T * 2), // Left section
      createCavePlatform(T * 22, height - T * 2, T * 18, T * 2), // Right section
      
      // Left wall - with opening at bottom for transition
      createCavePlatform(0, 0, T * 2, height - T * 10),
      
      // Right wall - with opening at bottom for transition
      createCavePlatform(width - T * 2, 0, T * 2, height - T * 10),
      
      // Ceiling with opening for upper transition
      createCavePlatform(0, 0, T * 16, T * 2),
      createCavePlatform(T * 30, 0, T * 15, T * 2),
      
      // Central pillar structure
      createCavePlatform(T * 18, height - T * 15, T * 8, T * 13),
      
      // Left side ascending platforms
      createCavePlatform(T * 4, height - T * 7, T * 6, T),
      createCavePlatform(T * 8, height - T * 12, T * 5, T),
      createCavePlatform(T * 3, height - T * 17, T * 6, T),
      createCavePlatform(T * 10, height - T * 22, T * 5, T),
      createCavePlatform(T * 4, height - T * 27, T * 6, T),
      createCavePlatform(T * 10, height - T * 32, T * 6, T),
      
      // Right side platforms
      createCavePlatform(T * 30, height - T * 6, T * 6, T),
      createCavePlatform(T * 35, height - T * 11, T * 5, T),
      createCavePlatform(T * 28, height - T * 16, T * 7, T),
      createCavePlatform(T * 34, height - T * 21, T * 6, T),
      createCavePlatform(T * 28, height - T * 26, T * 8, T),
      createCavePlatform(T * 35, height - T * 31, T * 6, T),
      
      // Upper passage platforms
      createCavePlatform(T * 18, height - T * 35, T * 10, T),
      
      // One-way ledges
      createCavePlatform(T * 14, height - T * 10, T * 3, T / 2, 'one_way'),
      createCavePlatform(T * 25, height - T * 20, T * 3, T / 2, 'one_way'),
      // Floor under acid pool
      createCavePlatform(T * 18, height - T * 2, T * 4, T * 2),
    ],
    hazards: [
      // Acid pool in gap
      { x: T * 18, y: height - T * 2.5, width: T * 4, height: T, type: 'acid', damage: 2 },
    ],
    enemies: [
      createEnemy('crawlid', T * 10, height - T * 3),
      createEnemy('crawlid', T * 30, height - T * 3),
      createEnemy('vengefly', T * 12, height - T * 18),
      createEnemy('vengefly', T * 32, height - T * 24),
      createEnemy('gruzzer', T * 20, height - T * 28),
      createEnemy('tiktik', T * 38, height - T * 7),
      createEnemy('leaping_husk', T * 35, height - T * 4),
    ],
    interactables: [],
    transitions: [
      {
        from: { x: 0, y: height - T * 10, width: T * 5, height: T * 8 },
        toRoom: 'crossroads_1',
        toPosition: { x: T * 55, y: T * 18 },
        direction: 'left',
      },
      {
        from: { x: width - T * 5, y: height - T * 10, width: T * 5, height: T * 8 },
        toRoom: 'crossroads_3',
        toPosition: { x: T * 5, y: T * 16 },
        direction: 'right',
      },
      {
        from: { x: T * 16, y: 0, width: T * 14, height: T * 3 },
        toRoom: 'crossroads_upper',
        toPosition: { x: T * 18, y: T * 28 - 56 },
        direction: 'up',
      },
    ],
  };
}

// Room 3: Gruzzer Nest - Horizontal cave with flying enemies
export function createRoom3(): Room {
  const width = T * 50;
  const height = T * 22;
  
  return {
    id: 'crossroads_3',
    name: 'Forgotten Crossroads - Gruzzer Nest',
    width,
    height,
    backgroundColor: '#0f1219',
    spawnPoint: { x: T * 6, y: height - T * 5 },
    platforms: [
      // Uneven floor with gaps for transitions
      createCavePlatform(T * 5, height - T * 2, T * 7, T * 2), // Left section
      createCavePlatform(T * 12, height - T * 4, T * 4, T * 4), // raised rock
      createCavePlatform(T * 16, height - T * 2, T * 10, T * 2),
      createCavePlatform(T * 29, height - T * 2, T * 16, T * 2), // Right section
      
      // Left wall with opening for transition
      createCavePlatform(0, 0, T * 2, height - T * 10),
      
      // Right wall with opening for transition
      createCavePlatform(width - T * 2, 0, T * 2, height - T * 10),
      
      // Ceiling with organic shapes
      createCavePlatform(0, 0, width, T * 2),
      createCavePlatform(T * 15, T * 2, T * 5, T * 3),
      createCavePlatform(T * 32, T * 2, T * 4, T * 4),
      
      // Floating platforms
      createCavePlatform(T * 8, height - T * 8, T * 4, T),
      createCavePlatform(T * 18, height - T * 10, T * 5, T),
      createCavePlatform(T * 28, height - T * 8, T * 4, T),
      createCavePlatform(T * 38, height - T * 11, T * 5, T),
      
      // One-way ledges
      createCavePlatform(T * 12, height - T * 14, T * 4, T / 2, 'one_way'),
      createCavePlatform(T * 24, height - T * 13, T * 4, T / 2, 'one_way'),
      createCavePlatform(T * 42, height - T * 7, T * 4, T / 2, 'one_way'),
      // Floor under spike pit
      createCavePlatform(T * 26, height - T * 2, T * 3, T * 2),
    ],
    hazards: [
      // Spike pit
      { x: T * 26, y: height - T * 2.5, width: T * 3, height: T / 2, type: 'spike', damage: 1 },
    ],
    enemies: [
      createEnemy('gruzzer', T * 15, height - T * 12),
      createEnemy('gruzzer', T * 25, height - T * 14),
      createEnemy('gruzzer', T * 35, height - T * 10),
      createEnemy('gruzzer', T * 42, height - T * 15),
      createEnemy('vengefly', T * 20, height - T * 16),
      createEnemy('crawlid', T * 32, height - T * 3),
    ],
    interactables: [
      {
        type: 'bench',
        id: 'bench_gruzzer',
        x: T * 42,
        y: height - T * 4,
        width: T * 2,
        height: T * 2,
      },
    ],
    transitions: [
      {
        from: { x: 0, y: height - T * 10, width: T * 5, height: T * 8 },
        toRoom: 'crossroads_2',
        toPosition: { x: T * 38, y: T * 35 },
        direction: 'left',
      },
      {
        from: { x: width - T * 5, y: height - T * 10, width: T * 5, height: T * 8 },
        toRoom: 'crossroads_boss',
        toPosition: { x: T * 7, y: T * 19 },
        direction: 'right',
      },
    ],
  };
}

// Room 4: Upper Crossroads - Above the hub
export function createUpperRoom(): Room {
  const width = T * 55;
  const height = T * 30;
  
  return {
    id: 'crossroads_upper',
    name: 'Forgotten Crossroads - Upper Passage',
    width,
    height,
    backgroundColor: '#0f1219',
    spawnPoint: { x: T * 27, y: height - T * 5 },
    platforms: [
      // Floor sections with opening for down transition
      createCavePlatform(0, height - T * 2, T * 20, T * 2),
      createCavePlatform(T * 35, height - T * 2, T * 20, T * 2),
      
      // Walls
      createCavePlatform(0, 0, T * 2, height),
      createCavePlatform(width - T * 2, 0, T * 2, height),
      
      // Ceiling
      createCavePlatform(0, 0, width, T * 2),
      
      // Large central rock formation (narrower to leave gap access on sides)
      createCavePlatform(T * 25, height - T * 9, T * 6, T * 7),
      
      // Platforms around formation
      createCavePlatform(T * 6, height - T * 7, T * 5, T),
      createCavePlatform(T * 14, height - T * 10, T * 4, T),
      createCavePlatform(T * 8, height - T * 15, T * 6, T),
      createCavePlatform(T * 36, height - T * 7, T * 5, T),
      createCavePlatform(T * 44, height - T * 11, T * 5, T),
      createCavePlatform(T * 38, height - T * 16, T * 6, T),
      
      // Upper ledges
      createCavePlatform(T * 18, height - T * 18, T * 6, T),
      createCavePlatform(T * 28, height - T * 18, T * 6, T),
      createCavePlatform(T * 22, height - T * 23, T * 8, T),
      
      // One-way platforms
      createCavePlatform(T * 12, height - T * 20, T * 4, T / 2, 'one_way'),
      createCavePlatform(T * 36, height - T * 20, T * 4, T / 2, 'one_way'),
      // Floor under spikes
      createCavePlatform(T * 20, height - T * 2, T * 4, T * 2),
    ],
    hazards: [
      { x: T * 20, y: height - T * 2.5, width: T * 4, height: T / 2, type: 'spike', damage: 1 },
    ],
    enemies: [
      createEnemy('vengefly', T * 12, height - T * 12),
      createEnemy('vengefly', T * 40, height - T * 14),
      createEnemy('husk_guard', T * 8, height - T * 4),
      createEnemy('leaping_husk', T * 38, height - T * 4),
      createEnemy('leaping_husk', T * 45, height - T * 4),
      createEnemy('tiktik', T * 50, height - T * 3),
    ],
    interactables: [],
    transitions: [
      {
        from: { x: T * 20, y: height - T * 3, width: T * 5, height: T * 5 },
        toRoom: 'crossroads_2',
        toPosition: { x: T * 22, y: T * 5 - 56 },
        direction: 'down',
      },
    ],
  };
}

// Boss Room: False Knight Arena - Large open arena
export function createBossRoom(): Room {
  const width = T * 40;
  const height = T * 25;
  
  return {
    id: 'crossroads_boss',
    name: 'False Knight Arena',
    width,
    height,
    backgroundColor: '#080a0f',
    spawnPoint: { x: T * 8, y: height - T * 6 },
    platforms: [
      // Arena floor with opening for left transition
      createCavePlatform(T * 6, height - T * 3, width - T * 6, T * 3),
      
      // Left wall with opening for transition
      createCavePlatform(0, 0, T * 3, height - T * 12),
      
      // Right wall - solid
      createCavePlatform(width - T * 3, 0, T * 3, height),
      
      // High ceiling
      createCavePlatform(0, 0, width, T * 3),
      
      // Small refuge ledges on sides
      createCavePlatform(T * 5, height - T * 9, T * 4, T),
      createCavePlatform(width - T * 9, height - T * 9, T * 4, T),
      
      // Upper observation platforms
      createCavePlatform(T * 12, height - T * 14, T * 5, T),
      createCavePlatform(width - T * 17, height - T * 14, T * 5, T),
      
      // Center high platform
      createCavePlatform(T * 17, height - T * 18, T * 6, T),
    ],
    hazards: [],
    enemies: [
      createEnemy('false_knight', T * 18, height - T * 8),
    ],
    interactables: [],
    transitions: [
      {
        from: { x: 0, y: height - T * 12, width: T * 6, height: T * 10 },
        toRoom: 'crossroads_3',
        toPosition: { x: T * 42, y: T * 16 },
        direction: 'left',
      },
    ],
  };
}

// Room collection with all Forgotten Crossroads rooms
export const ALL_ROOMS: Record<string, () => Room> = {
  dirtmouth: createDirtmouth,
  crossroads_1: createRoom1,
  crossroads_2: createRoom2,
  crossroads_3: createRoom3,
  crossroads_upper: createUpperRoom,
  crossroads_boss: createBossRoom,
};

export function getRoom(roomId: string): Room {
  const createRoom = ALL_ROOMS[roomId];
  if (!createRoom) {
    console.error(`Room not found: ${roomId}`);
    return createDirtmouth();
  }
  return createRoom();
}
