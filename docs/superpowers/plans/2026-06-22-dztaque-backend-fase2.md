# DZtaque Backend — Fase 2: Core de Pins + Feed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o feed placeholder por um feed real com pins, likes e saves persistidos no Supabase, com busca/filtro no banco, scroll infinito, página de detalhe com pins relacionados, e seed de ~25 pins do Unsplash.

**Architecture:** Server Components renderizam a primeira página do feed e o detalhe via uma camada de dados tipada (`lib/pins.ts`). Client Components cuidam de scroll infinito (API route paginada por cursor) e interações otimistas (Server Actions). Postgres com RLS; contagem de likes em tempo real via subquery.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript strict, `@supabase/ssr`, Supabase Postgres + RLS, `tsx` (seed).

## Global Constraints

- Next.js 14 App Router; TypeScript strict
- `@supabase/ssr` para todos os clientes; server client de `lib/supabase/server.ts`
- Sem Tailwind, sem UI library, sem ORM — inline styles com CSS custom properties de `globals.css`
- Design system: `--bg #111111`, `--text #EDE8D5`, `border-radius: 0` exceto avatares; sem `box-shadow`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SEED_TEST_PASSWORD`
- Funções/triggers Postgres SEMPRE com `SET search_path = public` e tabelas schema-qualificadas (`public.x`) — lição da Fase 1
- Migration aplicada MANUALMENTE pelo usuário no Supabase SQL Editor — o implementador cria o arquivo `.sql` e fornece o texto, mas não tenta aplicar via código
- `PAGE_SIZE = 30` no feed
- Diretório: `/Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque`
- Verificação de cada task: `npm run typecheck` deve passar (exceto onde a task explicitamente depende de outra ainda não criada)

---

### Task 1: Migration — pins, likes, saves

**Files:**
- Create: `supabase/migrations/002_pins.sql`

**Interfaces:**
- Produces: tabelas `pins`, `likes`, `saves` com RLS e índices no Supabase

- [ ] **Step 1: Criar `supabase/migrations/002_pins.sql`**

```sql
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
```

- [ ] **Step 2: Instruir aplicação manual**

A migration NÃO é aplicada por código. No relatório, instruir o usuário a colar o conteúdo de `supabase/migrations/002_pins.sql` no Supabase Dashboard → SQL Editor → Run. Marcar como ação manual pendente.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_pins.sql
git commit -m "feat: migration pins + likes + saves + RLS"
```

---

### Task 2: RPC `get_feed_pins` + camada de dados `lib/pins.ts`

**Files:**
- Modify: `supabase/migrations/002_pins.sql` (adicionar função RPC ao fim)
- Create: `lib/pins.ts`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts`
- Produces:
  - Tipo `PinWithMeta` (exportado)
  - Tipo `FeedResult = { pins: PinWithMeta[]; nextCursor: string | null }`
  - `getFeedPins(opts: { collection?: string; search?: string; cursor?: string }): Promise<FeedResult>`
  - `getPinById(id: string): Promise<PinWithMeta | null>`
  - `getRelatedPins(pin: PinWithMeta): Promise<PinWithMeta[]>`
  - `getRecentCollections(limit?: number): Promise<string[]>`

- [ ] **Step 1: Adicionar a função RPC ao fim de `supabase/migrations/002_pins.sql`**

A função centraliza a query complexa (JOIN + agregação + busca + paginação). `current_uid` é passado pela aplicação (do `auth.uid()` da sessão) para calcular `liked_by_me`/`saved_by_me`.

```sql
-- ── RPC: feed paginado com metadados ─────────────────────────
CREATE OR REPLACE FUNCTION public.get_feed_pins(
  p_user_id    UUID,
  p_collection TEXT DEFAULT NULL,
  p_search     TEXT DEFAULT NULL,
  p_cursor     TIMESTAMPTZ DEFAULT NULL,
  p_limit      INT DEFAULT 30
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
    (p_collection IS NULL OR p.collection = p_collection)
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
```

- [ ] **Step 2: Instruir reaplicação da função**

No relatório, lembrar que esta função também precisa ser executada no SQL Editor (o `CREATE OR REPLACE` pode ser rodado junto com o resto da migration, ou separado).

- [ ] **Step 3: Criar `lib/pins.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 30

export type PinWithMeta = {
  id: string
  authorId: string
  authorName: string
  authorHandle: string
  authorInitials: string
  title: string
  collection: string
  tags: string[]
  imageUrl: string
  aspect: number
  sourceUrl: string | null
  notes: string | null
  createdAt: string
  likeCount: number
  likedByMe: boolean
  savedByMe: boolean
}

export type FeedResult = { pins: PinWithMeta[]; nextCursor: string | null }

type FeedRow = {
  id: string
  author_id: string
  author_name: string
  author_handle: string
  title: string
  collection: string
  tags: string[]
  image_url: string
  aspect: number
  source_url: string | null
  notes: string | null
  created_at: string
  like_count: number
  liked_by_me: boolean
  saved_by_me: boolean
}

function initialsFrom(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function mapRow(r: FeedRow): PinWithMeta {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorHandle: r.author_handle,
    authorInitials: initialsFrom(r.author_name),
    title: r.title,
    collection: r.collection,
    tags: r.tags ?? [],
    imageUrl: r.image_url,
    aspect: Number(r.aspect),
    sourceUrl: r.source_url,
    notes: r.notes,
    createdAt: r.created_at,
    likeCount: Number(r.like_count),
    likedByMe: r.liked_by_me,
    savedByMe: r.saved_by_me,
  }
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getFeedPins(opts: {
  collection?: string
  search?: string
  cursor?: string
}): Promise<FeedResult> {
  const supabase = await createClient()
  const uid = await currentUserId()
  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: opts.collection && opts.collection !== 'TODOS' ? opts.collection : null,
    p_search: opts.search ?? null,
    p_cursor: opts.cursor ?? null,
    p_limit: PAGE_SIZE,
  })
  if (error) throw new Error(`getFeedPins: ${error.message}`)
  const rows = (data ?? []) as FeedRow[]
  const pins = rows.map(mapRow)
  const nextCursor = pins.length === PAGE_SIZE ? pins[pins.length - 1].createdAt : null
  return { pins, nextCursor }
}

