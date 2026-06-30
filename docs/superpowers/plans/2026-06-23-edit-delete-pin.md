# Editar e Deletar Pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o autor de um pin edite seus campos de texto (título, coleção, tags, URL de origem, notas) e delete o pin, com confirmação, via botões visíveis apenas para o dono na página de detalhe.

**Architecture:** Duas novas Server Actions (`editPin`, `deletePin`) em `app/(protected)/actions.ts` que usam o cliente Supabase autenticado (RLS já restringe UPDATE/DELETE ao `author_id`). Três novos Client Components: `EditPinDrawer` (formulário reduzido, espelha `CreatePinDrawer`), `DeleteConfirmModal` (modal de confirmação) e `PinOwnerActions` (agrupa os dois botões e gerencia o estado de abertura). `app/(protected)/pin/[id]/page.tsx` passa a buscar o usuário logado e compara com `pin.authorId` para decidir se renderiza `PinOwnerActions`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, @supabase/ssr, sem Tailwind (CSS custom properties + classes globais já existentes: `.field`, `.field-label`, `.btn-primary`, `.btn-ghost`, `.caption`, `.tag-pill`).

## Global Constraints

- Sem Tailwind — todo estilo é inline ou via classes globais já definidas em `app/globals.css`.
- Design tokens: `--bg: #111111`, `--text: #EDE8D5`, `--surface`, `--border`, `--text-muted`, `--text-faint` — sem novo token, sem `border-radius` (exceto `.avatar`), sem `box-shadow`.
- RLS já garante autorização no banco (`pins_update`, `pins_delete` policies). Toda query de UPDATE/DELETE nas Server Actions DEVE incluir `.eq('author_id', user.id)` como defesa redundante explícita — não confiar só na RLS.
- Imagem do pin NÃO é editável nesta feature.
- Sem @menção no fluxo de edição.
- Sem soft-delete: `DELETE` é definitivo, cascata via FK já existente remove `likes`/`saves`/`notifications` ligados ao pin.

---

### Task 1: Server Actions `editPin` e `deletePin`

**Files:**
- Modify: `app/(protected)/actions.ts` (adicionar ao final do arquivo, após `markNotificationsRead`)

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server` (já importado no topo do arquivo), padrão de validação já usado em `createPin`.
- Produces:
  - `type EditPinData = { pinId: string; title: string; collection: string; tags: string[]; sourceUrl?: string; notes?: string }`
  - `type EditPinResult = { success: true } | { success: false; error: string }`
  - `export async function editPin(data: EditPinData): Promise<EditPinResult>`
  - `export async function deletePin(pinId: string): Promise<{ success: boolean; error?: string }>`

Essas assinaturas são consumidas por `EditPinDrawer` (Task 2) e `DeleteConfirmModal` (Task 3).

- [ ] **Step 1: Adicionar os tipos e a action `editPin`**

Acrescente ao final de `app/(protected)/actions.ts`:

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

export async function editPin(data: EditPinData): Promise<EditPinResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  if (!data.title.trim()) return { success: false, error: 'Título obrigatório' }
  if (!data.collection.trim()) return { success: false, error: 'Coleção obrigatória' }

  const { error } = await supabase
    .from('pins')
    .update({
      title: data.title.trim().toUpperCase(),
      collection: data.collection.trim(),
      tags: data.tags,
      source_url: data.sourceUrl?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    .eq('id', data.pinId)
    .eq('author_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/feed')
  revalidatePath(`/pin/${data.pinId}`)
  return { success: true }
}

export async function deletePin(pinId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const { error } = await supabase
    .from('pins')
    .delete()
    .eq('id', pinId)
    .eq('author_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/feed')
  return { success: true }
}
```

