# Onboarding Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir um tutorial spotlight de 8 passos no feed para todos os usuários que ainda não dispensaram com "NÃO EXIBIR NOVAMENTE".

**Architecture:** Task 1 adiciona atributos `data-tour="..."` nos elementos existentes para que os seletores do tour funcionem de forma robusta. Task 2 cria o componente `OnboardingTour` (Client Component puro: localStorage + `getBoundingClientRect` + `box-shadow` spotlight) e o monta no layout protegido.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, sem dependências novas, sem Tailwind.

## Global Constraints

- Sem Tailwind — todo estilo é inline ou via classes globais existentes: `.btn-ghost`, `.btn-primary`, `.caption`, `.body-sm`
- `border-radius: 0` em todos os elementos (nenhuma exceção no tour)
- `box-shadow: 0 0 0 9999px rgba(0,0,0,0.72)` no spotlight — é a única box-shadow desta feature
- `localStorage` key: `'dztaque_tour_done'`, valor `'1'` quando dispensado
- TypeScript strict — sem `any`
- Sem novas dependências

---

### Task 1: Adicionar atributos `data-tour` nos componentes existentes

**Files:**
- Modify: `components/CreatePinButton.tsx`
- Modify: `components/FeedGrid.tsx`
- Modify: `components/CollectionTabs.tsx`
- Modify: `components/LikeButton.tsx`
- Modify: `components/SaveButton.tsx`
- Modify: `components/NavBar.tsx`

**Interfaces:**
- Produces: os seletores CSS que `OnboardingTour` (Task 2) usa — `[data-tour="create-pin"]`, `[data-tour="feed-grid"]`, `[data-tour="collection-tabs"]`, `[data-tour="like-btn"]`, `[data-tour="save-btn"]`, `[data-tour="nav-notifications"]`, `[data-tour="nav-avatar"]`. A `nav` (NavBar) não precisa de atributo — é o seletor semântico `nav` já existente.

- [ ] **Step 1: Adicionar `data-tour="create-pin"` em `CreatePinButton`**

Em `components/CreatePinButton.tsx`, o `<button>` fica assim:

```tsx
<button
  data-tour="create-pin"
  className="btn-ghost"
  onClick={() => setIsOpen(true)}
  style={{ fontSize: '9px' }}
>
  + PIN
</button>
```

- [ ] **Step 2: Adicionar `data-tour="feed-grid"` em `FeedGrid`**

Em `components/FeedGrid.tsx`, o `<div>` container do grid (linha 72) fica assim:

```tsx
<div data-tour="feed-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
```

- [ ] **Step 3: Adicionar `data-tour="collection-tabs"` em `CollectionTabs`**

Em `components/CollectionTabs.tsx`, o `<div>` externo (linha 16) fica assim:

```tsx
<div
  data-tour="collection-tabs"
  style={{
    display: 'flex', alignItems: 'center', padding: '0 20px',
    borderBottom: '1px solid var(--border)', overflowX: 'auto',
  }}
>
```

- [ ] **Step 4: Adicionar `data-tour="like-btn"` em `LikeButton`**

Em `components/LikeButton.tsx`, o `<button>` interno fica assim:

```tsx
<button
  data-tour="like-btn"
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
```

- [ ] **Step 5: Adicionar `data-tour="save-btn"` em `SaveButton`**

Em `components/SaveButton.tsx`, o `<button>` fica assim:

```tsx
<button
  data-tour="save-btn"
  onClick={handleClick}
  aria-label="Salvar"
  style={{
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    color: saved ? 'var(--text)' : 'var(--text-muted)',
    display: 'flex', alignItems: 'center',
  }}
>
```

- [ ] **Step 6: Adicionar `data-tour="nav-notifications"` e `data-tour="nav-avatar"` em `NavBar`**

Em `components/NavBar.tsx`, o `<a>` de notificações (linha 64) recebe `data-tour="nav-notifications"`:

```tsx
<a
  data-tour="nav-notifications"
  href="/notifications"
  aria-label="Notificações"
  style={{ position: 'relative', textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '6px 8px' }}
  className="btn-ghost"
>
```

E o `<a>` do avatar (linha 87) recebe `data-tour="nav-avatar"`:

```tsx
<a data-tour="nav-avatar" href="/profile" title={name} style={{ cursor: 'pointer', textDecoration: 'none' }}>
```

- [ ] **Step 7: Verificar compilação TypeScript**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 8: Commit**

