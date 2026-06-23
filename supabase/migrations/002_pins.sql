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
