import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (isLogin) {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else navigate('/adaptive-ai');
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (err) setError(err.message);
      else setMessage('Check your email to confirm your account, then sign in.');
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setError('');
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message || 'Google sign-in failed.');
    }
    if (result.redirected) return;
    navigate('/adaptive-ai');
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center relative overflow-hidden select-none px-6">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(168,200,255,0.4) 0%, transparent 70%)' }}
      />

      <div className="z-10 w-full max-w-sm space-y-6">
        <h1 className="text-3xl font-serif text-[#e8e8f0] tracking-wider text-center"
          style={{ textShadow: '0 0 30px rgba(168,200,255,0.3)' }}>
          {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </h1>

        <button
          onClick={handleGoogleAuth}
          className="w-full py-3 bg-[#1a1a28] border border-[#3a3a5a] text-[#e8e8f0] font-serif text-sm tracking-wider hover:bg-[#2a2a3a] transition-all flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[#2a2a3a]" />
          <span className="text-[#5a5a6a] font-serif text-xs">or</span>
          <div className="flex-1 h-px bg-[#2a2a3a]" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-[#0a0a12] border border-[#2a2a3a] text-[#e8e8f0] px-4 py-3 font-serif text-sm focus:border-[#a8c8ff] outline-none transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full bg-[#0a0a12] border border-[#2a2a3a] text-[#e8e8f0] px-4 py-3 font-serif text-sm focus:border-[#a8c8ff] outline-none transition-colors"
          />
          {error && <p className="text-red-400 font-serif text-xs text-center">{error}</p>}
          {message && <p className="text-green-400 font-serif text-xs text-center">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#2a2a3a] border border-[#a8c8ff] text-[#e8e8f0] font-serif text-sm tracking-wider hover:bg-[#3a3a4a] transition-all disabled:opacity-50"
          >
            {loading ? 'LOADING...' : isLogin ? 'SIGN IN' : 'SIGN UP'}
          </button>
        </form>

        <p className="text-center text-[#5a5a6a] font-serif text-xs">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }} className="text-[#a8c8ff] hover:underline">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <Link to="/adaptive-ai" className="block text-center text-[#6a6a7a] hover:text-[#a8c8ff] font-serif text-sm tracking-wider transition-colors">
          ← Back to AI Page
        </Link>
      </div>
    </div>
  );
};

export default Auth;
