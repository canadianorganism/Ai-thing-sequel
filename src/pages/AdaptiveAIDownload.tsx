import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AIReviews from '@/components/AIReviews';
import AIComparisonDemo from '@/components/AIComparisonDemo';
import AIComparison3D from '@/components/AIComparison3D';
import ManageSubscription from '@/components/ManageSubscription';
import { trackFunnelEvent } from '@/lib/funnel';
import { fetchEntitlement, type AITier } from '@/lib/entitlements';
import { toast } from 'sonner';

const AdaptiveAIDownload = () => {
  const navigate = useNavigate();
  const [downloadFormat, setDownloadFormat] = useState<'exe' | 'ts' | 'js'>('exe');
  const [user, setUser] = useState<{ id: string; email?: string; email_confirmed_at?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [entitlement, setEntitlement] = useState<AITier | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void fetchEntitlement().then(setEntitlement);
    const onFocus = () => { void fetchEntitlement().then(setEntitlement); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? undefined, email_confirmed_at: data.user.email_confirmed_at ?? undefined } : null);
      setAuthChecked(true);
    });
  }, []);

  // Paywall: if the user owns a tier, hit the server-side build endpoint.
  // The server enforces entitlement, builds the source for the tier, and
  // verifies Copper builds before returning bytes. The client never sees
  // the full Diamond source unless the server says so.
  const handleDownload = async () => {
    void trackFunnelEvent('download_attempt', { format: downloadFormat });
    if (!entitlement) {
      navigate(`/adaptive-ai/checkout?format=${downloadFormat}`);
      return;
    }
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.functions.supabase.co/download-ai-build`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ format: downloadFormat }),
      });
      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* not JSON */ }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const filename = `adaptive-ai-${entitlement}.${downloadFormat}`;
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      void trackFunnelEvent('download_success', { format: downloadFormat });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      toast.error('Download blocked', { description: msg });
    } finally {
      setDownloading(false);
    }
  };



  return (
    <div className="w-full min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center relative overflow-hidden select-none px-6 py-12">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(168,200,255,0.4) 0%, transparent 70%)' }}
      />

      <div className="z-10 max-w-3xl text-center space-y-8">
        <h1 className="text-4xl sm:text-5xl font-serif text-[#e8e8f0] tracking-wider"
          style={{ textShadow: '0 0 30px rgba(168,200,255,0.3)' }}>
          UNIVERSAL ADAPTIVE AI
        </h1>
        <p className="text-[#6a6a7a] text-base sm:text-lg font-serif tracking-wide leading-relaxed max-w-xl mx-auto">
          A self-configuring AI engine that works with <span className="text-[#a8c8ff]">any programming language</span>, 
          any engine (2D, 3D, VR), and adapts to any game — past, present, or future.
        </p>

        {/* Side-by-side AI comparison */}
        <AIComparisonDemo />

        {/* 3D side-by-side AI comparison */}
        <AIComparison3D />

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left mt-8">
          {[
            // Copper (top)
            { title: 'Any Language', desc: 'Native TypeScript/JavaScript, plus a universal JSON protocol for Python, C#, C++, Rust, Go, Java, Kotlin, Swift, Lua, GDScript, Ruby, and any other language.' },
            { title: 'Any Engine, 2D or 3D', desc: 'Canvas, Phaser, Three.js, Babylon.js, Unity, Godot, Unreal, CryEngine, Pygame, LÖVE2D, Raylib, SDL, SFML, or any custom engine.' },
            { title: 'JSON Protocol', desc: 'Send events and receive modifiers via JSON over stdin/stdout, HTTP, WebSocket, file exchange, or any IPC. Works from any programming language.' },
            { title: 'Plugin Architecture', desc: 'Prebuilt plugins for platformers, RPGs, puzzles, 3D FPS/TPS, VR/XR, and open-world games. Create custom plugins for any genre.' },
            { title: 'Enemy Counter-AI', desc: 'Analyzes player tendencies and tells enemies which attacks to use. Dashers face charges, campers face rushdowns.' },
            { title: 'HTTP & CLI Server', desc: 'Run as a local HTTP API server or stdin/stdout JSON line server. Any language can POST events and GET modifiers instantly.' },
            { title: 'Smart Hints', desc: 'Contextual tips when struggling — 3D spatial awareness, combat advice, puzzle nudges, exploration suggestions. Never repeats or spams.' },
            { title: 'Zero Dependencies', desc: 'Single file. No frameworks, no libraries. Works as JS/TS import, Node.js CLI, HTTP server, or JSON subprocess from any language.' },
            // Diamond (bottom)
            { title: 'Dynamic Difficulty', desc: 'Invisibly scales damage, aggression, XP, loot, prices, aim assist, detection range, and timing based on a real-time struggle score.' },
            { title: 'FPS/TPS Aim Assist', desc: 'Dynamic aim assist that scales with player skill. Struggling players get subtle tracking help. Skilled players get pure raw input.' },
            { title: 'VR/XR Ready', desc: 'Adapts to virtual reality: room-scale dodge hints, motion intensity scaling, spatial combat assistance, and comfort-aware difficulty.' },
            { title: 'Voice Replication', desc: 'Analyzes voice actor audio to capture pitch, timbre, cadence, and emotion. Generates synthesis parameters to replicate the original performance.' },
          ].map((f, i) => {
            const copperFeatures = ['Smart Hints', 'Zero Dependencies', 'HTTP & CLI Server', 'Enemy Counter-AI', 'JSON Protocol', 'Any Language', 'Any Engine, 2D or 3D', 'Plugin Architecture'];
            const isCopper = copperFeatures.includes(f.title);

            return (
              <div
                key={i}
                className="relative p-6 space-y-2 transition-all duration-300 hover:scale-[1.02] overflow-hidden"
                style={{
                  background: isCopper
                    ? 'linear-gradient(160deg, #1c1814 0%, #1a1610 40%, #1e1a14 100%)'
                    : 'linear-gradient(160deg, #141820 0%, #10141c 40%, #161a24 100%)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.filter = 'brightness(1.15)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.filter = 'brightness(1)';
                }}
              >
                {/* Thick mineral border - TOP */}
                <div className="absolute top-0 left-0 right-0 h-[5px]" style={{
                  background: isCopper
                    ? 'linear-gradient(90deg, #6b3a1f, #b87333, #daa06d, #e8be84, #daa06d, #b87333, #8b5a2b, #cd7f32, #b87333, #6b3a1f)'
                    : 'linear-gradient(90deg, #5a8a9a, #88d8f0, #b9f2ff, #e8faff, #ffffff, #e8faff, #b9f2ff, #7dcce8, #a0e8ff, #5a8a9a)',
                  boxShadow: isCopper
                    ? '0 1px 3px rgba(184,115,51,0.5), 0 0 8px rgba(184,115,51,0.3), inset 0 -1px 1px rgba(107,58,31,0.8), inset 0 1px 1px rgba(232,190,132,0.4)'
                    : '0 1px 3px rgba(185,242,255,0.5), 0 0 12px rgba(185,242,255,0.4), inset 0 -1px 1px rgba(90,138,154,0.8), inset 0 1px 1px rgba(255,255,255,0.6)',
                }} />
                {/* BOTTOM */}
                <div className="absolute bottom-0 left-0 right-0 h-[5px]" style={{
                  background: isCopper
                    ? 'linear-gradient(90deg, #8b5a2b, #cd7f32, #b87333, #daa06d, #e8be84, #daa06d, #b87333, #6b3a1f, #b87333, #8b5a2b)'
                    : 'linear-gradient(90deg, #7dcce8, #a0e8ff, #b9f2ff, #e8faff, #ffffff, #e8faff, #b9f2ff, #88d8f0, #5a8a9a, #7dcce8)',
                  boxShadow: isCopper
                    ? '0 -1px 3px rgba(184,115,51,0.5), 0 0 8px rgba(184,115,51,0.3), inset 0 1px 1px rgba(107,58,31,0.8), inset 0 -1px 1px rgba(232,190,132,0.4)'
                    : '0 -1px 3px rgba(185,242,255,0.5), 0 0 12px rgba(185,242,255,0.4), inset 0 1px 1px rgba(90,138,154,0.8), inset 0 -1px 1px rgba(255,255,255,0.6)',
                }} />
                {/* LEFT */}
                <div className="absolute top-0 bottom-0 left-0 w-[5px]" style={{
                  background: isCopper
                    ? 'linear-gradient(180deg, #6b3a1f, #b87333, #daa06d, #e8be84, #cd7f32, #b87333, #8b5a2b, #b87333, #6b3a1f)'
                    : 'linear-gradient(180deg, #5a8a9a, #88d8f0, #b9f2ff, #e8faff, #ffffff, #b9f2ff, #7dcce8, #a0e8ff, #5a8a9a)',
                  boxShadow: isCopper
                    ? '1px 0 3px rgba(184,115,51,0.5), 0 0 8px rgba(184,115,51,0.3), inset -1px 0 1px rgba(107,58,31,0.8), inset 1px 0 1px rgba(232,190,132,0.4)'
                    : '1px 0 3px rgba(185,242,255,0.5), 0 0 12px rgba(185,242,255,0.4), inset -1px 0 1px rgba(90,138,154,0.8), inset 1px 0 1px rgba(255,255,255,0.6)',
                }} />
                {/* RIGHT */}
                <div className="absolute top-0 bottom-0 right-0 w-[5px]" style={{
                  background: isCopper
                    ? 'linear-gradient(180deg, #8b5a2b, #cd7f32, #b87333, #e8be84, #daa06d, #b87333, #6b3a1f, #b87333, #8b5a2b)'
                    : 'linear-gradient(180deg, #7dcce8, #a0e8ff, #e8faff, #ffffff, #e8faff, #b9f2ff, #88d8f0, #5a8a9a, #7dcce8)',
                  boxShadow: isCopper
                    ? '-1px 0 3px rgba(184,115,51,0.5), 0 0 8px rgba(184,115,51,0.3), inset 1px 0 1px rgba(107,58,31,0.8), inset -1px 0 1px rgba(232,190,132,0.4)'
                    : '-1px 0 3px rgba(185,242,255,0.5), 0 0 12px rgba(185,242,255,0.4), inset 1px 0 1px rgba(90,138,154,0.8), inset -1px 0 1px rgba(255,255,255,0.6)',
                }} />

                {/* Corner nuggets - thicker bright spots where borders meet */}
                {[['-top-[1px] -left-[1px]', 'top-left'], ['-top-[1px] -right-[1px]', 'top-right'], ['-bottom-[1px] -left-[1px]', 'bottom-left'], ['-bottom-[1px] -right-[1px]', 'bottom-right']].map(([pos, corner]) => (
                  <div key={corner} className={`absolute ${pos} w-[8px] h-[8px] z-10`} style={{
                    background: isCopper
                      ? 'radial-gradient(circle, #e8be84 0%, #cd7f32 50%, #8b5a2b 100%)'
                      : 'radial-gradient(circle, #ffffff 0%, #d6f5ff 40%, #88d8f0 100%)',
                    boxShadow: isCopper
                      ? '0 0 6px rgba(218,160,109,0.6)'
                      : '0 0 8px rgba(185,242,255,0.7), 0 0 3px rgba(255,255,255,0.5)',
                  }} />
                ))}

                {/* Mineral texture overlay - rough/hammered for copper, faceted sparkle for diamond */}
                <div className="absolute inset-[5px] pointer-events-none" style={{
                  background: isCopper
                    ? `repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(139,90,43,0.06) 12px, rgba(139,90,43,0.06) 13px),
                       repeating-linear-gradient(-30deg, transparent, transparent 18px, rgba(205,127,50,0.04) 18px, rgba(205,127,50,0.04) 19px)`
                    : `repeating-linear-gradient(60deg, transparent, transparent 10px, rgba(185,242,255,0.03) 10px, rgba(185,242,255,0.03) 11px),
                       repeating-linear-gradient(-45deg, transparent, transparent 14px, rgba(255,255,255,0.02) 14px, rgba(255,255,255,0.02) 15px),
                       repeating-linear-gradient(15deg, transparent, transparent 20px, rgba(136,216,240,0.03) 20px, rgba(136,216,240,0.03) 21px)`,
                }} />

                {/* Diamond sparkle dots */}
                {!isCopper && (
                  <div className="absolute inset-[5px] pointer-events-none" style={{
                    background: `radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.3), transparent),
                                 radial-gradient(1px 1px at 70% 15%, rgba(255,255,255,0.25), transparent),
                                 radial-gradient(1px 1px at 45% 70%, rgba(185,242,255,0.3), transparent),
                                 radial-gradient(1px 1px at 85% 55%, rgba(255,255,255,0.2), transparent),
                                 radial-gradient(1.5px 1.5px at 10% 80%, rgba(214,245,255,0.25), transparent),
                                 radial-gradient(1px 1px at 60% 45%, rgba(255,255,255,0.2), transparent)`,
                  }} />
                )}

                {/* Copper patina spots */}
                {isCopper && (
                  <div className="absolute inset-[5px] pointer-events-none" style={{
                    background: `radial-gradient(8px 8px at 15% 25%, rgba(80,140,120,0.06), transparent),
                                 radial-gradient(12px 12px at 75% 65%, rgba(70,130,110,0.05), transparent),
                                 radial-gradient(6px 6px at 50% 85%, rgba(80,140,120,0.04), transparent)`,
                  }} />
                )}

                {/* Diamond shimmer sweep */}
                {!isCopper && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      left: 0,
                      width: '30%',
                      height: '200%',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(185,242,255,0.15) 50%, rgba(255,255,255,0.06) 70%, transparent 100%)',
                      animation: 'diamond-shimmer 4s ease-in-out infinite',
                    }} />
                  </div>
                )}

                {/* Outer glow */}
                <div className="absolute -inset-[1px] pointer-events-none rounded-sm" style={{
                  boxShadow: isCopper
                    ? '0 0 15px rgba(184,115,51,0.2), 0 0 35px rgba(184,115,51,0.08)'
                    : '0 0 15px rgba(185,242,255,0.25), 0 0 35px rgba(185,242,255,0.1), 0 0 60px rgba(185,242,255,0.04)',
                }} />
                
                <h3 className={`relative z-20 font-serif text-sm tracking-wider uppercase ${isCopper ? 'text-[#e8be84]' : 'text-[#d6f5ff]'}`} style={{
                  textShadow: isCopper ? '0 0 10px rgba(218,160,109,0.4)' : '0 0 12px rgba(185,242,255,0.5)',
                }}>{f.title}</h3>
                <p className="relative z-20 text-[#6a6a7a] font-serif text-xs leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Compatibility list */}
        <div className="mt-6 text-left bg-[#1a1a28] border border-[#2a2a3a] p-6 space-y-3">
          <h3 className="text-[#a8c8ff] font-serif text-sm tracking-wider uppercase text-center">Works With Any Language, Engine, and Genre</h3>
          <p className="text-[#6a6a7a] font-serif text-xs leading-relaxed text-center">
            <span className="text-[#a8c8ff]">Languages:</span> TypeScript · JavaScript · Python · C# · C++ · Rust · Go · Java · Kotlin · Swift · Lua · GDScript · Ruby · PHP · Haskell · Zig · and any language with JSON support
          </p>
          <p className="text-[#6a6a7a] font-serif text-xs leading-relaxed text-center mt-2">
            <span className="text-[#a8c8ff]">Engines:</span> Unity · Unreal · Godot · Three.js · Babylon.js · Phaser · Pygame · LÖVE2D · Raylib · SDL · SFML · CryEngine · PlayCanvas · RPG Maker · GameMaker · Custom
          </p>
          <p className="text-[#6a6a7a] font-serif text-xs leading-relaxed text-center mt-2">
            <span className="text-[#a8c8ff]">Genres:</span> Platformers · RPGs · FPS · TPS · Open World · Roguelikes · Puzzle · Strategy · Racing · Fighting · 
            Survival · MMOs · Battle Royale · VR/XR · Sports · MOBAs · and anything you create
          </p>
        </div>

        {/* Examples */}
        <div className="mt-8 text-left bg-[#14141e] border border-[#2a2a3a] p-6 space-y-4">
          <h3 className="text-[#a8c8ff] font-serif text-sm tracking-wider uppercase text-center">
            Examples (.EXE Build)
          </h3>
          <p className="text-[#6a6a7a] font-serif text-xs text-center leading-relaxed">
            The Windows .exe build attaches to any game process and feeds adaptive
            modifiers in real time. Works universally with any title — these are just examples.
            No game files are modified.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'Bloodborne', tag: 'Soulslike · Combat pacing & boss telegraphs' },
              { name: 'Dead Cells', tag: 'Roguelike · Loot quality & enemy aggression' },
              { name: 'Baby Steps', tag: 'Physics traversal · Forgiveness windows' },
            ].map((g) => (
              <div key={g.name} className="border border-[#2a2a3a] bg-[#1a1a28] p-3 space-y-1">
                <div className="text-[#e8e8f0] font-serif text-sm tracking-wide">{g.name}</div>
                <div className="text-[#6a6a7a] font-serif text-[11px] leading-snug">{g.tag}</div>
              </div>
            ))}
          </div>
          <p className="text-[#5a5a6a] font-serif text-[11px] text-center italic">
            Universal plugin protocol — auto-detects and works with any game you launch.
          </p>
        </div>

        {/* Format selector */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setDownloadFormat('exe')}
            className={`px-6 py-2 font-serif text-sm tracking-wider border transition-all ${
              downloadFormat === 'exe'
                ? 'bg-[#2a2a3a] border-[#a8c8ff] text-[#e8e8f0]'
                : 'bg-transparent border-[#2a2a3a] text-[#6a6a7a] hover:border-[#4a4a5a]'
            }`}
          >
            Windows (.exe)
          </button>
          <button
            onClick={() => setDownloadFormat('ts')}
            className={`px-6 py-2 font-serif text-sm tracking-wider border transition-all ${
              downloadFormat === 'ts'
                ? 'bg-[#2a2a3a] border-[#a8c8ff] text-[#e8e8f0]'
                : 'bg-transparent border-[#2a2a3a] text-[#6a6a7a] hover:border-[#4a4a5a]'
            }`}
          >
            TypeScript (.ts)
          </button>
          <button
            onClick={() => setDownloadFormat('js')}
            className={`px-6 py-2 font-serif text-sm tracking-wider border transition-all ${
              downloadFormat === 'js'
                ? 'bg-[#2a2a3a] border-[#a8c8ff] text-[#e8e8f0]'
                : 'bg-transparent border-[#2a2a3a] text-[#6a6a7a] hover:border-[#4a4a5a]'
            }`}
          >
            JavaScript (.js)
          </button>
        </div>
        <p className="text-[#5a5a6a] font-serif text-xs mt-2 max-w-xl mx-auto">
          {downloadFormat === 'exe'
            ? 'Windows executable — attaches to any game process (e.g. Bloodborne, Dead Cells, Baby Steps, or any other title) and streams adaptive modifiers in real time.'
            : downloadFormat === 'ts'
            ? 'TypeScript — full type safety. Use directly in TS/JS projects.'
            : 'Plain JavaScript — run with Node.js as a JSON protocol server, or import in any JS project. Use from Python, C#, Rust, Go, Java, or any language via JSON.'}
        </p>


        {/* Download button */}
        {!authChecked ? null : !user ? (
          <div className="mt-6 text-center space-y-3">
            <p className="text-[#6a6a7a] font-serif text-sm">Sign in with a verified email to download</p>
            <Link to="/auth" className="inline-block px-10 py-4 bg-[#2a2a3a] border-2 border-[#a8c8ff] text-[#e8e8f0] font-serif text-xl tracking-widest hover:bg-[#3a3a4a] transition-all">
              SIGN IN TO DOWNLOAD
            </Link>
          </div>
        ) : !user.email_confirmed_at ? (
          <div className="mt-6 text-center space-y-3">
            <p className="text-[#ff9d5c] font-serif text-sm">Please verify your email address to download</p>
            <p className="text-[#5a5a6a] font-serif text-xs">Check your inbox for a confirmation link from us</p>
          </div>
        ) : (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="mt-6 px-10 py-4 bg-[#2a2a3a] border-2 border-[#a8c8ff] text-[#e8e8f0] font-serif text-xl tracking-widest hover:bg-[#3a3a4a] hover:border-[#c8e0ff] transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ textShadow: '0 0 10px rgba(168,200,255,0.5)' }}
          >
            {downloading
              ? 'BUILDING & VERIFYING…'
              : entitlement
                ? `DOWNLOAD ${entitlement.toUpperCase()} BUILD (.${downloadFormat.toUpperCase()})`
                : `UNLOCK & DOWNLOAD (.${downloadFormat.toUpperCase()})`}
          </button>
        )}
        <p className="text-[#3a3a4a] font-serif text-xs">
          Single file · Plugin architecture · Zero dependencies · Works anywhere
        </p>


        {/* Subscription management */}
        <ManageSubscription />

        {/* Reviews section */}
        <AIReviews />

        {/* Back link */}
        <Link
          to="/"
          className="inline-block mt-6 text-[#6a6a7a] hover:text-[#a8c8ff] font-serif text-sm tracking-wider transition-colors"
        >
          ← Back to Game
        </Link>
      </div>
    </div>
  );
};

export default AdaptiveAIDownload;
