-- Pixel appreciate button: per-game kudos counts.
-- Public read; writes go through the service-role API route only.
CREATE TABLE public.game_appreciations (
  game_slug text PRIMARY KEY,
  total bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Atomic increment used by the appreciations API route.
CREATE OR REPLACE FUNCTION public.increment_game_appreciation(p_slug text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total bigint;
BEGIN
  INSERT INTO public.game_appreciations (game_slug, total)
  VALUES (p_slug, 1)
  ON CONFLICT (game_slug)
  DO UPDATE SET total = public.game_appreciations.total + 1, updated_at = now()
  RETURNING total INTO new_total;
  RETURN new_total;
END;
$$;

GRANT SELECT ON public.game_appreciations TO anon, authenticated;
GRANT ALL ON public.game_appreciations TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_game_appreciation(text) TO service_role;
ALTER TABLE public.game_appreciations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Appreciations publicly readable" ON public.game_appreciations FOR SELECT USING (true);
