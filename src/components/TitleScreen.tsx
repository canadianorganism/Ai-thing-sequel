import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface TitleScreenProps {
  onStartGame: (userId: string) => void;
}

const TitleScreen = ({ onStartGame }: TitleScreenProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Star field animation
  const stars = Array.from({ length: 80 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 3,
  }));

  if (checkingAuth) {
    return (
      <div className="w-full h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-[#a8c8ff] text-xl font-serif animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-[#0a0a12] flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Star background */}
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: 0.3 + Math.random() * 0.4,
            animationDelay: `${star.delay}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
          }}
        />
      ))}

      {/* Ground silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#1a1a28] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 120" className="w-full" style={{ filter: 'drop-shadow(0 -2px 4px rgba(168,200,255,0.05))' }}>
          <path d="M0 120 L0 80 Q50 60 100 75 Q150 90 200 70 Q250 50 300 65 Q350 80 400 55 Q450 30 500 50 Q550 70 600 45 Q650 20 700 40 Q750 60 800 35 Q850 10 900 30 Q950 50 1000 25 Q1050 0 1100 20 Q1150 40 1200 15 L1200 120 Z" fill="#1a1a28" />
        </svg>
      </div>

      {/* Title */}
      <div className="z-10 text-center mb-12">
        <h1 className="text-6xl font-serif text-[#e8e8f0] tracking-wider mb-2" style={{ textShadow: '0 0 30px rgba(168,200,255,0.3)' }}>
          HOLLOW KNIGHT
        </h1>
        <p className="text-[#6a6a7a] text-lg font-serif tracking-widest">A FORGOTTEN CROSSROADS DEMO</p>
      </div>

      {/* Auth / Start panel */}
      <div className="z-10 w-full max-w-sm">
        {user ? (
          <div className="text-center space-y-6">
            <p className="text-[#a8c8ff] font-serif text-sm">
              Signed in as <span className="text-[#e8e8f0]">{user.email}</span>
            </p>
            <button
              onClick={() => onStartGame(user.id)}
              className="w-full py-4 bg-[#2a2a3a] border-2 border-[#a8c8ff] text-[#e8e8f0] font-serif text-2xl tracking-widest hover:bg-[#3a3a4a] hover:border-[#c8e0ff] transition-all duration-300"
              style={{ textShadow: '0 0 10px rgba(168,200,255,0.5)' }}
            >
              START GAME
            </button>
            <button
              onClick={handleSignOut}
              className="text-[#6a6a7a] hover:text-[#a8c8ff] font-serif text-sm tracking-wider transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-[#e8e8f0] font-serif text-xl tracking-wider">
                {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
              </h2>
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full py-3 px-4 bg-[#1a1a28] border border-[#3a3a4a] text-[#e8e8f0] font-serif placeholder:text-[#4a4a5a] focus:border-[#a8c8ff] focus:outline-none transition-colors"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full py-3 px-4 bg-[#1a1a28] border border-[#3a3a4a] text-[#e8e8f0] font-serif placeholder:text-[#4a4a5a] focus:border-[#a8c8ff] focus:outline-none transition-colors"
            />

            {error && (
              <p className="text-[#ff6666] text-sm font-serif text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2a2a3a] border border-[#a8c8ff] text-[#e8e8f0] font-serif text-lg tracking-wider hover:bg-[#3a3a4a] transition-all disabled:opacity-50"
            >
              {loading ? '...' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>

            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="w-full text-[#6a6a7a] hover:text-[#a8c8ff] font-serif text-sm tracking-wider transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
            </button>
          </form>
        )}
      </div>

      {/* Controls hint */}
      <div className="z-10 mt-12 text-center text-[#3a3a4a] font-serif text-xs space-y-1">
        <p>WASD / Arrow Keys to move · Z/Space to jump · X/J to attack</p>
        <p>C/K to dash · V/B to heal/cast · TAB/M for charms · L to view map · P to reset · ESC to pause</p>
      </div>

      {/* Adaptive AI link */}
      <Link
        to="/adaptive-ai"
        className="z-10 mt-6 text-[#a8c8ff] hover:text-[#c8e0ff] font-serif text-sm tracking-wider transition-colors underline underline-offset-4 decoration-[#3a3a4a] hover:decoration-[#a8c8ff]"
        style={{ textShadow: '0 0 8px rgba(168,200,255,0.3)' }}
      >
        Interested in using AI? Click Here
      </Link>
    </div>
  );
};

export default TitleScreen;
