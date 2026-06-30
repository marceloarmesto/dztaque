'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

type TourStep = {
  selector: string
  title: string
  body: string
  placement: 'above' | 'below' | 'left'
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
    selector: '[data-tour="create-pin-panel"]',
    title: 'PREENCHENDO UM PIN',
    body: 'Envie uma imagem ou use uma URL como origem. Preencha o título, a coleção (para organizar), as tags e uma nota opcional sobre a referência.',
    placement: 'left',
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
const DRAWER_STEP = 2
const PADDING = 8     // px de respiro ao redor do elemento destacado
const TOOLTIP_WIDTH = 320
const TOOLTIP_GAP = 12

export default function OnboardingTour() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [tooltipHeight, setTooltipHeight] = useState(180)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Verifica localStorage apenas no cliente, após hidratação
  useEffect(() => {
    if (pathname === '/feed' && localStorage.getItem(STORAGE_KEY) !== '1') {
      setActive(true)
    }
  }, [pathname])

  // Avança entre passos, abrindo/fechando o drawer conforme necessário
  const goToStep = useCallback((fromIdx: number, toIdx: number) => {
    // Fechar drawer se estamos saindo do step do drawer
    if (fromIdx === DRAWER_STEP) {
      const closeBtn = document.querySelector<HTMLElement>('[data-tour="create-pin-close"]')
      if (closeBtn) closeBtn.click()
    }

    let i = toIdx
    while (i < STEPS.length) {
      if (i === DRAWER_STEP) {
        // Entrar no step do drawer: abrir o drawer e aguardar animação
        setStepIdx(i)
        setRect(null)
        const createBtn = document.querySelector<HTMLElement>('[data-tour="create-pin"]')
        if (createBtn) {
          createBtn.click()
          setTimeout(() => {
            const panel = document.querySelector(STEPS[DRAWER_STEP].selector)
            if (panel) setRect(panel.getBoundingClientRect())
          }, 350)
        }
        return
      }
      const el = document.querySelector(STEPS[i].selector)
      if (el) {
        setRect(el.getBoundingClientRect())
        setStepIdx(i)
        return
      }
      i++
    }
    localStorage.setItem(STORAGE_KEY, '1')
    setActive(false)
  }, [])

  // Vai ao passo 0 quando o tour é ativado
  useEffect(() => {
    if (active) goToStep(-1, 0)
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
  }, [stepIdx])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setActive(false)
  }

  function next() {
    if (stepIdx === STEPS.length - 1) { dismiss(); return }
    goToStep(stepIdx, stepIdx + 1)
  }

  function prev() {
    if (stepIdx === 0) return
    goToStep(stepIdx, stepIdx - 1)
  }

  if (!active || !rect) return null

  const step = STEPS[stepIdx]

  const spotTop    = rect.top    - PADDING
  const spotLeft   = rect.left   - PADDING
  const spotWidth  = rect.width  + PADDING * 2
  const spotHeight = rect.height + PADDING * 2

  const tooltipLeft = step.placement === 'left'
    ? Math.max(16, spotLeft - TOOLTIP_WIDTH - TOOLTIP_GAP)
    : Math.max(16, Math.min(spotLeft, window.innerWidth - TOOLTIP_WIDTH - 16))

  const tooltipTop = step.placement === 'below'
    ? spotTop + spotHeight + TOOLTIP_GAP
    : step.placement === 'above'
    ? spotTop - tooltipHeight - TOOLTIP_GAP
    : Math.max(16, spotTop + spotHeight / 2 - tooltipHeight / 2)

  return (
    <>
      {/* Full-screen click blocker — prevents interacting with the page during the tour */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
        }}
      />

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
