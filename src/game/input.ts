import { InputState } from './types';

// Key mappings (configurable)
const KEY_BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'Space'],
  attack: ['KeyX', 'KeyJ'],
  dash: ['KeyC', 'KeyK'],
  cast: ['KeyV', 'KeyB'], // V/B + direction for spells
  focus: ['KeyV', 'KeyB'], // Hold V/B to focus/heal
  pause: ['Escape'],
  map: ['Tab', 'KeyM'],
  mapHold: ['KeyL'], // Hold L to show map
  reset: ['KeyP'], // Reset to bench
};

export interface MouseState {
  x: number;
  y: number;
  clicked: boolean;
  justClicked: boolean;
}

class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private keysJustReleased: Set<string> = new Set();
  private canvas: HTMLCanvasElement | null = null;
  
  // Mouse state
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDown: boolean = false;
  private mouseJustClicked: boolean = false;
  
  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }
  
  init(canvas?: HTMLCanvasElement) {
    this.canvas = canvas || null;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }
  
  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }
  
  private handleKeyDown(e: KeyboardEvent) {
    if (!this.keysDown.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keysDown.add(e.code);
    
    // Prevent default for game keys
    if (this.isGameKey(e.code)) {
      e.preventDefault();
    }
  }
  
  private handleKeyUp(e: KeyboardEvent) {
    this.keysDown.delete(e.code);
    this.keysJustReleased.add(e.code);
  }
  
  private handleMouseMove(e: MouseEvent) {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    } else {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }
  }
  
  private handleMouseDown(e: MouseEvent) {
    if (!this.mouseDown) {
      this.mouseJustClicked = true;
    }
    this.mouseDown = true;
  }
  
  private handleMouseUp(e: MouseEvent) {
    this.mouseDown = false;
  }
  
  private isGameKey(code: string): boolean {
    return Object.values(KEY_BINDINGS).some(keys => keys.includes(code));
  }
  
  private isKeyDown(keys: string[]): boolean {
    return keys.some(key => this.keysDown.has(key));
  }
  
  private isKeyJustPressed(keys: string[]): boolean {
    return keys.some(key => this.keysJustPressed.has(key));
  }
  
  getState(): InputState {
    const state = {
      left: this.isKeyDown(KEY_BINDINGS.left),
      right: this.isKeyDown(KEY_BINDINGS.right),
      up: this.isKeyDown(KEY_BINDINGS.up),
      down: this.isKeyDown(KEY_BINDINGS.down),
      jump: this.isKeyDown(KEY_BINDINGS.jump),
      attack: this.isKeyDown(KEY_BINDINGS.attack),
      dash: this.isKeyDown(KEY_BINDINGS.dash),
      cast: this.isKeyDown(KEY_BINDINGS.cast),
      focus: this.isKeyDown(KEY_BINDINGS.focus),
      pause: this.isKeyJustPressed(KEY_BINDINGS.pause),
      map: this.isKeyJustPressed(KEY_BINDINGS.map),
      mapHeld: this.isKeyDown(KEY_BINDINGS.mapHold),
      reset: this.isKeyJustPressed(KEY_BINDINGS.reset),
      jumpPressed: this.isKeyJustPressed(KEY_BINDINGS.jump),
      attackPressed: this.isKeyJustPressed(KEY_BINDINGS.attack),
      dashPressed: this.isKeyJustPressed(KEY_BINDINGS.dash),
      castPressed: this.isKeyJustPressed(KEY_BINDINGS.cast),
    };
    
    // Debug logging for attack input
    if (state.attackPressed) {
      console.log('[Input] Attack pressed detected!');
    }
    
    return state;
  }
  
  getMouseState(): MouseState {
    return {
      x: this.mouseX,
      y: this.mouseY,
      clicked: this.mouseDown,
      justClicked: this.mouseJustClicked,
    };
  }
  
  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }
  
  // Call at end of each frame to clear just-pressed states
  endFrame() {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseJustClicked = false;
  }
}

export const inputManager = new InputManager();
