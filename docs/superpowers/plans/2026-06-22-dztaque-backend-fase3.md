# DZtaque Backend — Fase 3: Criar Pin + Cloudinary + @Menção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar a funcionalidade de criar pins com upload de imagem ao Cloudinary, autocomplete de coleção, tags, @menção com notificação persistida, ativando o botão `+ PIN` já presente na NavBar.

**Architecture:** Upload de imagem acontece direto do browser para o Cloudinary (unsigned preset); o servidor recebe apenas a URL já resolvida. Server Action `createPin` insere o pin no Supabase e cria notificações de menção. `CreatePinButton` (Client Component) gerencia estado `isOpen` e renderiza `CreatePinDrawer` inline — sem Context nem portal.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, `@supabase/ssr`, Cloudinary unsigned upload via `fetch`.

## Global Constraints

- Next.js 14 App Router; TypeScript strict mode
- Sem Tailwind, sem UI library — inline styles com CSS variables de `globals.css`
- Design system: `--bg #111111`, `--surface #161616`, `--text #EDE8D5`, `border-radius: 0` exceto avatares; sem box-shadow
- `@supabase/ssr` via `lib/supabase/server.ts` (server) e `lib/supabase/client.ts` (browser)
- Cloudinary: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` e `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` — ambas expostas no browser (`NEXT_PUBLIC_`)
- Postgres functions com `SET search_path = public`; tabelas schema-qualificadas
- Migration `003_notifications.sql` aplicada MANUALMENTE pelo usuário no Supabase SQL Editor
- `npm run typecheck` deve passar após cada task
- Diretório: `/Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque`

---

### Task 1: Migration — tabela notifications

**Files:**
- Create: `supabase/migrations/003_notifications.sql`

**Interfaces:**
- Produces: tabela `public.notifications` com RLS no Supabase

- [ ] **Step 1: Criar `supabase/migrations/003_notifications.sql`**

```sql
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
```

- [ ] **Step 2: Instrução manual**

Reportar no relatório que o usuário deve colar este SQL no Supabase Dashboard → SQL Editor → Run. Não tentar aplicar via código.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_notifications.sql
git commit -m "feat: migration notifications table + RLS"
```

---

### Task 2: getUserCollections + /api/collections

**Files:**
- Modify: `lib/pins.ts` — adicionar função `getUserCollections`
- Create: `app/api/collections/route.ts`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts`
- Produces:
  - `getUserCollections(userId: string): Promise<string[]>` (exportada de `lib/pins.ts`)
  - `GET /api/collections` → `{ collections: string[] }` (401 sem sessão)

- [ ] **Step 1: Adicionar `getUserCollections` ao final de `lib/pins.ts`**

```typescript
export async function getUserCollections(userId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pins')
    .select('collection, created_at')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(`getUserCollections: ${error.message}`)
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of (data ?? []) as { collection: string }[]) {
    if (!seen.has(row.collection)) {
      seen.add(row.collection)
      result.push(row.collection)
    }
  }
  return result
}
```

- [ ] **Step 2: Criar `app/api/collections/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserCollections } from '@/lib/pins'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const collections = await getUserCollections(user.id)
  return NextResponse.json({ collections })
}
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/pins.ts app/api/collections/route.ts
git commit -m "feat: getUserCollections + /api/collections route"
```

---

### Task 3: /api/image-info

**Files:**
- Create: `app/api/image-info/route.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` do env; `createClient` de `lib/supabase/server.ts`
- Produces: `GET /api/image-info?url=` → `{ width: number; height: number }` (1×1 em fallback; 401 sem sessão)

- [ ] **Step 1: Criar `app/api/image-info/route.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ width: 1, height: 1 })

  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloud) return NextResponse.json({ width: 1, height: 1 })

  try {
    // Cloudinary fl_getinfo retorna metadados sem fazer download completo
    const fetchUrl = `https://res.cloudinary.com/${cloud}/image/fetch/fl_getinfo/${encodeURIComponent(url)}`
    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const json = await res.json() as { input?: { width?: number; height?: number } }
      const w = json.input?.width ?? 1
      const h = json.input?.height ?? 1
      if (w > 0 && h > 0) return NextResponse.json({ width: w, height: h })
    }
  } catch {
    // timeout ou erro de rede — retorna fallback
  }

  return NextResponse.json({ width: 1, height: 1 })
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/image-info/route.ts
git commit -m "feat: /api/image-info route for external URL dimensions"
```

---

### Task 4: Server Action createPin

**Files:**
- Modify: `app/(protected)/actions.ts` — adicionar `createPin` e import de `revalidatePath`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server.ts`; `revalidatePath` de `next/cache`
- Produces:
  - `createPin(data: CreatePinData): Promise<CreatePinResult>`
  - `type CreatePinData = { title: string; collection: string; tags: string[]; imageUrl: string; aspect: number; sourceUrl?: string; notes?: string; mentionedUserIds: string[] }`
  - `type CreatePinResult = { success: true; pinId: string } | { success: false; error: string }`

