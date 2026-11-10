import {
  GameState,
  Player,
  Enemy,
  Room,
  Projectile,
  Particle,
  Camera,
  TILE_SIZE,
  PLAYER_CONSTANTS,
} from './types';
import { getAttackHitbox } from './physics';
import { BreakableWall, GeoPickup } from './breakables';
import { Charm, CharmState, CharmId, CHARM_DATA, equipCharm, unequipCharm } from './charms';
import { GrubContainer } from './grubs';
import { NPC, ShopState, ShopItem } from './npc';

// Authentic Hollow Knight color palette
const COLORS = {
  // Player - The Knight's iconic look
  playerBody: '#2a2a3a',
  playerHead: '#e8e8f0',
  playerHorns: '#f0f0f8',
  playerEyes: '#1a1a1a',
  playerCloak: '#1a1a28',
  
  // UI - Clean white masks and blue soul
  maskFull: '#ffffff',
  maskEmpty: '#3a3a4a',
  maskBorder: '#888898',
  soulFull: '#a8c8ff',
  soulEmpty: '#2a3040',
  geo: '#e8d080',
  
  // Environment - Dark cavernous blues and grays
  platformMain: '#2a2a3a',
  platformLight: '#3a3a4a',
  platformDark: '#1a1a28',
  platformEdge: '#4a4a5a',
  spikeBase: '#3a3a4a',
  spikeTip: '#5a5a6a',
  
  // Backgrounds - Deep cavern atmosphere
  bgDarkest: '#0a0a12',
  bgDark: '#101018',
  bgMid: '#161620',
  bgLight: '#1c1c28',
  
  // Effects
  attack: 'rgba(255, 255, 255, 0.9)',
  attackGlow: 'rgba(200, 220, 255, 0.4)',
  dash: 'rgba(160, 180, 220, 0.6)',
  heal: 'rgba(255, 255, 255, 0.95)',
  healGlow: 'rgba(200, 255, 220, 0.4)',
  soul: 'rgba(160, 200, 255, 0.8)',
  spell: '#88ccff',
  
  // Enemies - Muted orange/brown tones for bugs
  crawlid: '#8a5a4a',
  crawlidLight: '#9a6a5a',
  crawlidDark: '#6a4a3a',
  vengefly: '#7a5040',
  vengeflyWing: '#9a7060',
  tiktik: '#6a5a4a',
  tiktikShell: '#7a6a5a',
  gruzzer: '#aa7a50',
  gruzzerFuzz: '#8a6040',
  huskGuard: '#5a5a6a',
  huskGuardArmor: '#4a4a5a',
  leapingHusk: '#4a4a5a',
  gruzMother: '#aa8855',
  falseKnight: '#3a3a4a',
  falseKnightArmor: '#5a5a6a',
  falseKnightGlow: '#8a8a9a',
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private exitButtonBounds: { x: number; y: number; w: number; h: number } | null = null;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }
  
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
  
  getWidth() { return this.width; }
  getHeight() { return this.height; }
  
  render(
    state: GameState, 
    breakableWalls: BreakableWall[] = [], 
    geoPickups: GeoPickup[] = [], 
    equippedCharms: Charm[] = [], 
    charmMenuState: CharmState | null = null, 
    mousePos: { x: number; y: number } = { x: 0, y: 0 },
    audioSettings: { musicVolume: number; sfxVolume: number; ambientVolume: number } | null = null,
    showMap: boolean = false,
    grubContainers: GrubContainer[] = [],
    grubsCollected: number = 0,
    grubNotificationTimer: number = 0,
    npcs: NPC[] = [],
    interactPromptNpc: NPC | null = null,
    dialogueNpc: NPC | null = null,
    dialogueIndex: number = 0,
    shopState: ShopState | null = null,
    adaptiveHint: { message: string; priority: number; category: string } | null = null,
    hintTimer: number = 0
  ) {
    const { player, currentRoom, projectiles, particles, camera } = state;
    
    // Apply camera shake
    const shakeX = camera.shake * (Math.random() - 0.5) * 12;
    const shakeY = camera.shake * (Math.random() - 0.5) * 12;
    
    // Draw layered background
    this.drawBackground(currentRoom);
    
    // Save context for camera transform
    this.ctx.save();
    this.ctx.translate(-camera.position.x + shakeX + this.width / 2, -camera.position.y + shakeY + this.height / 2);
    
    // Draw parallax background layers (enhanced)
    this.drawBackgroundLayers(currentRoom, camera);
    
    // Draw room
    this.drawRoom(currentRoom);
    
    // Draw interactables
    this.drawInteractables(currentRoom);
    
    // Draw breakable walls
    for (const wall of breakableWalls) {
      if (!wall.broken) {
        this.drawBreakableWall(wall);
      }
    }
    
    // Draw grub containers
    for (const grub of grubContainers) {
      if (!grub.broken) {
        this.drawGrubContainer(grub);
      }
    }
    
    // Draw geo pickups
    for (const geo of geoPickups) {
      if (!geo.collected) {
        this.drawGeoPickup(geo);
      }
    }
    
    // Draw NPCs
    for (const npc of npcs) {
      this.drawNPC(npc);
    }
    
    // Draw enemies
    for (const enemy of currentRoom.enemies) {
      if (enemy.state !== 'dead') {
        this.drawEnemy(enemy);
      }
    }
    
    // Draw player
    this.drawPlayer(player);
    
    // Draw NPC interact prompt (in world space)
    if (interactPromptNpc) {
      this.drawInteractPrompt(interactPromptNpc);
    }
    
    // Draw projectiles
    for (const projectile of projectiles) {
      this.drawProjectile(projectile);
    }
    
    // Draw particles
    for (const particle of particles) {
      this.drawParticle(particle);
    }
    
    // Restore context
    this.ctx.restore();
    
    // Draw UI (screen-space)
    this.drawUI(player, state.gameTime, equippedCharms);
    
    // Draw grub notification
    if (grubNotificationTimer > 0) {
      this.drawGrubNotification(grubsCollected, grubNotificationTimer);
    }
    
    // Draw NPC dialogue
    if (dialogueNpc) {
      this.drawDialogue(dialogueNpc.dialogue[dialogueIndex]);
    }
    // Draw dialogue if active (legacy)
    else if (state.dialogueActive && state.currentDialogue) {
      this.drawDialogue(state.currentDialogue[state.dialogueIndex]);
    }
    
    // Draw shop UI
    if (shopState && shopState.isOpen) {
      this.drawShopUI(shopState, player.stats.geo, mousePos);
    }
    
    // Draw map overlay when L is held
    if (showMap && !state.isPaused) {
      this.drawMapOverlay(state.visitedRooms, currentRoom.id);
    }
    
    // Draw pause overlay with settings, or charm menu
    if (charmMenuState) {
      this.drawCharmMenu(charmMenuState, mousePos);
    } else if (state.isPaused && audioSettings && !shopState?.isOpen) {
      this.drawSettingsMenu(audioSettings, mousePos);
    } else if (state.isPaused && !shopState?.isOpen) {
      this.drawPauseMenu();
    }
    
    // Draw adaptive AI hint
    if (adaptiveHint && hintTimer > 0) {
      this.drawAdaptiveHint(adaptiveHint.message, hintTimer);
    }
    
    // Draw death screen
    if (player.state === 'dead') {
      this.drawDeathScreen();
    }
  }
  
  private drawAdaptiveHint(message: string, timer: number) {
    const alpha = Math.min(1, timer, timer > 1 ? 1 : timer); // fade in/out
    const y = this.height * 0.82;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    // Background pill
    this.ctx.font = '14px Georgia, serif';
    const metrics = this.ctx.measureText(message);
    const padding = 16;
    const boxW = metrics.width + padding * 2;
    const boxH = 32;
    const boxX = (this.width - boxW) / 2;
    const boxY = y - boxH / 2;
    
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.75)';
    this.ctx.beginPath();
    this.ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(168, 200, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    this.ctx.stroke();
    
    // Text
    this.ctx.fillStyle = '#a8c8ff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(message, this.width / 2, y);
    
    this.ctx.restore();
  }
  
  private drawMapOverlay(visitedRooms: Set<string>, currentRoomId: string) {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Title
    this.ctx.fillStyle = '#e8e8f0';
    this.ctx.font = 'bold 28px Georgia, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('FORGOTTEN CROSSROADS', this.width / 2, 50);
    
    // Hint text
    this.ctx.font = '14px Georgia, serif';
    this.ctx.fillStyle = 'rgba(232, 232, 240, 0.5)';
    this.ctx.fillText('Hold L to view map', this.width / 2, this.height - 30);
    
    // Room layout data
    const rooms = [
      { id: 'dirtmouth', name: 'Dirtmouth', x: 0, y: 0, w: 2, h: 1 },
      { id: 'crossroads_1', name: 'Entry Hall', x: 0, y: 1, w: 2, h: 1 },
      { id: 'crossroads_2', name: 'Vertical Hub', x: 2, y: 0, w: 1, h: 3 },
      { id: 'crossroads_3', name: 'Gruzzer Nest', x: 3, y: 1, w: 2, h: 1 },
      { id: 'crossroads_upper', name: 'Upper Passage', x: 3, y: 0, w: 2, h: 1 },
      { id: 'crossroads_boss', name: 'False Knight Arena', x: 5, y: 1, w: 2, h: 1 },
    ];
    
    // Calculate map dimensions
    const cellSize = 70;
    const padding = 20;
    const mapWidth = 7 * cellSize;
    const mapHeight = 3 * cellSize;
    const startX = (this.width - mapWidth) / 2;
    const startY = (this.height - mapHeight) / 2;
    
    // Draw grid background
    this.ctx.strokeStyle = 'rgba(74, 74, 90, 0.3)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= 7; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX + x * cellSize, startY);
      this.ctx.lineTo(startX + x * cellSize, startY + mapHeight);
      this.ctx.stroke();
    }
    for (let y = 0; y <= 3; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY + y * cellSize);
      this.ctx.lineTo(startX + mapWidth, startY + y * cellSize);
      this.ctx.stroke();
    }
    
    // Draw rooms
    for (const room of rooms) {
      const rx = startX + room.x * cellSize;
      const ry = startY + room.y * cellSize;
      const rw = room.w * cellSize;
      const rh = room.h * cellSize;
      
      const visited = visitedRooms.has(room.id);
      const isCurrent = room.id === currentRoomId;
      
      if (visited) {
        // Visited room - filled
        if (isCurrent) {
          // Current room - glowing
          this.ctx.fillStyle = 'rgba(168, 200, 255, 0.3)';
          this.ctx.fillRect(rx - 4, ry - 4, rw + 8, rh + 8);
          this.ctx.fillStyle = 'rgba(168, 200, 255, 0.6)';
        } else {
          this.ctx.fillStyle = 'rgba(90, 90, 106, 0.6)';
        }
        this.ctx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4);
        
        // Room border
        this.ctx.strokeStyle = isCurrent ? '#a8c8ff' : '#6a6a7a';
        this.ctx.lineWidth = isCurrent ? 3 : 2;
        this.ctx.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);
        
        // Room name
        this.ctx.fillStyle = isCurrent ? '#ffffff' : '#c8c8d0';
        this.ctx.font = '12px Georgia, serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(room.name, rx + rw / 2, ry + rh / 2 + 4);
        
        // Draw player marker in current room
        if (isCurrent) {
          const markerX = rx + rw / 2;
          const markerY = ry + rh / 2 - 15;
          
          // Glowing marker
          const gradient = this.ctx.createRadialGradient(markerX, markerY, 0, markerX, markerY, 12);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          gradient.addColorStop(1, 'transparent');
          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(markerX, markerY, 12, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Knight head icon
          this.ctx.fillStyle = '#e8e8f0';
          this.ctx.beginPath();
          this.ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Horns
          this.ctx.fillStyle = '#f0f0f8';
          this.ctx.beginPath();
          this.ctx.moveTo(markerX - 4, markerY - 3);
          this.ctx.lineTo(markerX - 7, markerY - 10);
          this.ctx.lineTo(markerX - 2, markerY - 5);
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.moveTo(markerX + 4, markerY - 3);
          this.ctx.lineTo(markerX + 7, markerY - 10);
          this.ctx.lineTo(markerX + 2, markerY - 5);
          this.ctx.fill();
        }
      } else {
        // Unvisited room - just outline
        this.ctx.strokeStyle = 'rgba(74, 74, 90, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);
        this.ctx.setLineDash([]);
        
        // Question mark
        this.ctx.fillStyle = 'rgba(106, 106, 122, 0.5)';
        this.ctx.font = '20px Georgia, serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('?', rx + rw / 2, ry + rh / 2 + 6);
      }
    }
    
    // Draw connections between rooms
    this.ctx.strokeStyle = 'rgba(168, 200, 255, 0.4)';
    this.ctx.lineWidth = 2;
    
    // Dirtmouth -> Entry Hall
    if (visitedRooms.has('dirtmouth') && visitedRooms.has('crossroads_1')) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX + 1 * cellSize, startY + cellSize);
      this.ctx.lineTo(startX + 1 * cellSize, startY + cellSize + 2);
      this.ctx.stroke();
    }
    
    // Entry -> Vertical Hub
    if (visitedRooms.has('crossroads_1') && visitedRooms.has('crossroads_2')) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX + 2 * cellSize, startY + 1.5 * cellSize);
      this.ctx.lineTo(startX + 2 * cellSize + 2, startY + 1.5 * cellSize);
      this.ctx.stroke();
    }
    
    // Vertical Hub -> Gruzzer Nest
    if (visitedRooms.has('crossroads_2') && visitedRooms.has('crossroads_3')) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX + 3 * cellSize, startY + 1.5 * cellSize);
      this.ctx.lineTo(startX + 3 * cellSize + 2, startY + 1.5 * cellSize);
      this.ctx.stroke();
    }
    
    // Vertical Hub -> Upper Passage
    if (visitedRooms.has('crossroads_2') && visitedRooms.has('crossroads_upper')) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX + 2.5 * cellSize, startY + cellSize);
      this.ctx.lineTo(startX + 3 * cellSize, startY + 0.5 * cellSize);
      this.ctx.stroke();
    }
    
    // Gruzzer Nest -> Boss Arena
    if (visitedRooms.has('crossroads_3') && visitedRooms.has('crossroads_boss')) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX + 5 * cellSize, startY + 1.5 * cellSize);
      this.ctx.lineTo(startX + 5 * cellSize + 2, startY + 1.5 * cellSize);
      this.ctx.stroke();
    }
  }
  
  private drawBreakableWall(wall: BreakableWall) {
    const { position, width, height, crackLevel } = wall;
    
    // Main wall body
    this.ctx.fillStyle = '#3a3a4a';
    this.ctx.fillRect(position.x, position.y, width, height);
    
    // Lighter edge
    this.ctx.fillStyle = '#4a4a5a';
    this.ctx.fillRect(position.x, position.y, width, 4);
    this.ctx.fillRect(position.x, position.y, 4, height);
    
    // Darker shadow
    this.ctx.fillStyle = '#2a2a3a';
    this.ctx.fillRect(position.x + width - 4, position.y, 4, height);
    this.ctx.fillRect(position.x, position.y + height - 4, width, 4);
    
    // Crack lines based on damage
    if (crackLevel > 0) {
      this.ctx.strokeStyle = '#1a1a28';
      this.ctx.lineWidth = 2;
      
      const cx = position.x + width / 2;
      const cy = position.y + height / 2;
      
      if (crackLevel >= 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 10, cy - 15);
        this.ctx.lineTo(cx, cy);
        this.ctx.lineTo(cx + 15, cy + 10);
        this.ctx.stroke();
      }
      
      if (crackLevel >= 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(cx + 5, cy - 20);
        this.ctx.lineTo(cx - 5, cy - 5);
        this.ctx.lineTo(cx - 15, cy + 15);
        this.ctx.stroke();
      }
      
      if (crackLevel >= 3) {
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 20, cy);
        this.ctx.lineTo(cx, cy + 5);
        this.ctx.lineTo(cx + 20, cy - 5);
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#2a2a3a';
        this.ctx.fillRect(position.x, position.y, 8, 8);
        this.ctx.fillRect(position.x + width - 8, position.y + height - 8, 8, 8);
      }
    }
    
    // Sparkle hint
    const time = Date.now() / 800;
    const sparkle = Math.sin(time) * 0.5 + 0.5;
    this.ctx.fillStyle = `rgba(232, 208, 128, ${0.1 + sparkle * 0.1})`;
    this.ctx.beginPath();
    this.ctx.arc(position.x + width / 2, position.y + height / 2, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  private drawGeoPickup(geo: GeoPickup) {
    const { position, value, lifetime } = geo;
    
    const alpha = Math.min(1, lifetime / 2);
    const time = Date.now() / 200;
    const bob = Math.sin(time + position.x) * 3;
    
    const x = position.x;
    const y = position.y + bob;
    const size = 6 + Math.min(4, value / 5);
    
    // Outer glow
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    gradient.addColorStop(0, `rgba(232, 208, 128, ${0.4 * alpha})`);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Geo diamond shape
    this.ctx.fillStyle = `rgba(232, 208, 128, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size);
    this.ctx.lineTo(x + size * 0.7, y);
    this.ctx.lineTo(x, y + size);
    this.ctx.lineTo(x - size * 0.7, y);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Bright center
    this.ctx.fillStyle = `rgba(255, 240, 180, ${alpha})`;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  private drawGrubContainer(grub: GrubContainer) {
    const { position, width, height, crackLevel } = grub;
    const time = Date.now() / 1000;
    const cx = position.x + width / 2;
    const cy = position.y + height / 2;
    
    // Jar body - glass-like container
    this.ctx.fillStyle = '#3a5a3a';
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy + height * 0.1, width * 0.45, height * 0.45, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Glass highlight
    this.ctx.fillStyle = 'rgba(120, 180, 120, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(cx - width * 0.1, cy - height * 0.1, width * 0.15, height * 0.25, -0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Jar lid
    this.ctx.fillStyle = '#5a5a6a';
    this.ctx.fillRect(position.x + width * 0.15, position.y, width * 0.7, height * 0.15);
    
    // Grub inside - small wiggling larva
    const wiggle = Math.sin(time * 3) * 3;
    this.ctx.fillStyle = '#e8e0c0';
    this.ctx.beginPath();
    this.ctx.ellipse(cx + wiggle, cy + height * 0.1, width * 0.2, height * 0.2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Grub face
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.beginPath();
    this.ctx.arc(cx + wiggle - 3, cy + height * 0.05, 2, 0, Math.PI * 2);
    this.ctx.arc(cx + wiggle + 3, cy + height * 0.05, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Cracks
    if (crackLevel > 0) {
      this.ctx.strokeStyle = '#1a3a1a';
      this.ctx.lineWidth = 2;
      if (crackLevel >= 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, cy - 10);
        this.ctx.lineTo(cx, cy);
        this.ctx.lineTo(cx + 10, cy + 8);
        this.ctx.stroke();
      }
      if (crackLevel >= 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(cx + 5, cy - 15);
        this.ctx.lineTo(cx - 3, cy);
        this.ctx.lineTo(cx - 10, cy + 12);
        this.ctx.stroke();
      }
    }
    
    // Subtle glow to make it findable
    const pulse = Math.sin(time * 2) * 0.15 + 0.2;
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, width);
    gradient.addColorStop(0, `rgba(136, 204, 102, ${pulse})`);
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, width, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  private drawGrubNotification(grubsCollected: number, timer: number) {
    const alpha = Math.min(1, timer);
    const y = this.height * 0.25;
    
    // Background bar
    this.ctx.fillStyle = `rgba(10, 10, 18, ${0.8 * alpha})`;
    this.ctx.fillRect(this.width / 2 - 160, y - 20, 320, 50);
    
    // Border
    this.ctx.strokeStyle = `rgba(136, 204, 102, ${0.6 * alpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.width / 2 - 160, y - 20, 320, 50);
    
    this.ctx.textAlign = 'center';
    
    if (grubsCollected >= 10) {
      // Charm unlock message
      this.ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
      this.ctx.font = 'bold 18px Georgia, serif';
      this.ctx.fillText("Grubberfly's Elegy Acquired!", this.width / 2, y + 8);
    } else {
      // Grub count
      this.ctx.fillStyle = `rgba(232, 224, 192, ${alpha})`;
      this.ctx.font = '16px Georgia, serif';
      this.ctx.fillText(`Grub Rescued! (${grubsCollected}/10)`, this.width / 2, y + 8);
    }
  }
  
  private drawBackground(room: Room) {
    if (room.id === 'dirtmouth') {
      // Dirtmouth - dark night sky with stars
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, '#0a0c18');
      gradient.addColorStop(0.4, '#141824');
      gradient.addColorStop(1, '#1a1e2e');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      // Stars
      this.ctx.fillStyle = 'rgba(200, 210, 230, 0.6)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + 31) % this.width;
        const sy = (i * 53 + 17) % (this.height * 0.5);
        const size = 1 + (i % 3) * 0.5;
        const twinkle = Math.sin(Date.now() / 1000 + i * 0.7) * 0.3 + 0.7;
        this.ctx.globalAlpha = twinkle;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    } else {
      // Deep gradient background (underground)
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, COLORS.bgDarkest);
      gradient.addColorStop(0.5, COLORS.bgDark);
      gradient.addColorStop(1, COLORS.bgMid);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }
  
  private drawBackgroundLayers(room: Room, camera: Camera) {
    const time = Date.now() / 1000;
    
    // Dirtmouth has different background - buildings and streetlamps
    if (room.id === 'dirtmouth') {
      this.drawDirtmouthBackground(room, camera, time);
      return;
    }
    
    // Layer 1: Far distant cave walls
    this.ctx.fillStyle = 'rgba(20, 22, 30, 0.8)';
    const farParallax = 0.15;
    const farOffsetX = camera.position.x * farParallax;
    
    for (let x = -farOffsetX % (TILE_SIZE * 12); x < room.width + TILE_SIZE * 12; x += TILE_SIZE * 12) {
      const height = 100 + ((x * 37) % 150);
      this.ctx.beginPath();
      this.ctx.moveTo(x - 30, 0);
      this.ctx.lineTo(x + 30, 0);
      this.ctx.lineTo(x + 20, height);
      this.ctx.lineTo(x - 20, height);
      this.ctx.fill();
    }
    
    // Layer 2: Mid stalactites
    this.ctx.fillStyle = COLORS.bgLight;
    const midOffsetX = camera.position.x * 0.3;
    for (let x = -midOffsetX % (TILE_SIZE * 8); x < room.width; x += TILE_SIZE * 8) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + TILE_SIZE * 0.5, TILE_SIZE * 3);
      this.ctx.lineTo(x - TILE_SIZE * 0.5, TILE_SIZE * 3);
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    // Layer 3: Glowing fungi
    const fungiPositions = [
      { x: 0.1, y: 0.7, size: 12, hue: 180 },
      { x: 0.4, y: 0.65, size: 15, hue: 200 },
      { x: 0.7, y: 0.75, size: 14, hue: 190 },
      { x: 0.85, y: 0.82, size: 9, hue: 165 },
    ];
    
    for (const fungi of fungiPositions) {
      const fx = fungi.x * room.width;
      const fy = fungi.y * room.height;
      const pulse = Math.sin(time * 1.5 + fungi.x * 10) * 0.3 + 0.7;
      
      const gradient = this.ctx.createRadialGradient(fx, fy, 0, fx, fy, fungi.size * 3);
      gradient.addColorStop(0, `hsla(${fungi.hue}, 70%, 60%, 0.15)`);
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(fx, fy, fungi.size * 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = `hsla(${fungi.hue}, 80%, 70%, ${0.6 * pulse})`;
      this.ctx.beginPath();
      this.ctx.arc(fx, fy, fungi.size * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Layer 4: Floating dust particles
    this.ctx.fillStyle = 'rgba(150, 160, 180, 0.15)';
    for (let i = 0; i < 30; i++) {
      const baseX = (i * 173) % room.width;
      const baseY = (i * 257) % room.height;
      const x = baseX + Math.sin(time * 0.5 + i) * 10;
      const y = baseY + Math.cos(time * 0.3 + i * 1.5) * 15;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawRoom(room: Room) {
    // Draw platforms with layered depth
    for (const platform of room.platforms) {
      if (platform.type === 'one_way') {
        // One-way platform - thin decorative ledge
        this.ctx.fillStyle = COLORS.platformLight;
        this.ctx.fillRect(platform.x, platform.y, platform.width, 6);
        
        // Top edge highlight
        this.ctx.fillStyle = COLORS.platformEdge;
        this.ctx.fillRect(platform.x, platform.y, platform.width, 2);
        
        // Small supports
        this.ctx.fillStyle = COLORS.platformDark;
        this.ctx.fillRect(platform.x + 4, platform.y + 6, 4, 8);
        this.ctx.fillRect(platform.x + platform.width - 8, platform.y + 6, 4, 8);
      } else {
        // Solid platform - main fill
        this.ctx.fillStyle = COLORS.platformMain;
        this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Top edge highlight
        this.ctx.fillStyle = COLORS.platformEdge;
        this.ctx.fillRect(platform.x, platform.y, platform.width, 3);
        
        // Bottom shadow
        this.ctx.fillStyle = COLORS.platformDark;
        this.ctx.fillRect(platform.x, platform.y + platform.height - 4, platform.width, 4);
        
        // Add texture details for larger platforms
        if (platform.width > TILE_SIZE * 2 && platform.height < TILE_SIZE * 3) {
          this.ctx.fillStyle = COLORS.platformLight;
          for (let x = platform.x + TILE_SIZE; x < platform.x + platform.width - TILE_SIZE / 2; x += TILE_SIZE * 1.5) {
            this.ctx.fillRect(x, platform.y + 6, 2, platform.height - 10);
          }
        }
      }
    }
    
    // Draw hazards - spikes with proper shading
    for (const hazard of room.hazards) {
      if (hazard.type === 'spike') {
        const spikeWidth = 14;
        const numSpikes = Math.floor(hazard.width / spikeWidth);
        
        for (let i = 0; i < numSpikes; i++) {
          const x = hazard.x + i * spikeWidth + spikeWidth / 2;
          const y = hazard.y + hazard.height;
          
          // Base shadow
          this.ctx.fillStyle = COLORS.spikeBase;
          this.ctx.beginPath();
          this.ctx.moveTo(x - spikeWidth / 2 + 2, y);
          this.ctx.lineTo(x, hazard.y + 2);
          this.ctx.lineTo(x + spikeWidth / 2 - 2, y);
          this.ctx.fill();
          
          // Main spike
          this.ctx.fillStyle = COLORS.spikeTip;
          this.ctx.beginPath();
          this.ctx.moveTo(x - spikeWidth / 2 + 3, y);
          this.ctx.lineTo(x, hazard.y);
          this.ctx.lineTo(x + spikeWidth / 2 - 3, y);
          this.ctx.fill();
          
          // Highlight edge
          this.ctx.strokeStyle = COLORS.platformEdge;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(x - spikeWidth / 2 + 4, y);
          this.ctx.lineTo(x, hazard.y);
          this.ctx.stroke();
        }
      }
    }
  }
  
  private drawInteractables(room: Room) {
    for (const interactable of room.interactables) {
      switch (interactable.type) {
        case 'bench':
          this.drawBench(interactable.x, interactable.y);
          break;
        case 'geo_deposit':
          this.drawGeoDeposit(interactable.x, interactable.y, interactable.width, interactable.height);
          break;
      }
    }
  }
  
  private drawBench(x: number, y: number) {
    // Hollow Knight bench style
    const benchColor = '#4a4a5a';
    const benchLight = '#5a5a6a';
    const benchDark = '#3a3a4a';
    
    // Back rest
    this.ctx.fillStyle = benchDark;
    this.ctx.fillRect(x - 4, y - 10, 6, 45);
    this.ctx.fillStyle = benchLight;
    this.ctx.fillRect(x - 2, y - 8, 3, 40);
    
    // Seat
    this.ctx.fillStyle = benchColor;
    this.ctx.fillRect(x, y + 24, TILE_SIZE * 2, 8);
    this.ctx.fillStyle = benchLight;
    this.ctx.fillRect(x, y + 24, TILE_SIZE * 2, 3);
    
    // Front leg
    this.ctx.fillStyle = benchDark;
    this.ctx.fillRect(x + TILE_SIZE * 2 - 8, y + 32, 6, 22);
    
    // Decorative glow when nearby
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.beginPath();
    this.ctx.arc(x + TILE_SIZE, y + 20, 40, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  private drawGeoDeposit(x: number, y: number, width: number, height: number) {
    this.ctx.fillStyle = COLORS.platformLight;
    this.ctx.fillRect(x, y, width, height);
    
    // Geo sparkle
    this.ctx.fillStyle = COLORS.geo;
    const time = Date.now() / 500;
    for (let i = 0; i < 3; i++) {
      const sparkX = x + width / 2 + Math.sin(time + i * 2) * 8;
      const sparkY = y + height / 2 + Math.cos(time + i * 2) * 6;
      this.ctx.beginPath();
      this.ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawPlayer(player: Player) {
    const { position, hitbox, facing, state, invincibilityFrames, currentAttackDirection } = player;
    const x = position.x + hitbox.width / 2;
    const y = position.y + hitbox.height / 2;
    
    // Flicker during invincibility
    if (invincibilityFrames > 0 && Math.floor(invincibilityFrames * 20) % 2 === 0) {
      return;
    }
    
    const scale = facing === 'left' ? -1 : 1;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, 1);
    
    // Draw cloak/body - distinctive teardrop shape
    this.ctx.fillStyle = COLORS.playerCloak;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -8);
    this.ctx.bezierCurveTo(-16, 0, -14, 28, 0, 32);
    this.ctx.bezierCurveTo(14, 28, 16, 0, 0, -8);
    this.ctx.fill();
    
    // Inner cloak highlight
    this.ctx.fillStyle = COLORS.playerBody;
    this.ctx.beginPath();
    this.ctx.ellipse(-2, 12, 8, 14, 0.1, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw head - the iconic white mask
    this.ctx.fillStyle = COLORS.playerHead;
    this.ctx.beginPath();
    this.ctx.ellipse(0, -16, 14, 16, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw horns - curved and elegant
    this.ctx.fillStyle = COLORS.playerHorns;
    
    // Left horn
    this.ctx.beginPath();
    this.ctx.moveTo(-6, -26);
    this.ctx.quadraticCurveTo(-10, -38, -4, -46);
    this.ctx.quadraticCurveTo(-2, -38, -4, -26);
    this.ctx.fill();
    
    // Right horn
    this.ctx.beginPath();
    this.ctx.moveTo(6, -26);
    this.ctx.quadraticCurveTo(10, -38, 4, -46);
    this.ctx.quadraticCurveTo(2, -38, 4, -26);
    this.ctx.fill();
    
    // Draw eyes - large dark voids
    this.ctx.fillStyle = COLORS.playerEyes;
    this.ctx.beginPath();
    this.ctx.ellipse(-5, -16, 4, 6, 0.1, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(5, -16, 4, 6, -0.1, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
    
    // Draw attack effect
    if (state === 'attacking' && currentAttackDirection) {
      this.drawAttackEffect(player);
    }
    
    // Draw dash trail
    if (state === 'dashing') {
      this.ctx.fillStyle = COLORS.dash;
      for (let i = 1; i <= 3; i++) {
        const trailX = x - player.velocity.x * 0.02 * i;
        this.ctx.globalAlpha = 0.5 - i * 0.15;
        this.ctx.beginPath();
        this.ctx.ellipse(trailX, y, 18 - i * 3, 24 - i * 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }
    
    // Draw healing effect
    if (state === 'healing') {
      const time = Date.now() / 100;
      
      // Swirling particles
      this.ctx.strokeStyle = COLORS.heal;
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const angle = time * 2 + (i / 6) * Math.PI * 2;
        const radius = 25 + Math.sin(time + i) * 5;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 3, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      
      // Central glow
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 35);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 35, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawAttackEffect(player: Player) {
    const { position, hitbox, currentAttackDirection } = player;
    if (!currentAttackDirection) return;
    
    const attackBox = getAttackHitbox(position, hitbox, currentAttackDirection);
    
    this.ctx.save();
    
    const cx = attackBox.x + attackBox.width / 2;
    const cy = attackBox.y + attackBox.height / 2;
    
    this.ctx.translate(cx, cy);
    
    let rotation = 0;
    switch (currentAttackDirection) {
      case 'right': rotation = 0; break;
      case 'left': rotation = Math.PI; break;
      case 'up': rotation = -Math.PI / 2; break;
      case 'down': rotation = Math.PI / 2; break;
    }
    this.ctx.rotate(rotation);
    
    // Outer glow
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
    gradient.addColorStop(0, COLORS.attackGlow);
    gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 50, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Sharp slash arc
    this.ctx.fillStyle = COLORS.attack;
    this.ctx.beginPath();
    this.ctx.moveTo(-5, 0);
    this.ctx.arc(0, 0, 45, -0.6, 0.6);
    this.ctx.lineTo(-5, 0);
    this.ctx.fill();
    
    // Inner bright core
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 38, -0.3, 0.3);
    this.ctx.lineTo(-3, 0);
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  private drawEnemy(enemy: Enemy) {
    const { position, hitbox, facing, type, health, maxHealth, staggerTimer } = enemy;
    const x = position.x + hitbox.width / 2;
    const y = position.y + hitbox.height / 2;
    
    // Stagger flash
    const isFlashing = staggerTimer > 0 && Math.floor(staggerTimer * 15) % 2 === 0;
    
    const scale = facing === 'left' ? -1 : 1;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, 1);
    
    if (isFlashing) {
      this.ctx.fillStyle = '#ffffff';
    }
    
    // Draw enemy based on type
    switch (type) {
      case 'crawlid':
        this.drawCrawlid(isFlashing);
        break;
      case 'vengefly':
        this.drawVengefly(isFlashing);
        break;
      case 'tiktik':
        this.drawTiktik(isFlashing);
        break;
      case 'gruzzer':
        this.drawGruzzer(isFlashing);
        break;
      case 'husk_guard':
        this.drawHuskGuard(isFlashing);
        break;
      case 'leaping_husk':
        this.drawLeapingHusk(isFlashing);
        break;
      case 'gruz_mother':
        this.drawGruzMother(isFlashing);
        break;
      case 'false_knight':
        this.drawFalseKnight(staggerTimer > 1, isFlashing);
        break;
      default:
        this.ctx.fillStyle = isFlashing ? '#ffffff' : '#ff0000';
        this.ctx.fillRect(-hitbox.width / 2, -hitbox.height / 2, hitbox.width, hitbox.height);
    }
    
    this.ctx.restore();
    
    // Draw health bar for bosses
    if (type === 'false_knight' || type === 'gruz_mother') {
      this.drawBossHealthBar(position.x, position.y - 30, hitbox.width, health, maxHealth);
    }
  }
  
  private drawCrawlid(flash: boolean) {
    // Crawlid - small bug enemy
    if (!flash) {
      // Body
      this.ctx.fillStyle = COLORS.crawlid;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 2, 20, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Shell segments
      this.ctx.fillStyle = COLORS.crawlidDark;
      this.ctx.beginPath();
      this.ctx.ellipse(-8, 0, 6, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Head
      this.ctx.fillStyle = COLORS.crawlidLight;
      this.ctx.beginPath();
      this.ctx.ellipse(14, 0, 8, 8, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eye
      this.ctx.fillStyle = '#2a1a1a';
      this.ctx.beginPath();
      this.ctx.arc(18, -2, 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.ellipse(0, 2, 20, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Legs
    this.ctx.strokeStyle = flash ? '#ffffff' : COLORS.crawlidDark;
    this.ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * 8, 10);
      this.ctx.lineTo(i * 12, 18);
      this.ctx.stroke();
    }
  }
  
  private drawVengefly(flash: boolean) {
    const wingFlap = Math.sin(Date.now() / 40) * 0.4;
    
    if (!flash) {
      // Wings
      this.ctx.fillStyle = COLORS.vengeflyWing;
      this.ctx.save();
      this.ctx.rotate(wingFlap);
      this.ctx.beginPath();
      this.ctx.ellipse(-14, -10, 14, 8, -0.3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      
      this.ctx.save();
      this.ctx.rotate(-wingFlap);
      this.ctx.beginPath();
      this.ctx.ellipse(14, -10, 14, 8, 0.3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      
      // Body
      this.ctx.fillStyle = COLORS.vengefly;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 16, 18, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eyes
      this.ctx.fillStyle = '#ffeecc';
      this.ctx.beginPath();
      this.ctx.ellipse(-5, -4, 5, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(5, -4, 5, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Pupils
      this.ctx.fillStyle = '#2a1a1a';
      this.ctx.beginPath();
      this.ctx.arc(-5, -3, 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(5, -3, 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 16, 18, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawTiktik(flash: boolean) {
    if (!flash) {
      // Shell
      this.ctx.fillStyle = COLORS.tiktikShell;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Body center
      this.ctx.fillStyle = COLORS.tiktik;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eye
      this.ctx.fillStyle = '#ffeecc';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#2a1a1a';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Legs (always visible)
    this.ctx.strokeStyle = flash ? '#ffffff' : COLORS.tiktik;
    this.ctx.lineWidth = 2;
    const legAnim = Math.sin(Date.now() / 100) * 0.2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + legAnim;
      this.ctx.beginPath();
      this.ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
      this.ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
      this.ctx.stroke();
    }
  }
  
  private drawGruzzer(flash: boolean) {
    if (!flash) {
      // Fuzzy body
      this.ctx.fillStyle = COLORS.gruzzerFuzz;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Date.now() / 500;
        const bumpX = Math.cos(angle) * 14;
        const bumpY = Math.sin(angle) * 14;
        this.ctx.beginPath();
        this.ctx.arc(bumpX, bumpY, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // Main body
      this.ctx.fillStyle = COLORS.gruzzer;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Face
      this.ctx.fillStyle = '#ffddaa';
      this.ctx.beginPath();
      this.ctx.ellipse(8, 0, 8, 10, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eyes
      this.ctx.fillStyle = '#2a1a1a';
      this.ctx.beginPath();
      this.ctx.arc(10, -3, 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(10, 3, 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawHuskGuard(flash: boolean) {
    if (!flash) {
      // Body armor
      this.ctx.fillStyle = COLORS.huskGuardArmor;
      this.ctx.fillRect(-22, -35, 44, 70);
      
      // Shoulder plates
      this.ctx.fillStyle = COLORS.huskGuard;
      this.ctx.fillRect(-26, -30, 8, 20);
      this.ctx.fillRect(18, -30, 8, 20);
      
      // Head
      this.ctx.beginPath();
      this.ctx.arc(0, -42, 14, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Shield
      this.ctx.fillStyle = COLORS.falseKnightGlow;
      this.ctx.beginPath();
      this.ctx.ellipse(-28, 0, 8, 25, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eyes
      this.ctx.fillStyle = '#ffcc88';
      this.ctx.beginPath();
      this.ctx.arc(-4, -44, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(4, -44, 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillRect(-22, -35, 44, 70);
    }
  }
  
  private drawLeapingHusk(flash: boolean) {
    if (!flash) {
      // Thin body
      this.ctx.fillStyle = COLORS.leapingHusk;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 14, 28, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Head
      this.ctx.fillStyle = COLORS.huskGuard;
      this.ctx.beginPath();
      this.ctx.arc(0, -32, 12, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eyes
      this.ctx.fillStyle = '#ffaa66';
      this.ctx.beginPath();
      this.ctx.arc(-4, -34, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(4, -34, 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Arms
      this.ctx.strokeStyle = COLORS.leapingHusk;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(-12, -10);
      this.ctx.lineTo(-20, 5);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(12, -10);
      this.ctx.lineTo(20, 5);
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 14, 28, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawGruzMother(flash: boolean) {
    if (!flash) {
      // Large fuzzy body
      this.ctx.fillStyle = COLORS.gruzzerFuzz;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const bumpX = Math.cos(angle) * 38;
        const bumpY = Math.sin(angle) * 28;
        this.ctx.beginPath();
        this.ctx.arc(bumpX, bumpY, 10, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // Main body
      this.ctx.fillStyle = COLORS.gruzMother;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 40, 30, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Face
      this.ctx.fillStyle = '#ffddaa';
      this.ctx.beginPath();
      this.ctx.ellipse(28, 0, 18, 16, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Eyes
      this.ctx.fillStyle = '#2a1a1a';
      this.ctx.beginPath();
      this.ctx.arc(32, -6, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(32, 6, 5, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, 40, 30, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawFalseKnight(staggered: boolean, flash: boolean) {
    if (staggered) {
      // Show vulnerable maggot
      if (!flash) {
        this.ctx.fillStyle = '#ffccaa';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 25, 28, 20, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Scared eyes
        this.ctx.fillStyle = '#2a1a1a';
        this.ctx.beginPath();
        this.ctx.arc(-8, 22, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(8, 22, 4, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.beginPath();
        this.ctx.ellipse(0, 25, 28, 20, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // Collapsed armor
      this.ctx.fillStyle = flash ? '#ffffff' : COLORS.falseKnightArmor;
      this.ctx.fillRect(-55, 15, 110, 50);
    } else {
      if (!flash) {
        // Full armor - imposing figure
        this.ctx.fillStyle = COLORS.falseKnightArmor;
        
        // Body
        this.ctx.fillRect(-55, -35, 110, 100);
        
        // Shoulder pads
        this.ctx.fillStyle = COLORS.falseKnightGlow;
        this.ctx.fillRect(-65, -30, 15, 30);
        this.ctx.fillRect(50, -30, 15, 30);
        
        // Head/Helmet
        this.ctx.fillStyle = COLORS.falseKnight;
        this.ctx.beginPath();
        this.ctx.arc(0, -50, 35, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Helmet visor
        this.ctx.fillStyle = COLORS.falseKnightGlow;
        this.ctx.fillRect(-20, -55, 40, 15);
        
        // Eyes glow
        this.ctx.fillStyle = '#ffaa44';
        this.ctx.beginPath();
        this.ctx.arc(-8, -50, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(8, -50, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Mace
        this.ctx.fillStyle = COLORS.huskGuard;
        this.ctx.fillRect(50, -25, 22, 70);
        this.ctx.fillStyle = COLORS.falseKnightGlow;
        this.ctx.beginPath();
        this.ctx.arc(61, -35, 28, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Mace spikes
        this.ctx.fillStyle = COLORS.spikeTip;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const spikeX = 61 + Math.cos(angle) * 28;
          const spikeY = -35 + Math.sin(angle) * 28;
          this.ctx.beginPath();
          this.ctx.moveTo(spikeX, spikeY);
          this.ctx.lineTo(spikeX + Math.cos(angle) * 12, spikeY + Math.sin(angle) * 12);
          this.ctx.lineTo(spikeX + Math.cos(angle + 0.3) * 5, spikeY + Math.sin(angle + 0.3) * 5);
          this.ctx.fill();
        }
      } else {
        this.ctx.fillRect(-55, -35, 110, 100);
      }
    }
  }
  
  private drawBossHealthBar(x: number, y: number, width: number, health: number, maxHealth: number) {
    const barWidth = Math.max(width, 120);
    const barHeight = 10;
    const healthPercent = Math.max(0, health / maxHealth);
    
    // Background
    this.ctx.fillStyle = '#1a1a2a';
    this.ctx.fillRect(x + (width - barWidth) / 2 - 2, y - 2, barWidth + 4, barHeight + 4);
    
    // Empty bar
    this.ctx.fillStyle = '#3a2a2a';
    this.ctx.fillRect(x + (width - barWidth) / 2, y, barWidth, barHeight);
    
    // Health bar with gradient
    if (healthPercent > 0) {
      const gradient = this.ctx.createLinearGradient(
        x + (width - barWidth) / 2, y,
        x + (width - barWidth) / 2, y + barHeight
      );
      gradient.addColorStop(0, '#ff6644');
      gradient.addColorStop(0.5, '#ff4422');
      gradient.addColorStop(1, '#cc3311');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x + (width - barWidth) / 2, y, barWidth * healthPercent, barHeight);
    }
    
    // Border
    this.ctx.strokeStyle = '#888888';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + (width - barWidth) / 2, y, barWidth, barHeight);
  }
  
  private drawProjectile(projectile: Projectile) {
    const { position, hitbox, type, velocity } = projectile;
    const x = position.x + hitbox.width / 2;
    const y = position.y + hitbox.height / 2;
    
    if (type === 'vengeful_spirit') {
      // Outer glow
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 40);
      gradient.addColorStop(0, 'rgba(160, 200, 255, 0.8)');
      gradient.addColorStop(0.4, 'rgba(136, 204, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(136, 204, 255, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, 40, 20, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Core shape
      this.ctx.fillStyle = 'rgba(200, 230, 255, 0.9)';
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, 25, 12, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Bright center
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Trailing wisps
      for (let i = 1; i <= 3; i++) {
        const trailX = x - velocity.x * 0.015 * i;
        this.ctx.fillStyle = `rgba(160, 200, 255, ${0.4 - i * 0.1})`;
        this.ctx.beginPath();
        this.ctx.ellipse(trailX, y, 15 - i * 3, 8 - i * 2, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
  
  private drawParticle(particle: Particle) {
    const { position, size, color, lifetime, maxLifetime, type } = particle;
    const alpha = lifetime / maxLifetime;
    
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    
    switch (type) {
      case 'soul':
        const gradient = this.ctx.createRadialGradient(
          position.x, position.y, 0,
          position.x, position.y, size * alpha
        );
        gradient.addColorStop(0, 'rgba(200, 230, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(160, 200, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, size * alpha, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'heal':
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'hit':
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, size * (1 - alpha * 0.5), 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'death':
        this.ctx.fillStyle = `rgba(255, 120, 60, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
        this.ctx.fill();
        break;
      default:
        this.ctx.fillRect(position.x - size / 2, position.y - size / 2, size, size);
    }
    
    this.ctx.globalAlpha = 1;
  }
  
  private drawUI(player: Player, gameTime: number, equippedCharms: Charm[] = []) {
    const { stats } = player;
    const padding = 24;
    
    // Health masks - authentic mask shape
    const maskSize = 30;
    const maskSpacing = 4;
    for (let i = 0; i < stats.maxHealth; i++) {
      const x = padding + i * (maskSize + maskSpacing);
      const y = padding;
      
      // Mask border/shadow
      this.ctx.fillStyle = COLORS.maskBorder;
      this.ctx.beginPath();
      this.ctx.moveTo(x + maskSize / 2, y - 2);
      this.ctx.lineTo(x + maskSize + 2, y + maskSize * 0.4);
      this.ctx.lineTo(x + maskSize * 0.85, y + maskSize + 2);
      this.ctx.lineTo(x + maskSize * 0.15, y + maskSize + 2);
      this.ctx.lineTo(x - 2, y + maskSize * 0.4);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Mask fill
      this.ctx.fillStyle = i < stats.currentHealth ? COLORS.maskFull : COLORS.maskEmpty;
      this.ctx.beginPath();
      this.ctx.moveTo(x + maskSize / 2, y);
      this.ctx.lineTo(x + maskSize, y + maskSize * 0.4);
      this.ctx.lineTo(x + maskSize * 0.8, y + maskSize);
      this.ctx.lineTo(x + maskSize * 0.2, y + maskSize);
      this.ctx.lineTo(x, y + maskSize * 0.4);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Highlight on full masks
      if (i < stats.currentHealth) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(x + maskSize / 2, y + 4);
        this.ctx.lineTo(x + maskSize * 0.7, y + maskSize * 0.4);
        this.ctx.lineTo(x + maskSize * 0.3, y + maskSize * 0.4);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }
    
    // Soul meter
    const soulRadius = 36;
    const soulX = padding + soulRadius;
    const soulY = padding + maskSize + 24 + soulRadius;
    
    // Outer ring
    this.ctx.strokeStyle = COLORS.maskBorder;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(soulX, soulY, soulRadius + 2, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Background
    this.ctx.fillStyle = COLORS.soulEmpty;
    this.ctx.beginPath();
    this.ctx.arc(soulX, soulY, soulRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Soul fill with glow
    const soulPercent = stats.currentSoul / stats.maxSoul;
    if (soulPercent > 0) {
      // Glow effect
      const glowGradient = this.ctx.createRadialGradient(soulX, soulY, 0, soulX, soulY, soulRadius);
      glowGradient.addColorStop(0, 'rgba(160, 200, 255, 0.3)');
      glowGradient.addColorStop(1, 'rgba(160, 200, 255, 0)');
      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(soulX, soulY, soulRadius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Actual soul fill
      this.ctx.fillStyle = COLORS.soulFull;
      this.ctx.beginPath();
      this.ctx.moveTo(soulX, soulY);
      this.ctx.arc(soulX, soulY, soulRadius - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * soulPercent);
      this.ctx.closePath();
      this.ctx.fill();
    }
    
    // Soul segments (3 segments for 3 casts)
    this.ctx.strokeStyle = COLORS.soulEmpty;
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(soulX, soulY);
      this.ctx.lineTo(
        soulX + Math.cos(angle) * soulRadius,
        soulY + Math.sin(angle) * soulRadius
      );
      this.ctx.stroke();
    }
    
    // Center dot
    this.ctx.fillStyle = COLORS.maskBorder;
    this.ctx.beginPath();
    this.ctx.arc(soulX, soulY, 6, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Geo counter
    this.ctx.fillStyle = COLORS.geo;
    this.ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'left';
    
    // Geo icon
    const geoX = padding;
    const geoY = this.height - padding - 8;
    this.ctx.beginPath();
    this.ctx.moveTo(geoX + 8, geoY - 12);
    this.ctx.lineTo(geoX + 16, geoY - 4);
    this.ctx.lineTo(geoX + 8, geoY + 4);
    this.ctx.lineTo(geoX, geoY - 4);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.fillText(`${stats.geo}`, geoX + 24, geoY);
    
    // Draw equipped charms (small icons)
    const charmIconSize = 22;
    const charmStartX = this.width - 24 - equippedCharms.length * (charmIconSize + 4);
    const charmY = 24;
    
    for (let i = 0; i < equippedCharms.length; i++) {
      const charm = equippedCharms[i];
      const cx = charmStartX + i * (charmIconSize + 4) + charmIconSize / 2;
      const cy = charmY + charmIconSize / 2;
      
      // Charm background
      this.ctx.fillStyle = 'rgba(60, 60, 80, 0.8)';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, charmIconSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Charm border
      this.ctx.strokeStyle = '#8888aa';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, charmIconSize / 2, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Charm icon (simplified - just show a symbol)
      this.ctx.fillStyle = this.getCharmColor(charm.id);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, charmIconSize / 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Controls hint (subtle)
    this.ctx.fillStyle = 'rgba(150, 150, 170, 0.6)';
    this.ctx.font = '12px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('WASD/Arrows Move | Z/Space Jump | X/J Attack | C/K Dash | V/B Focus/Spell | TAB/M Charms | L Map | P Reset | ESC Pause', this.width - padding, this.height - padding);
  }
  
  private drawDialogue(line: { speaker?: string; text: string }) {
    const boxHeight = 130;
    const padding = 24;
    
    // Background with border
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
    this.ctx.fillRect(0, this.height - boxHeight, this.width, boxHeight);
    
    // Top border
    this.ctx.strokeStyle = COLORS.maskBorder;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height - boxHeight);
    this.ctx.lineTo(this.width, this.height - boxHeight);
    this.ctx.stroke();
    
    // Inner border
    this.ctx.strokeStyle = 'rgba(100, 100, 120, 0.5)';
    this.ctx.strokeRect(padding, this.height - boxHeight + padding / 2, this.width - padding * 2, boxHeight - padding);
    
    // Speaker name
    if (line.speaker) {
      this.ctx.fillStyle = COLORS.geo;
      this.ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(line.speaker, padding * 2, this.height - boxHeight + padding * 2);
    }
    
    // Text
    this.ctx.fillStyle = '#e8e8f0';
    this.ctx.font = '16px "Segoe UI", Arial, sans-serif';
    this.ctx.fillText(line.text, padding * 2, this.height - boxHeight + padding * 3.5);
  }
  
  private getCharmColor(charmId: CharmId): string {
    const colors: Record<CharmId, string> = {
      wayward_compass: '#88aadd',
      gathering_swarm: '#ddcc88',
      stalwart_shell: '#aaaacc',
      soul_catcher: '#aaccff',
      shaman_stone: '#cc88ff',
      soul_eater: '#8888ff',
      dashmaster: '#88ddaa',
      sprintmaster: '#aaddaa',
      grubsong: '#ffcc88',
      quick_slash: '#ff8888',
      steady_body: '#cccccc',
      quick_focus: '#ffffff',
      deep_focus: '#88ffff',
      lifeblood_heart: '#88ccff',
      longnail: '#ccccaa',
      mark_of_pride: '#ffccaa',
      fury_of_the_fallen: '#ff4444',
      thorns_of_agony: '#555555',
      grubberflys_elegy: '#ffff88',
      spell_twister: '#dd88ff',
    };
    return colors[charmId] || '#888888';
  }
  
  private drawCharmMenu(charmState: CharmState, mousePos: { x: number; y: number }) {
    // Full screen overlay
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.95)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Title
    this.ctx.fillStyle = '#e8e8f0';
    this.ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CHARMS', this.width / 2, 50);
    
    // Notches display
    this.ctx.font = '18px "Segoe UI", Arial, sans-serif';
    this.ctx.fillStyle = charmState.overcharmed ? '#ff6666' : '#aaaacc';
    this.ctx.fillText(`Notches: ${charmState.usedNotches} / ${charmState.maxNotches}${charmState.overcharmed ? ' (OVERCHARMED - Double Damage!)' : ''}`, this.width / 2, 80);
    
    // Draw all charms in a grid
    const gridCols = 5;
    const charmSize = 60;
    const padding = 20;
    const startX = (this.width - (gridCols * (charmSize + padding))) / 2 + charmSize / 2;
    const startY = 120;
    
    let hoveredCharm: Charm | null = null;
    
    let index = 0;
    charmState.charms.forEach((charm) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const cx = startX + col * (charmSize + padding);
      const cy = startY + row * (charmSize + padding + 30);
      
      // Check if mouse is hovering over this charm
      const dx = mousePos.x - cx;
      const dy = mousePos.y - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const isHovered = distance <= charmSize / 2 && charm.acquired;
      
      if (isHovered) {
        hoveredCharm = charm;
      }
      
      // Charm background with hover effect
      if (!charm.acquired) {
        this.ctx.fillStyle = 'rgba(30, 30, 40, 0.5)';
      } else if (charm.equipped) {
        this.ctx.fillStyle = isHovered ? 'rgba(100, 120, 160, 0.9)' : 'rgba(80, 100, 140, 0.8)';
      } else {
        this.ctx.fillStyle = isHovered ? 'rgba(70, 70, 100, 0.9)' : 'rgba(50, 50, 70, 0.8)';
      }
      
      // Scale up slightly on hover
      const hoverScale = isHovered ? 1.1 : 1;
      const displaySize = (charmSize / 2) * hoverScale;
      
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, displaySize, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Charm border with hover glow
      if (isHovered) {
        // Glow effect
        this.ctx.shadowColor = charm.equipped ? '#aaccff' : '#ffffff';
        this.ctx.shadowBlur = 10;
      }
      
      this.ctx.strokeStyle = charm.equipped ? '#aaccff' : charm.acquired ? (isHovered ? '#ccccee' : '#8888aa') : '#444455';
      this.ctx.lineWidth = charm.equipped ? 3 : (isHovered ? 3 : 2);
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, displaySize, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      
      // Charm icon
      if (charm.acquired) {
        this.ctx.fillStyle = this.getCharmColor(charm.id);
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, (charmSize / 3) * hoverScale, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add inner highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(cx - 4 * hoverScale, cy - 4 * hoverScale, (charmSize / 6) * hoverScale, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Lock icon for unacquired charms
        this.ctx.fillStyle = '#444455';
        this.ctx.fillRect(cx - 8, cy - 4, 16, 12);
        this.ctx.strokeStyle = '#444455';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy - 6, 6, Math.PI, 0);
        this.ctx.stroke();
      }
      
      // Charm name (small)
      this.ctx.fillStyle = charm.acquired ? (isHovered ? '#ffffff' : '#ccccdd') : '#666677';
      this.ctx.font = isHovered ? 'bold 11px "Segoe UI", Arial, sans-serif' : '11px "Segoe UI", Arial, sans-serif';
      this.ctx.textAlign = 'center';
      const shortName = charm.name.length > 12 ? charm.name.substring(0, 10) + '...' : charm.name;
      this.ctx.fillText(shortName, cx, cy + charmSize / 2 + 14);
      
      // Notch cost
      if (charm.acquired) {
        this.ctx.fillStyle = isHovered ? '#aaaacc' : '#888899';
        this.ctx.font = '10px "Segoe UI", Arial, sans-serif';
        this.ctx.fillText(`${charm.notchCost}◆`, cx, cy + charmSize / 2 + 26);
      }
      
      index++;
    });
    
    // Draw hovered charm description at bottom
    if (hoveredCharm) {
      // Description box
      const boxHeight = 80;
      const boxY = this.height - boxHeight - 50;
      
      this.ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
      this.ctx.fillRect(40, boxY, this.width - 80, boxHeight);
      
      this.ctx.strokeStyle = '#6666aa';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(40, boxY, this.width - 80, boxHeight);
      
      // Charm name
      this.ctx.fillStyle = this.getCharmColor(hoveredCharm.id);
      this.ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(hoveredCharm.name, 60, boxY + 25);
      
      // Notch cost
      this.ctx.fillStyle = '#aaaacc';
      this.ctx.font = '14px "Segoe UI", Arial, sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`Cost: ${hoveredCharm.notchCost} Notch${hoveredCharm.notchCost > 1 ? 'es' : ''}`, this.width - 60, boxY + 25);
      
      // Description
      this.ctx.fillStyle = '#ccccdd';
      this.ctx.font = '14px "Segoe UI", Arial, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(hoveredCharm.description, 60, boxY + 50);
      
      // Status
      this.ctx.fillStyle = hoveredCharm.equipped ? '#88ff88' : '#ffcc88';
      this.ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
      this.ctx.fillText(hoveredCharm.equipped ? '✓ EQUIPPED - Click to unequip' : 'Click to equip', 60, boxY + 70);
    }
    
    // Instructions
    this.ctx.fillStyle = 'rgba(150, 150, 170, 0.8)';
    this.ctx.font = '14px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Click charms to equip/unequip  •  Press M or TAB to close', this.width / 2, this.height - 20);
  }
  
  private drawPauseMenu() {
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.85)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Title
    this.ctx.fillStyle = '#e8e8f0';
    this.ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 40);
    
    // Subtitle
    this.ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
    this.ctx.font = '20px "Segoe UI", Arial, sans-serif';
    this.ctx.fillText('Press ESC to resume', this.width / 2, this.height / 2 + 10);
    
    // Exit to Menu button
    this.drawExitButton(this.width / 2, this.height / 2 + 70);
  }
  
  private drawExitButton(cx: number, cy: number) {
    const btnW = 220;
    const btnH = 44;
    const btnX = cx - btnW / 2;
    const btnY = cy - btnH / 2;
    
    // Store for hit detection
    this.exitButtonBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
    
    // Button background
    this.ctx.fillStyle = 'rgba(42, 42, 58, 0.9)';
    this.ctx.beginPath();
    this.ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    this.ctx.fill();
    
    // Border
    this.ctx.strokeStyle = '#a8c8ff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    this.ctx.stroke();
    
    // Text
    this.ctx.fillStyle = '#e8e8f0';
    this.ctx.font = '20px Georgia, serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('EXIT TO MENU', cx, cy);
    this.ctx.textBaseline = 'alphabetic';
  }
  
  getExitButtonBounds(): { x: number; y: number; w: number; h: number } | null {
    return this.exitButtonBounds;
  }
  
  private drawSettingsMenu(
    audioSettings: { musicVolume: number; sfxVolume: number; ambientVolume: number },
    mousePos: { x: number; y: number }
  ) {
    // Dark overlay
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    const centerX = this.width / 2;
    const startY = 80;
    
    // Title
    this.ctx.fillStyle = '#e8e8f0';
    this.ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SETTINGS', centerX, startY);
    
    // Decorative line
    this.ctx.strokeStyle = '#6666aa';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 120, startY + 20);
    this.ctx.lineTo(centerX + 120, startY + 20);
    this.ctx.stroke();
    
    // Volume controls
    const sliderWidth = 300;
    const sliderHeight = 12;
    const sliderX = centerX - sliderWidth / 2;
    const sliders = [
      { label: '🎵 Music Volume', value: audioSettings.musicVolume, y: startY + 80, key: 'music' },
      { label: '🔊 Sound Effects', value: audioSettings.sfxVolume, y: startY + 160, key: 'sfx' },
      { label: '🌫️ Ambient Sounds', value: audioSettings.ambientVolume, y: startY + 240, key: 'ambient' },
    ];
    
    sliders.forEach(slider => {
      // Label
      this.ctx.fillStyle = '#ccccdd';
      this.ctx.font = '18px "Segoe UI", Arial, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(slider.label, sliderX, slider.y - 20);
      
      // Percentage
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#88aaff';
      this.ctx.fillText(`${Math.round(slider.value * 100)}%`, sliderX + sliderWidth, slider.y - 20);
      
      // Slider track (background)
      this.ctx.fillStyle = '#2a2a3a';
      this.ctx.fillRect(sliderX, slider.y, sliderWidth, sliderHeight);
      
      // Slider track border
      this.ctx.strokeStyle = '#4a4a6a';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(sliderX, slider.y, sliderWidth, sliderHeight);
      
      // Filled portion
      const fillWidth = slider.value * sliderWidth;
      const gradient = this.ctx.createLinearGradient(sliderX, 0, sliderX + fillWidth, 0);
      gradient.addColorStop(0, '#6688cc');
      gradient.addColorStop(1, '#88aaff');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(sliderX, slider.y, fillWidth, sliderHeight);
      
      // Handle/knob
      const handleX = sliderX + fillWidth;
      const handleY = slider.y + sliderHeight / 2;
      const handleRadius = 10;
      
      // Check if mouse is hovering over this slider
      const isHovering = 
        mousePos.x >= sliderX - 10 && 
        mousePos.x <= sliderX + sliderWidth + 10 &&
        mousePos.y >= slider.y - 10 && 
        mousePos.y <= slider.y + sliderHeight + 10;
      
      // Handle glow when hovering
      if (isHovering) {
        this.ctx.shadowColor = '#88aaff';
        this.ctx.shadowBlur = 15;
      }
      
      // Handle circle
      this.ctx.beginPath();
      this.ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = isHovering ? '#aaccff' : '#88aaff';
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
    });
    
    // Instructions
    this.ctx.fillStyle = 'rgba(150, 150, 170, 0.8)';
    this.ctx.font = '16px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Click and drag sliders to adjust volume', centerX, this.height - 100);
    this.ctx.fillText('Press ESC to resume game', centerX, this.height - 70);
    
    // Exit to Menu button
    this.drawExitButton(centerX, this.height - 30);
  }
  
  private drawDirtmouthBackground(room: Room, camera: Camera, time: number) {
    const T = TILE_SIZE;
    
    // Distant mountain silhouettes
    this.ctx.fillStyle = '#1a1e2e';
    this.ctx.beginPath();
    this.ctx.moveTo(0, room.height * 0.4);
    for (let x = 0; x < room.width; x += T * 3) {
      const h = room.height * 0.3 + Math.sin(x * 0.01 + 1) * T * 3;
      this.ctx.lineTo(x, h);
    }
    this.ctx.lineTo(room.width, room.height);
    this.ctx.lineTo(0, room.height);
    this.ctx.fill();
    
    // Building silhouettes behind platforms
    const buildings = [
      { x: T * 8, w: T * 4, h: T * 5 },
      { x: T * 29, w: T * 5, h: T * 6 },
      { x: T * 39, w: T * 6, h: T * 5 },
      { x: T * 48, w: T * 4, h: T * 4 },
    ];
    
    for (const b of buildings) {
      const by = T * 13 - b.h;
      this.ctx.fillStyle = '#1e2230';
      this.ctx.fillRect(b.x, by, b.w, b.h);
      
      // Roof
      this.ctx.fillStyle = '#252938';
      this.ctx.beginPath();
      this.ctx.moveTo(b.x - 4, by);
      this.ctx.lineTo(b.x + b.w / 2, by - T * 1.5);
      this.ctx.lineTo(b.x + b.w + 4, by);
      this.ctx.fill();
      
      // Window glow
      this.ctx.fillStyle = `rgba(200, 170, 100, ${0.3 + Math.sin(time + b.x) * 0.1})`;
      this.ctx.fillRect(b.x + b.w * 0.2, by + b.h * 0.3, b.w * 0.2, b.h * 0.2);
      this.ctx.fillRect(b.x + b.w * 0.6, by + b.h * 0.3, b.w * 0.2, b.h * 0.2);
    }
    
    // Streetlamp near well
    const lampX = T * 23;
    const lampY = T * 7;
    this.ctx.strokeStyle = '#4a4a5a';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(lampX, T * 13);
    this.ctx.lineTo(lampX, lampY);
    this.ctx.lineTo(lampX + 8, lampY);
    this.ctx.stroke();
    
    // Lamp glow
    const lampGlow = this.ctx.createRadialGradient(lampX + 8, lampY + 4, 0, lampX + 8, lampY + 4, T * 3);
    lampGlow.addColorStop(0, 'rgba(200, 170, 100, 0.25)');
    lampGlow.addColorStop(1, 'transparent');
    this.ctx.fillStyle = lampGlow;
    this.ctx.beginPath();
    this.ctx.arc(lampX + 8, lampY + 4, T * 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Lamp bulb
    this.ctx.fillStyle = 'rgba(230, 200, 130, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(lampX + 8, lampY + 4, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Floating dust motes (gentler for surface)
    this.ctx.fillStyle = 'rgba(180, 180, 200, 0.1)';
    for (let i = 0; i < 15; i++) {
      const bx = (i * 137) % room.width;
      const by = (i * 211) % (room.height * 0.7) + room.height * 0.1;
      const x = bx + Math.sin(time * 0.3 + i) * 8;
      const y = by + Math.cos(time * 0.2 + i * 1.3) * 10;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  // Get slider bounds for hit detection (used by Game.ts)
  getVolumeSliderBounds(): { key: string; x: number; y: number; width: number; height: number }[] {
    const centerX = this.width / 2;
    const sliderWidth = 300;
    const sliderHeight = 12;
    const sliderX = centerX - sliderWidth / 2;
    const startY = 80;
    
    return [
      { key: 'music', x: sliderX, y: startY + 80, width: sliderWidth, height: sliderHeight },
      { key: 'sfx', x: sliderX, y: startY + 160, width: sliderWidth, height: sliderHeight },
      { key: 'ambient', x: sliderX, y: startY + 240, width: sliderWidth, height: sliderHeight },
    ];
  }
  
  private drawNPC(npc: NPC) {
    const { position, hitbox, appearance, name } = npc;
    const x = position.x + hitbox.width / 2;
    const y = position.y + hitbox.height / 2;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    
    if (appearance.hasCape && appearance.capeColor) {
      this.ctx.fillStyle = appearance.capeColor;
      this.ctx.beginPath();
      this.ctx.moveTo(-8, -5);
      this.ctx.bezierCurveTo(-14, 5, -12, hitbox.height * 0.4, -6, hitbox.height * 0.45);
      this.ctx.lineTo(6, hitbox.height * 0.45);
      this.ctx.bezierCurveTo(12, hitbox.height * 0.4, 14, 5, 8, -5);
      this.ctx.fill();
    }
    
    this.ctx.fillStyle = appearance.bodyColor;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 5, hitbox.width * 0.4, hitbox.height * 0.35, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = appearance.headColor;
    this.ctx.beginPath();
    this.ctx.arc(0, -hitbox.height * 0.25, hitbox.width * 0.45, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = appearance.eyeColor;
    this.ctx.beginPath();
    this.ctx.arc(-4, -hitbox.height * 0.27, 2.5, 0, Math.PI * 2);
    this.ctx.arc(4, -hitbox.height * 0.27, 2.5, 0, Math.PI * 2);
    this.ctx.fill();
    
    if (appearance.hasHat && appearance.hatColor) {
      this.ctx.fillStyle = appearance.hatColor;
      this.ctx.beginPath();
      this.ctx.ellipse(0, -hitbox.height * 0.4, hitbox.width * 0.55, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillRect(-hitbox.width * 0.3, -hitbox.height * 0.55, hitbox.width * 0.6, hitbox.height * 0.15);
    }
    
    if (appearance.hasBeard) {
      this.ctx.fillStyle = 'rgba(180, 180, 170, 0.7)';
      this.ctx.beginPath();
      this.ctx.moveTo(-5, -hitbox.height * 0.15);
      this.ctx.quadraticCurveTo(0, hitbox.height * 0.05, 5, -hitbox.height * 0.15);
      this.ctx.fill();
    }
    
    this.ctx.restore();
    
    this.ctx.fillStyle = 'rgba(232, 232, 240, 0.6)';
    this.ctx.font = '11px Georgia, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name, x, position.y - 8);
  }
  
  private drawInteractPrompt(npc: NPC) {
    const x = npc.position.x + npc.hitbox.width / 2;
    const y = npc.position.y - 20;
    const time = Date.now() / 600;
    const bob = Math.sin(time) * 3;
    
    this.ctx.fillStyle = 'rgba(232, 232, 240, 0.9)';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + bob - 8);
    this.ctx.lineTo(x - 6, y + bob - 16);
    this.ctx.lineTo(x + 6, y + bob - 16);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.font = 'bold 12px Georgia, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('↑ Talk', x, y + bob - 20);
  }
  
  private drawShopUI(shopState: ShopState, playerGeo: number, mousePos: { x: number; y: number }) {
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    const centerX = this.width / 2;
    const npcName = shopState.npcId === 'sly' ? "Sly's Shop" : 
                    shopState.npcId === 'iselda' ? "Iselda's Shop" : 'Shop';
    
    this.ctx.fillStyle = '#e8d080';
    this.ctx.font = 'bold 32px Georgia, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(npcName, centerX, 60);
    
    this.ctx.font = '18px Georgia, serif';
    this.ctx.fillText(`Geo: ${playerGeo}`, centerX, 95);
    
    this.ctx.strokeStyle = '#6a6a7a';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - 150, 110);
    this.ctx.lineTo(centerX + 150, 110);
    this.ctx.stroke();
    
    const startY = 140;
    const itemHeight = 60;
    const startX = centerX - 200;
    const itemWidth = 400;
    
    for (let i = 0; i < shopState.items.length; i++) {
      const item = shopState.items[i];
      const iy = startY + i * itemHeight;
      
      const isHovered = !item.sold &&
        mousePos.x >= startX && mousePos.x <= startX + itemWidth &&
        mousePos.y >= iy && mousePos.y <= iy + itemHeight - 5;
      
      if (item.sold) {
        this.ctx.fillStyle = 'rgba(30, 30, 40, 0.4)';
      } else if (isHovered) {
        this.ctx.fillStyle = 'rgba(60, 60, 90, 0.8)';
      } else {
        this.ctx.fillStyle = 'rgba(30, 30, 50, 0.7)';
      }
      this.ctx.fillRect(startX, iy, itemWidth, itemHeight - 5);
      
      this.ctx.strokeStyle = isHovered ? '#a8c8ff' : 'rgba(100, 100, 120, 0.5)';
      this.ctx.lineWidth = isHovered ? 2 : 1;
      this.ctx.strokeRect(startX, iy, itemWidth, itemHeight - 5);
      
      this.ctx.textAlign = 'left';
      if (item.sold) {
        this.ctx.fillStyle = '#555566';
        this.ctx.font = '16px Georgia, serif';
        this.ctx.fillText(`${item.name} — SOLD`, startX + 15, iy + 22);
      } else {
        this.ctx.fillStyle = isHovered ? '#ffffff' : '#ccccdd';
        this.ctx.font = 'bold 16px Georgia, serif';
        this.ctx.fillText(item.name, startX + 15, iy + 22);
        
        this.ctx.fillStyle = 'rgba(180, 180, 200, 0.8)';
        this.ctx.font = '12px Georgia, serif';
        this.ctx.fillText(item.description, startX + 15, iy + 42);
        
        const canAfford = playerGeo >= item.cost;
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = canAfford ? '#e8d080' : '#ff6666';
        this.ctx.font = 'bold 16px Georgia, serif';
        this.ctx.fillText(`${item.cost} Geo`, startX + itemWidth - 15, iy + 30);
      }
    }
    
    const closeY = startY + shopState.items.length * itemHeight + 20;
    const closeHovered = mousePos.y >= closeY && mousePos.y <= closeY + 40 &&
      mousePos.x >= centerX - 60 && mousePos.x <= centerX + 60;
    
    this.ctx.fillStyle = closeHovered ? 'rgba(80, 80, 110, 0.8)' : 'rgba(40, 40, 60, 0.8)';
    this.ctx.fillRect(centerX - 60, closeY, 120, 40);
    this.ctx.strokeStyle = closeHovered ? '#a8c8ff' : '#6a6a7a';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(centerX - 60, closeY, 120, 40);
    
    this.ctx.fillStyle = '#ccccdd';
    this.ctx.font = '16px Georgia, serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Close (ESC)', centerX, closeY + 26);
  }
  
  private drawDeathScreen() {
    this.ctx.fillStyle = 'rgba(10, 10, 18, 0.9)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Death text with glow
    this.ctx.shadowColor = '#ff4444';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#ff6655';
    this.ctx.font = 'bold 56px "Segoe UI", Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('YOU DIED', this.width / 2, this.height / 2 - 20);
    this.ctx.shadowBlur = 0;
    
    // Respawn hint
    this.ctx.fillStyle = 'rgba(200, 200, 220, 0.8)';
    this.ctx.font = '22px "Segoe UI", Arial, sans-serif';
    this.ctx.fillText('Press Z to respawn at bench', this.width / 2, this.height / 2 + 40);
  }
}
