# DZtaque — Backend Fase 2: Core de Pins + Feed

**Data:** 2026-06-22
**Fase:** 2 de 5
**Entregável:** Feed real com pins, likes e saves persistidos no Supabase, página de detalhe e busca/filtro no banco

---

## Contexto

Fase 1 (fundação) concluída: Next.js 14 App Router, Supabase auth com Google OAuth + email/senha de teste, tabela `profiles` com trigger, middleware de proteção de rotas. 8 usuários de teste semeados. Login funcional no browser.

Esta fase substitui o placeholder do feed por dados reais e implementa as interações de curtir e salvar.

## Fases do projeto

| Fase | Escopo |
|---|---|
| 1 — Fundação | ✅ concluída |
| **2 — Core pins e feed** (este spec) | Tabelas pins/likes/saves, feed real, detalhe, like/save |
| 3 — Criar pin + Cloudinary | Upload de imagem, drawer de criação, @menção |
| 4 — Perfil e coleções | Página de perfil com tabs |
| 5 — Notificações | Sistema de notificações |

---

## Decisões de produto (definidas no brainstorming)

| Decisão | Escolha |
|---|---|
| Imagens dos pins | `image_url` real (Unsplash nos testes, Cloudinary na Fase 3) + `aspect` para masonry |
| Contagem de likes | `COUNT` em tempo real da tabela `likes` (sem coluna de cache, sem trigger) |
| Like/Save na UI | Otimista (muda na hora) + Server Action grava em background, reverte se falhar |
| Carregamento do feed | Híbrido: Server Component renderiza 1ª página, scroll infinito via API route paginada no banco; busca e filtro de coleção consultam o banco |

---

## Database schema — Fase 2

```sql
-- PINS
CREATE TABLE pins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  collection  TEXT NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  image_url   TEXT NOT NULL,
  aspect      NUMERIC NOT NULL DEFAULT 1.0,
  source_url  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LIKES (1 linha por usuário+pin; PK composta previne duplicata)
CREATE TABLE likes (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pin_id     UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pin_id)
);

-- SAVES (1 linha por usuário+pin)
CREATE TABLE saves (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pin_id     UUID NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pin_id)
);

CREATE INDEX pins_created_at_idx ON pins (created_at DESC);
CREATE INDEX pins_collection_idx ON pins (collection);
CREATE INDEX likes_pin_idx ON likes (pin_id);
CREATE INDEX saves_user_idx ON saves (user_id);
```

Arquivo: `supabase/migrations/002_pins.sql`.

---

## RLS — políticas

Tudo público internamente (todo autenticado lê tudo); cada um gerencia apenas o que é seu.

