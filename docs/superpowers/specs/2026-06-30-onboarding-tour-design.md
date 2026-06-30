# DZtaque — Tutorial de Onboarding (Spotlight Tour)

**Data:** 2026-06-30
**Entregável:** Tutorial spotlight exibido no feed para novos usuários, até que dispensem explicitamente com "NÃO EXIBIR NOVAMENTE"

---

## Contexto

A plataforma está em uso real com ~40 colegas da DZ. Não há nenhum mecanismo de orientação para usuários que abrem o DZtaque pela primeira vez. O tutorial resolve isso sem exigir migration de banco ou novas rotas.

---

## Decisões de produto

| Decisão | Escolha |
|---|---|
| Quando aparece? | Em toda abertura, até o usuário dispensar |
| Como dispensar? | Botão "NÃO EXIBIR NOVAMENTE" (grava localStorage) |
| Onde aparece? | No feed (`/feed`), que é a tela de entrada |
| Estilo | Spotlight — overlay escuro com buraco recortado sobre o elemento real |
| Persistência | `localStorage.setItem('dztaque_tour_done', '1')` |
| Implementação | Do zero, sem bibliotecas externas |

---

## Arquitetura

**Um único Client Component:** `components/OnboardingTour.tsx`

Montado em `app/(protected)/layout.tsx` (wraps todas as rotas protegidas). No `useEffect` inicial:
- Lê `localStorage.getItem('dztaque_tour_done')`
- Se `'1'`: não renderiza nada
- Se null/ausente: renderiza o tour sobre o feed

Nenhuma migration de banco, nenhum Server Action, nenhuma API route nova.

---

## Mecânica do spotlight

A cada passo ativo:

1. `document.querySelector(step.selector)` localiza o elemento alvo
2. `element.getBoundingClientRect()` lê posição/dimensões na viewport
3. `<div>` overlay cobre toda a tela: `position: fixed, inset: 0, zIndex: 200, pointerEvents: none`
4. `<div>` "spotlight" posicionado sobre o elemento (mesmo `top/left/width/height` + 8px padding em cada lado), com `box-shadow: 0 0 0 9999px rgba(0,0,0,0.72)` criando o buraco
5. O elemento alvo recebe `position: relative; z-index: 201` temporariamente via `style` inline (restaurado ao sair do passo)
6. O tooltip é posicionado abaixo ou acima do spotlight conforme `placement`

**Tooltip visual:**
- `background: var(--surface)`, `border: 1px solid var(--border)`, sem border-radius
- `zIndex: 202`, `position: fixed`, calculado a partir do `getBoundingClientRect` do elemento alvo
- Conteúdo: contador "N / 8" (`.caption`), título (bold), texto (`body-sm`, `var(--text-muted)`)
- Botões: `← ANTERIOR` (`.btn-ghost`, oculto no passo 1) · `PRÓXIMO →` (`.btn-primary`) · `NÃO EXIBIR NOVAMENTE` (texto simples, `font-size: 10px`, `var(--text-faint)`)
- No passo 8 (último): `PRÓXIMO →` vira `CONCLUIR`

**Dispensar:** qualquer clique em "NÃO EXIBIR NOVAMENTE" ou "CONCLUIR" grava `localStorage.setItem('dztaque_tour_done', '1')` e desmonta o componente.

**Resize:** `useEffect` com listener em `window.resize` re-calcula a posição do spotlight/tooltip quando a janela é redimensionada durante o tour.

**Elemento não encontrado:** se `querySelector` retornar `null` (elemento não visível na tela atual), o passo é pulado automaticamente e avança para o próximo.

---

## Atributos `data-tour` a adicionar

Os seletores usam `data-tour="..."` para ser robustos a mudanças de classe/estrutura:

| Atributo | Onde adicionar | Arquivo |
|---|---|---|
| `data-tour="create-pin"` | botão principal no `CreatePinButton` | `components/CreatePinButton.tsx` |
| `data-tour="feed-grid"` | container do grid em `FeedGrid` | `components/FeedGrid.tsx` |
| `data-tour="collection-tabs"` | container das abas em `CollectionTabs` | `components/CollectionTabs.tsx` |
| `data-tour="like-btn"` | `<button>` dentro de `LikeButton` | `components/LikeButton.tsx` |
| `data-tour="save-btn"` | `<button>` dentro de `SaveButton` | `components/SaveButton.tsx` |
| `data-tour="nav-notifications"` | link do sino na `NavBar` | `components/NavBar.tsx` |
| `data-tour="nav-avatar"` | link do avatar na `NavBar` | `components/NavBar.tsx` |

A NavBar é selecionada via `nav` (elemento semântico já existente).

---

## Roteiro dos 8 passos

| # | Selector | Título | Texto | Placement |
|---|---|---|---|---|
| 1 | `nav` | BEM-VINDO AO DZTAQUE | Aqui você encontra referências visuais da DZ — e adiciona as suas. | below |
| 2 | `[data-tour="create-pin"]` | CRIAR UM PIN | Clique aqui para adicionar uma referência: faça upload de uma imagem ou cole uma URL. | below |
| 3 | `[data-tour="feed-grid"]` | O FEED DA DZ | Todos os pins da agência aparecem aqui. Role para descobrir referências de todos os colegas. | above |
| 4 | `[data-tour="collection-tabs"]` | FILTRAR POR COLEÇÃO | Use as abas para ver só os pins de uma coleção específica. | below |
| 5 | `[data-tour="like-btn"]` | CURTIR | Curta pins para mostrar que você viu e aprovou. | above |
| 6 | `[data-tour="save-btn"]` | SALVAR | Salve pins no seu perfil para encontrar mais tarde. | above |
| 7 | `[data-tour="nav-notifications"]` | NOTIFICAÇÕES | Quando alguém curtir, salvar ou mencionar você, aparece aqui. | below |
| 8 | `[data-tour="nav-avatar"]` | SEU PERFIL | Veja seus pins, suas coleções e as referências que você salvou. | below |

---

## Entregável

- [ ] Usuário que nunca dispensou o tour vê o spotlight ao abrir `/feed`
- [ ] Cada passo destaca o elemento correto com overlay escuro + buraco
- [ ] Tooltip mostra contador, título, texto e botões de navegação
- [ ] ANTERIOR/PRÓXIMO navegam entre passos; ANTERIOR oculto no passo 1
- [ ] Último passo mostra CONCLUIR no lugar de PRÓXIMO
- [ ] "NÃO EXIBIR NOVAMENTE" e CONCLUIR gravam localStorage e fecham o tour
- [ ] Após gravar localStorage, o tour não aparece mais em recargas
- [ ] Passo com elemento não encontrado na tela é pulado automaticamente
- [ ] Resize da janela reposiciona spotlight/tooltip

---

## Fora do escopo

- Armazenar estado no banco de dados (localStorage é suficiente para esta escala)
- Tour em páginas além do feed
- Analytics de quantos passos o usuário completou
- Vídeos ou animações nos passos
- Botão para re-abrir o tour manualmente nas configurações
