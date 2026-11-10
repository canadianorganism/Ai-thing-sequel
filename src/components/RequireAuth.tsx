import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import SignOutButton from './SignOutButton';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Route guard that redirects unauthenticated users to /auth.
 * Sets up onAuthStateChange listener BEFORE getSession to avoid race conditions.
 */
const RequireAuth = ({ children }: RequireAuthProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // 1. Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    // 2. Then check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <p className="text-[#a8c8ff] font-serif text-sm tracking-wider animate-pulse">LOADING...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return (
    <>
      <SignOutButton />
      {children}
    </>
  );
};

export default RequireAuth;
