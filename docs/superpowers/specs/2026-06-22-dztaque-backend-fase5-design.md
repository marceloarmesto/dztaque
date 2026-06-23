# DZtaque — Backend Fase 5: UI de Notificações

**Data:** 2026-06-22
**Fase:** 5 de 5 — fase final
**Entregável:** Badge de não-lidas no sino, página /notifications com lista real, e criação de notificações para likes e saves

---

## Contexto

Fases 1–4 concluídas. A tabela `notifications` existe desde a Fase 3 (type IN ('mention','like','save'), from_user_id, to_user_id, pin_id, read). Atualmente só notificações do tipo 'mention' são criadas. Esta fase adiciona a UI completa e expande a criação para likes e saves.

---

## Decisões de produto

| Decisão | Escolha |
|---|---|
| Notificações de like/save | Somente na primeira vez por par (user_id + pin_id) — sem duplicatas |
| Self-notifications | Bloqueadas — não notifica quando você curte/salva o próprio pin |
| Marcar como lida | Ao abrir /notifications, todas as não-lidas são marcadas como lidas (batch) |
| Real-time | Não — badge e lista atualizam a cada navegação (Server Component re-renderiza por request) |
| Paginação | Não — todas as notificações carregadas de uma vez (volume baixo por usuário) |

---

## Mudanças nos Server Actions — `app/(protected)/actions.ts`

### Novo helper interno: `getPinAuthorId`

```typescript
async function getPinAuthorId(pinId: string, supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from('pins').select('author_id').eq('id', pinId).single()
  return data?.author_id ?? null
}
```

### `toggleLike` — adicionar notificação no path de INSERT

```typescript
// Após inserir o like:
const authorId = await getPinAuthorId(pinId, supabase)
if (authorId && authorId !== user.id) {
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'like')
    .eq('from_user_id', user.id)
    .eq('pin_id', pinId)
    .maybeSingle()
  if (!existing) {
    await supabase.from('notifications').insert({
      type: 'like',
      from_user_id: user.id,
      to_user_id: authorId,
      pin_id: pinId,
    })
  }
}
```

### `toggleSave` — mesma lógica com `type: 'save'`

```typescript
const authorId = await getPinAuthorId(pinId, supabase)
if (authorId && authorId !== user.id) {
  const { data: existing } = await supabase
    .from('notifications')
    .select('id')
    .eq('type', 'save')
    .eq('from_user_id', user.id)
    .eq('pin_id', pinId)
    .maybeSingle()
  if (!existing) {
    await supabase.from('notifications').insert({
      type: 'save',
      from_user_id: user.id,
      to_user_id: authorId,
      pin_id: pinId,
    })
  }
}
```

---

## Badge no sino — `components/NavBar.tsx`

Adicionar uma query de contagem ao Server Component existente:

```typescript
const { count: unreadCount } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('to_user_id', user?.id ?? '')
  .eq('read', false)
```

O ponto branco já existe no JSX da NavBar como `unread > 0`. Trocar a condição para usar `unreadCount`:

```tsx
{(unreadCount ?? 0) > 0 && (
  <span style={{ position: 'absolute', top: '3px', right: '3px',
    width: '7px', height: '7px', background: 'var(--text)', borderRadius: '50%' }} />
)}
```

---

## Camada de dados — `lib/notifications.ts` (novo arquivo)

```typescript
type NotificationItem = {
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

// Carrega todas as notificações do usuário logado, mais recentes primeiro
getMyNotifications(userId: string): Promise<NotificationItem[]>
// SELECT notifications JOIN profiles (from) JOIN pins ORDER BY created_at DESC

// Marca todas as não-lidas como lidas (batch UPDATE)
markAllRead(userId: string): Promise<void>
// UPDATE notifications SET read = true WHERE to_user_id = userId AND read = false
```

---

## Nova Server Action — `markNotificationsRead`

Em `app/(protected)/actions.ts`:

```typescript
export async function markNotificationsRead(): Promise<void>
// 'use server' já está no topo
// UPDATE notifications SET read = true WHERE to_user_id = auth.uid() AND read = false
// NÃO chama revalidatePath — a página já terá re-renderizado com tudo como lido
```

---

## Página /notifications — `app/(protected)/notifications/page.tsx`

Server Component:
1. Chama `getMyNotifications(user.id)`
2. Chama `markAllRead(user.id)` — marca como lidas ANTES de renderizar (para que o badge suma na próxima navegação)
3. Renderiza a lista

**Layout de cada item:**

```
┌──────────────────────────────────────────────────────────┐
│ ●  [avatar LA]  @lucas.andrade curtiu seu pin            │
│ ◄  (borda      "NIKE — FEEL IT"                 há 2h   │
│    esquerda    ─────────────────────────────────────── │
│    se não lido)                                          │
└──────────────────────────────────────────────────────────┘
```

- **Não lido:** `borderLeft: '2px solid var(--text)'` + padding esquerdo extra
- **Lido:** sem borda, opacidade levemente reduzida (0.6)
- **Clicar:** navega para `/pin/${item.pinId}`
- **Texto por tipo:**
  - `mention`: `@{handle} mencionou você em "{pinTitle}"`
  - `like`: `@{handle} curtiu seu pin "{pinTitle}"`
  - `save`: `@{handle} salvou seu pin "{pinTitle}"`
- **Timestamp relativo:** segundos → minutos → horas → dias → data completa (calculado em JavaScript no Server Component)

**Estado vazio:** "NENHUMA NOTIFICAÇÃO" em caption muted, centralizado.

---

## Timestamp relativo

Função utilitária em `lib/notifications.ts`:

```typescript
function timeAgo(isoString: string): string {
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
```

---

## Entregável da Fase 5

- [ ] Curtir o pin de outro usuário → cria notificação (só na 1ª vez, sem self-notification)
- [ ] Salvar o pin de outro usuário → idem
- [ ] Badge no sino mostra ponto quando há não-lidas reais no banco
- [ ] /notifications lista todas as notificações do usuário (mention, like, save)
- [ ] Itens não lidos com destaque visual (borda esquerda)
- [ ] Abrir /notifications marca todas como lidas → badge some na próxima navegação
- [ ] Clicar numa notificação navega para o pin

---

## Fora do escopo

- Real-time / WebSocket
- Deletar ou arquivar notificações
- Notificações de novos pins de pessoas que você segue (não há sistema de follows)
- Push notifications
