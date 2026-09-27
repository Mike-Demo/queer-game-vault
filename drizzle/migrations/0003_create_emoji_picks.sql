CREATE TABLE public.emoji_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emojis text[] NOT NULL,
  game_slug text NOT NULL,
  title text NOT NULL,
  cover_url text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.emoji_picks TO authenticated;
GRANT ALL ON public.emoji_picks TO service_role;
ALTER TABLE public.emoji_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own picks readable" ON public.emoji_picks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own picks insertable" ON public.emoji_picks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own picks deletable" ON public.emoji_picks FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX emoji_picks_user_created ON public.emoji_picks (user_id, created_at DESC);