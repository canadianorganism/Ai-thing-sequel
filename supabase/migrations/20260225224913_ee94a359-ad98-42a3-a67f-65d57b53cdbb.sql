
-- Save game data table
CREATE TABLE public.game_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- Player stats
  max_health INTEGER NOT NULL DEFAULT 5,
  current_health INTEGER NOT NULL DEFAULT 5,
  max_soul INTEGER NOT NULL DEFAULT 99,
  current_soul INTEGER NOT NULL DEFAULT 0,
  geo INTEGER NOT NULL DEFAULT 0,
  nail_damage INTEGER NOT NULL DEFAULT 5,
  has_double_jump BOOLEAN NOT NULL DEFAULT true,
  has_dash BOOLEAN NOT NULL DEFAULT true,
  has_wall_jump BOOLEAN NOT NULL DEFAULT true,
  -- Position / room
  bench_room TEXT NOT NULL DEFAULT 'dirtmouth',
  bench_x REAL NOT NULL DEFAULT 0,
  bench_y REAL NOT NULL DEFAULT 0,
  -- Charms (stored as JSON)
  acquired_charms TEXT[] NOT NULL DEFAULT ARRAY['soul_catcher','steady_body','grubsong','dashmaster'],
  equipped_charms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  max_notches INTEGER NOT NULL DEFAULT 6,
  -- Progress
  visited_rooms TEXT[] NOT NULL DEFAULT ARRAY['dirtmouth'],
  grubs_collected INTEGER NOT NULL DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT one_save_per_user UNIQUE (user_id)
);

ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own save" ON public.game_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own save" ON public.game_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own save" ON public.game_saves
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_game_saves_updated_at
  BEFORE UPDATE ON public.game_saves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
