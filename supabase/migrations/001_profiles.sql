-- profiles: estende auth.users gerenciado pelo Supabase
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT NOT NULL,
  handle      TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- qualquer usuário autenticado lê qualquer perfil (necessário para @menções futuras)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated USING (true);

-- cada usuário edita apenas o próprio perfil
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- trigger: cria profile automaticamente no primeiro login Google ou email/senha
-- SET search_path = public garante que o GoTrue (que roda com search_path
-- restrito) ache a tabela; profiles é schema-qualificado por segurança extra.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, handle, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
