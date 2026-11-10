import { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';

interface Props {
  userId: string;
  onQuit: () => void;
}

const HollowKnightGame = ({ userId, onQuit }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let game: Game | null = null;

    const init = async () => {
      game = new Game(canvas);
      game.setOnQuit(onQuit);
      gameRef.current = game;
      await game.loadSave(userId);
      game.start();
      setLoading(false);
    };

    init();

    return () => {
      if (game) game.stop();
    };
  }, [userId]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 bg-[#0a0a12] flex items-center justify-center z-10">
          <div className="text-[#a8c8ff] text-xl font-serif animate-pulse">Loading save...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        tabIndex={0}
      />
    </div>
  );
};

export default HollowKnightGame;
