// @ts-nocheck
import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// ── Shared types ──
interface Entity3D {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  hitTimer: number;
  attackTimer: number;
}

interface SimState {
  player: Entity3D;
  enemies: Entity3D[];
  adaptive: boolean;
  struggleScore: number;
  damageScale: number;
  aggroScale: number;
  deaths: number;
}

function createEntity(x: number, z: number, hp: number): Entity3D {
  return {
    pos: new THREE.Vector3(x, 0.5, z),
    vel: new THREE.Vector3(),
    hp, maxHp: hp,
    hitTimer: 0, attackTimer: 0,
  };
}

function createSim(adaptive: boolean): SimState {
  return {
    player: createEntity(0, 0, 5),
    enemies: [
      createEntity(3, 2, 3),
      createEntity(-3, -2, 3),
      createEntity(2, -3, 3),
    ],
    adaptive,
    struggleScore: 0,
    damageScale: 1,
    aggroScale: 1,
    deaths: 0,
  };
}

// ── 3D Player mesh ──
function PlayerMesh({ state }: { state: SimState }) {
  const ref = useRef<THREE.Group>(null);
  const nailRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const p = state.player;

    // Simple AI: chase nearest enemy
    let nearest = state.enemies[0];
    let minDist = Infinity;
    state.enemies.forEach(e => {
      const d = p.pos.distanceTo(e.pos);
      if (d < minDist) { minDist = d; nearest = e; }
    });

    const dir = new THREE.Vector3().subVectors(nearest.pos, p.pos);
    const dist = dir.length();
    dir.normalize();

    if (dist > 1.2) {
      p.vel.copy(dir).multiplyScalar(3);
    } else {
      p.vel.set(0, 0, 0);
      if (p.attackTimer <= 0) {
        p.attackTimer = 0.45;
        state.enemies.forEach(e => {
          if (p.pos.distanceTo(e.pos) < 1.5 && e.hp > 0) {
            e.hp--;
            e.hitTimer = 0.15;
            if (e.hp <= 0) {
              e.hp = e.maxHp;
              e.pos.set((Math.random() - 0.5) * 6, 0.5, (Math.random() - 0.5) * 6);
            }
          }
        });
      }
    }

    // Dodge: jump back if enemy attacking nearby
    if (nearest.attackTimer > 0 && nearest.attackTimer < 0.1 && dist < 1.8) {
      p.vel.copy(dir).multiplyScalar(-4);
    }

    p.pos.add(p.vel.clone().multiplyScalar(dt));
    p.pos.x = THREE.MathUtils.clamp(p.pos.x, -4.5, 4.5);
    p.pos.z = THREE.MathUtils.clamp(p.pos.z, -4.5, 4.5);
    if (p.attackTimer > 0) p.attackTimer -= dt;
    if (p.hitTimer > 0) p.hitTimer -= dt;

    ref.current.position.copy(p.pos);
    ref.current.lookAt(nearest.pos.x, 0.5, nearest.pos.z);

    // Nail swing animation
    if (nailRef.current) {
      nailRef.current.visible = p.attackTimer > 0.25;
    }
  });

  const isHit = state.player.hitTimer > 0;

  return (
    <group ref={ref}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.8, 0.3]} />
        <meshStandardMaterial color={isHit ? '#ff4444' : '#e8e8f0'} />
      </mesh>
      {/* Head with horns */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.35, 0.35, 0.3]} />
        <meshStandardMaterial color={isHit ? '#ff4444' : '#e8e8f0'} />
      </mesh>
      <mesh position={[-0.2, 0.8, 0]}>
        <boxGeometry args={[0.08, 0.25, 0.08]} />
        <meshStandardMaterial color={isHit ? '#ff4444' : '#d0d0e0'} />
      </mesh>
      <mesh position={[0.2, 0.8, 0]}>
        <boxGeometry args={[0.08, 0.25, 0.08]} />
        <meshStandardMaterial color={isHit ? '#ff4444' : '#d0d0e0'} />
      </mesh>
      {/* Nail */}
      <mesh ref={nailRef} position={[0.5, 0.1, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.8, 0.08, 0.08]} />
        <meshStandardMaterial color="#c8c8e0" />
      </mesh>
    </group>
  );
}

