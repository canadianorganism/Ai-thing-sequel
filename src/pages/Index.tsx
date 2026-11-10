import { useState } from 'react';
import HollowKnightGame from '../components/HollowKnightGame';
import TitleScreen from '../components/TitleScreen';

const Index = () => {
  const [userId, setUserId] = useState<string | null>(null);

  if (!userId) {
    return <TitleScreen onStartGame={(id) => setUserId(id)} />;
  }

  return <HollowKnightGame userId={userId} onQuit={() => setUserId(null)} />;
};

export default Index;