export async function getPinById(id: string): Promise<PinWithMeta | null> {
  const supabase = await createClient()
  const uid = await currentUserId()
  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: null,
    p_search: null,
    p_cursor: null,
    p_limit: 1000,
  })
  if (error) throw new Error(`getPinById: ${error.message}`)
  const row = ((data ?? []) as FeedRow[]).find((r) => r.id === id)
  return row ? mapRow(row) : null
}

export async function getRelatedPins(pin: PinWithMeta): Promise<PinWithMeta[]> {
  const { pins } = await getFeedPins({ collection: pin.collection })
  return pins.filter((p) => p.id !== pin.id)
}

export async function getRecentCollections(limit = 3): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pins')
    .select('collection, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(`getRecentCollections: ${error.message}`)
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of (data ?? []) as { collection: string }[]) {
    if (!seen.has(row.collection)) {
      seen.add(row.collection)
      result.push(row.collection)
      if (result.length === limit) break
    }
  }
  return result
}
```

> Nota de implementação: `getPinById` usa a RPC com limite alto e filtra em memória para reaproveitar o cálculo de metadados (like/save). Para o tamanho da DZ é aceitável; uma RPC dedicada por id pode ser adicionada depois se necessário.

- [ ] **Step 4: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_pins.sql lib/pins.ts
git commit -m "feat: get_feed_pins RPC + lib/pins data layer"
```

---

### Task 3: Seed de pins

**Files:**
- Create: `scripts/seed-pins.ts`

**Interfaces:**
- Consumes: `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`); tabela `profiles` (8 usuários da Fase 1); tabelas `pins`, `likes`, `saves`
- Produces: ~25 pins + likes/saves no banco

- [ ] **Step 1: Criar `scripts/seed-pins.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

// Carregar .env.local manualmente (tsx não carrega automaticamente)
const envContent = fs.readFileSync('.env.local', 'utf-8')
envContent.split('\n').forEach((line) => {
  const i = line.indexOf('=')
  if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim()
})

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Unsplash: usa o formato images.unsplash.com com w/h para refletir o aspect.
function img(id: string, w: number, h: number) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`
}

type SeedPin = {
  title: string
  collection: string
  tags: string[]
  image_url: string
  aspect: number
  source_url: string | null
  notes: string | null
}

