# DZtaque — Editar e Deletar Pins

**Data:** 2026-06-23
**Entregável:** Autor de um pin pode editar campos de texto e deletar o pin, com confirmação

---

## Contexto

As 5 fases do backend estão concluídas e em produção (dztaque.vercel.app). Esta feature adiciona controle do autor sobre seus próprios pins — algo que faltava desde a Fase 3 (criar pin).

RLS já suporta isso desde a migration `002_pins.sql`:
```sql
CREATE POLICY "pins_update" ON public.pins
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "pins_delete" ON public.pins
  FOR DELETE TO authenticated USING (auth.uid() = author_id);
```

---

## Decisões de produto

| Decisão | Escolha |
|---|---|
| Imagem editável? | Não — só campos de texto (título, coleção, tags, URL origem, notas). Trocar imagem exige apagar e recriar o pin. |
| Arquitetura do drawer | `EditPinDrawer` separado do `CreatePinDrawer` — sem upload, sem @menção |
| Confirmação de delete | Modal com CANCELAR / EXCLUIR |
| Posição dos botões | Mesma linha de ações (CURTIR/SALVAR), visíveis só para o autor |

---

## Server Actions — `app/(protected)/actions.ts`

```typescript
type EditPinData = {
  pinId: string
  title: string
  collection: string
  tags: string[]
  sourceUrl?: string
  notes?: string
}

type EditPinResult = { success: true } | { success: false; error: string }

export async function editPin(data: EditPinData): Promise<EditPinResult>
```

Implementação:
1. `createClient()` + `getUser()` — erro se não autenticado
2. Validações: `title.trim()` e `collection.trim()` obrigatórios (mesmo padrão de `createPin`)
3. `UPDATE pins SET title, collection, tags, source_url, notes WHERE id = pinId AND author_id = user.id`
4. RLS garante que só o autor edita; a cláusula `author_id = user.id` no UPDATE é defesa redundante explícita
5. Se `error` do Supabase, retorna `{ success: false, error: error.message }`
6. `revalidatePath('/feed')` + `revalidatePath(\`/pin/${data.pinId}\`)`
7. Retorna `{ success: true }`

```typescript
export async function deletePin(pinId: string): Promise<{ success: boolean; error?: string }>
```

Implementação:
1. `createClient()` + `getUser()` — erro se não autenticado
2. `DELETE FROM pins WHERE id = pinId AND author_id = user.id`
3. Cascata automática via FK `ON DELETE CASCADE`: remove linhas em `likes`, `saves`, `notifications` (via `pin_id`)
4. `revalidatePath('/feed')`
5. Retorna `{ success: true }` ou `{ success: false, error }`

---

## `components/EditPinDrawer.tsx` (Client Component, novo)

Estrutura igual ao `CreatePinDrawer`, mas reduzida:

**Props:**
```typescript
{
  pin: PinWithMeta
  onClose: () => void
}
```

**Campos** (pré-preenchidos com os valores de `pin`):
- Título (obrigatório, uppercase)
- Coleção (obrigatório, autocomplete via `/api/collections`)
- Tags (autocomplete via `/api/tags`, Enter-to-add)
- URL de origem (opcional, mesmo auto-prepend `https://` do CreatePinDrawer)
- Notas (opcional)

**Sem:**
- Seção de imagem/upload
- Campo de @menção

**Comportamento:**
- Mesmo slide-in animation do `CreatePinDrawer` (`translateX(100%)` → `translateX(0)`)
- Submit chama `editPin({ pinId: pin.id, ... })`
- Sucesso: `onClose()` + `router.refresh()`
- Erro: exibe mensagem no rodapé do drawer (mesmo padrão do CreatePinDrawer)
- Botão: `SALVAR ALTERAÇÕES` (`.btn-primary`)

---

## `components/DeleteConfirmModal.tsx` (Client Component, novo)

**Props:**
```typescript
{
  pinId: string
  onClose: () => void
}
```

**Visual:**
- Overlay: `position: fixed, inset: 0, background: rgba(0,0,0,0.6), zIndex: 100`
- Painel centralizado: `position: fixed, top: 50%, left: 50%, transform: translate(-50%, -50%)`, `background: var(--surface)`, `border: 1px solid var(--border)`, `padding: 24px`, `maxWidth: 360px`, sem border-radius
- Título: "EXCLUIR PIN?" (`.caption`)
- Texto: "Essa ação não pode ser desfeita." (`body-sm`, `var(--text-muted)`)
- Botões lado a lado: `CANCELAR` (`.btn-ghost`, fecha modal) e `EXCLUIR` (fundo vermelho/destaque — usar uma cor de alerta inline já que a paleta não tem token de erro, ex: `#a33`)

**Comportamento:**
- `EXCLUIR` chama `deletePin(pinId)`, mostra estado "EXCLUINDO…" durante a chamada
- Sucesso: `router.push('/feed')`
- Erro: exibe mensagem no modal, mantém aberto

---

## `components/PinOwnerActions.tsx` (Client Component, novo)

Agrupa os botões EDITAR/EXCLUIR e gerencia os dois estados de UI (drawer aberto, modal aberto).

```typescript
{
  pin: PinWithMeta
}
```

```tsx
'use client'
// useState: editOpen, deleteOpen
// Renderiza dois <button className="btn-ghost"> — EDITAR e EXCLUIR
// {editOpen && <EditPinDrawer pin={pin} onClose={...} />}
// {deleteOpen && <DeleteConfirmModal pinId={pin.id} onClose={...} />}
```

---

## Modificação em `app/(protected)/pin/[id]/page.tsx`

Após obter `pin` e o `user` da sessão:
```typescript
const isOwner = pin.authorId === (user?.id ?? '')
```

Na linha de ações (onde já estão `LikeButton`/`SaveButton`), adicionar:
```tsx
{isOwner && <PinOwnerActions pin={pin} />}
```

---

## Entregável

- [ ] Autor vê botões EDITAR/EXCLUIR na página do próprio pin; outros usuários não veem
- [ ] EDITAR abre drawer com campos pré-preenchidos (sem imagem, sem @menção)
- [ ] Salvar edição atualiza o pin e reflete no feed e na página de detalhe
- [ ] EXCLUIR abre modal de confirmação
- [ ] Confirmar exclusão remove o pin (+ likes/saves/notificações em cascata) e redireciona ao feed
- [ ] RLS impede que um usuário edite/delete pin de outro mesmo manipulando a chamada diretamente

---

## Fora do escopo

- Editar ou trocar a imagem do pin
- Editar @menções já enviadas
- Histórico de edições
- Restaurar pin deletado (sem soft-delete)
