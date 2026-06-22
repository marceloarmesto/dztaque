# DZtaque — Spec de Design

**Data:** 2026-06-21
**Tagline:** Referências que robô não tem
**Formato de entrega:** Protótipo estático — único arquivo `index.html`, sem backend

---

## Visão geral

Plataforma interna de curadoria e troca de referências criativas para os colaboradores da DZEstúdio. Funciona como um Pinterest/Cosmos exclusivo: pessoas salvam imagens, prints e links de campanhas, sites, peças e vídeos, organizam por categoria e tag, e compartilham com colegas via menção.

---

## Design system

Derivado de `design.md`. Regras absolutas:

| Token | Valor |
|---|---|
| Shell background | `#111111` (canvas-dark) |
| Texto primário | `#EDE8D5` (cream) |
| Texto secundário | `rgba(237,232,213,0.4)` |
| Linhas / bordas | `rgba(237,232,213,0.12)` |
| Card background | `#161616` |
| Card hover background | `#1c1c1c` |
| Verde DZ (acento) | `#0A3D26` |
| Border-radius | `0px` em tudo (exceto avatares circulares) |
| Sombras | nenhuma |
| Tipografia display | Helvetica Neue Black 900, UPPERCASE |
| Tipografia corpo | Helvetica Neue Regular 400 |
| Espaçamento | escada de 8px (`4px → 128px`) |
| Fotos | grayscale(100%) contrast(1.15) — sem exceção |

---

## Telas do protótipo

### 1. Login

- Fundo `#111111`, wordmark `DZTAQUE` centralizado em display-lg
- Tagline em subheading abaixo: "Referências que robô não tem"
- Botão único: `ENTRAR COM GOOGLE @dzestudio.com.br` — borda 1px creme, sem preenchimento, sem arredondamento
- Rodapé: `DZESTÚDIO` em caption muted

### 2. Feed (tela principal)

**Top nav** (altura fixa, border-bottom 1px `rgba(237,232,213,.12)`):
- Esquerda: wordmark `DZTAQUE` em font-weight 900
- Centro: campo de busca — background `rgba(237,232,213,.07)`, ícone de lupa, placeholder "buscar referências..."
- Direita: ícone de sino (notificações) · botão `+ PIN` (borda 1px creme) · avatar circular com iniciais do usuário

**Barra de categorias** (border-bottom 1px hairline):
- Tabs em caption UPPERCASE: TODOS · MOTION · IDENTIDADE · COPY · UI/UX · CAMPANHA · TIPOGRAFIA · OOH
- Tab ativa: texto creme + underline 2px creme
- Tabs inativas: texto `rgba(237,232,213,.3)`

**Feed — grid masonry 3 colunas**, gap 6px, padding horizontal 16px:
- Ordenação padrão: cronológico reverso (mais novo primeiro)
- Scroll infinito simulado no protótipo

**Pin card:**
- Sem border-radius
- Imagem: altura variável (proporcional ao original), background `#1c1c1c`, ícone de photo como placeholder
- Badge de categoria: canto superior direito da imagem, `font-size 7px`, `font-weight 700`, `letter-spacing .1em`, background `rgba(0,0,0,.5)`, texto creme
- Strip de info (background `#161616`, padding 7px 8px):
  - Título: `font-size 10px`, `font-weight 700`, cor creme, UPPERCASE, truncado com ellipsis
  - Linha abaixo: avatar (14px circular com iniciais) + `@nome` em muted · contador de curtidas + ícone coração + ícone bookmark
  - Coração preenchido = curtido pelo usuário atual; bookmark preenchido = salvo pelo usuário atual

### 3. Drawer — criar pin (desliza pela direita)