- [ ] **Step 1: Ler `app/(protected)/actions.ts` atual e adicionar ao topo e ao final**

Adicionar ao início do arquivo (após `'use server'`):
```typescript
import { revalidatePath } from 'next/cache'
```

Adicionar ao final do arquivo:
```typescript
type CreatePinData = {
  title: string
  collection: string
  tags: string[]
  imageUrl: string
  aspect: number
  sourceUrl?: string
  notes?: string
  mentionedUserIds: string[]
}

type CreatePinResult = { success: true; pinId: string } | { success: false; error: string }

export async function createPin(data: CreatePinData): Promise<CreatePinResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  if (!data.title.trim()) return { success: false, error: 'Título obrigatório' }
  if (!data.collection.trim()) return { success: false, error: 'Coleção obrigatória' }
  if (!data.imageUrl.trim()) return { success: false, error: 'Imagem obrigatória' }

  const { data: pin, error: pinError } = await supabase
    .from('pins')
    .insert({
      title: data.title.trim().toUpperCase(),
      collection: data.collection.trim(),
      tags: data.tags,
      image_url: data.imageUrl,
      aspect: data.aspect,
      source_url: data.sourceUrl?.trim() || null,
      notes: data.notes?.trim() || null,
      author_id: user.id,
    })
    .select('id')
    .single()

  if (pinError) return { success: false, error: pinError.message }

  if (data.mentionedUserIds.length > 0) {
    await supabase.from('notifications').insert(
      data.mentionedUserIds.map((toUserId) => ({
        type: 'mention' as const,
        from_user_id: user.id,
        to_user_id: toUserId,
        pin_id: pin.id,
      }))
    )
  }

  revalidatePath('/feed')
  return { success: true, pinId: pin.id }
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
git commit -m "feat: createPin server action with cloudinary url + mention notifications"
```

---

### Task 5: CreatePinDrawer

**Files:**
- Create: `components/CreatePinDrawer.tsx`

