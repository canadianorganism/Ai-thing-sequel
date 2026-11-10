// NPC system - dialogue and shops for Dirtmouth
import { Vector2, Rectangle, TILE_SIZE } from './types';
import { CharmId } from './charms';

export interface NPC {
  id: string;
  name: string;
  position: Vector2;
  hitbox: Rectangle;
  dialogue: DialogueEntry[];
  shop: ShopItem[] | null;
  appearance: NPCAppearance;
}

export interface DialogueEntry {
  speaker: string;
  text: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'charm' | 'item';
  charmId?: CharmId;
  itemEffect?: string;
  sold: boolean;
}

export interface NPCAppearance {
  bodyColor: string;
  headColor: string;
  eyeColor: string;
  height: number;
  hasHat?: boolean;
  hatColor?: string;
  hasBeard?: boolean;
  hasCape?: boolean;
  capeColor?: string;
}

export interface ShopState {
  isOpen: boolean;
  npcId: string | null;
  items: ShopItem[];
  selectedIndex: number;
}

export function createShopState(): ShopState {
  return {
    isOpen: false,
    npcId: null,
    items: [],
    selectedIndex: 0,
  };
}

// Create all Dirtmouth NPCs
export function createDirtmouthNPCs(): NPC[] {
  const T = TILE_SIZE;
  
  return [
    // Elderbug - standing near the bench, gives lore
    {
      id: 'elderbug',
      name: 'Elderbug',
      position: { x: T * 18, y: T * 13 - 56 },
      hitbox: { x: 0, y: 0, width: 32, height: 56 },
      dialogue: [
        { speaker: 'Elderbug', text: 'Oh! A visitor to our little town... How rare.' },
        { speaker: 'Elderbug', text: 'This is Dirtmouth, what remains of it. Most have gone below.' },
        { speaker: 'Elderbug', text: 'The well leads down into the old kingdom. Be careful down there.' },
        { speaker: 'Elderbug', text: 'If you find anything interesting, do come back and tell me.' },
      ],
      shop: null,
      appearance: {
        bodyColor: '#5a6a5a',
        headColor: '#8a9a8a',
        eyeColor: '#2a2a2a',
        height: 56,
        hasBeard: true,
        hasCape: true,
        capeColor: '#4a5a4a',
      },
    },
    // Sly - the shopkeeper, sells charms and items
    {
      id: 'sly',
      name: 'Sly',
      position: { x: T * 30, y: T * 11 - 42 },
      hitbox: { x: 0, y: 0, width: 28, height: 42 },
      dialogue: [
        { speaker: 'Sly', text: 'Welcome, welcome! Come see my wares!' },
        { speaker: 'Sly', text: 'I have charms and curiosities for sale. Take a look!' },
      ],
      shop: [
        {
          id: 'shop_gathering_swarm',
          name: 'Gathering Swarm',
          description: 'A swarm will collect any loose Geo.',
          cost: 300,
          type: 'charm',
          charmId: 'gathering_swarm',
          sold: false,
        },
        {
          id: 'shop_stalwart_shell',
          name: 'Stalwart Shell',
          description: 'Increases invincibility after taking damage.',
          cost: 200,
          type: 'charm',
          charmId: 'stalwart_shell',
          sold: false,
        },
        {
          id: 'shop_quick_slash',
          name: 'Quick Slash',
          description: 'Increases attack speed significantly.',
          cost: 800,
          type: 'charm',
          charmId: 'quick_slash',
          sold: false,
        },
        {
          id: 'shop_sprintmaster',
          name: 'Sprintmaster',
          description: 'Increases walking speed.',
          cost: 400,
          type: 'charm',
          charmId: 'sprintmaster',
          sold: false,
        },
        {
          id: 'shop_spell_twister',
          name: 'Spell Twister',
          description: 'Reduces the Soul cost of casting spells.',
          cost: 500,
          type: 'charm',
          charmId: 'spell_twister',
          sold: false,
        },
        {
          id: 'shop_extra_notch_1',
          name: 'Charm Notch',
          description: 'An extra notch for equipping charms.',
          cost: 600,
          type: 'item',
          itemEffect: 'extra_notch',
          sold: false,
        },
      ],
      appearance: {
        bodyColor: '#6a5040',
        headColor: '#9a8070',
        eyeColor: '#2a1a1a',
        height: 42,
        hasHat: true,
        hatColor: '#4a3a2a',
      },
    },
    // Iselda - map shop
    {
      id: 'iselda',
      name: 'Iselda',
      position: { x: T * 40, y: T * 11 - 52 },
      hitbox: { x: 0, y: 0, width: 30, height: 52 },
      dialogue: [
        { speaker: 'Iselda', text: '...Bapanada.' },
        { speaker: 'Iselda', text: 'My husband Cornifer is mapping the caverns below.' },
        { speaker: 'Iselda', text: 'I sell what charms and supplies I can. Have a look.' },
      ],
      shop: [
        {
          id: 'shop_wayward_compass',
          name: 'Wayward Compass',
          description: 'Shows your location on the map.',
          cost: 220,
          type: 'charm',
          charmId: 'wayward_compass',
          sold: false,
        },
        {
          id: 'shop_longnail',
          name: 'Longnail',
          description: 'Increases the range of the nail.',
          cost: 300,
          type: 'charm',
          charmId: 'longnail',
          sold: false,
        },
        {
          id: 'shop_lifeblood_heart',
          name: 'Lifeblood Heart',
          description: 'Grants two Lifeblood masks at benches.',
          cost: 250,
          type: 'charm',
          charmId: 'lifeblood_heart',
          sold: false,
        },
        {
          id: 'shop_mark_of_pride',
          name: 'Mark of Pride',
          description: 'Greatly increases nail range.',
          cost: 900,
          type: 'charm',
          charmId: 'mark_of_pride',
          sold: false,
        },
        {
          id: 'shop_extra_notch_2',
          name: 'Charm Notch',
          description: 'An extra notch for equipping charms.',
          cost: 800,
          type: 'item',
          itemEffect: 'extra_notch',
          sold: false,
        },
      ],
      appearance: {
        bodyColor: '#5a5068',
        headColor: '#8a7898',
        eyeColor: '#2a2a3a',
        height: 52,
        hasCape: true,
        capeColor: '#3a3048',
      },
    },
    // Cornifer - map maker, dialogue only
    {
      id: 'cornifer',
      name: 'Cornifer',
      position: { x: T * 43, y: T * 11 - 48 },
      hitbox: { x: 0, y: 0, width: 28, height: 48 },
      dialogue: [
        { speaker: 'Cornifer', text: 'Ah, another explorer! How wonderful!' },
        { speaker: 'Cornifer', text: 'I have been charting these lands for years now.' },
        { speaker: 'Cornifer', text: 'The caverns below hold many secrets. Be thorough!' },
        { speaker: 'Cornifer', text: 'My wife Iselda sells maps in our shop, just over there.' },
      ],
      shop: null,
      appearance: {
        bodyColor: '#5a6858',
        headColor: '#7a8878',
        eyeColor: '#2a2a2a',
        height: 48,
        hasHat: true,
        hatColor: '#3a4838',
      },
    },
    // Bretta - rescued bug, shy dialogue
    {
      id: 'bretta',
      name: 'Bretta',
      position: { x: T * 10, y: T * 11 - 40 },
      hitbox: { x: 0, y: 0, width: 24, height: 40 },
      dialogue: [
        { speaker: 'Bretta', text: '...Oh! You startled me...' },
        { speaker: 'Bretta', text: 'I came up from below. It was so scary down there...' },
        { speaker: 'Bretta', text: 'But this town is nice. Quiet. Safe.' },
        { speaker: 'Bretta', text: 'You... you are very brave to go down there.' },
      ],
      shop: null,
      appearance: {
        bodyColor: '#8a6a7a',
        headColor: '#aa8a9a',
        eyeColor: '#3a2a3a',
        height: 40,
      },
    },
  ];
}
