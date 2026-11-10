import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Small fixed-position sign-out button shown on gated pages.
 */
const SignOutButton = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <button
      onClick={handleSignOut}
      className="fixed top-4 right-4 z-50 px-4 py-2 bg-[#1a1a28]/80 backdrop-blur-sm border border-[#3a3a5a] text-[#e8e8f0] font-serif text-xs tracking-wider hover:bg-[#2a2a3a] hover:border-[#a8c8ff] transition-all"
    >
      SIGN OUT
    </button>
  );
};

export default SignOutButton;