**Interfaces:**
- Consumes: `createPin`, `CreatePinData` de `app/(protected)/actions.ts`; `createClient` de `lib/supabase/client.ts` (para buscar profiles no @mention); `GET /api/collections`; `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`; `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- Produces: `<CreatePinDrawer onClose={() => void} />`

- [ ] **Step 1: Criar `components/CreatePinDrawer.tsx`**

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPin } from '@/app/(protected)/actions'

type Profile = { id: string; name: string; handle: string }

export default function CreatePinDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  // Imagem
  const [imageMode, setImageMode] = useState<'upload' | 'url' | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [aspect, setAspect] = useState(1.0)
  const [uploading, setUploading] = useState(false)
  const [urlLoading, setUrlLoading] = useState(false)

  // Campos
  const [title, setTitle] = useState('')
  const [collection, setCollection] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Coleção autocomplete
  const [collectionSuggestions, setCollectionSuggestions] = useState<string[]>([])
  const [showCollectionDD, setShowCollectionDD] = useState(false)

  // @Menção
  const [mentionInput, setMentionInput] = useState('')
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([])
  const [mentionedUsers, setMentionedUsers] = useState<Profile[]>([])

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Slide-in ao montar
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    requestAnimationFrame(() => {
      if (panelRef.current) panelRef.current.style.transform = 'translateX(0)'
    })
  }, [])

  // Carregar coleções do usuário
  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((d) => { if (d.collections) setCollectionSuggestions(d.collections) })
      .catch(() => {})
  }, [])

  // ── Upload Cloudinary ──────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageMode('upload')
    setUploading(true)
    setSubmitError('')
    try {
      const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      const form = new FormData()
      form.append('file', file)
      form.append('upload_preset', preset!)
      form.append('folder', 'dztaque/pins')
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
        method: 'POST', body: form,
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setImageUrl(json.secure_url)
      setImagePreview(json.secure_url)
      setAspect(json.height / json.width)
    } catch (err) {
      setSubmitError('Erro no upload: ' + (err instanceof Error ? err.message : 'tente novamente'))
      setImageMode(null)
    } finally {
      setUploading(false)
    }
  }

  // ── URL externa ────────────────────────────────────────────
  async function handleUseUrl() {
    if (!sourceUrl.trim()) return
    setImageMode('url')
    setUrlLoading(true)
    setImageUrl(sourceUrl.trim())
    setImagePreview(sourceUrl.trim())
    try {
      const res = await fetch(`/api/image-info?url=${encodeURIComponent(sourceUrl.trim())}`)
      const { width, height } = await res.json()
      setAspect(height / width)
    } catch {}
    setUrlLoading(false)
  }

  // ── Tags ───────────────────────────────────────────────────
  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (val && !tags.includes(val)) setTags((t) => [...t, val])
    setTagInput('')
  }

  // ── @Menção ────────────────────────────────────────────────
  async function handleMentionInput(val: string) {
    setMentionInput(val)
    const q = val.replace('@', '').trim()
    if (!q) { setMentionSuggestions([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, name, handle')
      .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
      .limit(6)
    setMentionSuggestions((data ?? []) as Profile[])
  }

  function selectMention(p: Profile) {
    if (!mentionedUsers.find((u) => u.id === p.id)) {
      setMentionedUsers((u) => [...u, p])
    }
    setMentionInput('')
    setMentionSuggestions([])
  }

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setSubmitError('Título obrigatório'); return }
    if (!collection.trim()) { setSubmitError('Coleção obrigatória'); return }
    if (!imageUrl) { setSubmitError('Imagem obrigatória'); return }

    setSubmitting(true)
    setSubmitError('')

    const result = await createPin({
      title: title.trim(),
      collection: collection.trim(),
      tags,
      imageUrl,
      aspect,
      sourceUrl: sourceUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      mentionedUserIds: mentionedUsers.map((u) => u.id),
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
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
        }}
      />

      {/* Painel */}
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

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border)',
            }}>
              <span className="caption">NOVO PIN</span>
              <button type="button" onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '22px', lineHeight: 1, padding: 0,
              }} aria-label="Fechar">×</button>
            </div>

            {/* Imagem */}
            <div className="field">
              <label className="field-label">Imagem *</label>

              {/* Upload area */}
              {imageMode !== 'url' && !imagePreview && (
                <div
                  onClick={() => document.getElementById('pin-file-input')?.click()}
                  style={{
                    border: '1px dashed var(--border-strong)', padding: '24px',
                    textAlign: 'center', cursor: 'pointer',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--text)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                >
                  <p className="caption" style={{ color: 'var(--text-muted)' }}>
                    {uploading ? 'ENVIANDO…' : 'CLIQUE PARA ENVIAR'}
                  </p>
                  <p className="body-sm" style={{ color: 'var(--text-faint)', marginTop: '4px' }}>
                    JPG · PNG · GIF · WebP
                  </p>
                </div>
              )}
              <input
                id="pin-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
                disabled={uploading}
              />

              {/* Preview */}
              {imagePreview && (
                <div style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{
                      width: '100%', maxHeight: '200px', objectFit: 'cover',
                      display: 'block', filter: 'grayscale(1) contrast(1.15)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { setImageMode(null); setImageUrl(''); setImagePreview(''); setAspect(1.0) }}
                    style={{
                      position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)',
                      border: 'none', color: 'var(--text)', cursor: 'pointer',
                      fontSize: '14px', padding: '2px 6px',
                    }}
                  >×</button>
                </div>
              )}
            </div>

            {/* URL de origem + usar como imagem */}
            <div className="field">
              <label className="field-label">URL de origem</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  style={{ flex: 1 }}
                />
                {sourceUrl && !imagePreview && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleUseUrl}
                    disabled={urlLoading}
                    style={{ whiteSpace: 'nowrap', fontSize: '8px' }}
                  >
                    {urlLoading ? '…' : 'USAR COMO IMAGEM'}
                  </button>
                )}
              </div>
            </div>

            {/* Título */}
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

            {/* Coleção */}
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

            {/* Tags */}
            <div className="field">
              <label className="field-label">Tags</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="digite e pressione Enter"
              />
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

            {/* @Menção */}
            <div className="field">
              <label className="field-label">Mencionar alguém</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={mentionInput}
                  onChange={(e) => handleMentionInput(e.target.value)}
                  placeholder="@nome"
                />
                {mentionSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, background: '#222',
                    border: '1px solid var(--border)', zIndex: 5, maxHeight: '140px', overflowY: 'auto',
                  }}>
                    {mentionSuggestions.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={() => selectMention(p)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: '11px',
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#333')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '')}
                      >
                        <span className="avatar" style={{ width: '18px', height: '18px', fontSize: '7px' }}>
                          {p.name.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
                        </span>
                        <span>@{p.handle}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {mentionedUsers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                  {mentionedUsers.map((u) => (
                    <span key={u.id} className="tag-pill">
                      @{u.handle}
                      <span
                        className="remove"
                        onClick={() => setMentionedUsers((us) => us.filter((x) => x.id !== u.id))}
                      >×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notas */}
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

          {/* Footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            {submitError && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {submitError}
              </p>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'PUBLICANDO…' : 'PUBLICAR PIN'}
            </button>
          </div>
        </form>
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
git add components/CreatePinDrawer.tsx
git commit -m "feat: CreatePinDrawer with cloudinary upload, collection autocomplete, @mention"
```

