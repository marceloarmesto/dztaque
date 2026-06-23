# DZtaque Backend — Fase 5: UI de Notificações

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar UI completa de notificações: badge real no sino, criação de notifs para likes e saves (1ª vez, sem self), e página /notifications com lista e marcação automática de lidas.

**Architecture:** `lib/notifications.ts` contém toda a camada de dados de notificações. Os Server Actions toggleLike/toggleSave são estendidos para criar notificações no path de insert. NavBar (Server Component) adiciona query de unread count. A página /notifications chama `markAllRead` antes de renderizar para limpar o badge na próxima navegação.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, `@supabase/ssr`, Postgres com RLS.

## Global Constraints

- Next.js 14 App Router; TypeScript strict
- Sem Tailwind, sem UI library — inline styles com CSS variables
- Design system: `--bg #111111`, `--text #EDE8D5`, `border-radius: 0` exceto `.avatar`; sem `box-shadow`
- `@supabase/ssr` via `lib/supabase/server.ts`
- `npm run typecheck` deve passar após cada task
- Diretório: `/Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque`

---

### Task 1: lib/notifications.ts

**Files:**
- Create: `lib/notifications.ts`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts`
- Produces:
  - `type NotificationItem` (exportado)
  - `getMyNotifications(userId: string): Promise<NotificationItem[]>`
  - `markAllRead(userId: string): Promise<void>`
  - `timeAgo(isoString: string): string` (exportado)

- [ ] **Step 1: Criar `lib/notifications.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export type NotificationItem = {
  id: string
  type: 'mention' | 'like' | 'save'
  fromUserId: string
  fromName: string
  fromHandle: string
  fromInitials: string
  pinId: string
  pinTitle: string
  read: boolean
  createdAt: string
}

