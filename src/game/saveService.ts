import { supabase } from '@/integrations/supabase/client';
import { CharmId } from './charms';

export interface SaveData {
  maxHealth: number;
  currentHealth: number;
  maxSoul: number;
  currentSoul: number;
  geo: number;
  nailDamage: number;
  hasDoubleJump: boolean;
  hasDash: boolean;
  hasWallJump: boolean;
  benchRoom: string;
  benchX: number;
  benchY: number;
  acquiredCharms: string[];
  equippedCharms: string[];
  maxNotches: number;
  visitedRooms: string[];
  grubsCollected: number;
  collectedGrubIds: string[];
}

export async function saveGame(userId: string, data: SaveData): Promise<boolean> {
  const { error } = await supabase
    .from('game_saves' as any)
    .upsert({
      user_id: userId,
      max_health: data.maxHealth,
      current_health: data.currentHealth,
      max_soul: data.maxSoul,
      current_soul: data.currentSoul,
      geo: data.geo,
      nail_damage: data.nailDamage,
      has_double_jump: data.hasDoubleJump,
      has_dash: data.hasDash,
      has_wall_jump: data.hasWallJump,
      bench_room: data.benchRoom,
      bench_x: data.benchX,
      bench_y: data.benchY,
      acquired_charms: data.acquiredCharms,
      equipped_charms: data.equippedCharms,
      max_notches: data.maxNotches,
      visited_rooms: data.visitedRooms,
      grubs_collected: data.grubsCollected,
      collected_grub_ids: data.collectedGrubIds,
    } as any, { onConflict: 'user_id' } as any);

  if (error) {
    console.error('[Save] Error saving game:', error);
    return false;
  }
  console.log('[Save] Game saved successfully');
  return true;
}

export async function loadGame(userId: string): Promise<SaveData | null> {
  const { data, error } = await supabase
    .from('game_saves' as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Save] Error loading game:', error);
    return null;
  }

  if (!data) return null;

  const row = data as any;
  return {
    maxHealth: row.max_health,
    currentHealth: row.current_health,
    maxSoul: row.max_soul,
    currentSoul: row.current_soul,
    geo: row.geo,
    nailDamage: row.nail_damage,
    hasDoubleJump: row.has_double_jump,
    hasDash: row.has_dash,
    hasWallJump: row.has_wall_jump,
    benchRoom: row.bench_room,
    benchX: row.bench_x,
    benchY: row.bench_y,
    acquiredCharms: row.acquired_charms || [],
    equippedCharms: row.equipped_charms || [],
    maxNotches: row.max_notches,
    visitedRooms: row.visited_rooms || [],
    grubsCollected: row.grubs_collected,
    collectedGrubIds: row.collected_grub_ids || [],
  };
}