const PINS: SeedPin[] = [
  { title: 'NIKE — FEEL IT',        collection: 'Campanhas sociais',  tags: ['sport','emotion'],      image_url: img('photo-1542291026-7eec264c27ff', 800, 1120), aspect: 1.4,  source_url: 'https://nike.com', notes: null },
  { title: 'COSMOS REBRAND',        collection: 'Identidade visual',  tags: ['minimal','identity'],   image_url: img('photo-1558655146-d09347e92766', 800, 640),  aspect: 0.8,  source_url: 'https://cosmos.so', notes: 'Referência de grid editorial.' },
  { title: 'APPLE PRIVACY',         collection: 'Campanhas sociais',  tags: ['tech','manifesto'],     image_url: img('photo-1517336714731-489689fd1ca8', 800, 1280), aspect: 1.6,  source_url: 'https://apple.com', notes: null },
  { title: 'NEUE HAAS IN USE',      collection: 'Tipografia',         tags: ['helvetica','type'],     image_url: img('photo-1561070791-2526d30994b5', 800, 800),  aspect: 1.0,  source_url: null, notes: null },
  { title: 'LINEAR DESIGN SYS',     collection: 'Dark UI',            tags: ['ui','system'],          image_url: img('photo-1551650975-87deedd944c3', 800, 960),  aspect: 1.2,  source_url: 'https://linear.app', notes: null },
  { title: 'BK WHOPPER OOH',        collection: 'OOH',                tags: ['food','outdoor'],       image_url: img('photo-1568901346375-23c9450c58cd', 800, 480),  aspect: 0.6,  source_url: null, notes: null },
  { title: 'SPOTIFY WRAPPED',       collection: 'Campanhas sociais',  tags: ['data','music'],         image_url: img('photo-1614680376573-df3480f0c6ff', 800, 1440), aspect: 1.8,  source_url: 'https://spotify.com', notes: null },
  { title: 'INTER TYPEFACE',        collection: 'Tipografia',         tags: ['open','grotesque'],     image_url: img('photo-1499346030926-9a72daac6c63', 800, 720),  aspect: 0.9,  source_url: null, notes: null },
  { title: 'PORTO ALEGRE OOH',      collection: 'OOH',                tags: ['brasil','urban'],       image_url: img('photo-1449824913935-59a10b8d2000', 800, 560),  aspect: 0.7,  source_url: null, notes: null },
  { title: 'FIGMA CONFIG 24',       collection: 'Dark UI',            tags: ['ux','conference'],      image_url: img('photo-1542751371-adc38448a05e', 800, 1040), aspect: 1.3,  source_url: 'https://figma.com', notes: null },
  { title: 'CHANEL N5 FILM',        collection: 'Motion refs',        tags: ['luxury','cinematic'],   image_url: img('photo-1490481651871-ab68de25d43d', 800, 1360), aspect: 1.7,  source_url: null, notes: null },
  { title: 'PENTAGRAM WORK',        collection: 'Identidade visual',  tags: ['branding','studio'],    image_url: img('photo-1503602642458-232111445657', 800, 880),  aspect: 1.1,  source_url: 'https://pentagram.com', notes: null },
  { title: 'GUGGENHEIM TYPE',       collection: 'Tipografia',         tags: ['museum','display'],     image_url: img('photo-1518998053901-5348d3961a04', 800, 680),  aspect: 0.85, source_url: null, notes: null },
  { title: 'OATLY WEIRD VOICE',     collection: 'Copy',               tags: ['voice','humor'],        image_url: img('photo-1550989460-0adf9ea622e2', 800, 1200), aspect: 1.5,  source_url: 'https://oatly.com', notes: 'Tom de voz irreverente.' },
  { title: 'TEENAGE DREAMS',        collection: 'Campanhas sociais',  tags: ['fashion','youth'],      image_url: img('photo-1492288991661-058aa541ff43', 800, 800),  aspect: 1.0,  source_url: null, notes: null },
  { title: 'FRAMER MOTION',         collection: 'Motion refs',        tags: ['web','interaction'],    image_url: img('photo-1550745165-9bc0b252726f', 800, 1080), aspect: 1.35, source_url: 'https://framer.com', notes: null },
  { title: 'BRUTALIST WEB',         collection: 'Dark UI',            tags: ['brutalist','bold'],     image_url: img('photo-1517245386807-bb43f82c33c4', 800, 1280), aspect: 1.6,  source_url: null, notes: null },
  { title: 'DOVE REAL BEAUTY',      collection: 'Copy',               tags: ['manifesto','brand'],    image_url: img('photo-1531123414780-f74242c2b052', 800, 600),  aspect: 0.75, source_url: null, notes: null },
  { title: 'PRADA BILLBOARD',       collection: 'OOH',                tags: ['luxury','fashion'],     image_url: img('photo-1445205170230-053b83016050', 800, 960),  aspect: 1.2,  source_url: null, notes: null },
  { title: 'VEJA COLLAB',           collection: 'Identidade visual',  tags: ['collab','street'],      image_url: img('photo-1525966222134-fcfa99b8ae77', 800, 800),  aspect: 1.0,  source_url: 'https://veja.fr', notes: null },
  { title: 'KINETIC POSTERS',       collection: 'Motion refs',        tags: ['poster','kinetic'],     image_url: img('photo-1547891654-e66ed7ebb968', 800, 1120), aspect: 1.4,  source_url: null, notes: null },
  { title: 'GUMROAD MINIMAL',       collection: 'Dark UI',            tags: ['saas','clean'],         image_url: img('photo-1467232004584-a241de8bcf5d', 800, 720),  aspect: 0.9,  source_url: null, notes: null },
  { title: 'RETRO ARCADE COPY',     collection: 'Copy',               tags: ['retro','playful'],      image_url: img('photo-1493711662062-fa541adb3fc8', 800, 1040), aspect: 1.3,  source_url: null, notes: null },
  { title: 'SWISS GRID STUDY',      collection: 'Tipografia',         tags: ['swiss','grid'],         image_url: img('photo-1524634126442-357e0eac3c14', 800, 800),  aspect: 1.0,  source_url: null, notes: null },
  { title: 'NEON CITY OOH',         collection: 'OOH',                tags: ['neon','night'],         image_url: img('photo-1492321936769-b49830bc1d1e', 800, 1200), aspect: 1.5,  source_url: null, notes: null },
]

