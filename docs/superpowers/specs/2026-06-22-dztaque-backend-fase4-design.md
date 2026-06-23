# DZtaque — Backend Fase 4: Perfil + Coleções

**Data:** 2026-06-22
**Fase:** 4 de 5
**Entregável:** Página de perfil com 3 tabs (MEUS PINS, COLEÇÕES, SALVOS), perfis de outros colaboradores via `/profile/[handle]`, e PinCard linkado ao perfil do autor

---

## Contexto

Fases 1–3 concluídas: auth, feed, likes/saves, criar pin com Cloudinary, @menção. Esta fase adiciona a dimensão pessoal da plataforma — cada colaborador tem uma página com seus pins organizados por coleção.

## Fases do projeto

| Fase | Escopo |
|---|---|
| 1–3 | ✅ concluídas |
| **4 — Perfil + Coleções** (este spec) | Página de perfil, tabs, cards de coleção, PinCard linkado |
| 5 — Notificações | UI de notificações, badge no sino |

---

## Decisões de produto

| Decisão | Escolha |
|---|---|
| Rotas | `/profile` redireciona para `/profile/[currentUser.handle]`; `/profile/[handle]` serve qualquer perfil |
| Card de coleção | Grid 2×2 com thumbnails dos 4 pins mais recentes da coleção |
| Tab SALVOS | Visível **apenas** no próprio perfil |
| EDITAR PERFIL | Botão placeholder (disabled) reservado no layout, fora de escopo funcional |
| Paginação | Nenhuma nesta fase — carrega todos os pins do autor (volume por pessoa é baixo) |

---

## Rotas

```
/profile                    → Server Component; redireciona para /profile/[currentUser.handle]
/profile/[handle]           → Server Component; página de perfil de qualquer colaborador
```

`/profile/[handle]` determina se é o próprio perfil comparando `profile.id === currentUser.id`. Com base nisso:
- Tab SALVOS aparece ou não
- Botão EDITAR PERFIL aparece (disabled) ou não

---

## Camada de dados — novas funções em `lib/pins.ts`

### Atualização da RPC `get_feed_pins`

Adicionar parâmetro opcional `p_author_id UUID DEFAULT NULL` à função Postgres. Quando fornecido, filtra `WHERE p.author_id = p_author_id`. Aplicado via `CREATE OR REPLACE FUNCTION` no SQL Editor (sem nova migration — apenas substituição da função existente em `supabase/migrations/002_pins.sql` para documentação).

O filtro `p_author_id` é combinável com `p_collection`, `p_search`, `p_cursor`.

### Novas funções TypeScript em `lib/pins.ts`

```typescript
// Todos os pins de um autor (com like/save metadata do usuário logado)
getAuthorPins(authorId: string): Promise<PinWithMeta[]>
// Usa getFeedPins com p_author_id = authorId, sem cursor (carrega tudo)

// Pins salvos pelo usuário (com like/save metadata)
getSavedPins(userId: string): Promise<PinWithMeta[]>
// SELECT pins.* + metadados via JOIN saves → pins → get_feed_pins logic
// Alternativa: nova RPC get_saved_pins ou query direta via supabase-js

// Perfil + stats de um handle
getProfileWithStats(handle: string): Promise<ProfileWithStats | null>
// SELECT profiles.*, count(pins), count(DISTINCT pins.collection), sum(likes count)
```

```typescript
type ProfileWithStats = {
  id: string
  name: string
  handle: string
  avatarUrl: string | null
  createdAt: string
  pinsCount: number
  collectionsCount: number
  likesReceived: number
}
```

### Coleções derivadas em memória

`groupByCollection(pins: PinWithMeta[]): CollectionGroup[]`

```typescript
type CollectionGroup = {
  name: string
  count: number
  previewImages: string[]  // até 4 imageUrl dos pins mais recentes
}
```

Calculado no Server Component — sem query extra, apenas `reduce` sobre os pins já carregados.

---

## Componentes novos

### `ProfileHeader` (Server Component via props)