---

### Task 6: CreatePinButton + NavBar

**Files:**
- Create: `components/CreatePinButton.tsx`
- Modify: `components/NavBar.tsx`

**Interfaces:**
- Consumes: `CreatePinDrawer`
- Produces: `<CreatePinButton />` — botão que abre/fecha o drawer

- [ ] **Step 1: Criar `components/CreatePinButton.tsx`**

```typescript
'use client'

import { useState } from 'react'
import CreatePinDrawer from './CreatePinDrawer'

export default function CreatePinButton() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      <button
        className="btn-ghost"
        onClick={() => setIsOpen(true)}
        style={{ fontSize: '9px' }}
      >
        + PIN
      </button>
      {isOpen && <CreatePinDrawer onClose={() => setIsOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Ler `components/NavBar.tsx` e adicionar `CreatePinButton`**

Adicionar import no topo:
```typescript
import CreatePinButton from './CreatePinButton'
```

No JSX, inserir `<CreatePinButton />` dentro do `<div>` da direita, antes do `<form action={signOut}>`. A `<div>` direita ficará:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
  <CreatePinButton />
  <form action={signOut}>
    <button type="submit" className="btn-ghost" style={{ fontSize: '9px' }}>
      SAIR
    </button>
  </form>
  <span
    className="avatar"
    title={name}
    style={{ width: '28px', height: '28px', fontSize: '11px', cursor: 'pointer' }}
  >
    {initials || '?'}
  </span>
</div>
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add components/CreatePinButton.tsx components/NavBar.tsx
git commit -m "feat: CreatePinButton + wire to NavBar"
```

---

### Task 7: .env.example + verificação E2E

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Produces: app com criar pin funcionando end-to-end

- [ ] **Step 1: Atualizar `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SEED_TEST_PASSWORD=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add cloudinary vars to .env.example"
```

- [ ] **Step 3: Verificação E2E manual (pré-condição: migration 003 aplicada pelo usuário)**

Com `npm run dev` rodando e logado:
1. Nav bar mostra `+ PIN` → clicar abre o drawer com animação de slide
2. Clicar no overlay fecha o drawer
3. Selecionar arquivo de imagem → preview grayscale aparece, "ENVIANDO…" some
4. Preencher título, coleção (autocomplete mostra coleções existentes), tags (Enter adiciona pill)
5. Digitar @lu → dropdown mostra @lucas; clicar adiciona pill
6. Clicar PUBLICAR PIN → "PUBLICANDO…" → drawer fecha
7. Feed atualiza com o novo pin no topo (com a imagem real do Cloudinary)
8. Clicar no pin → página de detalhe mostra a imagem real

---

## Checklist de self-review

**Spec coverage:**
- [x] Migration 003_notifications.sql — Task 1
- [x] getUserCollections — Task 2
- [x] /api/collections — Task 2
- [x] /api/image-info — Task 3
- [x] createPin Server Action (pins + notifications + revalidatePath) — Task 4
- [x] CreatePinDrawer (upload Cloudinary, URL externa, coleção autocomplete, tags, @menção, submit) — Task 5
- [x] CreatePinButton — Task 6
- [x] NavBar com + PIN — Task 6
- [x] .env.example — Task 7

**Placeholders:** nenhum.

**Consistência de tipos:**
- `CreatePinData` definido em Task 4, consumido em Task 5 (`createPin(data: CreatePinData)`) ✓
- `getUserCollections(userId)` definido em Task 2, chamado em `/api/collections` (Task 2) ✓
- Drawer fecha com `onClose` de `CreatePinButton` e chama `router.refresh()` (Task 5) ✓

**Nota sobre migration manual:** Task 1 e Task 7 E2E dependem de o usuário aplicar `003_notifications.sql` no Supabase antes dos testes. O controller deve pausar entre Task 1 e Task 3 para solicitar a migration manual.