async function seed() {
  // Buscar os 8 usuários da Fase 1
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, handle')
    .order('handle')
  if (pe || !profiles?.length) {
    console.error('Sem profiles. Rode scripts/seed.ts (Fase 1) antes.', pe?.message ?? '')
    process.exit(1)
  }

  // Idempotência: apaga todos os pins (cascata remove likes/saves)
  await supabase.from('pins').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Inserir pins, rotacionando autoria entre os usuários
  const rows = PINS.map((p, i) => ({ ...p, author_id: profiles[i % profiles.length].id }))
  const { data: inserted, error: ie } = await supabase.from('pins').insert(rows).select('id')
  if (ie) { console.error('Erro inserindo pins:', ie.message); process.exit(1) }
  console.log(`✓ ${inserted!.length} pins inseridos`)

  // Likes/saves aleatórios
  const pinIds = inserted!.map((r) => r.id)
  const likeRows: { user_id: string; pin_id: string }[] = []
  const saveRows: { user_id: string; pin_id: string }[] = []
  const seenLike = new Set<string>()
  const seenSave = new Set<string>()
  for (let n = 0; n < 30; n++) {
    const u = profiles[Math.floor(Math.random() * profiles.length)].id
    const pin = pinIds[Math.floor(Math.random() * pinIds.length)]
    const k = `${u}:${pin}`
    if (!seenLike.has(k)) { seenLike.add(k); likeRows.push({ user_id: u, pin_id: pin }) }
  }
  for (let n = 0; n < 15; n++) {
    const u = profiles[Math.floor(Math.random() * profiles.length)].id
    const pin = pinIds[Math.floor(Math.random() * pinIds.length)]
    const k = `${u}:${pin}`
    if (!seenSave.has(k)) { seenSave.add(k); saveRows.push({ user_id: u, pin_id: pin }) }
  }
  if (likeRows.length) await supabase.from('likes').insert(likeRows)
  if (saveRows.length) await supabase.from('saves').insert(saveRows)
  console.log(`✓ ${likeRows.length} likes, ${saveRows.length} saves`)
  console.log('\nDone.')
  process.exit(0)
}

seed()
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Não executar ainda**

O seed depende da migration (Task 1/2) já aplicada no Supabase. Anotar no relatório que o seed será rodado pelo controller após a migration manual. Não rodar agora.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-pins.ts
git commit -m "feat: seed-pins script (~25 unsplash pins + likes/saves)"
```

---

### Task 4: Server Actions — toggleLike / toggleSave

**Files:**
- Create: `app/(protected)/actions.ts`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts`
- Produces:
  - `toggleLike(pinId: string): Promise<{ liked: boolean; count: number }>`
  - `toggleSave(pinId: string): Promise<{ saved: boolean }>`

- [ ] **Step 1: Criar `app/(protected)/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleLike(pinId: string): Promise<{ liked: boolean; count: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: existing } = await supabase
    .from('likes')
    .select('pin_id')
    .eq('pin_id', pinId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('likes').delete().eq('pin_id', pinId).eq('user_id', user.id)
  } else {
    await supabase.from('likes').insert({ pin_id: pinId, user_id: user.id })
  }

  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('pin_id', pinId)

  return { liked: !existing, count: count ?? 0 }
}

export async function toggleSave(pinId: string): Promise<{ saved: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: existing } = await supabase
    .from('saves')
    .select('pin_id')
    .eq('pin_id', pinId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('saves').delete().eq('pin_id', pinId).eq('user_id', user.id)
  } else {
    await supabase.from('saves').insert({ pin_id: pinId, user_id: user.id })
  }

  return { saved: !existing }
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/actions.ts"
git commit -m "feat: toggleLike/toggleSave server actions"
```

---

