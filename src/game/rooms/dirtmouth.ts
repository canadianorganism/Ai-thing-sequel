// Dirtmouth - the surface town above the Forgotten Crossroads
import { Room, Platform, TILE_SIZE } from '../types';

const T = TILE_SIZE;

function createPlatform(x: number, y: number, width: number, height: number, type: 'solid' | 'one_way' = 'solid'): Platform {
  return { x, y, width, height, type };
}

export function createDirtmouth(): Room {
  const width = T * 60;
  const height = T * 18;
  
  return {
    id: 'dirtmouth',
    name: 'Dirtmouth',
    width,
    height,
    backgroundColor: '#141824',
    spawnPoint: { x: T * 25, y: T * 13 - 56 },
    platforms: [
      // Main ground - slightly uneven village path
      createPlatform(0, T * 13, T * 24, T * 5),
      // Well gap (transition to crossroads)
      createPlatform(T * 27, T * 13, T * 33, T * 5),
      
      // Left boundary - cliff
      createPlatform(0, 0, T * 2, height),
      
      // Right boundary - cliff
      createPlatform(width - T * 2, 0, T * 2, height),
      
      // Sky/ceiling (very high, open area)
      createPlatform(0, 0, width, T * 2),
      
      // Small raised platforms for buildings (one_way so player can jump up)
      // Sly's shop platform
      createPlatform(T * 28, T * 11, T * 6, T * 2, 'one_way'),
      
      // Iselda's shop platform
      createPlatform(T * 38, T * 11, T * 8, T * 2, 'one_way'),
      
      // Left side raised area
      createPlatform(T * 6, T * 11, T * 6, T * 2, 'one_way'),
      
      // One-way ledge near well
      createPlatform(T * 22, T * 10, T * 4, T / 2, 'one_way'),
    ],
    hazards: [],
    enemies: [], // Dirtmouth is safe - no enemies
    interactables: [
      // Bench in the center of town
      {
        type: 'bench',
        id: 'bench_dirtmouth',
        x: T * 15,
        y: T * 11,
        width: T * 2,
        height: T * 2,
      },
    ],
    transitions: [
      // Well entrance - leads down to Forgotten Crossroads Entry
      {
        from: { x: T * 24, y: T * 12, width: T * 3, height: T * 4 },
        toRoom: 'crossroads_1',
        toPosition: { x: T * 4, y: T * 18 },
        direction: 'down',
      },
    ],
  };
}