```sql
ALTER TABLE pins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pins_select" ON pins
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pins_insert" ON pins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "pins_update" ON pins
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "pins_delete" ON pins
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "likes_select" ON likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert" ON likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "saves_select" ON saves
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "saves_insert" ON saves
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saves_delete" ON saves
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

---

## Camada de acesso a dados (`lib/pins.ts`)

Funções tipadas chamadas por Server Components e API routes. Usam o server client do `lib/supabase/server.ts`.

```typescript
type PinWithMeta = {
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

type FeedResult = { pins: PinWithMeta[]; nextCursor: string | null }

// Feed paginado. cursor = createdAt do último pin da página anterior (ISO).
// PAGE_SIZE = 30. Ordena por created_at DESC.
getFeedPins(opts: {
  collection?: string
  search?: string
  cursor?: string
}): Promise<FeedResult>

getPinById(id: string): Promise<PinWithMeta | null>

// Mesma collection, exclui o pin atual, LIMIT 30, created_at DESC.
getRelatedPins(pin: PinWithMeta): Promise<PinWithMeta[]>

// As 3 coleções com o pin mais recente (DISTINCT collection ORDER BY max(created_at) DESC LIMIT 3).
getRecentCollections(limit?: number): Promise<string[]>
```

**Estratégia de query do feed:**
- Base: `SELECT pins.*, profiles.name, profiles.handle` com `JOIN profiles ON pins.author_id = profiles.id`
- `likeCount`: subquery `(SELECT count(*) FROM likes WHERE likes.pin_id = pins.id)`
- `likedByMe` / `savedByMe`: subquery `EXISTS` filtrando pelo `auth.uid()` do usuário atual
- Filtro de coleção: `WHERE collection = $collection` (quando ≠ TODOS)
- Busca: `WHERE (title ILIKE %q% OR collection ILIKE %q% OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE %q%))`
- Paginação por cursor: `WHERE created_at < $cursor` (mais estável que OFFSET com inserções concorrentes)
- `nextCursor` = `createdAt` do último pin se a página veio cheia (30), senão `null`

> Como essas queries combinam JOIN + subqueries + busca em array, são implementadas via **RPC (função Postgres) `get_feed_pins`** OU via query builder do supabase-js com `.select()` aninhado. O plano de implementação decide o método mais limpo; o contrato de retorno (`PinWithMeta`) é o que importa.

`initials`: derivado de `name` (primeiras letras das 2 primeiras palavras, maiúsculas) — mesma lógica do `NavBar` da Fase 1.

---

## API route — scroll infinito

`app/api/pins/route.ts` — `GET`:
- Lê query params: `collection`, `q`, `cursor`
- Chama `getFeedPins({ collection, search: q, cursor })`
- Retorna JSON `{ pins, nextCursor }`
- Protegida: se sem sessão, retorna 401

---

## Telas e componentes

### Feed — `app/(protected)/feed/page.tsx` (substitui placeholder)

Server Component:
- Lê `searchParams`: `?collection=` e `?q=`
- Chama `getFeedPins({ collection, search })` (1ª página) e `getRecentCollections(3)`
- Renderiza: `<NavBar />` + `<CollectionTabs>` + `<FeedGrid initialPins nextCursor collection q />`
- Estado vazio: caption "NENHUMA REFERÊNCIA ENCONTRADA"

### Componentes (novos, em `components/`)

**`CollectionTabs.tsx`** (client) — tabs `TODOS` + 3 coleções recentes. Clique atualiza a URL (`router.push('/feed?collection=X')`). Tab ativa: underline 2px creme.

**`FeedGrid.tsx`** (client) — recebe `initialPins`, `nextCursor`, `collection`, `q`. Distribui pins em 3 colunas (round-robin) para masonry. Scroll infinito: `IntersectionObserver` em um sentinel no fim → `fetch('/api/pins?collection=&q=&cursor=')` → anexa pins, atualiza cursor. Para quando `nextCursor` é null.

**`PinCard.tsx`** (client) — imagem real (`image_url`, altura = `180 * aspect`), badge de coleção, título uppercase truncado, avatar + @handle do autor, contador de likes, `<LikeButton>` + `<SaveButton>`. Clique no card → `/pin/[id]`. Clique nos botões usa `stopPropagation`.

**`LikeButton.tsx`** (client) — recebe `pinId`, `initialLiked`, `initialCount`. Estado otimista: clique alterna ícone (♥/♡) e ajusta contador na hora, chama Server Action `toggleLike(pinId)`. Em erro, reverte.

**`SaveButton.tsx`** (client) — mesmo padrão para save (⊞/⊟), Server Action `toggleSave(pinId)`.

### Server Actions — `app/(protected)/actions.ts`

```typescript
'use server'
// Alterna like: se existe linha (user, pin) deleta, senão insere. Retorna { liked, count }.
toggleLike(pinId: string): Promise<{ liked: boolean; count: number }>
// Alterna save: idem. Retorna { saved: boolean }.
toggleSave(pinId: string): Promise<{ saved: boolean }>
```
Usam o user da sessão (`auth.uid()`); o RLS garante que só o próprio usuário grava.

### Detalhe — `app/(protected)/pin/[id]/page.tsx` (substitui placeholder)

Server Component:
- `getPinById(params.id)`; se null → "PIN NÃO ENCONTRADO"
- Layout 2 colunas (60/40): imagem real à esquerda, metadados à direita
- Direita: coleção clicável (`/feed?collection=X`), título display-sm, autor (avatar+nome+@handle), tags como pills, notas, botões like/save (contadores reais), "ABRIR LINK ↗" se `source_url`
- Botão "← VOLTAR" (Client Component com `router.back()`)
- "MAIS DA COLEÇÃO [nome]" via `getRelatedPins`, em grid masonry usando `PinCard`

---

## Seed de pins — `scripts/seed-pins.ts`

- ~25 pins distribuídos entre os 8 usuários de teste
- `image_url`: URLs do Unsplash (`https://images.unsplash.com/...`) com `aspect` correspondente
- Coleções variadas e repetidas (para as tabs e relacionados funcionarem): ex. "Campanhas sociais", "Identidade visual", "Motion refs", "Dark UI", "Tipografia"
- `tags` variadas
- ~30 likes e ~15 saves pré-populados aleatoriamente entre usuários e pins (feed nasce "vivo")
- Idempotente: limpa pins/likes/saves de teste antes de re-semear (ou usa `ON CONFLICT`); lê credenciais do `.env.local` como o seed da Fase 1
- Usa `SUPABASE_SECRET_KEY` (admin) para bypassar RLS na inserção

---

## Entregável da Fase 2

- [ ] Migration `002_pins.sql` aplicada (pins, likes, saves + RLS + índices)
- [ ] `lib/pins.ts` com as 4 funções de acesso a dados
- [ ] `/feed` mostra pins reais em masonry 3 colunas com imagens do Unsplash
- [ ] Tabs de coleção (TODOS + 3 recentes) filtram o feed via URL
- [ ] Busca no NavBar encontra pins por título/tag/coleção (query no banco)
- [ ] Scroll infinito carrega páginas adicionais
- [ ] Curtir e salvar funcionam com UI otimista e persistem no banco
- [ ] `/pin/[id]` mostra detalhe real + pins relacionados da mesma coleção
- [ ] Seed cria ~25 pins com likes/saves; feed nasce populado

---

## Fora do escopo da Fase 2

- Upload de imagem / Cloudinary (Fase 3)
- Criar pin via drawer / @menção (Fase 3)
- Página de perfil com tabs (Fase 4)
- Notificações (Fase 5)
- Responsividade mobile