- [ ] **Step 2: Verificar compilação TypeScript**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npx tsc --noEmit`
Expected: sem erros relacionados a `actions.ts`

- [ ] **Step 3: Commit**

```bash
git add app/\(protected\)/actions.ts
git commit -m "feat: adicionar editPin e deletePin server actions"
```

---

### Task 2: `EditPinDrawer` (Client Component)

**Files:**
- Create: `components/EditPinDrawer.tsx`

**Interfaces:**
- Consumes: `editPin(data: EditPinData)` de `@/app/(protected)/actions` (Task 1), `PinWithMeta` de `@/lib/pins`.
- Produces: `export default function EditPinDrawer({ pin, onClose }: { pin: PinWithMeta; onClose: () => void })`. Consumido por `PinOwnerActions` (Task 4).

- [ ] **Step 1: Criar o componente**

Crie `components/EditPinDrawer.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { editPin } from '@/app/(protected)/actions'
import type { PinWithMeta } from '@/lib/pins'

export default function EditPinDrawer({
  pin,
  onClose,
}: {
  pin: PinWithMeta
  onClose: () => void
}) {
  const router = useRouter()

  const [title, setTitle] = useState(pin.title)
  const [collection, setCollection] = useState(pin.collection)
  const [tags, setTags] = useState<string[]>(pin.tags)
  const [tagInput, setTagInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState(pin.sourceUrl ?? '')
  const [notes, setNotes] = useState(pin.notes ?? '')

  const [collectionSuggestions, setCollectionSuggestions] = useState<string[]>([])
  const [showCollectionDD, setShowCollectionDD] = useState(false)

  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagDD, setShowTagDD] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.style.transform = 'translateX(0)'
    })
  }, [])

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((d) => { if (d.collections) setCollectionSuggestions(d.collections) })
      .catch(() => {})
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d) => { if (d.tags) setTagSuggestions(d.tags) })
      .catch(() => {})
  }, [])

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (val && !tags.includes(val)) setTags((t) => [...t, val])
    setTagInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setSubmitError('Título obrigatório'); return }
    if (!collection.trim()) { setSubmitError('Coleção obrigatória'); return }

    setSubmitting(true)
    setSubmitError('')

    const result = await editPin({
      pinId: pin.id,
      title: title.trim(),
      collection: collection.trim(),
      tags,
      sourceUrl: sourceUrl.trim()
        ? sourceUrl.trim().match(/^https?:\/\//) ? sourceUrl.trim() : `https://${sourceUrl.trim()}`
        : undefined,
      notes: notes.trim() || undefined,
    })

    setSubmitting(false)
    if (result.success) {
      onClose()
      router.refresh()
    } else {
      setSubmitError(result.error)
    }
  }

  const filteredCollections = collection
    ? collectionSuggestions.filter((c) => c.toLowerCase().includes(collection.toLowerCase()))
    : collectionSuggestions

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
        }}
      />

      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)',
          zIndex: 101, transform: 'translateX(100%)', transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)',
            }}>
              <span className="caption">EDITAR PIN</span>
              <button type="button" onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '22px', lineHeight: 1, padding: 0,
              }} aria-label="Fechar">×</button>
            </div>

            <div className="field">
              <label className="field-label">URL de origem</label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="ex: facebook.com ou https://..."
              />
            </div>

            <div className="field">
              <label className="field-label">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="NOME DA REFERÊNCIA"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="field">
              <label className="field-label">Coleção *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={collection}
                  onChange={(e) => { setCollection(e.target.value); setShowCollectionDD(true) }}
                  onFocus={() => setShowCollectionDD(true)}
                  onBlur={() => setTimeout(() => setShowCollectionDD(false), 150)}
                  placeholder="nome da coleção"
                  autoComplete="off"
                />
                {showCollectionDD && filteredCollections.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, background: '#222',
                    border: '1px solid var(--border)', zIndex: 5, maxHeight: '160px', overflowY: 'auto',
                  }}>
                    {filteredCollections.map((c) => (
                      <div
                        key={c}
                        onMouseDown={() => { setCollection(c); setShowCollectionDD(false) }}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '11px', color: 'var(--text)' }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '')}
                      >{c}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="field">
              <label className="field-label">Tags</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => { setTagInput(e.target.value); setShowTagDD(true) }}
                  onFocus={() => setShowTagDD(true)}
                  onBlur={() => setTimeout(() => setShowTagDD(false), 150)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="digite e pressione Enter"
                  autoComplete="off"
                />
                {showTagDD && tagInput.trim() && (() => {
                  const q = tagInput.trim().toLowerCase()
                  const filtered = tagSuggestions.filter(
                    (t) => t.includes(q) && !tags.includes(t)
                  ).slice(0, 6)
                  return filtered.length > 0 ? (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, background: '#222',
                      border: '1px solid var(--border)', zIndex: 5, maxHeight: '140px', overflowY: 'auto',
                    }}>
                      {filtered.map((t) => (
                        <div
                          key={t}
                          onMouseDown={() => {
                            if (!tags.includes(t)) setTags((tg) => [...tg, t])
                            setTagInput('')
                            setShowTagDD(false)
                          }}
                          style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '11px', color: 'var(--text)' }}
                          onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                          onMouseOut={(e) => (e.currentTarget.style.background = '')}
                        >{t}</div>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {tags.map((t) => (
                    <span key={t} className="tag-pill">
                      {t}
                      <span
                        className="remove"
                        onClick={() => setTags((tg) => tg.filter((x) => x !== t))}
                      >×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="field">
              <label className="field-label">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="contexto, por que essa referência é relevante..."
                rows={3}
              />
            </div>

          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            {submitError && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {submitError}
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'SALVANDO…' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar compilação TypeScript**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npx tsc --noEmit`
Expected: sem erros relacionados a `EditPinDrawer.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/EditPinDrawer.tsx
git commit -m "feat: adicionar EditPinDrawer"
```

---

### Task 3: `DeleteConfirmModal` (Client Component)

**Files:**
- Create: `components/DeleteConfirmModal.tsx`

**Interfaces:**
- Consumes: `deletePin(pinId: string)` de `@/app/(protected)/actions` (Task 1).
- Produces: `export default function DeleteConfirmModal({ pinId, onClose }: { pinId: string; onClose: () => void })`. Consumido por `PinOwnerActions` (Task 4).

- [ ] **Step 1: Criar o componente**

Crie `components/DeleteConfirmModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePin } from '@/app/(protected)/actions'

export default function DeleteConfirmModal({
  pinId,
  onClose,
}: {
  pinId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const result = await deletePin(pinId)
    if (result.success) {
      router.push('/feed')
    } else {
      setDeleting(false)
      setError(result.error ?? 'Erro ao excluir')
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
        }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          padding: '24px', maxWidth: '360px', width: '90%', zIndex: 101,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="caption" style={{ marginBottom: '10px' }}>EXCLUIR PIN?</p>
        <p className="body-sm" style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Essa ação não pode ser desfeita.
        </p>
        {error && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={deleting}>
            CANCELAR
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: '#a33', border: 'none', color: '#fff',
              padding: '10px 16px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.04em', cursor: 'pointer', flex: 1,
            }}
          >
            {deleting ? 'EXCLUINDO…' : 'EXCLUIR'}
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar compilação TypeScript**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npx tsc --noEmit`
Expected: sem erros relacionados a `DeleteConfirmModal.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/DeleteConfirmModal.tsx
git commit -m "feat: adicionar DeleteConfirmModal"
```

---

### Task 4: `PinOwnerActions` (Client Component) e integração na página de detalhe

**Files:**
- Create: `components/PinOwnerActions.tsx`
- Modify: `app/(protected)/pin/[id]/page.tsx`

**Interfaces:**
- Consumes: `EditPinDrawer` (Task 2), `DeleteConfirmModal` (Task 3), `PinWithMeta` de `@/lib/pins`, `createClient` de `@/lib/supabase/server` (novo import na página).
- Produces: `export default function PinOwnerActions({ pin }: { pin: PinWithMeta })`.

- [ ] **Step 1: Criar `PinOwnerActions`**

Crie `components/PinOwnerActions.tsx`:

```tsx
'use client'

import { useState } from 'react'
import EditPinDrawer from '@/components/EditPinDrawer'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import type { PinWithMeta } from '@/lib/pins'

export default function PinOwnerActions({ pin }: { pin: PinWithMeta }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setEditOpen(true)}>
        EDITAR
      </button>
      <button type="button" className="btn-ghost" onClick={() => setDeleteOpen(true)}>
        EXCLUIR
      </button>

      {editOpen && <EditPinDrawer pin={pin} onClose={() => setEditOpen(false)} />}
      {deleteOpen && <DeleteConfirmModal pinId={pin.id} onClose={() => setDeleteOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Verificar compilação TypeScript**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npx tsc --noEmit`
Expected: sem erros relacionados a `PinOwnerActions.tsx`

- [ ] **Step 3: Integrar na página de detalhe**

Modifique `app/(protected)/pin/[id]/page.tsx`. Primeiro, adicione os imports no topo (após os imports existentes):

```typescript
import PinOwnerActions from '@/components/PinOwnerActions'
import { createClient } from '@/lib/supabase/server'
```

O bloco de imports completo no topo do arquivo fica:

```typescript
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import PinCard from '@/components/PinCard'
import LikeButton from '@/components/LikeButton'
import SaveButton from '@/components/SaveButton'
import BackButton from '@/components/BackButton'
import PinOwnerActions from '@/components/PinOwnerActions'
import { getPinById, getRelatedPins } from '@/lib/pins'
import { createClient } from '@/lib/supabase/server'
```

Em seguida, logo após a linha `const pin = await getPinById(id)` (linha 15) e antes do `if (!pin)` (linha 17), busque o usuário logado:

```typescript
  const { id } = await params
  const pin = await getPinById(id)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!pin) {
```

Por fim, no bloco de ações (linha 84-98, dentro da `<div style={{ display: 'flex', gap: '14px', ... }}>`), adicione `PinOwnerActions` condicional logo após `SaveButton`:

```tsx
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <LikeButton pinId={pin.id} initialLiked={pin.likedByMe} initialCount={pin.likeCount} />
            <SaveButton pinId={pin.id} initialSaved={pin.savedByMe} />
            {pin.authorId === user?.id && <PinOwnerActions pin={pin} />}
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
```

- [ ] **Step 4: Verificar compilação TypeScript**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 5: Build de produção**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npm run build`
Expected: build conclui sem erros

- [ ] **Step 6: Commit**

```bash
git add components/PinOwnerActions.tsx app/\(protected\)/pin/\[id\]/page.tsx
git commit -m "feat: exibir editar/excluir na página do pin para o autor"
```

---

## Self-Review

**1. Cobertura do spec:**
- Server Actions `editPin`/`deletePin` → Task 1 ✓
- `EditPinDrawer` sem imagem/sem @menção, campos pré-preenchidos → Task 2 ✓
- `DeleteConfirmModal` com CANCELAR/EXCLUIR → Task 3 ✓
- `PinOwnerActions` agrupando os botões, condicional ao autor na página de detalhe → Task 4 ✓
- Itens de "Entregável" do spec: todos cobertos pelas 4 tasks; o item de RLS é coberto pelas policies já existentes (`pins_update`/`pins_delete`) + cláusula `eq('author_id', user.id)` redundante em ambas actions.

**2. Placeholder scan:** nenhum "TBD"/"TODO" — todo código é completo e executável.

**3. Consistência de tipos:** `EditPinData` (Task 1) usado identicamente em `EditPinDrawer.handleSubmit` (Task 2: `pinId`, `title`, `collection`, `tags`, `sourceUrl`, `notes`). `deletePin(pinId: string)` (Task 1) consumido com a mesma assinatura em `DeleteConfirmModal` (Task 3). `PinOwnerActions` (Task 4) importa `EditPinDrawer`/`DeleteConfirmModal` com as props exatas definidas em suas respectivas tasks.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-edit-delete-pin.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
