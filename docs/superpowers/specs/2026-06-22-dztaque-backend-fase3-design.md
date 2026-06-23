# DZtaque — Backend Fase 3: Criar Pin + Cloudinary + @Menção

**Data:** 2026-06-22
**Fase:** 3 de 5
**Entregável:** Drawer de criação de pin com upload real ao Cloudinary, @menção com notificação persistida, e o feed refletindo pins recém-criados

---

## Contexto

Fases 1 (auth) e 2 (feed, likes, saves) concluídas. Esta fase adiciona a capacidade de criação de pins — a funcionalidade central que torna a plataforma utilizável pelo time. O botão `+ PIN` já existe na NavBar mas não abre nada; esta fase o conecta ao drawer real.

## Fases do projeto

| Fase | Escopo |
|---|---|
| 1 — Fundação | ✅ concluída |
| 2 — Core pins e feed | ✅ concluída |
| **3 — Criar pin + Cloudinary** (este spec) | Drawer, upload de imagem, @menção, tabela notifications |
| 4 — Perfil e coleções | Página de perfil com tabs |
| 5 — Notificações | UI de notificações |

---

## Decisões de produto

| Decisão | Escolha |
|---|---|
| Imagem | Obrigatória — `image_url NOT NULL` se mantém |
| Upload | Client-side direto ao Cloudinary (unsigned preset) |
| Aspect ratio | Calculado automaticamente das dimensões retornadas pelo Cloudinary |
| @menção | Cria linha em `notifications` (tabela criada nesta fase) |
| Revalidação | `revalidatePath('/feed')` após criar pin |

---

## Cloudinary — configuração

**Variáveis de ambiente** (adicionar a `.env.local` e `.env.example`):
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

Ambas `NEXT_PUBLIC_` porque o upload acontece no browser.

**Fluxo de upload:**
```
1. Usuário seleciona arquivo ou cola URL de imagem
2. Browser POST para https://api.cloudinary.com/v1_1/{cloud}/image/upload
   Body: { file, upload_preset: PRESET }
3. Cloudinary retorna { secure_url, width, height, public_id }
4. Front calcula aspect = height / width
5. secure_url e aspect ficam em estado local até o submit do formulário
6. Server Action createPin recebe imageUrl + aspect já resolvidos
```

O servidor Next.js nunca toca no arquivo — sem limite de tamanho de request, sem streaming.

---

## Database schema — Fase 3

### Nova migration: `supabase/migrations/003_notifications.sql`

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

-- cada usuário lê apenas as próprias notificações
CREATE POLICY "notifs_select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = to_user_id);

-- qualquer autenticado cria notificação (para mencionar outro usuário)
CREATE POLICY "notifs_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);

-- cada usuário marca como lida apenas as suas
CREATE POLICY "notifs_update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = to_user_id);
```

---

## Arquitetura dos componentes

```
NavBar (Server Component — sem mudança de lógica)
  └── CreatePinButton (Client Component — NOVO)
        ├── estado: isOpen (boolean)
        ├── botão "+ PIN" (classe .btn-ghost)
        └── {isOpen && <CreatePinDrawer onClose={...} />}

CreatePinDrawer (Client Component — NOVO)
  ├── overlay: position fixed, inset 0, background rgba(0,0,0,0.6), z-index 100
  ├── painel: position fixed, top 0, right 0, width 400px, height 100vh, z-index 101
  │   overflow-y auto, background var(--surface), border-left 1px var(--border)
  │   transition: transform 0.25s ease (translateX(100%) → translateX(0))
  ├── estado local: imageUrl, aspect, uploading, tags[], mentionedUsers[]
  └── submit → Server Action createPin()