// ── Enemy mesh ──
function EnemyMesh({ entity, state }: { entity: Entity3D; state: SimState }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const e = entity;
    const p = state.player;
    if (e.hitTimer > 0) { e.hitTimer -= dt; }

    const dir = new THREE.Vector3().subVectors(p.pos, e.pos);
    const dist = dir.length();
    dir.normalize();

    const speed = 2 * (state.adaptive ? state.aggroScale : 1);

    if (dist < 6) {
      e.vel.copy(dir).multiplyScalar(speed);
    } else {
      e.vel.set(Math.sin(Date.now() * 0.001 + e.pos.x) * 1.5, 0, Math.cos(Date.now() * 0.001 + e.pos.z) * 1.5);
    }

    e.pos.add(e.vel.clone().multiplyScalar(dt));
    e.pos.x = THREE.MathUtils.clamp(e.pos.x, -4.5, 4.5);
    e.pos.z = THREE.MathUtils.clamp(e.pos.z, -4.5, 4.5);

    // Attack
    if (e.attackTimer <= 0 && dist < 1.2) {
      const attackFreq = state.adaptive ? state.aggroScale : 1;
      e.attackTimer = 1.2 / attackFreq;
      if (p.hitTimer <= 0) {
        const dmg = Math.ceil(state.adaptive ? state.damageScale : 1);
        p.hp -= dmg;
        p.hitTimer = 0.5;
        p.vel.copy(dir).multiplyScalar(-3);

        if (p.hp <= 0) {
          state.deaths++;
          if (state.adaptive) {
            state.struggleScore = Math.min(1, state.struggleScore + 0.2);
            state.damageScale = Math.max(0.3, 1 - state.struggleScore * 0.6);
            state.aggroScale = Math.max(0.4, 1 - state.struggleScore * 0.5);
          }
          p.hp = p.maxHp;
          p.pos.set(0, 0.5, 0);
          p.vel.set(0, 0, 0);
        }
      }
    }
    if (e.attackTimer > 0) e.attackTimer -= dt;

    // Adaptive recovery
    if (state.adaptive && state.struggleScore > 0) {
      state.struggleScore = Math.max(0, state.struggleScore - dt * 0.015);
      state.damageScale = Math.max(0.3, 1 - state.struggleScore * 0.6);
      state.aggroScale = Math.max(0.4, 1 - state.struggleScore * 0.5);
    }

    ref.current.position.copy(e.pos);
    ref.current.lookAt(p.pos.x, 0.5, p.pos.z);
  });

  const isHit = entity.hitTimer > 0;

  return (
    <group ref={ref}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial color={isHit ? '#ffffff' : '#ff5533'} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.12, 0.1, 0.28]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.12, 0.1, 0.28]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.5} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.25, -0.25, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color={isHit ? '#ffffff' : '#cc4422'} />
      </mesh>
      <mesh position={[0.25, -0.25, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color={isHit ? '#ffffff' : '#cc4422'} />
      </mesh>
    </group>
  );
}

