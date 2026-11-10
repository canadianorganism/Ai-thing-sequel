import { useState, useEffect, useRef } from 'react';

interface GameEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  type: 'player' | 'enemy';
  grounded: boolean;
  attackTimer: number;
  hitTimer: number;
  deathCount: number;
  color: string;
}

const CANVAS_W = 360;
const CANVAS_H = 200;
const GROUND_Y = 165;
const GRAVITY = 600;

const AIComparisonDemo = () => {
  const beforeRef = useRef<HTMLCanvasElement>(null);
  const afterRef = useRef<HTMLCanvasElement>(null);
  const [beforeDeaths, setBeforeDeaths] = useState(0);
  const [afterDeaths, setAfterDeaths] = useState(0);
  const [aiDifficulty, setAiDifficulty] = useState(1.0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const beforeCanvas = beforeRef.current;
    const afterCanvas = afterRef.current;
    if (!beforeCanvas || !afterCanvas) return;

    const ctxB = beforeCanvas.getContext('2d')!;
    const ctxA = afterCanvas.getContext('2d')!;

    // Before: static hard difficulty
    const beforeState = createState(false);
    // After: adaptive AI
    const afterState = createState(true);

    let lastTime = performance.now();
    let bDeaths = 0;
    let aDeaths = 0;
    let difficultyScale = 1.0;

    function createState(adaptive: boolean) {
      return {
        player: createPlayer(),
        enemies: [createEnemy(260, 0.7), createEnemy(180, -0.5)],
        adaptive,
        struggleScore: 0,
        damageScale: 1.0,
        aggroScale: 1.0,
        particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
      };
    }

    function createPlayer(): GameEntity {
      return { x: 60, y: GROUND_Y, vx: 0, vy: 0, health: 5, maxHealth: 5, type: 'player', grounded: true, attackTimer: 0, hitTimer: 0, deathCount: 0, color: '#e8e8f0' };
    }

    function createEnemy(x: number, speed: number): GameEntity {
      return { x, y: GROUND_Y, vx: speed * 60, vy: 0, health: 3, maxHealth: 3, type: 'enemy', grounded: true, attackTimer: 0, hitTimer: 0, deathCount: 0, color: '#ff6644' };
    }

    function update(state: ReturnType<typeof createState>, dt: number) {
      const p = state.player;

      // Simple player AI: move toward nearest enemy, attack, dodge
      const nearest = state.enemies.reduce((a, b) => Math.abs(a.x - p.x) < Math.abs(b.x - p.x) ? a : b);
      const dist = nearest.x - p.x;

      // Move toward enemy
      if (Math.abs(dist) > 40) {
        p.vx = Math.sign(dist) * 120;
      } else {
        p.vx = 0;
        // Attack
        if (p.attackTimer <= 0) {
          p.attackTimer = 0.5;
          state.enemies.forEach(e => {
            if (Math.abs(e.x - p.x) < 50 && e.health > 0) {
              e.health--;
              e.hitTimer = 0.15;
              spawnParticles(state, e.x, e.y - 15, '#ffaa44', 3);
              if (e.health <= 0) {
                // Respawn enemy
                e.health = e.maxHealth;
                e.x = Math.random() > 0.5 ? 300 : 30;
              }
            }
          });
        }
      }

      // Jump occasionally to dodge
      if (p.grounded && nearest.attackTimer > 0 && nearest.attackTimer < 0.15 && Math.abs(dist) < 60) {
        p.vy = -280;
        p.grounded = false;
      }

      // Update player physics
      p.x += p.vx * dt;
      if (!p.grounded) {
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.vy = 0; p.grounded = true; }
      }
      p.x = Math.max(15, Math.min(CANVAS_W - 15, p.x));
      if (p.attackTimer > 0) p.attackTimer -= dt;
      if (p.hitTimer > 0) p.hitTimer -= dt;

      // Enemy AI
      const attackFreq = state.adaptive ? state.aggroScale : 1.0;
      const dmgScale = state.adaptive ? state.damageScale : 1.0;

      state.enemies.forEach(e => {
        if (e.hitTimer > 0) { e.hitTimer -= dt; return; }

        // Patrol / chase
        const eDist = p.x - e.x;
        if (Math.abs(eDist) < 150) {
          e.vx = Math.sign(eDist) * 80 * attackFreq;
        } else {
          // Patrol
          if (e.x < 30 || e.x > CANVAS_W - 30) e.vx *= -1;
        }

        e.x += e.vx * dt;
        e.x = Math.max(15, Math.min(CANVAS_W - 15, e.x));

        // Attack player
        if (e.attackTimer <= 0 && Math.abs(eDist) < 35) {
          e.attackTimer = 1.5 / attackFreq;
          if (p.hitTimer <= 0) {
            const dmg = Math.ceil(dmgScale);
            p.health -= dmg;
            p.hitTimer = 0.6;
            p.vx = -Math.sign(eDist) * 150;
            spawnParticles(state, p.x, p.y - 15, '#ff4444', 4);

            if (p.health <= 0) {
              p.deathCount++;
              if (state.adaptive) {
                // Increase struggle, reduce difficulty
                state.struggleScore = Math.min(1, state.struggleScore + 0.2);
                state.damageScale = Math.max(0.3, 1 - state.struggleScore * 0.6);
                state.aggroScale = Math.max(0.4, 1 - state.struggleScore * 0.5);
                difficultyScale = state.damageScale;
                aDeaths = p.deathCount;
                setAfterDeaths(aDeaths);
                setAiDifficulty(state.damageScale);
              } else {
                bDeaths = p.deathCount;
                setBeforeDeaths(bDeaths);
              }
              // Respawn
              p.health = p.maxHealth;
              p.x = 60;
              p.y = GROUND_Y;
              p.vx = 0;
              p.vy = 0;
              p.grounded = true;
            }
          }
        }
        if (e.attackTimer > 0) e.attackTimer -= dt;
      });

      // Adaptive: slowly recover difficulty when doing well
      if (state.adaptive && state.struggleScore > 0) {
        state.struggleScore = Math.max(0, state.struggleScore - dt * 0.02);
        state.damageScale = Math.max(0.3, 1 - state.struggleScore * 0.6);
        state.aggroScale = Math.max(0.4, 1 - state.struggleScore * 0.5);
      }

      // Update particles
      state.particles.forEach(pt => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 200 * dt;
        pt.life -= dt;
      });
      state.particles = state.particles.filter(pt => pt.life > 0);
    }

    function spawnParticles(state: ReturnType<typeof createState>, x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        state.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 1) * 100,
          life: 0.4 + Math.random() * 0.3,
          color,
        });
      }
    }

    function render(ctx: CanvasRenderingContext2D, state: ReturnType<typeof createState>) {
      // Background
      ctx.fillStyle = '#0d0d18';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Ground
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, GROUND_Y + 20, CANVAS_W, CANVAS_H - GROUND_Y - 20);
      ctx.strokeStyle = '#2a2a4a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 20);
      ctx.lineTo(CANVAS_W, GROUND_Y + 20);
      ctx.stroke();

      // Particles
      state.particles.forEach(pt => {
        ctx.globalAlpha = pt.life * 2;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      const p = state.player;

      // Draw player (knight silhouette)
      ctx.fillStyle = p.hitTimer > 0 ? '#ff6666' : p.color;
      // Body
      ctx.fillRect(p.x - 6, p.y - 28, 12, 20);
      // Head (with horns)
      ctx.fillRect(p.x - 5, p.y - 36, 10, 10);
      ctx.fillRect(p.x - 8, p.y - 40, 4, 6);
      ctx.fillRect(p.x + 4, p.y - 40, 4, 6);
      // Legs
      ctx.fillRect(p.x - 5, p.y - 8, 4, 8);
      ctx.fillRect(p.x + 1, p.y - 8, 4, 8);
      // Nail (weapon)
      if (p.attackTimer > 0.3) {
        ctx.fillStyle = '#c8c8d8';
        ctx.fillRect(p.x + 10, p.y - 30, 20, 3);
      }

      // Draw enemies
      state.enemies.forEach(e => {
        ctx.fillStyle = e.hitTimer > 0 ? '#ffffff' : e.color;
        // Bug body
        ctx.beginPath();
        ctx.ellipse(e.x, e.y - 10, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(e.x - 5, e.y - 14, 3, 3);
        ctx.fillRect(e.x + 2, e.y - 14, 3, 3);
        // Legs
        ctx.fillStyle = e.hitTimer > 0 ? '#ffffff' : e.color;
        ctx.fillRect(e.x - 10, e.y - 2, 3, 6);
        ctx.fillRect(e.x + 7, e.y - 2, 3, 6);
      });

      // Health bar
      const hbW = 50;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(8, 8, hbW, 6);
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(8, 8, hbW * (p.health / p.maxHealth), 6);

      // Adaptive indicator
      if (state.adaptive) {
        ctx.fillStyle = '#a8c8ff';
        ctx.font = '8px monospace';
        ctx.fillText(`AI: ${Math.round(state.damageScale * 100)}%`, CANVAS_W - 52, 14);
      }
    }

    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      update(beforeState, dt);
      update(afterState, dt);
      render(ctxB, beforeState);
      render(ctxA, afterState);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="w-full space-y-4 mb-10">
      <h2 className="text-[#a8c8ff] font-serif text-lg sm:text-xl tracking-wider text-center uppercase">
        See the Difference
      </h2>
      <p className="text-[#6a6a7a] font-serif text-xs text-center max-w-lg mx-auto">
        Two identical simulations run side by side. Without AI, difficulty stays brutal. 
        With the Adaptive AI, the engine detects struggle and adjusts invisibly.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {/* Before */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[#ff6644] font-serif text-xs tracking-wider uppercase">Without AI</span>
            <span className="text-[#6a6a7a] font-serif text-[10px]">Deaths: {beforeDeaths}</span>
          </div>
          <canvas
            ref={beforeRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="border border-[#2a2a3a] bg-[#0d0d18]"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="text-[#5a5a6a] font-serif text-[10px] text-center">
            Fixed difficulty — no adaptation
          </div>
        </div>

        {/* After */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[#44ff88] font-serif text-xs tracking-wider uppercase">With Adaptive AI</span>
            <span className="text-[#6a6a7a] font-serif text-[10px]">Deaths: {afterDeaths}</span>
          </div>
          <canvas
            ref={afterRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="border border-[#a8c8ff]/30 bg-[#0d0d18]"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="flex items-center justify-center gap-2">
            <span className="text-[#5a5a6a] font-serif text-[10px]">AI Difficulty:</span>
            <div className="w-20 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#a8c8ff] transition-all duration-500"
                style={{ width: `${aiDifficulty * 100}%` }}
              />
            </div>
            <span className="text-[#a8c8ff] font-serif text-[10px]">{Math.round(aiDifficulty * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIComparisonDemo;
