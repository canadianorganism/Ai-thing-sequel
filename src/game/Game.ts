import {
  GameState,
  Player,
  Room,
  Projectile,
  Particle,
  Camera,
  InputState,
  PLAYER_CONSTANTS,
} from './types';
import { createPlayer, updatePlayer, damagePlayer, pogoPlayer, addSoul, addGeo } from './player';
import { updateEnemy, damageEnemy, checkEnemyHit, createEnemy } from './enemies';
import { getRoom } from './rooms/forgotten-crossroads';
import { inputManager } from './input';
import { Renderer } from './renderer';
import { getAttackHitbox, rectanglesOverlap, getWorldHitbox, distance } from './physics';
import { audioManager } from './audio';
import { 
  BreakableWall, 
  GeoPickup, 
  createBreakableWall, 
  damageBreakableWall, 
  updateGeoPickups, 
  checkBreakableWallHit 
} from './breakables';
import {
  CharmState,
  CharmEffects,
  createCharmState,
  calculateCharmEffects,
  getModifiedPlayerConstants,
  equipCharm,
  unequipCharm,
  getEquippedCharms,
  CharmId,
} from './charms';
import {
  GrubContainer,
  createAllGrubs,
  damageGrubContainer,
  checkGrubHit,
} from './grubs';
import {
  NPC,
  ShopState,
  ShopItem,
  createShopState,
  createDirtmouthNPCs,
} from './npc';
import { saveGame, loadGame, SaveData } from './saveService';
import { AdaptiveAI, AdaptiveHint } from './adaptiveAI';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private state: GameState;
  private lastTime: number = 0;
  private running: boolean = false;
  private projectileIdCounter: number = 0;
  private particleIdCounter: number = 0;
  private breakableWalls: Map<string, BreakableWall[]> = new Map();
  private geoPickups: GeoPickup[] = [];
  private grubContainers: GrubContainer[] = [];
  private grubsCollected: number = 0;
  private grubNotificationTimer: number = 0;
  private audioInitialized: boolean = false;
  private lastPlayerState: string = 'idle';
  private charmState: CharmState;
  private charmEffects: CharmEffects;
  private charmMenuOpen: boolean = false;
  private draggingSlider: string | null = null;
  private attackHitEnemies: Set<string> = new Set();
  private npcs: NPC[] = [];
  private shopState: ShopState;
  private npcDialogueActive: boolean = false;
  private npcDialogueNpc: NPC | null = null;
  private npcDialogueIndex: number = 0;
  private interactPromptNpc: NPC | null = null;
  private userId: string | null = null;
  private saveNotificationTimer: number = 0;
  private benchRoomId: string = 'dirtmouth';
  private shadeRoomId: string | null = null;
  private shadePosition: { x: number; y: number } | null = null;
  private shadeGeo: number = 0;
  private shadeSpawned: boolean = false;
  private adaptiveAI: AdaptiveAI;
  private currentHint: AdaptiveHint | null = null;
  private hintDisplayTimer: number = 0;
  private onQuit: (() => void) | null = null;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    
    // Initialize game state - start in Dirtmouth
    const startRoom = getRoom('dirtmouth');
    const player = createPlayer(startRoom.spawnPoint.x, startRoom.spawnPoint.y);
    
    this.state = {
      player,
      currentRoom: startRoom,
      projectiles: [],
      particles: [],
      camera: {
        position: { x: player.position.x, y: player.position.y },
        target: { x: player.position.x, y: player.position.y },
        bounds: { x: 0, y: 0, width: startRoom.width, height: startRoom.height },
        shake: 0,
      },
      isPaused: false,
      dialogueActive: false,
      currentDialogue: null,
      dialogueIndex: 0,
      gameTime: 0,
      benchPosition: { ...startRoom.spawnPoint },
      visitedRooms: new Set([startRoom.id]),
    };
    
    // Initialize adaptive AI
    this.adaptiveAI = new AdaptiveAI();
    
    // Initialize charm system
    this.charmState = createCharmState();
    this.charmEffects = calculateCharmEffects(this.charmState);
    
    // Initialize NPCs
    this.npcs = createDirtmouthNPCs();
    this.shopState = createShopState();
    
    // Initialize breakable walls for all rooms
    this.initBreakableWalls();
    
    // Initialize grub containers
    this.grubContainers = createAllGrubs();
    
    // Handle resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }
  
  private initBreakableWalls() {
    // Add breakable walls to each room
    this.breakableWalls.set('crossroads_1', [
      createBreakableWall('wall_1_1', 32 * 52, 32 * 18, 32 * 2, 32 * 5, 25),
      createBreakableWall('wall_1_2', 32 * 20, 32 * 16, 32 * 2, 32 * 3, 15),
    ]);
    this.breakableWalls.set('crossroads_2', [
      createBreakableWall('wall_2_1', 32 * 15, 32 * 25, 32 * 2, 32 * 4, 30),
    ]);
    this.breakableWalls.set('crossroads_3', [
      createBreakableWall('wall_3_1', 32 * 38, 32 * 12, 32 * 2, 32 * 4, 20),
      createBreakableWall('wall_3_2', 32 * 10, 32 * 8, 32 * 2, 32 * 3, 15),
    ]);
  }
  
  handleResize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      this.renderer.resize(width, height);
    }
  }
  
  setOnQuit(callback: () => void) {
    this.onQuit = callback;
  }
  
  start() {
    inputManager.init(this.canvas);
    inputManager.setCanvas(this.canvas);
    audioManager.init();
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  stop() {
    this.running = false;
    inputManager.destroy();
    audioManager.destroy();
    window.removeEventListener('resize', this.handleResize);
  }
  
  private async initAudioOnInteraction() {
    if (!this.audioInitialized) {
      console.log('[Game] First interaction detected, initializing audio...');
      this.audioInitialized = true; // Set flag first to prevent multiple calls
      await audioManager.resume();
      audioManager.startAmbient();
      audioManager.startMusic();
      console.log('[Game] Audio initialization complete');
    }
  }
  
  private gameLoop(currentTime: number) {
    if (!this.running) return;
    
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05); // Cap at 50ms
    this.lastTime = currentTime;
    
    const input = inputManager.getState();
    const mouse = inputManager.getMouseState();
    
    // Initialize audio on first user interaction
    if (input.jump || input.attack || input.dash || mouse.justClicked) {
      this.initAudioOnInteraction();
    }
    
    // Handle charm menu interactions
    if (this.charmMenuOpen && mouse.justClicked) {
      this.handleCharmMenuClick(mouse.x, mouse.y);
    }
    
    // Handle shop interactions
    if (this.shopState.isOpen && mouse.justClicked) {
      this.handleShopClick(mouse.x, mouse.y);
    }
    
    // Handle NPC dialogue advancement
    if (this.npcDialogueActive && this.npcDialogueNpc) {
      if (input.jumpPressed || input.attackPressed) {
        this.npcDialogueIndex++;
        if (this.npcDialogueIndex >= this.npcDialogueNpc.dialogue.length) {
          // End dialogue, open shop if NPC has one
          this.npcDialogueActive = false;
          if (this.npcDialogueNpc.shop) {
            // Sync sold state with charm acquisition
            for (const item of this.npcDialogueNpc.shop) {
              if (item.type === 'charm' && item.charmId) {
                const charm = this.charmState.charms.get(item.charmId);
                if (charm && charm.acquired) item.sold = true;
              }
            }
            this.shopState.isOpen = true;
            this.shopState.npcId = this.npcDialogueNpc.id;
            this.shopState.items = this.npcDialogueNpc.shop;
            this.shopState.selectedIndex = 0;
          }
          this.npcDialogueNpc = null;
          this.npcDialogueIndex = 0;
        }
      }
    }
    
    // Close shop with escape
    if (this.shopState.isOpen && input.pause) {
      this.shopState.isOpen = false;
      this.shopState.npcId = null;
      // Don't toggle pause
    } else if (this.shopState.isOpen) {
      // Shop is open, don't process other inputs
    }
    // Handle volume slider interactions when paused (not in charm menu)
    else if (this.state.isPaused && !this.charmMenuOpen) {
      this.handleVolumeSliderInteraction(mouse);
      // Check exit button click
      if (mouse.justClicked) {
        const exitBounds = this.renderer.getExitButtonBounds();
        if (exitBounds && mouse.x >= exitBounds.x && mouse.x <= exitBounds.x + exitBounds.w &&
            mouse.y >= exitBounds.y && mouse.y <= exitBounds.y + exitBounds.h) {
          this.stop();
          if (this.onQuit) this.onQuit();
          return;
        }
      }
    }
    
    // Handle pause (only if shop/dialogue not open)
    if (!this.shopState.isOpen && !this.npcDialogueActive) {
      if (input.pause) {
        this.state.isPaused = !this.state.isPaused;
        this.charmMenuOpen = false;
        this.draggingSlider = null;
      }
      
      // Handle charm menu (M key or TAB)
      if (input.map && !this.charmMenuOpen) {
        this.charmMenuOpen = true;
        this.state.isPaused = true;
      } else if (input.map && this.charmMenuOpen) {
        this.charmMenuOpen = false;
        this.state.isPaused = false;
      }
    }
    
    // Track player state changes for audio
    if (this.state.player.state !== this.lastPlayerState) {
      if (this.state.player.state === 'attacking') {
        audioManager.playAttack();
        this.adaptiveAI.recordAttack(this.state.player.currentAttackDirection || 'right');
      } else if (this.state.player.state === 'dashing') {
        audioManager.playDash();
        this.adaptiveAI.recordDash();
      } else if (this.state.player.state === 'jumping' && this.lastPlayerState !== 'wall_sliding') {
        audioManager.playJump();
        this.adaptiveAI.recordJump();
      } else if (this.state.player.state === 'dead') {
        audioManager.playDeath();
        this.adaptiveAI.recordDeath(this.state.currentRoom.id);
      } else if (this.state.player.state === 'healing' && this.lastPlayerState !== 'healing') {
        audioManager.playHeal();
        this.adaptiveAI.recordHeal();
      }
      this.lastPlayerState = this.state.player.state;
    }
    
    if (!this.state.isPaused && !this.npcDialogueActive && !this.shopState.isOpen && this.state.player.state !== 'dead') {
      this.adaptiveAI.update(deltaTime);
      this.update(deltaTime, input);
      
      // Check for hints
      const hint = this.adaptiveAI.getHint();
      if (hint) {
        this.currentHint = hint;
        this.hintDisplayTimer = 8; // Show hint for 8 seconds
      }
      if (this.hintDisplayTimer > 0) {
        this.hintDisplayTimer -= deltaTime;
        if (this.hintDisplayTimer <= 0) this.currentHint = null;
      }
    }
    
    // Handle respawn (death with shade mechanic)
    if (this.state.player.state === 'dead' && input.jumpPressed) {
      this.handleDeathAndRespawn();
    }
    
    // Handle reset to bench (P key)
    if (input.reset && !this.state.isPaused) {
      this.respawn();
    }
    
    // Render with breakables, geo, grubs, charms, and NPCs
    const roomBreakables = this.breakableWalls.get(this.state.currentRoom.id) || [];
    const roomGrubs = this.grubContainers.filter(g => g.roomId === this.state.currentRoom.id);
    const equippedCharms = getEquippedCharms(this.charmState);
    const roomNpcs = this.state.currentRoom.id === 'dirtmouth' ? this.npcs : [];
    
    // Update grub notification timer
    if (this.grubNotificationTimer > 0) {
      this.grubNotificationTimer -= Math.min((performance.now() - this.lastTime + 16) / 1000, 0.05);
    }
    
    // Get audio settings for settings menu
    const audioSettings = this.state.isPaused && !this.charmMenuOpen && !this.shopState.isOpen ? {
      musicVolume: audioManager.getMusicVolume(),
      sfxVolume: audioManager.getSfxVolume(),
      ambientVolume: audioManager.getAmbientVolume(),
    } : null;
    
    this.renderer.render(
      this.state, 
      roomBreakables, 
      this.geoPickups, 
      equippedCharms, 
      this.charmMenuOpen ? this.charmState : null,
      { x: mouse.x, y: mouse.y },
      audioSettings,
      input.mapHeld,
      roomGrubs,
      this.grubsCollected,
      this.grubNotificationTimer,
      roomNpcs,
      this.interactPromptNpc,
      this.npcDialogueActive ? this.npcDialogueNpc : null,
      this.npcDialogueIndex,
      this.shopState,
      this.currentHint,
      this.hintDisplayTimer
    );
    
    // Clear just-pressed states
    inputManager.endFrame();
    
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  private update(deltaTime: number, input: InputState) {
    const { player, currentRoom, projectiles, particles, camera } = this.state;
    
    this.state.gameTime += deltaTime;
    
    // Recalculate charm effects (in case health changed for Fury/Elegy)
    this.charmEffects = calculateCharmEffects(this.charmState);
    const modifiedConstants = getModifiedPlayerConstants(this.charmEffects, player);
    
    // Update player with charm-modified constants
    updatePlayer(
      player,
      input,
      currentRoom,
      deltaTime,
      this.createProjectile.bind(this),
      this.createParticles.bind(this),
      modifiedConstants
    );
    
    // Check player attack hits (use modified attack timing)
    // Clear hit tracking when not attacking
    if (player.state !== 'attacking') {
      this.attackHitEnemies.clear();
    }
    
    if (player.state === 'attacking' && player.currentAttackDirection && player.attackCooldown > modifiedConstants.ATTACK_COOLDOWN - 0.1) {
      const attackHitbox = getAttackHitbox(player.position, player.hitbox, player.currentAttackDirection, modifiedConstants.ATTACK_RANGE);
      
      // Check breakable walls
      const roomBreakables = this.breakableWalls.get(currentRoom.id) || [];
      for (const wall of roomBreakables) {
        if (checkBreakableWallHit(wall, attackHitbox)) {
          const result = damageBreakableWall(wall, player.stats.nailDamage, this.createParticles.bind(this));
          audioManager.playHit();
          camera.shake = 0.15;
          
          if (result.broken) {
            audioManager.playBreak();
            this.geoPickups.push(...result.geoDropped);
          }
        }
      }
      
      // Check grub containers in current room
      for (const grub of this.grubContainers) {
        if (grub.roomId === currentRoom.id && !grub.broken) {
          if (checkGrubHit(grub, attackHitbox)) {
            const freed = damageGrubContainer(grub, player.stats.nailDamage, this.createParticles.bind(this));
            audioManager.playHit();
            camera.shake = 0.15;
            
            if (freed) {
              this.grubsCollected = this.grubContainers.filter(g => g.collected).length;
              this.grubNotificationTimer = 3; // Show notification for 3 seconds
              audioManager.playGeoCollect();
              
              // Check if all 10 grubs collected - unlock Grubberfly's Elegy
              if (this.grubsCollected >= 10) {
                const elegy = this.charmState.charms.get('grubberflys_elegy');
                if (elegy && !elegy.acquired) {
                  elegy.acquired = true;
                  this.grubNotificationTimer = 5; // Longer notification for charm unlock
                }
              }
            }
          }
        }
      }
      
      for (const enemy of currentRoom.enemies) {
        if (enemy.state === 'dead') continue;
        if (this.attackHitEnemies.has(enemy.id)) continue;
        
        if (checkEnemyHit(enemy, attackHitbox)) {
          this.attackHitEnemies.add(enemy.id);
          const knockbackDir = {
            x: enemy.position.x > player.position.x ? 1 : -1,
            y: player.currentAttackDirection === 'down' ? 1 : player.currentAttackDirection === 'up' ? -1 : 0,
          };
          
          // Apply charm damage multiplier (Fury of the Fallen) + adaptive AI multiplier
          const aiMods = this.adaptiveAI.getModifiers();
          const damage = Math.max(1, Math.floor(player.stats.nailDamage * modifiedConstants.NAIL_DAMAGE_MULTIPLIER * aiMods.playerDamageMultiplier));
          const killed = damageEnemy(enemy, damage, knockbackDir, this.createParticles.bind(this));
          this.adaptiveAI.recordHitLanded(enemy.type, damage);
          audioManager.playHit();
          addSoul(player, modifiedConstants.SOUL_PER_HIT);
          
          if (player.currentAttackDirection === 'down') {
            pogoPlayer(player);
          }
          
          camera.shake = 0.2;
          
          if (killed) {
            // Shade drops its stored geo
            if (enemy.type === 'shade') {
              addGeo(player, this.shadeGeo);
              this.shadeGeo = 0;
              this.shadeRoomId = null;
              this.shadePosition = null;
              this.shadeSpawned = false;
            } else {
              addGeo(player, Math.floor(Math.random() * 5) + 1);
            }
            
            if (enemy.type === 'gruz_mother') {
              for (let i = 0; i < 4; i++) {
                const gruzzer = createEnemy(
                  'gruzzer',
                  enemy.position.x + (Math.random() - 0.5) * 60,
                  enemy.position.y
                );
                currentRoom.enemies.push(gruzzer);
              }
            }
          }
        }
      }
      
      // Fire Grubberfly's Elegy beam when at full health
      if (modifiedConstants.SHOULD_FIRE_ELEGY) {
        const dir = player.currentAttackDirection === 'left' ? -1 :
                    player.currentAttackDirection === 'right' ? 1 :
                    player.facing === 'right' ? 1 : -1;
        const isVertical = player.currentAttackDirection === 'up' || player.currentAttackDirection === 'down';
        const vertDir = player.currentAttackDirection === 'up' ? -1 : player.currentAttackDirection === 'down' ? 1 : 0;
        
        const spawnX = player.position.x + player.hitbox.width / 2 + (isVertical ? 0 : dir * 20);
        const spawnY = player.position.y + player.hitbox.height / 2 + (isVertical ? vertDir * 20 : 0);
        
        this.createProjectile({
          type: 'vengeful_spirit',
          position: { x: spawnX, y: spawnY },
          velocity: { 
            x: isVertical ? 0 : dir * 500, 
            y: isVertical ? vertDir * 500 : 0 
          },
          hitbox: { x: 0, y: 0, width: isVertical ? 20 : 40, height: isVertical ? 40 : 20 },
          damage: player.stats.nailDamage * 3,
          lifetime: 0.6,
          fromPlayer: true,
        });
      }
    }
    
    // Update geo pickups
    updateGeoPickups(
      this.geoPickups,
      player.position,
      player.hitbox,
      deltaTime,
      (value) => {
        addGeo(player, value);
        audioManager.playGeoCollect();
      }
    );
    
    // Update enemies with adaptive AI counter strategies
    const aiModifiers = this.adaptiveAI.getModifiers();
    for (const enemy of currentRoom.enemies) {
      if (enemy.state === 'dead') continue;
      
      const counterStrategy = this.adaptiveAI.getEnemyCounterStrategy(enemy.type);
      updateEnemy(enemy, player, currentRoom, deltaTime, this.createParticles.bind(this), counterStrategy, aiModifiers);
      
      // Check enemy collision with player
      if (player.invincibilityFrames <= 0 && player.state !== 'dashing') {
        const playerHitbox = getWorldHitbox(player.position, player.hitbox);
        const enemyHitbox = getWorldHitbox(enemy.position, enemy.hitbox);
        
        if (rectanglesOverlap(playerHitbox, enemyHitbox)) {
          const knockbackDir = {
            x: player.position.x > enemy.position.x ? 1 : -1,
            y: 0,
          };
          
          // Overcharmed = double damage, then apply adaptive AI modifier
          const baseDamage = this.charmState.overcharmed ? enemy.damage * 2 : enemy.damage;
          const damage = Math.max(1, Math.round(baseDamage * aiModifiers.enemyDamageMultiplier));
          this.adaptiveAI.recordDamageTaken(enemy.type, damage);
          damagePlayer(player, damage, knockbackDir, this.charmEffects, this.createParticles.bind(this));
          camera.shake = 0.3;
        }
      }
    }
    
    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      
      // Move projectile
      proj.position.x += proj.velocity.x * deltaTime;
      proj.position.y += proj.velocity.y * deltaTime;
      proj.lifetime -= deltaTime;
      
      // Check lifetime
      if (proj.lifetime <= 0) {
        projectiles.splice(i, 1);
        continue;
      }
      
      // Check collisions
      if (proj.fromPlayer) {
        // Player projectile hits enemies
        for (const enemy of currentRoom.enemies) {
          if (enemy.state === 'dead') continue;
          
          const projHitbox = getWorldHitbox(proj.position, proj.hitbox);
          const enemyHitbox = getWorldHitbox(enemy.position, enemy.hitbox);
          
          if (rectanglesOverlap(projHitbox, enemyHitbox)) {
            const knockbackDir = { x: proj.velocity.x > 0 ? 1 : -1, y: 0 };
            const scaledDamage = Math.max(1, Math.round(proj.damage * aiModifiers.playerDamageMultiplier));
            damageEnemy(enemy, scaledDamage, knockbackDir, this.createParticles.bind(this));
            this.adaptiveAI.recordHitLanded(enemy.type, scaledDamage);
            
            // Don't remove Vengeful Spirit on hit (it passes through)
            if (proj.type !== 'vengeful_spirit') {
              projectiles.splice(i, 1);
            }
            break;
          }
        }
      }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.lifetime -= deltaTime;
      
      // Apply gravity to some particle types
      if (particle.type === 'dust' || particle.type === 'spark') {
        particle.velocity.y += 200 * deltaTime;
      }
      
      if (particle.lifetime <= 0) {
        particles.splice(i, 1);
      }
    }
    
    // Update camera shake
    if (camera.shake > 0) {
      camera.shake -= deltaTime * 2;
      if (camera.shake < 0) camera.shake = 0;
    }
    
    // Update camera position (follow player)
    camera.target.x = player.position.x + player.hitbox.width / 2;
    camera.target.y = player.position.y + player.hitbox.height / 2;
    
    // Smooth camera follow
    const smoothing = 5;
    camera.position.x += (camera.target.x - camera.position.x) * smoothing * deltaTime;
    camera.position.y += (camera.target.y - camera.position.y) * smoothing * deltaTime;
    
    // Clamp camera to room bounds
    const halfWidth = this.canvas.width / 2;
    const halfHeight = this.canvas.height / 2;
    
    camera.position.x = Math.max(halfWidth, Math.min(currentRoom.width - halfWidth, camera.position.x));
    camera.position.y = Math.max(halfHeight, Math.min(currentRoom.height - halfHeight, camera.position.y));
    
    // Out-of-bounds detection: reset player if they fall below or go far outside room
    if (player.position.y > currentRoom.height + 200 ||
        player.position.x < -200 ||
        player.position.x > currentRoom.width + 200) {
      this.respawn();
      return;
    }
    
    // Check room transitions
    for (const transition of currentRoom.transitions) {
      const playerHitbox = getWorldHitbox(player.position, player.hitbox);
      
      if (rectanglesOverlap(playerHitbox, transition.from)) {
        this.transitionToRoom(transition.toRoom, transition.toPosition);
        break;
      }
    }
    
    // Check bench interaction
    for (const interactable of currentRoom.interactables) {
      if (interactable.type === 'bench') {
        const playerHitbox = getWorldHitbox(player.position, player.hitbox);
        
        if (rectanglesOverlap(playerHitbox, interactable)) {
          if (input.up) {
            // Rest at bench
            player.stats.currentHealth = player.stats.maxHealth;
            this.state.benchPosition = { x: player.position.x, y: player.position.y };
            this.benchRoomId = currentRoom.id;
            
            // Save game
            this.saveCurrentGame();
            
            // Visual feedback
            this.createParticles([{
              position: { x: player.position.x + player.hitbox.width / 2, y: player.position.y },
              velocity: { x: 0, y: -50 },
              color: '#ffffff',
              size: 20,
              lifetime: 1,
              maxLifetime: 1,
              type: 'heal',
            }]);
          }
        }
      }
    }
    
    // NPC proximity check (only in Dirtmouth)
    if (currentRoom.id === 'dirtmouth') {
      this.interactPromptNpc = null;
      const playerCX = player.position.x + player.hitbox.width / 2;
      const playerCY = player.position.y + player.hitbox.height / 2;
      
      for (const npc of this.npcs) {
        const npcCX = npc.position.x + npc.hitbox.width / 2;
        const npcCY = npc.position.y + npc.hitbox.height / 2;
        const dist = Math.sqrt((playerCX - npcCX) ** 2 + (playerCY - npcCY) ** 2);
        
        if (dist < 60) {
          this.interactPromptNpc = npc;
          
          // Start dialogue on Up press
          if (input.up && !this.npcDialogueActive && !this.shopState.isOpen) {
            this.npcDialogueActive = true;
            this.npcDialogueNpc = npc;
            this.npcDialogueIndex = 0;
          }
          break;
        }
      }
    } else {
      this.interactPromptNpc = null;
    }
    
    // Remove dead enemies after a delay
    for (let i = currentRoom.enemies.length - 1; i >= 0; i--) {
      const enemy = currentRoom.enemies[i];
      if (enemy.state === 'dead') {
        // Create death particles
        for (let j = 0; j < 8; j++) {
          this.createParticles([{
            position: { 
              x: enemy.position.x + enemy.hitbox.width / 2,
              y: enemy.position.y + enemy.hitbox.height / 2
            },
            velocity: { 
              x: (Math.random() - 0.5) * 200,
              y: (Math.random() - 0.5) * 200
            },
            color: '#ff6600',
            size: 6 + Math.random() * 6,
            lifetime: 0.5,
            maxLifetime: 0.5,
            type: 'death',
          }]);
        }
        
        currentRoom.enemies.splice(i, 1);
      }
    }
  }
  
  private createProjectile(proj: Omit<Projectile, 'id'>) {
    this.state.projectiles.push({
      ...proj,
      id: `proj_${this.projectileIdCounter++}`,
    });
  }
  
  private createParticles(particles: Omit<Particle, 'id'>[]) {
    for (const particle of particles) {
      this.state.particles.push({
        ...particle,
        id: `particle_${this.particleIdCounter++}`,
      });
    }
  }
  
  private transitionToRoom(roomId: string, position: { x: number; y: number }) {
    const newRoom = getRoom(roomId);
    
    this.state.currentRoom = newRoom;
    this.state.player.position = { ...position };
    this.state.player.velocity = { x: 0, y: 0 };
    this.state.projectiles = [];
    this.state.particles = [];
    this.state.visitedRooms.add(roomId);
    this.adaptiveAI.recordAreaChange(roomId);
    
    // Update camera bounds
    this.state.camera.bounds = {
      x: 0,
      y: 0,
      width: newRoom.width,
      height: newRoom.height,
    };
    
    // Snap camera to new position
    this.state.camera.position = { ...position };
    this.state.camera.target = { ...position };
    
    // Spawn shade in this room if it died here
    this.trySpawnShade(roomId);
  }
  
  private handleDeathAndRespawn() {
    const { player, currentRoom } = this.state;
    
    // Record shade location (where the player died)
    this.shadeRoomId = currentRoom.id;
    this.shadePosition = { x: player.position.x, y: player.position.y };
    this.shadeGeo = player.stats.geo;
    this.shadeSpawned = false;
    
    // Lose all geo
    player.stats.geo = 0;
    
    this.respawn();
  }
  
  private trySpawnShade(roomId: string) {
    if (this.shadeRoomId === roomId && this.shadePosition && !this.shadeSpawned) {
      const shade = createEnemy('shade', this.shadePosition.x, this.shadePosition.y);
      this.state.currentRoom.enemies.push(shade);
      this.shadeSpawned = true;
    }
  }
  
  private respawn() {
    const { benchPosition, player } = this.state;
    
    if (benchPosition) {
      // Respawn at the room where the last bench was used
      const benchRoom = getRoom(this.benchRoomId);
      this.state.currentRoom = benchRoom;
      player.position = { ...benchPosition };
      player.velocity = { x: 0, y: 0 };
      player.state = 'idle';
      player.invincibilityFrames = 0;
      player.stats.currentHealth = player.stats.maxHealth;
      this.state.projectiles = [];
      this.state.particles = [];
      
      // Reload room enemies
      const freshRoom = getRoom(this.state.currentRoom.id);
      this.state.currentRoom.enemies = freshRoom.enemies;
      
      // Reset camera to bench position
      this.state.camera.bounds = { x: 0, y: 0, width: benchRoom.width, height: benchRoom.height };
      this.state.camera.position = { ...benchPosition };
      this.state.camera.target = { ...benchPosition };
      
      // Spawn shade if it's in bench room
      this.trySpawnShade(this.benchRoomId);
    }
  }
  
  async loadSave(userId: string) {
    this.userId = userId;
    const data = await loadGame(userId);
    if (!data) return; // New game, use defaults
    
    const { player } = this.state;
    
    // Restore player stats
    player.stats.maxHealth = data.maxHealth;
    player.stats.currentHealth = data.maxHealth; // Full health on load
    player.stats.maxSoul = data.maxSoul;
    player.stats.currentSoul = data.currentSoul;
    player.stats.geo = data.geo;
    player.stats.nailDamage = data.nailDamage;
    player.stats.hasDoubleJump = data.hasDoubleJump;
    player.stats.hasDash = data.hasDash;
    player.stats.hasWallJump = data.hasWallJump;
    
    // Restore bench position and spawn there
    this.state.benchPosition = { x: data.benchX, y: data.benchY };
    this.benchRoomId = data.benchRoom;
    const room = getRoom(data.benchRoom);
    this.state.currentRoom = room;
    player.position = { x: data.benchX, y: data.benchY };
    this.state.camera.position = { x: data.benchX, y: data.benchY };
    this.state.camera.target = { x: data.benchX, y: data.benchY };
    this.state.camera.bounds = { x: 0, y: 0, width: room.width, height: room.height };
    
    // Restore charms
    for (const charmId of data.acquiredCharms) {
      const charm = this.charmState.charms.get(charmId as CharmId);
      if (charm) charm.acquired = true;
    }
    for (const charmId of data.equippedCharms) {
      equipCharm(this.charmState, charmId as CharmId);
    }
    this.charmState.maxNotches = data.maxNotches;
    this.charmEffects = calculateCharmEffects(this.charmState);
    
    // Restore progress
    this.state.visitedRooms = new Set(data.visitedRooms);
    this.grubsCollected = data.grubsCollected;
    
    // Restore collected grubs - mark them as broken/collected so they don't respawn
    for (const grubId of data.collectedGrubIds) {
      const grub = this.grubContainers.find(g => g.id === grubId);
      if (grub) {
        grub.broken = true;
        grub.collected = true;
        grub.health = 0;
      }
    }
    
    // Load NPCs for dirtmouth
    if (data.benchRoom === 'dirtmouth') {
      this.npcs = createDirtmouthNPCs();
    }
    
    console.log('[Game] Save loaded successfully');
  }
  
  private async saveCurrentGame() {
    if (!this.userId) return;
    
    const { player, currentRoom } = this.state;
    const acquiredCharms: string[] = [];
    const equippedCharms: string[] = [];
    
    this.charmState.charms.forEach((charm, id) => {
      if (charm.acquired) acquiredCharms.push(id);
      if (charm.equipped) equippedCharms.push(id);
    });
    
    const data: SaveData = {
      maxHealth: player.stats.maxHealth,
      currentHealth: player.stats.currentHealth,
      maxSoul: player.stats.maxSoul,
      currentSoul: player.stats.currentSoul,
      geo: player.stats.geo,
      nailDamage: player.stats.nailDamage,
      hasDoubleJump: player.stats.hasDoubleJump,
      hasDash: player.stats.hasDash,
      hasWallJump: player.stats.hasWallJump,
      benchRoom: currentRoom.id,
      benchX: player.position.x,
      benchY: player.position.y,
      acquiredCharms,
      equippedCharms,
      maxNotches: this.charmState.maxNotches,
      visitedRooms: Array.from(this.state.visitedRooms),
      grubsCollected: this.grubsCollected,
      collectedGrubIds: this.grubContainers.filter(g => g.collected).map(g => g.id),
    };
    
    const success = await saveGame(this.userId, data);
    if (success) {
      this.saveNotificationTimer = 2;
    }
  }
  
  private handleShopClick(mouseX: number, mouseY: number) {
    if (!this.shopState.isOpen) return;
    
    const items = this.shopState.items;
    const startY = 140;
    const itemHeight = 60;
    const startX = this.renderer.getWidth() / 2 - 200;
    const itemWidth = 400;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.sold) continue;
      
      const iy = startY + i * itemHeight;
      
      if (mouseX >= startX && mouseX <= startX + itemWidth &&
          mouseY >= iy && mouseY <= iy + itemHeight - 5) {
        // Try to buy
        if (this.state.player.stats.geo >= item.cost) {
          this.state.player.stats.geo -= item.cost;
          item.sold = true;
          audioManager.playGeoCollect();
          
          if (item.type === 'charm' && item.charmId) {
            const charm = this.charmState.charms.get(item.charmId);
            if (charm) {
              charm.acquired = true;
            }
          } else if (item.type === 'item' && item.itemEffect === 'extra_notch') {
            this.charmState.maxNotches++;
          }
          
          this.charmEffects = calculateCharmEffects(this.charmState);
        }
        break;
      }
    }
    
    // Check close button
    const closeY = startY + items.length * itemHeight + 20;
    if (mouseY >= closeY && mouseY <= closeY + 40 &&
        mouseX >= this.renderer.getWidth() / 2 - 60 && mouseX <= this.renderer.getWidth() / 2 + 60) {
      this.shopState.isOpen = false;
      this.shopState.npcId = null;
    }
  }
  
  private handleVolumeSliderInteraction(mouse: { x: number; y: number; clicked: boolean; justClicked: boolean }) {
    const sliders = this.renderer.getVolumeSliderBounds();
    
    // Handle mouse down - start dragging
    if (mouse.justClicked) {
      for (const slider of sliders) {
        if (
          mouse.x >= slider.x - 15 &&
          mouse.x <= slider.x + slider.width + 15 &&
          mouse.y >= slider.y - 15 &&
          mouse.y <= slider.y + slider.height + 15
        ) {
          this.draggingSlider = slider.key;
          break;
        }
      }
    }
    
    // Handle mouse release - stop dragging
    if (!mouse.clicked) {
      this.draggingSlider = null;
    }
    
    // Handle dragging - update volume
    if (this.draggingSlider && mouse.clicked) {
      const slider = sliders.find(s => s.key === this.draggingSlider);
      if (slider) {
        // Calculate volume based on mouse position
        const volume = Math.max(0, Math.min(1, (mouse.x - slider.x) / slider.width));
        
        switch (this.draggingSlider) {
          case 'music':
            audioManager.setMusicVolume(volume);
            break;
          case 'sfx':
            audioManager.setSfxVolume(volume);
            break;
          case 'ambient':
            audioManager.setAmbientVolume(volume);
            break;
        }
      }
    }
  }
  
  private handleCharmMenuClick(mouseX: number, mouseY: number) {
    // Calculate charm grid layout (must match renderer)
    const gridCols = 5;
    const charmSize = 60;
    const padding = 20;
    const startX = (this.canvas.width - (gridCols * (charmSize + padding))) / 2 + charmSize / 2;
    const startY = 120;
    
    let index = 0;
    const charmIds = Array.from(this.charmState.charms.keys());
    
    for (const charmId of charmIds) {
      const charm = this.charmState.charms.get(charmId);
      if (!charm) continue;
      
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const cx = startX + col * (charmSize + padding);
      const cy = startY + row * (charmSize + padding + 30);
      
      // Check if click is within charm circle
      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= charmSize / 2 && charm.acquired) {
        // Toggle charm
        if (charm.equipped) {
          unequipCharm(this.charmState, charmId);
          audioManager.playHit(); // Use hit sound for unequip feedback
        } else {
          const success = equipCharm(this.charmState, charmId);
          if (success) {
            audioManager.playGeoCollect(); // Use geo sound for equip feedback
          }
        }
        // Recalculate effects immediately
        this.charmEffects = calculateCharmEffects(this.charmState);
        break;
      }
      
      index++;
    }
  }
}