// ── HUD overlay ──
function HUD({ state }: { state: SimState }) {
  return (
    <group position={[0, 4.5, 0]}>
      {/* Health bar background */}
      <mesh position={[-3, 0, 0]}>
        <planeGeometry args={[2, 0.15]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      {/* Health bar fill */}
      <mesh position={[-3 - (1 - state.player.hp / state.player.maxHp), 0, 0.01]}>
        <planeGeometry args={[2 * (state.player.hp / state.player.maxHp), 0.15]} />
        <meshBasicMaterial color="#e8e8f0" />
      </mesh>
    </group>
  );
}

// ── Scene ──
function GameScene({ state }: { state: SimState }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 3]} intensity={0.8} />
      <pointLight position={[0, 3, 0]} intensity={0.4} color="#a8c8ff" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#151525" />
      </mesh>

      {/* Grid lines */}
      <gridHelper args={[10, 10, '#252540', '#1a1a30']} position={[0, 0.01, 0]} />

      {/* Arena walls */}
      {[
        [0, 0.25, -5, 10, 0.5, 0.1],
        [0, 0.25, 5, 10, 0.5, 0.1],
        [-5, 0.25, 0, 0.1, 0.5, 10],
        [5, 0.25, 0, 0.1, 0.5, 10],
      ].map((w, i) => (
        <mesh key={i} position={[w[0] as number, w[1] as number, w[2] as number]}>
          <boxGeometry args={[w[3] as number, w[4] as number, w[5] as number]} />
          <meshStandardMaterial color="#2a2a4a" transparent opacity={0.6} />
        </mesh>
      ))}

      <PlayerMesh state={state} />
      {state.enemies.map((e, i) => (
        <EnemyMesh key={i} entity={e} state={state} />
      ))}
    </>
  );
}

// ── Main component ──
const AIComparison3D = () => {
  const [beforeState] = useState(() => createSim(false));
  const [afterState] = useState(() => createSim(true));
  const [beforeDeaths, setBeforeDeaths] = useState(0);
  const [afterDeaths, setAfterDeaths] = useState(0);
  const [aiScale, setAiScale] = useState(1);

  // Poll deaths from sim state
  useEffect(() => {
    const interval = setInterval(() => {
      setBeforeDeaths(beforeState.deaths);
      setAfterDeaths(afterState.deaths);
      setAiScale(afterState.damageScale);
    }, 250);
    return () => clearInterval(interval);
  }, [beforeState, afterState]);

  return (
    <div className="w-full space-y-4 mb-10">
      <h2 className="text-[#a8c8ff] font-serif text-lg sm:text-xl tracking-wider text-center uppercase">
        3D Arena Comparison
      </h2>
      <p className="text-[#6a6a7a] font-serif text-xs text-center max-w-lg mx-auto">
        The same 3D arena with three enemies. Watch the Adaptive AI reduce enemy aggression and damage after repeated player deaths.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {/* Before */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[#ff6644] font-serif text-xs tracking-wider uppercase">Without AI</span>
            <span className="text-[#6a6a7a] font-serif text-[10px]">Deaths: {beforeDeaths}</span>
          </div>
          <div className="w-[360px] h-[220px] border border-[#2a2a3a] bg-[#0a0a12]">
            <Canvas camera={{ position: [0, 8, 8], fov: 45 }} style={{ background: '#0a0a12' }}>
              <GameScene state={beforeState} />
            </Canvas>
          </div>
          <div className="text-[#5a5a6a] font-serif text-[10px] text-center">
            Fixed difficulty — enemies always full aggro
          </div>
        </div>

        {/* After */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[#44ff88] font-serif text-xs tracking-wider uppercase">With Adaptive AI</span>
            <span className="text-[#6a6a7a] font-serif text-[10px]">Deaths: {afterDeaths}</span>
          </div>
          <div className="w-[360px] h-[220px] border border-[#a8c8ff]/30 bg-[#0a0a12]">
            <Canvas camera={{ position: [0, 8, 8], fov: 45 }} style={{ background: '#0a0a12' }}>
              <GameScene state={afterState} />
            </Canvas>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[#5a5a6a] font-serif text-[10px]">AI Difficulty:</span>
            <div className="w-20 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#a8c8ff] transition-all duration-500"
                style={{ width: `${aiScale * 100}%` }}
              />
            </div>
            <span className="text-[#a8c8ff] font-serif text-[10px]">{Math.round(aiScale * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIComparison3D;
