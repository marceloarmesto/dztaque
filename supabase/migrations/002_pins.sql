-- ── PINS ─────────────────────────────────────────────────────
CREATE TABLE public.pins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  collection  TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  image_url   TEXT NOT NULL,
  aspect      NUMERIC NOT NULL DEFAULT 1.0,
  source_url  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LIKES ────────────────────────────────────────────────────
CREATE TABLE public.likes (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_id     UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pin_id)
);

-- ── SAVES ────────────────────────────────────────────────────
CREATE TABLE public.saves (
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_id     UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pin_id)
);

-- ── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX pins_created_at_idx ON public.pins (created_at DESC);
CREATE INDEX pins_collection_idx ON public.pins (collection);
CREATE INDEX likes_pin_idx ON public.likes (pin_id);
CREATE INDEX saves_user_idx ON public.saves (user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.pins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pins_select" ON public.pins
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pins_insert" ON public.pins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "pins_update" ON public.pins
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "pins_delete" ON public.pins
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "likes_select" ON public.likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert" ON public.likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "saves_select" ON public.saves
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "saves_insert" ON public.saves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saves_delete" ON public.saves
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── RPC: feed paginado com metadados ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_feed_pins(
  p_user_id    UUID,
  p_collection TEXT DEFAULT NULL,
  p_search     TEXT DEFAULT NULL,
  p_cursor     TIMESTAMPTZ DEFAULT NULL,
  p_limit      INT DEFAULT 30,
  p_author_id  UUID DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  author_id     UUID,
  author_name   TEXT,
  author_handle TEXT,
  title         TEXT,
  collection    TEXT,
  tags          TEXT[],
  image_url     TEXT,
  aspect        NUMERIC,
  source_url    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ,
  like_count    BIGINT,
  liked_by_me   BOOLEAN,
  saved_by_me   BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.author_id, pr.name, pr.handle, p.title, p.collection,
    p.tags, p.image_url, p.aspect, p.source_url, p.notes, p.created_at,
    (SELECT count(*) FROM public.likes l WHERE l.pin_id = p.id) AS like_count,
    EXISTS (SELECT 1 FROM public.likes l WHERE l.pin_id = p.id AND l.user_id = p_user_id) AS liked_by_me,
    EXISTS (SELECT 1 FROM public.saves s WHERE s.pin_id = p.id AND s.user_id = p_user_id) AS saved_by_me
  FROM public.pins p
  JOIN public.profiles pr ON pr.id = p.author_id
  WHERE
    (p_author_id IS NULL OR p.author_id = p_author_id)
    AND (p_collection IS NULL OR p.collection = p_collection)
    AND (
      p_search IS NULL OR p_search = '' OR
      p.title ILIKE '%' || p_search || '%' OR
      p.collection ILIKE '%' || p_search || '%' OR
      EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE '%' || p_search || '%')
    )
    AND (p_cursor IS NULL OR p.created_at < p_cursor)
  ORDER BY p.created_at DESC
  LIMIT p_limit;
$$;