```bash
git add components/CreatePinButton.tsx components/FeedGrid.tsx components/CollectionTabs.tsx components/LikeButton.tsx components/SaveButton.tsx components/NavBar.tsx
git commit -m "feat: adicionar atributos data-tour nos elementos do onboarding"
```

---

### Task 2: `OnboardingTour` component + montagem no layout

**Files:**
- Create: `components/OnboardingTour.tsx`
- Modify: `app/(protected)/layout.tsx`

**Interfaces:**
- Consumes: atributos `data-tour="..."` do Task 1, seletor semântico `nav`
- Produces: `export default function OnboardingTour()` — sem props, autocontido

- [ ] **Step 1: Criar `components/OnboardingTour.tsx`**

```tsx
'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'

type TourStep = {
  selector: string
  title: string
  body: string
  placement: 'above' | 'below'
}

const STEPS: TourStep[] = [
  {
    selector: 'nav',
    title: 'BEM-VINDO AO DZTAQUE',
    body: 'Aqui você encontra referências visuais da DZ — e adiciona as suas.',
    placement: 'below',
  },
  {
    selector: '[data-tour="create-pin"]',
    title: 'CRIAR UM PIN',
    body: 'Clique aqui para adicionar uma referência: faça upload de uma imagem ou cole uma URL.',
    placement: 'below',
  },
  {
    selector: '[data-tour="feed-grid"]',
    title: 'O FEED DA DZ',
    body: 'Todos os pins da agência aparecem aqui. Role para descobrir referências de todos os colegas.',
    placement: 'above',
  },
  {
    selector: '[data-tour="collection-tabs"]',
    title: 'FILTRAR POR COLEÇÃO',
    body: 'Use as abas para ver só os pins de uma coleção específica.',
    placement: 'below',
  },
  {
    selector: '[data-tour="like-btn"]',
    title: 'CURTIR',
    body: 'Curta pins para mostrar que você viu e aprovou.',
    placement: 'above',
  },
  {
    selector: '[data-tour="save-btn"]',
    title: 'SALVAR',
    body: 'Salve pins no seu perfil para encontrar mais tarde.',
    placement: 'above',
  },
  {
    selector: '[data-tour="nav-notifications"]',
    title: 'NOTIFICAÇÕES',
    body: 'Quando alguém curtir, salvar ou mencionar você, aparece aqui.',
    placement: 'below',
  },
  {
    selector: '[data-tour="nav-avatar"]',
    title: 'SEU PERFIL',
    body: 'Veja seus pins, suas coleções e as referências que você salvou.',
    placement: 'below',
  },
]

const STORAGE_KEY = 'dztaque_tour_done'
const PADDING = 8     // px de respiro ao redor do elemento destacado
const TOOLTIP_WIDTH = 320
const TOOLTIP_GAP = 12

export default function OnboardingTour() {
  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [tooltipHeight, setTooltipHeight] = useState(180)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Verifica localStorage apenas no cliente, após hidratação
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== '1') {
      setActive(true)
    }
  }, [])

  // Avança para o passo `idx`, pulando elementos ausentes no DOM
  const goToStep = useCallback((idx: number) => {
    let i = idx
    while (i < STEPS.length) {
      const el = document.querySelector(STEPS[i].selector)
      if (el) {
        setRect(el.getBoundingClientRect())
        setStepIdx(i)
        return
      }
      i++
    }
    // Nenhum elemento encontrado a partir de `idx` — encerrar tour
    localStorage.setItem(STORAGE_KEY, '1')
    setActive(false)
  }, [])

  // Vai ao passo 0 quando o tour é ativado
  useEffect(() => {
    if (active) goToStep(0)
  }, [active, goToStep])

  // Recalcula o rect quando a janela é redimensionada
  useEffect(() => {
    if (!active) return
    const recalc = () => {
      const el = document.querySelector(STEPS[stepIdx].selector)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [active, stepIdx])

  // Mede a altura real do tooltip após cada render para corrigir posicionamento "above"
  useLayoutEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  })

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setActive(false)
  }

  function next() {
    if (stepIdx === STEPS.length - 1) { dismiss(); return }
    goToStep(stepIdx + 1)
  }

  function prev() {
    if (stepIdx === 0) return
    goToStep(stepIdx - 1)
  }

  if (!active || !rect) return null

  const step = STEPS[stepIdx]

  const spotTop    = rect.top    - PADDING
  const spotLeft   = rect.left   - PADDING
  const spotWidth  = rect.width  + PADDING * 2
  const spotHeight = rect.height + PADDING * 2

  const tooltipLeft = Math.max(
    16,
    Math.min(spotLeft, window.innerWidth - TOOLTIP_WIDTH - 16)
  )
  const tooltipTop = step.placement === 'below'
    ? spotTop + spotHeight + TOOLTIP_GAP
    : spotTop - tooltipHeight - TOOLTIP_GAP

  return (
    <>
      {/* Spotlight: cobre toda a tela com o "buraco" sobre o elemento */}
      <div
        style={{
          position: 'fixed',
          top: spotTop,
          left: spotLeft,
          width: spotWidth,
          height: spotHeight,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
          zIndex: 201,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_WIDTH,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '18px 20px',
          zIndex: 202,
        }}
      >
        <p className="caption" style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>
          {stepIdx + 1} / {STEPS.length}
        </p>
        <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)', marginBottom: '8px' }}>
          {step.title}
        </p>
        <p className="body-sm" style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          {step.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {stepIdx > 0 && (
            <button type="button" className="btn-ghost" onClick={prev} style={{ fontSize: '9px' }}>
              ← ANTERIOR
            </button>
          )}
          <button type="button" className="btn-primary" onClick={next} style={{ flex: 1, fontSize: '9px' }}>
            {stepIdx === STEPS.length - 1 ? 'CONCLUIR' : 'PRÓXIMO →'}
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-faint)',
            fontSize: '10px',
            padding: 0,
            display: 'block',
            width: '100%',
            textAlign: 'center',
          }}
        >
          NÃO EXIBIR NOVAMENTE
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Montar `OnboardingTour` em `app/(protected)/layout.tsx`**

O arquivo atual retorna `<>{children}</>`. Modifique para:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingTour from '@/components/OnboardingTour'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <>
      {children}
      <OnboardingTour />
    </>
  )
}
```

