// Audio Manager for Hollow Knight-style ambient sounds
class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private isInitialized: boolean = false;
  private ambientPlaying: boolean = false;
  private musicPlaying: boolean = false;
  private musicTimeoutId: number | null = null;
  
  // Volume levels (0-1)
  private _musicVolume: number = 1.0;
  private _sfxVolume: number = 0.8;
  private _ambientVolume: number = 0.5;
  
  init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.audioContext.destination);
      
      // Separate gain nodes for each category
      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = this._musicVolume;
      this.musicGain.connect(this.masterGain);
      
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = this._sfxVolume;
      this.sfxGain.connect(this.masterGain);
      
      this.ambientGain = this.audioContext.createGain();
      this.ambientGain.gain.value = this._ambientVolume;
      this.ambientGain.connect(this.masterGain);
      
      this.isInitialized = true;
      console.log('[Audio] Initialized, state:', this.audioContext.state);
    } catch (e) {
      console.warn('[Audio] Web Audio API not supported:', e);
    }
  }
  
  // Volume control methods
  setMusicVolume(volume: number) {
    this._musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this._musicVolume;
    }
  }
  
  setSfxVolume(volume: number) {
    this._sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this._sfxVolume;
    }
  }
  
  setAmbientVolume(volume: number) {
    this._ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.ambientGain) {
      this.ambientGain.gain.value = this._ambientVolume;
    }
  }
  
  getMusicVolume(): number { return this._musicVolume; }
  getSfxVolume(): number { return this._sfxVolume; }
  getAmbientVolume(): number { return this._ambientVolume; }
  
  // Resume audio context after user interaction (required by browser autoplay policy)
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      console.log('[Audio] Resuming suspended context...');
      await this.audioContext.resume();
      console.log('[Audio] Context resumed, state:', this.audioContext.state);
    } else if (this.audioContext) {
      console.log('[Audio] Context already running, state:', this.audioContext.state);
    }
  }
  
  // Start ambient cave atmosphere
  startAmbient() {
    if (!this.audioContext || !this.ambientGain || this.ambientPlaying) {
      console.log('[Audio] Cannot start ambient:', {
        hasContext: !!this.audioContext,
        hasAmbientGain: !!this.ambientGain,
        alreadyPlaying: this.ambientPlaying
      });
      return;
    }
    console.log('[Audio] Starting ambient sounds...');
    this.ambientPlaying = true;
    
    // Deep bass drone - cave rumble
    const bassOsc = this.audioContext.createOscillator();
    const bassGain = this.audioContext.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 40;
    bassGain.gain.value = 0.15;
    bassOsc.connect(bassGain);
    bassGain.connect(this.ambientGain);
    bassOsc.start();
    this.ambientOscillators.push(bassOsc);
    
    // Eerie mid-tone
    const midOsc = this.audioContext.createOscillator();
    const midGain = this.audioContext.createGain();
    midOsc.type = 'sine';
    midOsc.frequency.value = 110;
    midGain.gain.value = 0.06;
    midOsc.connect(midGain);
    midGain.connect(this.ambientGain);
    midOsc.start();
    this.ambientOscillators.push(midOsc);
    
    // High ethereal tone - slight detuning for atmosphere
    const highOsc = this.audioContext.createOscillator();
    const highGain = this.audioContext.createGain();
    highOsc.type = 'sine';
    highOsc.frequency.value = 440;
    highGain.gain.value = 0.01;
    highOsc.connect(highGain);
    highGain.connect(this.ambientGain);
    highOsc.start();
    this.ambientOscillators.push(highOsc);
    
    // Modulate the tones slowly for organic feel
    this.modulateAmbient();
  }
  
  private modulateAmbient() {
    if (!this.audioContext || this.ambientOscillators.length === 0) return;
    
    const time = this.audioContext.currentTime;
    
    // Slowly vary frequencies
    this.ambientOscillators.forEach((osc, i) => {
      const baseFreq = [40, 110, 440][i] || 100;
      const variation = Math.sin(time * 0.1 + i) * 2;
      osc.frequency.setValueAtTime(baseFreq + variation, time);
    });
    
    if (this.ambientPlaying) {
      setTimeout(() => this.modulateAmbient(), 100);
    }
  }
  
  stopAmbient() {
    this.ambientPlaying = false;
    this.ambientOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.ambientOscillators = [];
  }
  
  // Start grim piano background music
  startMusic() {
    if (!this.audioContext || !this.musicGain || this.musicPlaying) {
      console.log('[Audio] Cannot start music:', {
        hasContext: !!this.audioContext,
        hasMusicGain: !!this.musicGain,
        alreadyPlaying: this.musicPlaying
      });
      return;
    }
    console.log('[Audio] Starting piano music...');
    this.musicPlaying = true;
    this.playMelodyLoop();
  }
  
  private playMelodyLoop() {
    if (!this.musicPlaying || !this.audioContext) return;
    
    // Grim, melancholic melody in D minor - low register
    // Notes: D2, A2, F2, E2, D2, C2, D2, rest pattern
    const melody = [
      { note: 73.42, duration: 0.8 },   // D2
      { note: 55.00, duration: 0.6 },   // A1
      { note: 87.31, duration: 0.8 },   // F2
      { note: 82.41, duration: 0.4 },   // E2
      { note: 73.42, duration: 1.0 },   // D2
      { note: 65.41, duration: 0.6 },   // C2
      { note: 73.42, duration: 1.2 },   // D2 (held)
      { note: 0, duration: 0.8 },       // rest
      { note: 55.00, duration: 0.5 },   // A1
      { note: 61.74, duration: 0.5 },   // B1
      { note: 65.41, duration: 0.8 },   // C2
      { note: 73.42, duration: 0.6 },   // D2
      { note: 87.31, duration: 1.0 },   // F2
      { note: 82.41, duration: 0.8 },   // E2
      { note: 73.42, duration: 1.4 },   // D2 (long hold)
      { note: 0, duration: 1.0 },       // rest
    ];
    
    let time = this.audioContext.currentTime;
    
    melody.forEach(({ note, duration }) => {
      if (note > 0) {
        this.playPianoNote(note, time, duration * 0.9);
      }
      time += duration;
    });
    
    // Loop the melody
    const totalDuration = melody.reduce((sum, n) => sum + n.duration, 0) * 1000;
    this.musicTimeoutId = window.setTimeout(() => this.playMelodyLoop(), totalDuration);
  }
  
  private playPianoNote(frequency: number, startTime: number, duration: number) {
    if (!this.audioContext || !this.musicGain) return;
    
    // Piano-like sound using multiple harmonics with quick attack and longer decay
    const harmonics = [1, 2, 3, 4, 5];
    const harmonicGains = [1, 0.5, 0.25, 0.125, 0.0625];
    
    harmonics.forEach((harmonic, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.value = frequency * harmonic;
      
      // Low-pass filter for warmer piano tone
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 1;
      
      // Piano envelope: quick attack, slow decay
      const attackTime = 0.02;
      const decayTime = duration * 0.3;
      const sustainLevel = 0.3;
      const releaseTime = duration * 0.5;
      
      // INCREASED GAIN for audibility
      const baseGain = 0.25 * harmonicGains[i];
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(baseGain, startTime + attackTime);
      gain.gain.exponentialRampToValueAtTime(baseGain * sustainLevel, startTime + attackTime + decayTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + releaseTime);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start(startTime);
      osc.stop(startTime + duration + releaseTime + 0.1);
    });
  }
  
  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimeoutId !== null) {
      clearTimeout(this.musicTimeoutId);
      this.musicTimeoutId = null;
    }
  }
  
  // Play attack sound - sharp metallic slash
  playAttack() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
    
    filter.type = 'highpass';
    filter.frequency.value = 400;
    
    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }
  
  // Play hit sound - impact
  playHit() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.1);
  }
  
  // Play jump sound
  playJump() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.08);
  }
  
  // Play dash sound - whoosh
  playDash() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const bufferSize = this.audioContext.sampleRate * 0.15;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.3;
    }
    
    const source = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;
    gain.gain.value = 0.15;
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    source.start();
  }
  
  // Play geo collect sound - sparkle
  playGeoCollect() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }
  
  // Play break sound - crumble
  playBreak() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const bufferSize = this.audioContext.sampleRate * 0.2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.5;
    }
    
    const source = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    gain.gain.value = 0.2;
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    source.start();
  }
  
  // Play heal sound - ethereal
  playHeal() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, this.audioContext.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.5);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, this.audioContext.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1320, this.audioContext.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.audioContext.currentTime + 0.5);
    osc2.stop(this.audioContext.currentTime + 0.5);
  }
  
  // Play death sound
  playDeath() {
    if (!this.audioContext || !this.sfxGain) return;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.8);
    
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.8);
  }
  
  destroy() {
    this.stopAmbient();
    this.stopMusic();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}

export const audioManager = new AudioManager();
