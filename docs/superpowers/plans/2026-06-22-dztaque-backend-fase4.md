# DZtaque Backend — Fase 4: Perfil + Coleções

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar página de perfil com tabs MEUS PINS / COLEÇÕES / SALVOS, perfis de outros colaboradores via `/profile/[handle]`, e PinCard linkado ao perfil do autor.

**Architecture:** `/profile` redireciona para `/profile/[handle]`; a página de perfil é um Server Component que carrega dados do autor e passa tudo para ProfileTabs (Client Component). Coleções são derivadas em memória dos pins já carregados — sem query extra. A RPC `get_feed_pins` recebe `p_author_id` para filtrar pins de um autor com metadados completos (like/save).

**Tech Stack:** Next.js 14 App Router, TypeScript strict, `@supabase/ssr`, Postgres RPC.

## Global Constraints

- Next.js 14 App Router; TypeScript strict
- Sem Tailwind, sem UI library — inline styles com CSS variables
- Design system: `--bg #111111`, `--text #EDE8D5`, `border-radius: 0` exceto `.avatar`; sem `box-shadow`
- `@supabase/ssr` via `lib/supabase/server.ts` (server) e `lib/supabase/client.ts` (browser)
- Postgres RPC com `SET search_path = public`; tabelas schema-qualificadas
- RPC `get_feed_pins` DEVE ter `p_author_id` adicionado antes de rodar a app (Task 1, manual)
- `npm run typecheck` deve passar após cada task
- Diretório: `/Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque`

---

### Task 1: Atualizar RPC get_feed_pins com p_author_id

**Files:**
- Modify: `supabase/migrations/002_pins.sql` (documentação — a aplicação é manual no SQL Editor)

**Interfaces:**
- Produces: RPC `get_feed_pins` aceita parâmetro opcional `p_author_id UUID DEFAULT NULL`; quando fornecido, filtra pins por autor

- [ ] **Step 1: Adicionar p_author_id ao SQL da função em `supabase/migrations/002_pins.sql`**

Localizar o bloco `CREATE OR REPLACE FUNCTION public.get_feed_pins` no arquivo e substituir pela versão abaixo (adiciona `p_author_id` na assinatura e `WHERE` clause):

```sql
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
```

- [ ] **Step 2: Instrução manual**

Reportar no relatório que o usuário deve rodar este `CREATE OR REPLACE FUNCTION` no Supabase Dashboard → SQL Editor → Run. O `CREATE OR REPLACE` não cria tabelas novas — apenas substitui a função existente. Nenhuma migration de tabela é necessária.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_pins.sql
git commit -m "feat: add p_author_id to get_feed_pins RPC"
```

---

### Task 2: Novas funções de dados em lib/pins.ts

**Files:**
- Modify: `lib/pins.ts` — adicionar tipos e funções ao final do arquivo

**Interfaces:**
- Consumes: `createClient`, `currentUserId`, `mapRow`, `FeedRow` (já existem em `lib/pins.ts`); RPC `get_feed_pins` com o novo param
- Produces:
  - `type ProfileWithStats` (exportado)
  - `type CollectionGroup` (exportado)
  - `getProfileWithStats(handle: string): Promise<ProfileWithStats | null>`
  - `getAuthorPins(authorId: string): Promise<PinWithMeta[]>`
  - `getSavedPins(userId: string): Promise<PinWithMeta[]>`
  - `groupByCollection(pins: PinWithMeta[]): CollectionGroup[]`

- [ ] **Step 1: Adicionar ao FINAL de `lib/pins.ts`**

```typescript
// ── Tipos de perfil ───────────────────────────────────────────
export type ProfileWithStats = {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  createdAt: string
  pinsCount: number
  collectionsCount: number
  likesReceived: number
}

export type CollectionGroup = {
  name: string
  count: number
  previewImages: string[]  // até 4 imageUrl dos pins mais recentes
}

