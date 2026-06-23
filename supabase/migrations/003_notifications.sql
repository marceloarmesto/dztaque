CREATE TABLE public.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('mention', 'like', 'save')),
  from_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_id        UUID REFERENCES public.pins(id) ON DELETE CASCADE,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifs_to_user_idx
  ON public.notifications (to_user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifs_select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = to_user_id);

CREATE POLICY "notifs_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "notifs_update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = to_user_id);