- Largura: 400px, height: 100vh, background `#161616`, border-left 1px hairline
- Overlay escuro semitransparente sobre o feed ao abrir
- Header do drawer: `NOVO PIN` em caption UPPERCASE + ícone × para fechar
- Campos (em ordem):
  1. **Upload de imagem** — área de drag-and-drop com borda tracejada 1px creme, ou botão para selecionar arquivo. Aceita JPG, PNG, GIF, WebP.
  2. **URL de origem** (opcional) — input texto, placeholder "https://..."
  3. **Título** — input texto obrigatório, UPPERCASE
  4. **Categoria** — select com as categorias fixas
  5. **Tags** — input de tags livres (apertar Enter adiciona tag), tags renderizadas como pills com × para remover
  6. **Mencionar alguém** — input com `@` que filtra lista de colaboradores ao digitar. Ao mencionar, a pessoa recebe notificação.
  7. **Notas** (opcional) — textarea livre
- Botão de submissão: `PUBLICAR PIN` — fundo creme, texto preto, full-width, sem border-radius
- Preview da imagem (thumbnail 100% de largura, altura máxima 200px, object-fit cover) aparece entre o campo de upload e o campo de URL, imediatamente após o arquivo ser selecionado

### 4. Pin — página de detalhe

**Navegação:**
- Botão `← VOLTAR` no topo esquerdo — retorna ao feed na posição exata de scroll (scroll position preservada via `history.state` ou `sessionStorage`)

**Layout da página (desktop, 2 colunas):**
- Coluna esquerda (60%): imagem em tamanho completo, grayscale + alto contraste
- Coluna direita (40%): metadados e ações

**Metadados (coluna direita):**
- Título em display-sm UPPERCASE
- Categoria em caption muted
- Tags como pills (borda 0.5px creme, sem fundo, sem border-radius)
- Linha de autoria: avatar + nome + data de publicação
- Link de origem (se houver): botão `ABRIR LINK ↗` — borda 1px creme
- Ações: `♡ 12 CURTIDAS` · `⊞ SALVAR` · `@ MENCIONAR`

**Pins relacionados (abaixo da dobra):**
- Título da seção: `MAIS COMO ESTE` em caption
- Grid masonry idêntico ao feed principal
- Critério de relacionamento no protótipo: mesma categoria
- Scroll infinito simulado

### 5. Perfil do usuário

**Header:**
- Avatar grande (48px) + nome completo + `@handle`
- Contadores: X pins salvos · Y curtidas recebidas

**Tabs:**
- `MEUS PINS` — grid masonry com pins criados pelo usuário
- `SALVOS` — pins de outros que o usuário deu bookmark

### 6. Notificações

**Header:** `NOTIFICAÇÕES` em display-sm

**Lista de eventos** (cronológica reversa):
- `[avatar] @fulano mencionou você em [nome do pin]` — clique leva ao pin
- `[avatar] @fulano curtiu seu pin [nome do pin]`
- `[avatar] @fulano salvou seu pin [nome do pin]`
- Item não lido: borda-left 2px creme
- Item lido: opacidade reduzida

---

## Arquitetura do protótipo HTML

```
index.html
  ├── <style> — CSS completo com variáveis de design system
  ├── dados mock — array JS com ~20 pins fictícios (título, categoria, tags, autor, likes)
  ├── estado de navegação — objeto JS { currentScreen, currentPinId, feedScrollY }
  └── screens — funções JS que renderizam cada tela no #app:
      · renderLogin()
      · renderFeed(categoryFilter)
      · renderPinDetail(pinId)
      · renderProfile(userId)
      · renderNotifications()
      · openCreateDrawer()
      · closeCreateDrawer()
```

**Navegação:** `showScreen(name, params)` troca o conteúdo de `#app` e atualiza `history.pushState`. O botão voltar chama `history.back()` e `restoreScroll()`.

**Dados mock:** 20 pins distribuídos entre as categorias. Cada pin tem: `{ id, title, category, tags, author, authorInitials, likes, saved, imageAspect }`. `imageAspect` define a altura proporcional do placeholder.

---

## Categorias fixas (definidas pelo admin)

MOTION · IDENTIDADE · COPY · UI/UX · CAMPANHA · TIPOGRAFIA · OOH

---

## Fora do escopo do protótipo

- Autenticação real (Google OAuth)
- Upload real de imagens
- Persistência de dados
- Backend / API
- Responsividade mobile (desktop-first; mobile é nice-to-have)
- Animações de transição (drawer pode ter transição CSS simples)