Recebe `ProfileWithStats` + `isOwnProfile: boolean`. Renderiza:
- Avatar circular 56px (iniciais, sem upload)
- Nome (20px 700) + @handle (11px muted)
- Stats: PINS · COLEÇÕES · CURTIDAS (3 números com labels em caption)
- Botão EDITAR PERFIL — visível se `isOwnProfile`, `disabled`, `.btn-ghost`

### `ProfileTabs` (Client Component)

Gerencia a tab ativa via estado local (`useState`). Tabs disponíveis dependem de `isOwnProfile`.

```
MEUS PINS  |  COLEÇÕES  |  SALVOS (só próprio perfil)
```

Clique na tab muda o conteúdo renderizado. O estado de tab NÃO vai na URL (sem searchParams) — simplifica a implementação.

### `CollectionCard` (Client Component)

```
┌─────────────────────────────┐
│ img  │  img                 │  ← grid 2×2 (120px altura total)
│──────┼──────────────────────│
│ img  │  img                 │
├─────────────────────────────┤
│ NOME DA COLEÇÃO         12  │  ← nome + contagem de pins
│                      PINS  │
└─────────────────────────────┘
```

- Imagens com `filter: grayscale(1) contrast(1.15)`, `object-fit: cover`
- Células sem imagem mostram placeholder `var(--surface-hover)` com ícone SVG
- Clique: `router.push('/feed?collection=' + encodeURIComponent(name))`
- Borda `0.5px var(--border)`, sem border-radius, hover escurece borda

---

## Modificações em arquivos existentes

### `components/PinCard.tsx`

O avatar do autor (`<span className="avatar">`) vira um link para o perfil:

```tsx
// Antes:
<span className="avatar" ...>{pin.authorInitials}</span>
<span style={...}>@{pin.authorHandle}</span>

// Depois:
<a href={`/profile/${pin.authorHandle}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
  <span className="avatar" ...>{pin.authorInitials}</span>
  <span style={...}>@{pin.authorHandle}</span>
</a>
```

O `stopPropagation` evita que o clique no link abra o pin junto.

### `app/(protected)/profile/page.tsx`

Substituir placeholder por redirect:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('handle').eq('id', user?.id ?? '').single()
  redirect(`/profile/${profile?.handle ?? ''}`)
}
```

### NavBar

O avatar do usuário logado (atualmente um `<span>`) vira `<a href="/profile">` para facilitar o acesso ao próprio perfil.

---

## Página `/profile/[handle]`

```
app/(protected)/profile/[handle]/page.tsx  (novo arquivo)
```

Server Component:
1. Resolve `params.handle` (await params)
2. Chama `getProfileWithStats(handle)` → 404 se null
3. Chama `getAuthorPins(profile.id)` → para MEUS PINS e derivar COLEÇÕES
4. Se `isOwnProfile`: chama `getSavedPins(currentUser.id)` → para SALVOS
5. Deriva `collections = groupByCollection(authorPins)`
6. Renderiza `<NavBar />` + `<ProfileHeader .../>` + `<ProfileTabs .../>` passando todos os dados

---

## Entregável da Fase 4

- [ ] `/profile` redireciona para `/profile/[handle]` do usuário logado
- [ ] `/profile/lucas.andrade` mostra perfil do Lucas
- [ ] Header com avatar, nome, @handle e stats corretos
- [ ] Tab MEUS PINS mostra grid masonry com os pins do autor
- [ ] Tab COLEÇÕES mostra cards com grid 2×2 de thumbnails; clicar vai para feed filtrado
- [ ] Tab SALVOS aparece **só** no próprio perfil e mostra pins salvos
- [ ] Clicar no avatar/handle de qualquer PinCard navega para o perfil do autor
- [ ] Clicar no avatar na NavBar vai para `/profile`

---

## Fora do escopo da Fase 4

- Upload de avatar
- Editar nome/handle
- Notificações na UI (Fase 5)
- Paginação/scroll infinito no perfil