// ── Perfil com stats ──────────────────────────────────────────
export async function getProfileWithStats(handle: string): Promise<ProfileWithStats | null> {
  const supabase = await createClient()

  const { data: profile, error: pe } = await supabase
    .from('profiles')
    .select('id, name, handle, avatar_url, created_at')
    .eq('handle', handle)
    .single()
  if (pe || !profile) return null

  const { data: authorPins } = await supabase
    .from('pins')
    .select('id, collection')
    .eq('author_id', profile.id)

  const pins = (authorPins ?? []) as { id: string; collection: string }[]
  const pinIds = pins.map((p) => p.id)

  const pinsCount = pins.length
  const collectionsCount = new Set(pins.map((p) => p.collection)).size

  let likesReceived = 0
  if (pinIds.length > 0) {
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .in('pin_id', pinIds)
    likesReceived = count ?? 0
  }

  return {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    pinsCount,
    collectionsCount,
    likesReceived,
  }
}

// ── Pins de um autor (com metadados de like/save) ─────────────
export async function getAuthorPins(authorId: string): Promise<PinWithMeta[]> {
  const supabase = await createClient()
  const uid = await currentUserId()
  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: null,
    p_search: null,
    p_cursor: null,
    p_limit: 1000,
    p_author_id: authorId,
  })
  if (error) throw new Error(`getAuthorPins: ${error.message}`)
  return ((data ?? []) as FeedRow[]).map(mapRow)
}