`OnboardingTour` é um Client Component montado dentro de um Server Component — padrão válido em Next.js 14. Renderiza `null` no servidor (porque `active` começa `false` e o `useEffect` com localStorage só roda no cliente), então não há flash de conteúdo.

- [ ] **Step 3: Verificar compilação TypeScript**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 4: Build de produção**

Run: `cd /Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque && npm run build`
Expected: build limpo, sem erros

- [ ] **Step 5: Verificação manual**

1. Abra `http://localhost:3000/feed` (ou `npm run start` após o build)
2. Confirme que o tour aparece com spotlight na NavBar (passo 1)
3. Clique PRÓXIMO — spotlight deve mover para o botão `+ PIN`
4. Navegue todos os 8 passos confirmando que cada spotlight destaca o elemento correto
5. No passo 8, clique CONCLUIR — tour some
6. Recarregue a página — tour NÃO aparece (localStorage gravado)
7. No DevTools, apague `dztaque_tour_done` do localStorage e recarregue — tour aparece novamente

- [ ] **Step 6: Commit**

```bash
git add components/OnboardingTour.tsx "app/(protected)/layout.tsx"
git commit -m "feat: tutorial de onboarding spotlight (8 passos, localStorage)"
```

---

## Self-Review

**1. Cobertura do spec:**
- localStorage key `dztaque_tour_done` valor `'1'` → STORAGE_KEY constante ✓
- 8 passos com seletores, títulos, textos e placement ✓
- Spotlight via `getBoundingClientRect` + `box-shadow: 0 0 0 9999px rgba(0,0,0,0.72)` ✓
- Tooltip: contador N/8, título, texto, ANTERIOR (oculto no passo 1), PRÓXIMO/CONCLUIR, NÃO EXIBIR NOVAMENTE ✓
- Passo com elemento ausente é pulado automaticamente (`while` loop em `goToStep`) ✓
- Resize recalcula posição ✓
- `useLayoutEffect` mede tooltip para posicionamento "above" correto ✓
- Montado em `app/(protected)/layout.tsx` ✓
- Sem novas dependências ✓
- `border-radius: 0` — nenhum `borderRadius` no componente ✓

**2. Placeholder scan:** sem TBD/TODO — todo o código está completo.

**3. Consistência:** `STEPS` array indexado por `stepIdx` em Task 2 referencia seletores `data-tour="..."` que existem após Task 1. A `nav` não precisa de `data-tour` — já é o elemento `<nav>` no `NavBar.tsx`.