### Task 5: LikeButton + SaveButton (otimistas)

**Files:**
- Create: `components/LikeButton.tsx`
- Create: `components/SaveButton.tsx`

**Interfaces:**
- Consumes: `toggleLike`, `toggleSave` de `app/(protected)/actions.ts`
- Produces:
  - `<LikeButton pinId initialLiked initialCount />`
  - `<SaveButton pinId initialSaved />`

- [ ] **Step 1: Criar `components/LikeButton.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { toggleLike } from '@/app/(protected)/actions'

export default function LikeButton({
  pinId,
  initialLiked,
  initialCount,
  showCount = true,
}: {
  pinId: string
  initialLiked: boolean
  initialCount: number
  showCount?: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const nextLiked = !liked
    setLiked(nextLiked)
    setCount((c) => c + (nextLiked ? 1 : -1))
    startTransition(async () => {
      try {
        const res = await toggleLike(pinId)
        setLiked(res.liked)
        setCount(res.count)
      } catch {
        setLiked(liked)
        setCount(count)
      }
    })
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
      {showCount && (
        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{count}</span>
      )}
      <button
        onClick={handleClick}
        aria-label="Curtir"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          color: liked ? 'var(--text)' : 'var(--text-muted)',
          fontSize: '15px', lineHeight: 1,
        }}
      >
        {liked ? '♥' : '♡'}
      </button>
    </span>
  )
}
```

- [ ] **Step 2: Criar `components/SaveButton.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { toggleSave } from '@/app/(protected)/actions'

export default function SaveButton({
  pinId,
  initialSaved,
}: {
  pinId: string
  initialSaved: boolean
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    const prev = saved
    setSaved(!prev)
    startTransition(async () => {
      try {
        const res = await toggleSave(pinId)
        setSaved(res.saved)
      } catch {
        setSaved(prev)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Salvar"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: saved ? 'var(--text)' : 'var(--text-muted)',
        fontSize: '14px', lineHeight: 1,
      }}
    >
      {saved ? '⊞' : '⊟'}
    </button>
  )
}
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/LikeButton.tsx components/SaveButton.tsx
git commit -m "feat: optimistic LikeButton + SaveButton"
```

---

### Task 6: PinCard

**Files:**
- Create: `components/PinCard.tsx`

**Interfaces:**
- Consumes: `PinWithMeta` de `lib/pins.ts`; `LikeButton`, `SaveButton`
- Produces: `<PinCard pin={PinWithMeta} />`

- [ ] **Step 1: Criar `components/PinCard.tsx`**