function initialsFrom(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

type NotifRow = {
  id: string
  type: 'mention' | 'like' | 'save'
  from_user_id: string
  pin_id: string
  read: boolean
  created_at: string
}

export async function getMyNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = await createClient()

  // Passo 1: buscar notificações
  const { data: notifs, error } = await supabase
    .from('notifications')
    .select('id, type, from_user_id, pin_id, read, created_at')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(`getMyNotifications: ${error.message}`)
  if (!notifs?.length) return []

  // Passo 2: buscar perfis e pins únicos em paralelo
  const fromIds = [...new Set((notifs as NotifRow[]).map((n) => n.from_user_id))]
  const pinIds = [...new Set((notifs as NotifRow[]).map((n) => n.pin_id).filter(Boolean))]

  const [{ data: profiles }, { data: pins }] = await Promise.all([
    supabase.from('profiles').select('id, name, handle').in('id', fromIds),
    pinIds.length
      ? supabase.from('pins').select('id, title').in('id', pinIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as { id: string; name: string; handle: string }]))
  const pinMap = new Map(((pins as { id: string; title: string }[] | null) ?? []).map((p) => [p.id, p]))

  return (notifs as NotifRow[]).map((n) => ({
    id: n.id,
    type: n.type,
    fromUserId: n.from_user_id,
    fromName: profileMap.get(n.from_user_id)?.name ?? '',
    fromHandle: profileMap.get(n.from_user_id)?.handle ?? '',
    fromInitials: initialsFrom(profileMap.get(n.from_user_id)?.name ?? ''),
    pinId: n.pin_id,
    pinTitle: pinMap.get(n.pin_id)?.title ?? '',
    read: n.read,
    createdAt: n.created_at,
  }))
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('to_user_id', userId)
    .eq('read', false)
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat: notifications data layer (getMyNotifications, markAllRead, timeAgo)"
```

---

### Task 2: actions.ts — notificações de like e save

**Files:**
- Modify: `app/(protected)/actions.ts`

**Interfaces:**
- Consumes: tabela `pins` (para getPinAuthorId), tabela `notifications`
- Produces: `toggleLike` e `toggleSave` criam notificação no insert (1ª vez, sem self); `markNotificationsRead()` exportado

**Nota:** Ler `app/(protected)/actions.ts` antes de editar para localizar os pontos exatos de inserção.

- [ ] **Step 1: Adicionar helper `getPinAuthorId` e import de tipo no topo de `app/(protected)/actions.ts`**

Logo após a linha `'use server'` e os imports existentes, adicionar:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

async function getPinAuthorId(pinId: string, supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from('pins').select('author_id').eq('id', pinId).single()
  return (data as { author_id: string } | null)?.author_id ?? null
}
```

- [ ] **Step 2: Adicionar criação de notificação em `toggleLike` no path de INSERT**

Localizar no `toggleLike` o bloco de insert:
```typescript
} else {
  await supabase.from('likes').insert({ pin_id: pinId, user_id: user.id })
}
```

Substituir por:
```typescript
} else {
  await supabase.from('likes').insert({ pin_id: pinId, user_id: user.id })
  // Notificação: 1ª vez, sem self
  const authorId = await getPinAuthorId(pinId, supabase)
  if (authorId && authorId !== user.id) {
    const { data: existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'like')
      .eq('from_user_id', user.id)
      .eq('pin_id', pinId)
      .maybeSingle()
    if (!existingNotif) {
      await supabase.from('notifications').insert({
        type: 'like',
        from_user_id: user.id,
        to_user_id: authorId,
        pin_id: pinId,
      })
    }
  }
}
```

- [ ] **Step 3: Adicionar criação de notificação em `toggleSave` no path de INSERT**

Localizar no `toggleSave` o bloco de insert:
```typescript
} else {
  await supabase.from('saves').insert({ pin_id: pinId, user_id: user.id })
}
```

Substituir por:
```typescript
} else {
  await supabase.from('saves').insert({ pin_id: pinId, user_id: user.id })
  // Notificação: 1ª vez, sem self
  const authorId = await getPinAuthorId(pinId, supabase)
  if (authorId && authorId !== user.id) {
    const { data: existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'save')
      .eq('from_user_id', user.id)
      .eq('pin_id', pinId)
      .maybeSingle()
    if (!existingNotif) {
      await supabase.from('notifications').insert({
        type: 'save',
        from_user_id: user.id,
        to_user_id: authorId,
        pin_id: pinId,
      })
    }
  }
}
```

- [ ] **Step 4: Adicionar Server Action `markNotificationsRead` ao final de `app/(protected)/actions.ts`**

```typescript
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('to_user_id', user.id)
    .eq('read', false)
}
```

- [ ] **Step 5: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add "app/(protected)/actions.ts"
git commit -m "feat: like/save create notifications (first time, no self) + markNotificationsRead"
```

---

### Task 3: NavBar — badge de unread real

**Files:**
- Modify: `components/NavBar.tsx`

**Interfaces:**
- Consumes: tabela `notifications` via query Supabase
- Produces: badge no sino condicionado a `unreadCount > 0` real

**Nota:** Ler `components/NavBar.tsx` para identificar onde inserir a query e onde fica a condição do badge.

- [ ] **Step 1: Adicionar query de unreadCount em `NavBar.tsx`**

Logo após a query de `profile`, adicionar:

```typescript
const { count: unreadCount } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('to_user_id', user?.id ?? '')
  .eq('read', false)
```

- [ ] **Step 2: Atualizar a condição do badge no JSX**

Localizar o bloco do botão de notificações na NavBar. Ele tem algo como:
```tsx
{unread > 0 && (
  <span style={{ position: 'absolute', ... }} />
)}
```
ou alguma variação. Substituir a condição por `(unreadCount ?? 0) > 0`:

```tsx
{(unreadCount ?? 0) > 0 && (
  <span style={{
    position: 'absolute', top: '3px', right: '3px',
    width: '7px', height: '7px',
    background: 'var(--text)', borderRadius: '50%',
  }} />
)}
```

Se não houver badge existente no JSX, adicionar dentro do `<button>` do sino logo após o `<svg>`.

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/NavBar.tsx
git commit -m "feat: NavBar bell badge with real unread count from database"
```

---

### Task 4: Página /notifications

**Files:**
- Modify: `app/(protected)/notifications/page.tsx`

**Interfaces:**
- Consumes: `getMyNotifications`, `markAllRead` de `lib/notifications.ts`; `timeAgo` de `lib/notifications.ts`; `NavBar`; `createClient` de `lib/supabase/server.ts`
- Produces: página completa com lista, destaque de não-lidas, timestamp relativo; ao carregar, marca todas como lidas

- [ ] **Step 1: Substituir `app/(protected)/notifications/page.tsx`**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import { getMyNotifications, markAllRead, timeAgo } from '@/lib/notifications'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null  // middleware protege a rota

  // Carrega primeiro (para capturar o estado não-lido), depois marca como lidas
  const notifications = await getMyNotifications(user.id)
  await markAllRead(user.id)

  const typeLabels: Record<string, string> = {
    mention: 'mencionou você em',
    like: 'curtiu seu pin',
    save: 'salvou seu pin',
  }

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>
        <h1 className="display-sm" style={{ marginBottom: '28px' }}>NOTIFICAÇÕES</h1>

        {notifications.length === 0 ? (
          <p className="caption" style={{ color: 'var(--text-faint)' }}>
            NENHUMA NOTIFICAÇÃO
          </p>
        ) : (
          <div>
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={`/pin/${n.pinId}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: n.read ? '14px 0' : '14px 14px',
                  marginLeft: n.read ? '0' : '-2px',
                  borderLeft: n.read ? 'none' : '2px solid var(--text)',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none', color: 'inherit',
                  opacity: n.read ? 0.65 : 1,
                }}
              >
                <span
                  className="avatar"
                  style={{ width: '28px', height: '28px', fontSize: '11px', flexShrink: 0 }}
                >
                  {n.fromInitials || '?'}
                </span>

                <p style={{ flex: 1, fontSize: '12px', lineHeight: 1.5, color: 'var(--text)', margin: 0 }}>
                  <strong style={{ fontWeight: 700 }}>@{n.fromHandle}</strong>
                  {' '}{typeLabels[n.type] ?? n.type}{' '}
                  <strong style={{ fontWeight: 700 }}>&quot;{n.pinTitle}&quot;</strong>
                </p>

                <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {timeAgo(n.createdAt)}
                </span>

                {!n.read && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--text)', flexShrink: 0,
                  }} />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

**Nota de design:** `getMyNotifications` e `markAllRead` são chamados em `Promise.all` — a marcação como lida acontece junto com o carregamento, não depois. Isso garante que na próxima navegação o badge já some, mesmo que o usuário navegue rapidamente.

- [ ] **Step 2: Verificar typecheck e build**

```bash
npm run typecheck && npm run build 2>&1 | tail -10
```
Expected: typecheck sem erros; build passa com /notifications como rota dinâmica (`ƒ`).

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/notifications/page.tsx"
git commit -m "feat: notifications page with real data, unread highlight, auto-mark-as-read"
```

---

## Checklist de self-review

**Spec coverage:**
- [x] `NotificationItem` type — Task 1
- [x] `getMyNotifications` (join profiles + pins em 3 queries) — Task 1
- [x] `markAllRead` — Task 1
- [x] `timeAgo` — Task 1
- [x] `getPinAuthorId` helper — Task 2
- [x] `toggleLike` cria notif (insert path, 1ª vez, sem self) — Task 2
- [x] `toggleSave` idem — Task 2
- [x] `markNotificationsRead` Server Action — Task 2
- [x] NavBar badge com `unreadCount` real — Task 3
- [x] Página /notifications: lista, destaque, timestamp, marca como lidas ao abrir — Task 4

**Tipo consistency:**
- `NotificationItem` definido em Task 1, consumido em Task 4 via `getMyNotifications` ✓
- `timeAgo(isoString: string): string` definido em Task 1, chamado em Task 4 com `n.createdAt` ✓
- `markAllRead(userId: string)` definido em Task 1, chamado em Task 4 com `user.id` ✓

**Placeholders:** nenhum.

**Nota sobre `Promise.all` em Task 4:** `getMyNotifications` e `markAllRead` são chamados em paralelo. Como `markAllRead` atualiza as notificações do usuário no banco e `getMyNotifications` lê as mesmas linhas, pode haver uma race condition onde `markAllRead` termina antes e o select retorna todas as notificações já marcadas como `read: true`. Para evitar isso, seria necessário chamar `getMyNotifications` ANTES de `markAllRead`. Ajuste: chamar sequencialmente em vez de em paralelo.

**Correção aplicada inline — Step 1 de Task 4 já usa sequencial:**
```typescript
// Versão correta (sequencial, não paralelo):
const notifications = await getMyNotifications(user.id)
await markAllRead(user.id)
```