// ── Pins salvos por um usuário (com metadados de like/save) ───
// Carrega todos os pins e filtra pelos IDs salvos — aceitável para escala atual da DZ.
export async function getSavedPins(userId: string): Promise<PinWithMeta[]> {
  const supabase = await createClient()
  const uid = await currentUserId()

  const { data: saves } = await supabase
    .from('saves')
    .select('pin_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const pinIds = ((saves ?? []) as { pin_id: string }[]).map((s) => s.pin_id)
  if (pinIds.length === 0) return []

  const { data, error } = await supabase.rpc('get_feed_pins', {
    p_user_id: uid,
    p_collection: null,
    p_search: null,
    p_cursor: null,
    p_limit: 2000,
    p_author_id: null,
  })
  if (error) throw new Error(`getSavedPins: ${error.message}`)

  const all = new Map(((data ?? []) as FeedRow[]).map((r) => [r.id, mapRow(r)]))
  return pinIds.map((id) => all.get(id)).filter(Boolean) as PinWithMeta[]
}

// ── Coleções derivadas de um conjunto de pins ─────────────────
// Mantém a ordem de primeira aparição (pins já vêm por created_at DESC).
export function groupByCollection(pins: PinWithMeta[]): CollectionGroup[] {
  const map = new Map<string, PinWithMeta[]>()
  for (const pin of pins) {
    if (!map.has(pin.collection)) map.set(pin.collection, [])
    map.get(pin.collection)!.push(pin)
  }
  return Array.from(map.entries()).map(([name, colPins]) => ({
    name,
    count: colPins.length,
    previewImages: colPins.slice(0, 4).map((p) => p.imageUrl),
  }))
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/pins.ts
git commit -m "feat: getProfileWithStats, getAuthorPins, getSavedPins, groupByCollection"
```

---

### Task 3: PinCard + NavBar — avatares viram links

**Files:**
- Modify: `components/PinCard.tsx`
- Modify: `components/NavBar.tsx`

**Interfaces:**
- Consumes: `PinWithMeta.authorHandle` (já existe); `/profile/[handle]` route (Task 7 cria, mas o link funciona independentemente)
- Produces: clicar no avatar/handle num PinCard navega para `/profile/[handle]`; clicar no avatar na NavBar navega para `/profile`

- [ ] **Step 1: Ler `components/PinCard.tsx` e localizar o bloco do autor**

O bloco atual (dentro do info strip) tem a estrutura:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
  <span className="avatar" style={{ width: '16px', height: '16px', fontSize: '6px' }}>
    {pin.authorInitials}
  </span>
  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>@{pin.authorHandle}</span>
</div>
```

Substituir por:

```tsx
<a
  href={`/profile/${pin.authorHandle}`}
  onClick={(e) => e.stopPropagation()}
  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
>
  <span className="avatar" style={{ width: '16px', height: '16px', fontSize: '6px' }}>
    {pin.authorInitials}
  </span>
  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>@{pin.authorHandle}</span>
</a>
```

O `stopPropagation` evita que o clique no link abra o pin junto.

- [ ] **Step 2: Ler `components/NavBar.tsx` e substituir o `<span>` do avatar**

O span atual:
```tsx
<span
  className="avatar"
  title={name}
  style={{ width: '28px', height: '28px', fontSize: '11px', cursor: 'pointer' }}
>
  {initials || '?'}
</span>
```

Substituir por:

```tsx
<a href="/profile" title={name} style={{ cursor: 'pointer', textDecoration: 'none' }}>
  <span className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
    {initials || '?'}
  </span>
</a>
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/PinCard.tsx components/NavBar.tsx
git commit -m "feat: avatar links to profile in PinCard and NavBar"
```

---

### Task 4: CollectionCard

**Files:**
- Create: `components/CollectionCard.tsx`

**Interfaces:**
- Consumes: `CollectionGroup` de `lib/pins.ts`; `useRouter` de `next/navigation`
- Produces: `<CollectionCard group={CollectionGroup} />`

- [ ] **Step 1: Criar `components/CollectionCard.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import type { CollectionGroup } from '@/lib/pins'

export default function CollectionCard({ group }: { group: CollectionGroup }) {
  const router = useRouter()
  const cells = Array.from({ length: 4 }, (_, i) => group.previewImages[i] ?? null)

  return (
    <div
      onClick={() => router.push(`/feed?collection=${encodeURIComponent(group.name)}`)}
      style={{
        border: '0.5px solid var(--border)', cursor: 'pointer', marginBottom: '6px',
        transition: 'border-color .15s',
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Grid 2x2 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        height: '120px', gap: '1px', background: 'var(--border)',
      }}>
        {cells.map((imgUrl, i) => (
          <div key={i} style={{
            background: 'var(--surface-hover)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {imgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'grayscale(1) contrast(1.15)',
                }}
              />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="rgba(237,232,213,.15)" strokeWidth="1.5" aria-hidden>
                <rect x="3" y="3" width="18" height="18" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--surface)', padding: '8px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <p style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--text)', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
        }}>
          {group.name}
        </p>
        <p style={{
          fontSize: '9px', color: 'var(--text-muted)', margin: 0,
          flexShrink: 0, marginLeft: '8px',
        }}>
          {group.count} {group.count === 1 ? 'PIN' : 'PINS'}
        </p>
      </div>
    </div>
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
git add components/CollectionCard.tsx
git commit -m "feat: CollectionCard with 2x2 thumbnail grid"
```

---

### Task 5: ProfileHeader

**Files:**
- Create: `components/ProfileHeader.tsx`

**Interfaces:**
- Consumes: `ProfileWithStats` de `lib/pins.ts`
- Produces: `<ProfileHeader profile={ProfileWithStats} isOwnProfile={boolean} />`

- [ ] **Step 1: Criar `components/ProfileHeader.tsx`**

```typescript
import type { ProfileWithStats } from '@/lib/pins'

function initialsFrom(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
}: {
  profile: ProfileWithStats
  isOwnProfile: boolean
}) {
  const initials = initialsFrom(profile.name)
  const stats = [
    { value: profile.pinsCount,       label: 'PINS' },
    { value: profile.collectionsCount, label: 'COLEÇÕES' },
    { value: profile.likesReceived,    label: 'CURTIDAS' },
  ]

  return (
    <div style={{ padding: '32px 20px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <span
          className="avatar"
          style={{ width: '56px', height: '56px', fontSize: '22px', flexShrink: 0 }}
        >
          {initials || '?'}
        </span>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
            {profile.name}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            @{profile.handle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '28px', textAlign: 'center', flexShrink: 0 }}>
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                {value}
              </p>
              <p className="caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {isOwnProfile && (
          <button
            className="btn-ghost"
            disabled
            style={{ fontSize: '9px', opacity: 0.4, cursor: 'not-allowed' }}
          >
            EDITAR PERFIL
          </button>
        )}
      </div>
    </div>
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
git add components/ProfileHeader.tsx
git commit -m "feat: ProfileHeader with stats and own-profile controls"
```

---

### Task 6: ProfileTabs

**Files:**
- Create: `components/ProfileTabs.tsx`

**Interfaces:**
- Consumes: `PinWithMeta`, `CollectionGroup` de `lib/pins.ts`; `PinCard`; `CollectionCard`
- Produces: `<ProfileTabs authorPins savedPins collections isOwnProfile />`

- [ ] **Step 1: Criar `components/ProfileTabs.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { PinWithMeta, CollectionGroup } from '@/lib/pins'
import PinCard from './PinCard'
import CollectionCard from './CollectionCard'

type Tab = 'pins' | 'collections' | 'saved'

function MasonryGrid({ pins }: { pins: PinWithMeta[] }) {
  if (pins.length === 0) return null
  const cols: PinWithMeta[][] = [[], [], []]
  pins.forEach((p, i) => cols[i % 3].push(p))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
      {cols.map((col, idx) => (
        <div key={idx}>{col.map((p) => <PinCard key={p.id} pin={p} />)}</div>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="caption" style={{ color: 'var(--text-faint)', padding: '48px', textAlign: 'center' }}>
      {message}
    </p>
  )
}

export default function ProfileTabs({
  authorPins,
  savedPins,
  collections,
  isOwnProfile,
}: {
  authorPins: PinWithMeta[]
  savedPins: PinWithMeta[]
  collections: CollectionGroup[]
  isOwnProfile: boolean
}) {
  const [activeTab, setActiveTab] = useState<Tab>('pins')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pins',        label: 'MEUS PINS' },
    { id: 'collections', label: 'COLEÇÕES' },
    ...(isOwnProfile ? [{ id: 'saved' as Tab, label: 'SALVOS' }] : []),
  ]

  function renderContent() {
    if (activeTab === 'pins') {
      return authorPins.length > 0
        ? <MasonryGrid pins={authorPins} />
        : <EmptyState message="NENHUM PIN PUBLICADO" />
    }

    if (activeTab === 'collections') {
      if (collections.length === 0) return <EmptyState message="NENHUMA COLEÇÃO CRIADA" />
      const cols: CollectionGroup[][] = [[], [], []]
      collections.forEach((c, i) => cols[i % 3].push(c))
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {cols.map((col, idx) => (
            <div key={idx}>
              {col.map((c) => <CollectionCard key={c.name} group={c} />)}
            </div>
          ))}
        </div>
      )
    }

    if (activeTab === 'saved') {
      return savedPins.length > 0
        ? <MasonryGrid pins={savedPins} />
        : <EmptyState message="NENHUM PIN SALVO" />
    }

    return null
  }

  return (
    <>
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px',
      }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none',
                borderBottom: active ? '2px solid var(--text)' : '2px solid transparent',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                fontFamily: 'var(--font)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '1.2px', textTransform: 'uppercase',
                padding: '10px 14px', cursor: 'pointer', marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div style={{ padding: '12px 20px' }}>
        {renderContent()}
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
git add components/ProfileTabs.tsx
git commit -m "feat: ProfileTabs with pins/collections/saved tabs"
```

---

### Task 7: /profile redirect + /profile/[handle] page

**Files:**
- Modify: `app/(protected)/profile/page.tsx`
- Create: `app/(protected)/profile/[handle]/page.tsx`

**Interfaces:**
- Consumes: `getProfileWithStats`, `getAuthorPins`, `getSavedPins`, `groupByCollection` de `lib/pins.ts`; `NavBar`, `ProfileHeader`, `ProfileTabs`
- Produces: `/profile` redireciona para próprio handle; `/profile/[handle]` renderiza página completa com 404 se handle não existe

- [ ] **Step 1: Substituir `app/(protected)/profile/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .single()

  redirect(`/profile/${profile?.handle ?? ''}`)
}
```

- [ ] **Step 2: Criar `app/(protected)/profile/[handle]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import ProfileHeader from '@/components/ProfileHeader'
import ProfileTabs from '@/components/ProfileTabs'
import {
  getProfileWithStats,
  getAuthorPins,
  getSavedPins,
  groupByCollection,
} from '@/lib/pins'

export default async function ProfileHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = await getProfileWithStats(handle)
  if (!profile) notFound()

  const isOwnProfile = profile.id === (user?.id ?? '')

  const [authorPins, savedPins] = await Promise.all([
    getAuthorPins(profile.id),
    isOwnProfile ? getSavedPins(user!.id) : Promise.resolve([] as Awaited<ReturnType<typeof getSavedPins>>),
  ])

  const collections = groupByCollection(authorPins)

  return (
    <>
      <NavBar />
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
      <ProfileTabs
        authorPins={authorPins}
        savedPins={savedPins}
        collections={collections}
        isOwnProfile={isOwnProfile}
      />
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
git add "app/(protected)/profile/page.tsx" "app/(protected)/profile/[handle]/page.tsx"
git commit -m "feat: profile redirect + /profile/[handle] page"
```

---

### Task 8: Verificação E2E

**Files:** nenhum (apenas verificação)

**Pré-condição (ação manual do usuário):**
Aplicar o `CREATE OR REPLACE FUNCTION get_feed_pins` do Task 1 no Supabase SQL Editor. Sem isso, `getAuthorPins` e `getSavedPins` retornam erro pois chamam o RPC com o parâmetro `p_author_id` que ainda não existe.

- [ ] **Step 1: Build de produção**

```bash
npm run build 2>&1 | tail -15
```
Expected: todas as rotas compilam sem erro, incluindo `/profile` e `/profile/[handle]`.

- [ ] **Step 2: Verificação E2E no browser**

Com `npm run dev` rodando e logado:
1. Clicar no avatar na NavBar → navega para `/profile/lucas.andrade`
2. Header mostra nome, @handle, stats (PINS, COLEÇÕES, CURTIDAS)
3. Tab MEUS PINS: grid com os pins do Lucas
4. Tab COLEÇÕES: cards com grid 2×2 de thumbnails; clicar num card vai para o feed filtrado
5. Tab SALVOS: aparece no próprio perfil, mostra pins salvos
6. Clicar no avatar de outro usuário em qualquer PinCard → vai para `/profile/[handle]` daquele usuário
7. Tab SALVOS NÃO aparece no perfil de outra pessoa
8. Visitar `/profile` → redireciona para `/profile/[handle]` do usuário logado

---

## Checklist de self-review

**Spec coverage:**
- [x] RPC get_feed_pins com p_author_id — Task 1
- [x] getProfileWithStats — Task 2
- [x] getAuthorPins — Task 2
- [x] getSavedPins — Task 2
- [x] groupByCollection + CollectionGroup — Task 2
- [x] ProfileWithStats type — Task 2
- [x] PinCard avatar → link /profile/[handle] — Task 3
- [x] NavBar avatar → link /profile — Task 3
- [x] CollectionCard (grid 2×2) — Task 4
- [x] ProfileHeader (stats + EDITAR PERFIL disabled) — Task 5
- [x] ProfileTabs (pins/collections/saved, SALVOS só próprio perfil) — Task 6
- [x] /profile redirect — Task 7
- [x] /profile/[handle] página completa com 404 — Task 7

**Tipo consistency:**
- `CollectionGroup` definido em Task 2, consumido em Tasks 4 e 6 ✓
- `ProfileWithStats` definido em Task 2, consumido em Tasks 5 e 7 ✓
- `getProfileWithStats`, `getAuthorPins`, `getSavedPins`, `groupByCollection` definidos em Task 2, consumidos em Task 7 ✓
- `ProfileHeader` criado em Task 5, consumido em Task 7 ✓
- `ProfileTabs` criado em Task 6, consumido em Task 7 ✓
- `CollectionCard` criado em Task 4, consumido em Task 6 ✓

**Nota sobre getSavedPins:** carrega todos os pins via RPC e filtra pelos IDs salvos em memória — aceito para escala atual (<1000 pins). Documentado em Task 2.