```typescript
'use client'

import Link from 'next/link'
import type { PinWithMeta } from '@/lib/pins'
import LikeButton from './LikeButton'
import SaveButton from './SaveButton'

export default function PinCard({ pin }: { pin: PinWithMeta }) {
  const imgH = Math.round(180 * pin.aspect)
  return (
    <Link
      href={`/pin/${pin.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        border: '0.5px solid var(--border)', marginBottom: '6px',
      }}
    >
      <div style={{ position: 'relative', height: `${imgH}px`, overflow: 'hidden', background: 'var(--surface-hover)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pin.imageUrl}
          alt={pin.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <span style={{
          position: 'absolute', top: '6px', right: '6px', fontSize: '7px', fontWeight: 700,
          letterSpacing: '.08em', background: 'rgba(0,0,0,.55)', color: 'var(--text)',
          padding: '2px 6px', maxWidth: '120px', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {pin.collection}
        </span>
      </div>
      <div style={{ background: 'var(--surface)', padding: '7px 8px' }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, color: 'var(--text)', margin: '0 0 5px',
          textTransform: 'uppercase', letterSpacing: '.02em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {pin.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span className="avatar" style={{ width: '16px', height: '16px', fontSize: '6px' }}>
              {pin.authorInitials}
            </span>
            <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>@{pin.authorHandle}</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LikeButton pinId={pin.id} initialLiked={pin.likedByMe} initialCount={pin.likeCount} />
            <SaveButton pinId={pin.id} initialSaved={pin.savedByMe} />
          </span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/PinCard.tsx
git commit -m "feat: PinCard with real image"
```

---

### Task 7: API route — scroll infinito

**Files:**
- Create: `app/api/pins/route.ts`

**Interfaces:**
- Consumes: `getFeedPins` de `lib/pins.ts`; `createClient` de `lib/supabase/server.ts`
- Produces: `GET /api/pins?collection=&q=&cursor=` → `{ pins: PinWithMeta[]; nextCursor: string | null }` (401 sem sessão)

- [ ] **Step 1: Criar `app/api/pins/route.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFeedPins } from '@/lib/pins'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const collection = searchParams.get('collection') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const cursor = searchParams.get('cursor') ?? undefined

  const result = await getFeedPins({ collection, search: q, cursor })
  return NextResponse.json(result)
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/pins/route.ts
git commit -m "feat: /api/pins route for infinite scroll"
```

---

### Task 8: FeedGrid (masonry + scroll infinito)

**Files:**
- Create: `components/FeedGrid.tsx`

**Interfaces:**
- Consumes: `PinWithMeta` de `lib/pins.ts`; `PinCard`; `GET /api/pins`
- Produces: `<FeedGrid initialPins nextCursor collection q />`

- [ ] **Step 1: Criar `components/FeedGrid.tsx`**

```typescript
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { PinWithMeta } from '@/lib/pins'
import PinCard from './PinCard'

export default function FeedGrid({
  initialPins,
  nextCursor,
  collection,
  q,
}: {
  initialPins: PinWithMeta[]
  nextCursor: string | null
  collection: string
  q: string
}) {
  const [pins, setPins] = useState<PinWithMeta[]>(initialPins)
  const [cursor, setCursor] = useState<string | null>(nextCursor)
  const [loading, setLoading] = useState(false)
  const sentinel = useRef<HTMLDivElement | null>(null)

  // Reset quando filtros mudam (nova carga vinda do server)
  useEffect(() => {
    setPins(initialPins)
    setCursor(nextCursor)
  }, [initialPins, nextCursor])

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (collection && collection !== 'TODOS') params.set('collection', collection)
      if (q) params.set('q', q)
      params.set('cursor', cursor)
      const res = await fetch(`/api/pins?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as { pins: PinWithMeta[]; nextCursor: string | null }
        setPins((prev) => [...prev, ...data.pins])
        setCursor(data.nextCursor)
      }
    } finally {
      setLoading(false)
    }
  }, [loading, cursor, collection, q])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  if (pins.length === 0) {
    return (
      <p className="caption" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '64px' }}>
        NENHUMA REFERÊNCIA ENCONTRADA
      </p>
    )
  }

  const cols: PinWithMeta[][] = [[], [], []]
  pins.forEach((pin, i) => cols[i % 3].push(pin))

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        {cols.map((col, idx) => (
          <div key={idx}>
            {col.map((pin) => <PinCard key={pin.id} pin={pin} />)}
          </div>
        ))}
      </div>
      <div ref={sentinel} style={{ height: '1px' }} />
      {loading && (
        <p className="caption" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '24px' }}>
          CARREGANDO…
        </p>
      )}
    </>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/FeedGrid.tsx
git commit -m "feat: FeedGrid masonry + infinite scroll"
```

---

### Task 9: CollectionTabs + NavBar com busca

**Files:**
- Create: `components/CollectionTabs.tsx`
- Modify: `components/NavBar.tsx`

**Interfaces:**
- Consumes: `useRouter` de `next/navigation`
- Produces: `<CollectionTabs collections={string[]} active={string} />`; NavBar com input de busca que navega para `/feed?q=`

- [ ] **Step 1: Criar `components/CollectionTabs.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'

export default function CollectionTabs({
  collections,
  active,
}: {
  collections: string[]
  active: string
}) {
  const router = useRouter()
  const tabs = ['TODOS', ...collections]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '0 20px',
      borderBottom: '1px solid var(--border)', overflowX: 'auto',
    }}>
      {tabs.map((tab) => {
        const isActive = active === tab || (active === '' && tab === 'TODOS')
        return (
          <button
            key={tab}
            onClick={() => router.push(tab === 'TODOS' ? '/feed' : `/feed?collection=${encodeURIComponent(tab)}`)}
            style={{
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--text)' : '2px solid transparent',
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              fontFamily: 'var(--font)', fontSize: '9px', fontWeight: 700,
              letterSpacing: '1.2px', textTransform: 'uppercase',
              padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              marginBottom: '-1px',
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Ler o `components/NavBar.tsx` atual e adicionar a busca**

A NavBar atual (Fase 1) tem wordmark + logout + avatar. Adicionar um campo de busca central que, ao submeter (Enter), navega para `/feed?q=valor`. Como Server Components não têm estado, a busca vira um pequeno Client Component embutido.

Criar o sub-componente de busca dentro de `components/NavBar.tsx` NÃO é possível (NavBar é Server Component). Em vez disso, criar `components/SearchInput.tsx`:

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function SearchInput() {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/feed?q=${encodeURIComponent(q)}` : '/feed')
  }

  return (
    <form onSubmit={submit} style={{
      flex: 1, maxWidth: '340px', margin: '0 24px', display: 'flex',
      alignItems: 'center', gap: '8px', background: 'rgba(237,232,213,.07)',
      border: '1px solid var(--border)', padding: '6px 12px',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2.5" style={{ opacity: .35, flexShrink: 0 }} aria-hidden>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="buscar referências..."
        style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', fontSize: '11px' }}
      />
    </form>
  )
}
```

- [ ] **Step 3: Modificar `components/NavBar.tsx` para incluir `<SearchInput />`**

Ler o arquivo atual. Importar `SearchInput` e inseri-lo entre o wordmark e o bloco da direita (logout + avatar). Manter todo o resto (sessão, iniciais, logout) intacto. Exemplo da estrutura do JSX após edição:

```tsx
// imports no topo
import SearchInput from './SearchInput'

// dentro do <nav>, entre o <a> do wordmark e o <div> da direita:
<SearchInput />
```

- [ ] **Step 4: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/CollectionTabs.tsx components/SearchInput.tsx components/NavBar.tsx
git commit -m "feat: CollectionTabs + functional search in NavBar"
```

---

### Task 10: Feed page real

**Files:**
- Modify: `app/(protected)/feed/page.tsx`

**Interfaces:**
- Consumes: `getFeedPins`, `getRecentCollections` de `lib/pins.ts`; `NavBar`, `CollectionTabs`, `FeedGrid`
- Produces: `/feed` renderizando pins reais

- [ ] **Step 1: Substituir `app/(protected)/feed/page.tsx`**

```typescript
import NavBar from '@/components/NavBar'
import CollectionTabs from '@/components/CollectionTabs'
import FeedGrid from '@/components/FeedGrid'
import { getFeedPins, getRecentCollections } from '@/lib/pins'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; q?: string }>
}) {
  const { collection, q } = await searchParams
  const [{ pins, nextCursor }, collections] = await Promise.all([
    getFeedPins({ collection, search: q }),
    getRecentCollections(3),
  ])

  return (
    <>
      <NavBar />
      <CollectionTabs collections={collections} active={collection ?? ''} />
      <div style={{ padding: '12px 20px' }}>
        <FeedGrid
          initialPins={pins}
          nextCursor={nextCursor}
          collection={collection ?? 'TODOS'}
          q={q ?? ''}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/feed/page.tsx"
git commit -m "feat: real feed page with pins, tabs, search, infinite scroll"
```

---

### Task 11: BackButton + Pin detail page

**Files:**
- Create: `components/BackButton.tsx`
- Modify: `app/(protected)/pin/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPinById`, `getRelatedPins` de `lib/pins.ts`; `NavBar`, `PinCard`, `LikeButton`, `SaveButton`, `BackButton`
- Produces: `/pin/[id]` com detalhe real + pins relacionados

- [ ] **Step 1: Criar `components/BackButton.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()
  return (
    <button className="btn-ghost" onClick={() => router.back()} style={{ gap: '6px', fontSize: '9px' }}>
      ← VOLTAR
    </button>
  )
}
```

- [ ] **Step 2: Substituir `app/(protected)/pin/[id]/page.tsx`**

```typescript
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import PinCard from '@/components/PinCard'
import LikeButton from '@/components/LikeButton'
import SaveButton from '@/components/SaveButton'
import BackButton from '@/components/BackButton'
import { getPinById, getRelatedPins } from '@/lib/pins'

export default async function PinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pin = await getPinById(id)

  if (!pin) {
    return (
      <>
        <NavBar />
        <p className="caption" style={{ padding: '48px', color: 'var(--text-faint)' }}>
          PIN NÃO ENCONTRADO
        </p>
      </>
    )
  }

  const related = await getRelatedPins(pin)
  const relCols: typeof related[] = [[], [], []]
  related.forEach((p, i) => relCols[i % 3].push(p))

  return (
    <>
      <NavBar />
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <BackButton />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '60fr 40fr',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ padding: '24px 20px', borderRight: '1px solid var(--border)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pin.imageUrl}
            alt={pin.title}
            style={{ width: '100%', display: 'block', background: 'var(--surface-hover)' }}
          />
        </div>

        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Link
            href={`/feed?collection=${encodeURIComponent(pin.collection)}`}
            style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            {pin.collection} ↗
          </Link>
          <h1 className="display-sm">{pin.title}</h1>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 0',
            borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          }}>
            <span className="avatar" style={{ width: '34px', height: '34px', fontSize: '13px' }}>
              {pin.authorInitials}
            </span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{pin.authorName}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>@{pin.authorHandle}</p>
            </div>
          </div>

          {pin.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {pin.tags.map((t) => <span key={t} className="tag-pill">{t}</span>)}
            </div>
          )}

          {pin.notes && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{pin.notes}</p>
          )}

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <LikeButton pinId={pin.id} initialLiked={pin.likedByMe} initialCount={pin.likeCount} />
            <SaveButton pinId={pin.id} initialSaved={pin.savedByMe} />
            {pin.sourceUrl && (
              <a
                href={pin.sourceUrl}
                target="_blank"
                rel="noopener"
                className="btn-ghost"
                style={{ gap: '6px', textDecoration: 'none' }}
              >
                ABRIR LINK ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <p className="caption" style={{ marginBottom: '14px', color: 'var(--text-muted)' }}>
          MAIS DA COLEÇÃO &quot;{pin.collection}&quot;
        </p>
        {related.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {relCols.map((col, idx) => (
              <div key={idx}>{col.map((p) => <PinCard key={p.id} pin={p} />)}</div>
            ))}
          </div>
        ) : (
          <p className="caption" style={{ color: 'var(--text-faint)' }}>
            NENHUM OUTRO PIN NESTA COLEÇÃO
          </p>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/BackButton.tsx "app/(protected)/pin/[id]/page.tsx"
git commit -m "feat: real pin detail page with related pins"
```

---

### Task 12: next.config — permitir imagens do Unsplash + verificação E2E

**Files:**
- Modify: `next.config.mjs`

**Interfaces:**
- Produces: app rodando com feed real end-to-end

- [ ] **Step 1: Atualizar `next.config.mjs`**

Como usamos `<img>` nativo (não `next/image`), não há necessidade estrita de configurar `remotePatterns`. Mas deixar registrado para uma futura migração a `next/image`. Manter o config simples:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
```

(Nenhuma mudança funcional necessária nesta task; ela existe como checkpoint de verificação E2E.)

- [ ] **Step 2: Verificação E2E manual (controller, após migration aplicada e seed rodado)**

Pré-condições (ações manuais do usuário/controller):
1. Migration `002_pins.sql` (incluindo a RPC) aplicada no Supabase SQL Editor
2. `npx tsx scripts/seed-pins.ts` executado → ~25 pins criados

Com `npm run dev` rodando e logado (email/senha de teste), verificar:
- `/feed` mostra pins reais em 3 colunas com imagens do Unsplash
- Tabs de coleção filtram (clicar muda a URL e os pins)
- Busca por uma palavra (ex: "nike") filtra via banco
- Scroll até o fim carrega mais (se > 30 pins; com 25 não haverá segunda página — validar que não quebra)
- Clicar coração → preenche e contador sobe; refresh mantém o estado (persistiu)
- Clicar bookmark → idem
- Clicar num card → `/pin/[id]` com detalhe + "MAIS DA COLEÇÃO"
- Clicar na coleção no detalhe → volta ao feed filtrado

- [ ] **Step 3: Commit (se houver mudança) ou anotar verificação**

```bash
git add next.config.mjs
git commit -m "chore: phase 2 e2e verification checkpoint" --allow-empty
```

---

## Checklist de self-review

**Spec coverage:**
- [x] Migration pins/likes/saves + RLS + índices — Task 1
- [x] RPC get_feed_pins + lib/pins.ts (PinWithMeta, 4 funções) — Task 2
- [x] Seed ~25 pins Unsplash + likes/saves — Task 3
- [x] Server Actions toggleLike/toggleSave — Task 4
- [x] LikeButton/SaveButton otimistas — Task 5
- [x] PinCard com imagem real — Task 6
- [x] API route scroll infinito — Task 7
- [x] FeedGrid masonry + IntersectionObserver — Task 8
- [x] CollectionTabs + busca funcional na NavBar — Task 9
- [x] Feed page real (substitui placeholder) — Task 10
- [x] Pin detail real + relacionados — Task 11
- [x] Verificação E2E — Task 12

**Placeholders:** nenhum no código das tasks.

**Consistência de tipos:**
- `PinWithMeta` definido na Task 2, consumido em Tasks 5/6/8/10/11 com os mesmos campos ✓
- `toggleLike` retorna `{ liked, count }` (Task 4), consumido em LikeButton (Task 5) ✓
- `toggleSave` retorna `{ saved }` (Task 4), consumido em SaveButton (Task 5) ✓
- `getFeedPins` retorna `FeedResult { pins, nextCursor }` (Task 2), consumido em API route (Task 7), Feed page (Task 10), FeedGrid via fetch (Task 8) ✓
- `SearchInput` navega para `/feed?q=` (Task 9), lido por `searchParams` na Feed page (Task 10) ✓

**Nota sobre paginação do detalhe:** `getPinById` e `getRelatedPins` reutilizam `get_feed_pins`; `getRelatedPins` usa só a primeira página (30) da coleção — suficiente para "mais como este". Documentado na Task 2.