```

O drawer não usa Context nem Zustand — o estado é local ao `CreatePinButton`.

---

## Server Action `createPin`

Localização: `app/(protected)/actions.ts` (arquivo existente — adicionar a função).

```typescript
createPin(data: {
  title: string
  collection: string
  tags: string[]
  imageUrl: string
  aspect: number
  sourceUrl?: string
  notes?: string
  mentionedUserIds: string[]
}): Promise<{ success: true; pinId: string } | { success: false; error: string }>
```

**Implementação:**
1. `createClient()` + `getUser()` — retorna erro se sem sessão
2. Valida: title não vazio, collection não vazio, imageUrl não vazio
3. Insere em `public.pins` com `author_id = user.id`
4. Para cada `userId` em `mentionedUserIds`: insere em `public.notifications` com `type: 'mention'`, `from_user_id: user.id`, `to_user_id: userId`, `pin_id: novo pin id`
5. `revalidatePath('/feed')` — invalida o cache do feed para o novo pin aparecer
6. Retorna `{ success: true, pinId }`

---

## Componente `CreatePinDrawer`

**Campos (em ordem):**

| Campo | Obrigatório | Tipo |
|---|---|---|
| Imagem | ✅ | Upload de arquivo OR URL externa |
| URL de origem | ❌ | Input texto |
| Título | ✅ | Input texto (uppercase) |
| Coleção | ✅ | Input texto com dropdown de autocomplete |
| Tags | ❌ | Input Enter-to-add, pills com × |
| @Menção | ❌ | Input com dropdown de busca nos profiles |
| Notas | ❌ | Textarea |

**Seção de imagem — dois modos:**
- **Upload:** área de drag-and-drop (click para selecionar). Ao selecionar, inicia upload ao Cloudinary imediatamente. Mostra progress ("ENVIANDO…") e preview da imagem (grayscale, objectFit cover, maxHeight 200px) após conclusão.
- **URL externa:** campo de URL. Ao clicar "USAR ESTA URL", faz `fetch` do endpoint `GET /api/image-info?url=` que retorna `{ width, height }` para calcular o aspect. Se falhar, usa aspect 1.0.

Os dois modos são mutuamente exclusivos — ao escolher um, o outro se desabilita.

**Autocomplete de coleção:**
- Input livre com dropdown
- `GET /api/collections` (novo endpoint) retorna as coleções do usuário autenticado
- Dropdown filtra conforme digitação
- Selecionar item preenche o campo; ou digitar livremente cria nova coleção

**@Menção:**
- Input que busca em `profiles` (nome ou handle) — mesma lógica do `SearchInput`
- Ao selecionar, adiciona pill com `@handle` e × para remover
- Lista de `mentionedUserIds` vai no payload do submit

**Validação no submit:**
- Título vazio → foco no campo + borda highlight
- Coleção vazia → idem
- Sem imagem (imageUrl vazio) → foco na área de upload

**Feedback de submit:**
- Botão "PUBLICAR PIN" muda para "PUBLICANDO…" durante a Server Action
- Em sucesso: fecha o drawer + `router.refresh()` para o feed recarregar
- Em erro: exibe mensagem abaixo do botão, mantém drawer aberto

---

## Novos endpoints de API

### `GET /api/collections`
- Autenticado (401 se sem sessão)
- Retorna as coleções do usuário atual: `{ collections: string[] }`
- Implementação: `getRecentCollections` filtrada pelo `user.id` (nova função em `lib/pins.ts`: `getUserCollections(userId)`)

### `GET /api/image-info?url=`
- Autenticado
- Faz fetch do header `Content-Type` + tenta pegar dimensões via Cloudinary fetch URL (`https://res.cloudinary.com/{cloud}/image/fetch/{url}`) ou via Open Graph
- Retorna `{ width: number; height: number }` ou `{ width: 1, height: 1 }` como fallback
- Timeout de 3s — não bloqueia a UX

---

## Modificações em arquivos existentes

**`components/NavBar.tsx`:**
- Importar `CreatePinButton` e renderizá-lo no `<div>` direito, antes do logout

**`lib/pins.ts`:**
- Adicionar `getUserCollections(userId: string): Promise<string[]>` — retorna coleções únicas dos pins do usuário, ordenadas por criação recente

**`.env.example`:**
- Adicionar `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=` e `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=`

---

## Entregável da Fase 3

- [ ] Migration `003_notifications.sql` aplicada
- [ ] `+ PIN` na nav bar abre o drawer com animação de slide
- [ ] Upload de imagem ao Cloudinary funciona (preview grayscale, progress)
- [ ] Submeter pin cria entrada no banco e o feed atualiza com o novo pin
- [ ] Coleção com autocomplete mostra coleções existentes do usuário
- [ ] Tags com Enter-to-add e remoção por ×
- [ ] @Menção busca colaboradores e cria notificação no banco
- [ ] Fechar drawer (× ou click no overlay) descarta o formulário

---

## Fora do escopo da Fase 3

- UI de notificações (Fase 5)
- Editar ou apagar pins
- Página de perfil completa (Fase 4)
- Responsividade mobile
