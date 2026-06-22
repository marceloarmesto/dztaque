---
version: 1.0
name: DZEstudio-design-analysis
description: Uma agência digital independente cuja comunicação lê como editorial tipográfico de impacto — base em **verde floresta profundo** (`#0A3D26`) sustentando tipografia display extrabold em creme; bandas em creme aparecem em peças institucionais e layouts editoriais. A única fonte de tensão visual é a **técnica de mistura grotesque + serif italic** — inserir letras em fonte serifada itálica dentro de blocos sans-serif black para criar o contraste entre digital e humano. Tipo roda em uma grotesca **Black (900)** em display e **Regular (400)** em corpo — sempre em caixa alta nos títulos. O espaçamento segue uma escada de 8px (`space-1` 4px até `space-10` 128px). A assinatura visual mais forte da marca é a **tipografia como imagem** — textos grandes que ocupam todo o campo, sobrepondo fotografias P&B sobre fundos coloridos.

colors:
  green-deep:   "#0A3D26"
  green-mid:    "#1B7434"
  cream:        "#EDE8D5"
  black:        "#111111"
  white:        "#FFFFFF"
  canvas:       "#0A3D26"
  canvas-dark:  "#111111"
  canvas-mid:   "#1B7434"
  canvas-light: "#EDE8D5"
  canvas-white: "#FFFFFF"
  ink:          "#EDE8D5"
  ink-on-light: "#0A3D26"
  ink-on-black: "#EDE8D5"
  body:         "#EDE8D5"
  body-muted:   "rgba(237,232,213,0.5)"
  body-on-light: "#0A3D26"
  hairline:     "rgba(237,232,213,0.2)"
  hairline-on-light: "#D9D9D1"
  on-canvas:    "#EDE8D5"
  on-canvas-mid: "#EDE8D5"

typography:
  display-xl:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 120px
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -3.6px
    textTransform: uppercase
  display-lg:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 80px
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -2.4px
    textTransform: uppercase
  display-md:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 48px
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -1.44px
    textTransform: uppercase
  display-sm:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 32px
    fontWeight: 900
    lineHeight: 1.0
    letterSpacing: -0.96px
    textTransform: uppercase
  heading:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.28px
  subheading:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0
  body-lg:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-sm:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 1.2px
    textTransform: uppercase
  wordmark:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 900
    lineHeight: 1.0
    letterSpacing: -0.48px
    textTransform: uppercase
  serif-accent:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontWeight: 400
    fontStyle: italic

rounded:
  none: 0px
  sm: 4px
  pill: 9999px

spacing:
  space-1:  4px
  space-2:  8px
  space-3:  12px
  space-4:  16px
  space-5:  24px
  space-6:  32px
  space-7:  48px
  space-8:  64px
  space-9:  96px
  space-10: 128px

components:
  nai-bar:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    borderTop: "1px solid {colors.ink}"
    borderBottom: "1px solid {colors.ink}"
    padding: "6px 0"
    layout: "space-between (NEW / ADVERTISING / INTELLIGENCE)"
  dz-mark-primary:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.green-deep}"
    typography: "{typography.wordmark}"
    rounded: "{rounded.none}"
    size: 72px
  dz-mark-inverted:
    backgroundColor: "{colors.green-deep}"
    textColor: "{colors.cream}"
    typography: "{typography.wordmark}"
    rounded: "{rounded.none}"
    size: 72px
  dz-mark-outlined:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.wordmark}"
    rounded: "{rounded.none}"
    border: "1.5px solid currentColor"
    size: 72px
  dz-wordmark:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.wordmark}"
    content: "DZESTÚDIO"
  oval-accent:
    backgroundColor: transparent
    textColor: "currentColor"
    typography: "{typography.caption}"
    border: "1.5px solid currentColor"
    rounded: "{rounded.pill}"
    padding: "2px 14px"
    use: "palavra de destaque inline no headline"
  border-frame:
    backgroundColor: transparent
    border: "1.5px solid {colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.space-6}"
    use: "enquadramento interno de composições"
  wordmark-repeat:
    backgroundColor: transparent
    textColor: "{colors.canvas-mid}"
    typography: "{typography.caption}"
    use: "textura tom-sobre-tom; DZESTÚDIO repetido em linha contínua"
  vertical-text:
    backgroundColor: transparent
    textColor: "{colors.body-muted}"
    typography: "{typography.caption}"
    transform: "rotate(90deg) ou rotate(-90deg)"
    use: "contexto periférico nas laterais de posters"
  trusted-by:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    labelTypography: "{typography.caption}"
    signatureTypography: "{typography.serif-accent}"
    signatureFontSize: 24px
    position: "canto inferior direito"
    use: "prova social com assinatura cursiva fictícia do cliente"
  footer-strip:
    backgroundColor: transparent
    textColor: "{colors.body-muted}"
    typography: "{typography.caption}"
    borderTop: "1px solid {colors.hairline}"
    padding: "{spacing.space-3} 0"
    layout: "CTA à esquerda / ícones D centralizados / URL à direita"
  hero-band-dark:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    padding: "{spacing.space-9}"
  hero-band-cream:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.ink-on-light}"
    typography: "{typography.display-lg}"
    padding: "{spacing.space-9}"
  hero-band-black:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-on-black}"
    typography: "{typography.display-lg}"
    padding: "{spacing.space-9}"
  feed-square:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    width: 1080px
    height: 1080px
    padding: 48px
    zones: "topo: nai-bar / centro: headline display / rodapé: dz-mark + trusted-by"
  story-frame:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-on-black}"
    width: 1080px
    height: 1920px
    padding: "64px 48px"
    safezone: "250px topo e base"
    zones: "topo: dz-mark / centro: headline display / base: URL ou wordmark"
  poster-portrait:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    width: "297mm"
    height: "420mm"
    resolution: "300dpi"
    padding: 48px
    zones: "topo: ©ano + dz-mark / laterais: vertical-text / centro: headline + foto / base: footer-strip"
  outdoor-landscape:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-on-black}"
    width: 3840px
    height: 2160px
    resolution: "150dpi"
    padding: 80px
    minTextSize: "72pt"
    zones: "nai-bar topo / headline dominante / foto P&B / dz-mark canto"
  photo-bw:
    filter: "grayscale(100%) contrast(1.15)"
    backgroundColor: transparent
    shape: "recorte retangular, sem rounded"
    integration: "texto sobreposto permitido — pode cobrir partes do rosto"
    use: "todo e qualquer uso fotográfico na marca"
---

## Overview

A DZEstúdio é uma agência digital independente — Strategy, Creative e Tech. Sua comunicação visual lê como editorial tipográfico de alto impacto: próximo de um pôster de manifesto do que de um layout corporativo convencional. A base de canvas é **verde floresta profundo** (`{colors.canvas}` — #0A3D26); bandas em creme (`{colors.canvas-light}` — #EDE8D5) aparecem em peças institucionais, editoriais e de identidade limpa. O canvas preto (`{colors.canvas-dark}` — #111111) é usado em Stories e peças de campanha com maior dramaticidade.

Não há cor de acento escassa à la Ferrari. A tensão visual da DZ vem da **tipografia**: a mistura de grotesca extrabold (900) com letras ou sílabas em serif italic intercaladas no mesmo bloco headline cria a assinatura visual da marca — o contraste entre o digital (sans) e o humano (serif). Tipo roda sempre em caixa alta nos displays; corpo em caixa baixa.

A assinatura visual mais forte é a **tipografia como imagem** — textos grandes que ocupam todo o campo, sobrepondo fotografias P&B sobre fundos coloridos, sem moldura ou separação.

**Características-chave:**
- Canvas primário `{colors.canvas}` (#0A3D26) — verde floresta profundo, nunca preto puro.
- Creme `{colors.cream}` (#EDE8D5) como único contraste quente — texto sobre verde ou fundo alternativo.
- Grotesca Black 900 em todo display — nunca weight menor que 700 em headlines.
- Mistura grotesque + serif italic como técnica de destaque — não decoração, assinatura.
- `{rounded.none}` (0px) em todos os elementos — sem bordas arredondadas exceto oval-accent.
- Fotografias sempre P&B (grayscale), nunca coloridas.
- Espaçamento pela escada de 8px com tokens nomeados.

---

## Colors

### Canvas (fundos)
- **Green Deep** (`{colors.canvas}` — #0A3D26): Verde floresta profundo. Canvas primário da marca — fundo da maioria das peças institucionais, feeds e posters.
- **Black** (`{colors.canvas-dark}` — #111111): Canvas escuro alternativo. Usado em Stories e peças de campanha com maior dramaticidade e contraste.
- **Green Mid** (`{colors.canvas-mid}` — #1B7434): Verde vivo. Canvas de campanha — feeds de alto impacto, peças que precisam se destacar no feed.
- **Cream** (`{colors.canvas-light}` — #EDE8D5): Branco quente. Canvas editorial — peças institucionais, portfólio, layouts com fotografia dominante.
- **White** (`{colors.canvas-white}` — #FFFFFF): Branco puro. Canvas clean — outdoor horizontal, camiseta estampa, layouts minimalistas.

### Texto
- **Ink** (`{colors.ink}` — #EDE8D5): Texto primário sobre canvas escuro (green-deep, black, green-mid).
- **Ink on Light** (`{colors.ink-on-light}` — #0A3D26): Texto primário sobre canvas claro (cream, white).
- **Body Muted** (`{colors.body-muted}` — rgba(237,232,213,0.5)): Texto secundário, labels periféricos, texto vertical lateral.

### Separadores
- **Hairline** (`{colors.hairline}` — rgba(237,232,213,0.2)): Linha fina sobre canvas escuro. Usada no footer-strip e frames internos.
- **Hairline on Light** (`{colors.hairline-on-light}` — #D9D9D1): Linha fina sobre canvas claro.

### Combinações aprovadas

| Fundo         | Hex     | Texto        | Hex     | Uso                             |
|--------------|---------|-------------|---------|----------------------------------|
| green-deep   | #0A3D26 | cream       | #EDE8D5 | Primária / Institucional        |
| cream        | #EDE8D5 | green-deep  | #0A3D26 | Primária invertida / Editorial  |
| green-mid    | #1B7434 | cream       | #EDE8D5 | Campanha / Alto impacto         |
| green-mid    | #1B7434 | black       | #111111 | Campanha / Texto escuro         |
| black        | #111111 | cream       | #EDE8D5 | Dark / Stories / Dramaticidade  |
| white        | #FFFFFF | black       | #111111 | Clean / Editorial / Camiseta    |

---

## Typography

### Família tipográfica
A DZ usa uma **grotesca extrabold/black** como voz principal — Helvetica Neue Black ou equivalente: `'Helvetica Neue', Helvetica, Arial, sans-serif`. Não há família display separada — a mesma fonte em peso 900 é o display. Para contraste, letras ou sílabas específicas dentro do headline recebem `{typography.serif-accent}` — Georgia italic regular — criando a mistura que é a assinatura da marca.

### Hierarquia

| Token | Tamanho | Peso | Line-height | Tracking | Uso |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 120px | 900 | 0.9 | -3.6px | Símbolo gigante, hero máximo |
| `{typography.display-lg}` | 80px | 900 | 0.92 | -2.4px | Headlines principais de peça |
| `{typography.display-md}` | 48px | 900 | 0.95 | -1.44px | Subtítulos de destaque, posters |
| `{typography.display-sm}` | 32px | 900 | 1.0 | -0.96px | Headlines de Stories, feeds menores |
| `{typography.heading}` | 28px | 700 | 1.1 | -0.28px | Seções, subtítulos |
| `{typography.subheading}` | 20px | 400 | 1.2 | 0 | Suporte, descritores |
| `{typography.body-lg}` | 16px | 400 | 1.6 | 0 | Parágrafos principais |
| `{typography.body}` | 14px | 400 | 1.6 | 0 | Corpo de texto padrão |
| `{typography.body-sm}` | 12px | 400 | 1.5 | 0 | Rodapé, textos de apoio |
| `{typography.caption}` | 10px | 700 | 1.4 | 1.2px / uppercase | Labels, NAI bar, rodapé |
| `{typography.wordmark}` | 24px | 900 | 1.0 | -0.48px / uppercase | DZESTÚDIO, assinatura de marca |
| `{typography.serif-accent}` | herda do bloco | 400 | herda | herda | Mistura tipográfica — letras/sílabas em destaque |

### Princípios
- **Display sempre UPPERCASE.** Toda tipografia de headline roda em caixa alta — sem exceção.
- **Peso 900 em display, 400 em corpo.** O contraste vem da escala e da mistura, não da variação de peso no mesmo nível.
- **Tracking negativo em display.** -2.4px a -3.6px nos tamanhos grandes. Corpo em tracking zero.
- **Line-height abaixo de 1 em displays grandes.** 0.9 a 0.95 — textos que se tocam verticalmente. Cria densidade e impacto.

### Técnica de mistura tipográfica
Inserir letras ou sílabas específicas em `{typography.serif-accent}` (Georgia, italic, 400) dentro de um bloco grotesca black. A escolha das letras não é aleatória — geralmente recai em vogais com acento ou consoantes com forma expressiva.

```
DIGI[t]AL QUE RO[bô] [n]ÃO FA[z].
A GENTE [sempre] SE ENVOLVE.
```

Onde `[ ]` indica o caractere em serif italic. O tamanho da letra serif pode ser ligeiramente menor (0.85–0.9em) para compensar a altura-x diferente.

### Técnica de justify forçado
Textos institucionais longos com justify extremo — palavras ou letras espaçadas manualmente para preencher a linha borda a borda. Cria textura tipográfica densa em peças editoriais e slides.

### Nota sobre fonte real
A fonte exata da DZ é provavelmente uma grotesca licenciada (Neue Haas Grotesk, Aktiv Grotesk ou equivalente). Substitutos open-source: **Inter** em weight 800/900, ou **DM Sans** Black. A característica essencial é o peso extremo (Black/ExtraBlack) e a proporcionalidade extendida da letra.

---

## Layout

### Sistema de espaçamento
- **Unidade base:** 4px.
- **Tokens:** `{spacing.space-1}` 4px · `{spacing.space-2}` 8px · `{spacing.space-3}` 12px · `{spacing.space-4}` 16px · `{spacing.space-5}` 24px · `{spacing.space-6}` 32px · `{spacing.space-7}` 48px · `{spacing.space-8}` 64px · `{spacing.space-9}` 96px · `{spacing.space-10}` 128px.
- **Padding de peça:** `{spacing.space-7}` (48px) em feeds e stories; `{spacing.space-9}` (96px) reservado para posters grandes.

### Grid e container
- Feed Instagram: livre, sem grid rígido — tipografia define a composição.
- Posters: composição em zonas — topo / laterais / centro / rodapé. Rodapé tem altura fixa (~80px).
- Outdoor: tipografia dominante, máximo 2 blocos de texto + logo.
- Apresentação: grid de 12 colunas, max-width editorial 1280px.

### Zonas fixas por formato
Todos os formatos têm zonas fixas que aparecem consistentemente:

| Zona | Elemento | Posição |
|---|---|---|
| Identificador de marca | `{components.nai-bar}` | Topo, margem superior |
| Símbolo | `{components.dz-mark-primary}` | Topo esquerdo ou rodapé |
| Ano/copyright | `©2024` em `{typography.caption}` | Topo esquerdo (posters) |
| Contexto lateral | `{components.vertical-text}` | Lateral esquerda e direita (posters) |
| Atribuição | `{components.trusted-by}` | Rodapé direito |
| URL | `dzestudio.com.br` em `{typography.caption}` | Rodapé direito |
| Rodapé | `{components.footer-strip}` | Base dos posters |

### Filosofia de whitespace
A DZ alterna entre dois modos opostos: **total density** (tipo preenche o campo inteiro, quase sem respiro) e **editorial airy** (fundo dominante com tipografia pequena e posicionada). Nunca um meio-termo indefinido — a escolha é intencional.

---

## Elevação & Profundidade

A DZ não usa sombras. Profundidade é criada por dois recursos:

| Nível | Tratamento | Uso |
|---|---|---|
| Canvas | `{colors.canvas}` (#0A3D26) | Fundo de base — corpo das peças |
| Canvas alternativo | `{colors.canvas-dark}` (#111111) | Stories, bandas de campanha |
| Canvas elevado | `{colors.canvas-mid}` (#1B7434) | Feeds de alto impacto |
| Canvas claro | `{colors.canvas-light}` (#EDE8D5) | Peças editoriais, portfólio |
| Frame interno | Borda 1.5px `{colors.ink}` | Enquadramento de elemento (border-frame) |
| Profundidade fotográfica | Foto P&B em grayscale + contraste alto | Hero, composições com pessoa |

### Textura decorativa
- **Wordmark-repeat:** nome da marca repetido em tom-sobre-tom como padrão superficial — `{colors.canvas-mid}` sobre `{colors.canvas}`.
- **Sobreposição texto/foto:** tipografia display posicionada sobre a fotografia cria profundidade sem sombra — o texto e a imagem competem intencionalmente.

---

## Formas

### Escala de border-radius

| Token | Valor | Uso |
|---|---|---|
| `{rounded.none}` | 0px | Todo e qualquer elemento — dominante absoluto |
| `{rounded.sm}` | 4px | Raramente, elementos utilitários internos |
| `{rounded.pill}` | 9999px | Exclusivamente para `{components.oval-accent}` |

A marca DZ não usa bordas arredondadas em cards, botões, símbolos ou frames. Cantos retos (0px) em tudo. A única exceção é o oval-accent — um elemento específico que por sua natureza é uma elipse — e mesmo assim é uma forma livre, não um retângulo arredondado.

---

## Componentes

### Elementos de identidade

**`nai-bar`** — Barra de identificação posicional da DZ. Texto `{typography.caption}` em três colunas justificadas: `NEW` à esquerda / `ADVERTISING` ao centro / `INTELLIGENCE` à direita. Borda top e bottom de 1px na cor do texto. Aparece no topo de feeds, posters e outdoors como âncora da marca.

**`dz-mark-primary`** — Símbolo quadrado da DZ. Fundo `{colors.cream}`, texto `{colors.green-deep}`, `{typography.wordmark}`, tamanho mínimo 24×24px digital / 7mm impresso, `{rounded.none}`. Área de proteção: altura da letra D em todos os lados.

**`dz-mark-inverted`** — Versão invertida do símbolo. Fundo `{colors.green-deep}`, texto `{colors.cream}`. Usada sobre canvas claro.

**`dz-mark-outlined`** — Versão apenas contorno. Borda 1.5px `currentColor`, fundo transparente. Usada sobre canvas escuro em contextos neutros ou decorativos.

**`dz-wordmark`** — Texto "DZESTÚDIO" em `{typography.wordmark}`. Sempre com acento no Ú. Usada como assinatura tipográfica de peça, alternativa ou complemento ao símbolo.

### Elementos gráficos

**`oval-accent`** — Elipse ao redor de uma palavra de destaque dentro do headline. Borda 1.5px `currentColor`, `{rounded.pill}`, padding 2px × 14px, `{typography.caption}`. Posicionado inline no fluxo do texto — não flutuante. Cria ênfase sem quebrar o ritmo da leitura.

**`border-frame`** — Moldura interna com borda 1.5px `{colors.ink}`, `{rounded.none}`. Enquadra símbolos, composições ou elementos dentro de uma peça. Padding `{spacing.space-6}`.

**`wordmark-repeat`** — "DZESTÚDIO" repetido em linha contínua como textura. Cor `{colors.canvas-mid}` sobre `{colors.canvas}` — tom-sobre-tom, baixíssimo contraste intencional. Funciona como padrão superficial em fundos de peças ou como elemento de borda.

**`vertical-text`** — Texto em `{typography.caption}`, rotacionado 90° ou -90°, posicionado nas laterais de posters. Cor `{colors.body-muted}`. Conteúdo: fragmentos da tagline ("DIGITAL QUE" / "ROBÔ NÃO FAZ" / "MARKETING DIGITAL"). Não é lido diretamente — é contexto periférico.

**`trusted-by`** — Elemento de prova social. Label "TRUSTED BY" em `{typography.caption}` acima de uma assinatura em `{typography.serif-accent}` (Georgia italic, 24px). Posicionado no canto inferior direito. A assinatura representa um cliente e deve ser escrita em estilo cursivo.

**`footer-strip`** — Rodapé padrão de posters. Separado por `{colors.hairline}`. Layout: CTA de ação à esquerda / ícones de rede social ⓓ ao centro / `dzestudio.com.br` à direita. Tipografia `{typography.caption}`.

### Formatos de peça

**`hero-band-dark`** — Banda hero em canvas primário. Background `{colors.canvas}`, texto `{colors.ink}`, headline `{typography.display-lg}`, padding `{spacing.space-9}`. Inclui `nai-bar` no topo.

**`hero-band-cream`** — Banda hero editorial. Background `{colors.canvas-light}`, texto `{colors.ink-on-light}`. Usado em portfólio, apresentações e peças limpas.

**`hero-band-black`** — Banda hero dramática. Background `{colors.canvas-dark}`, texto `{colors.ink-on-black}`. Stories, peças de campanha.

**`feed-square`** — Post 1:1 para Instagram. 1080×1080px, 72dpi, padding 48px. Zonas: `nai-bar` no topo / headline `{typography.display-lg}` ou `{typography.display-md}` no centro / `dz-mark-primary` + `trusted-by` no rodapé. Fundo: `{colors.canvas}`, `{colors.canvas-light}` ou `{colors.canvas-mid}`.

**`story-frame`** — Stories 9:16 para Instagram. 1080×1920px, 72dpi, padding 64px × 48px, zona segura de 250px no topo e base. Headline dominante em `{typography.display-md}`. Fundo: `{colors.canvas-dark}` ou `{colors.canvas}`.

**`poster-portrait`** — Poster vertical A3. 297×420mm, 300dpi, padding 48px. Zonas: `©ano + dz-mark` no topo / `vertical-text` nas laterais / headline + `photo-bw` no centro / `footer-strip` na base.

**`outdoor-landscape`** — Outdoor horizontal 16:9. 3840×2160px, 150dpi, padding 80px. Tipografia mínima 72pt. Composição enxuta: `nai-bar` + headline dominante + `dz-mark`.

**`photo-bw`** — Tratamento fotográfico padrão. `filter: grayscale(100%) contrast(1.15)`. Foto sempre em recorte retangular `{rounded.none}`. Texto pode ser sobreposto — inclusive sobre o rosto. Aplicado em 100% das fotografias usadas na marca.

---

## Do's and Don'ts

### Do
- Usar `{colors.canvas}` (#0A3D26) como fundo primário — nunca preto puro em peças institucionais.
- Manter headlines sempre em UPPERCASE com `{typography.display-lg}` ou maior.
- Aplicar a mistura grotesque + `{typography.serif-accent}` em ao menos um bloco de headline por peça de campanha.
- Converter toda fotografia para P&B via `{components.photo-bw}` antes de usar.
- Usar `{rounded.none}` (0px) em absolutamente todos os elementos — cards, botões, frames, símbolos.
- Incluir `{components.nai-bar}` ("NEW · ADVERTISING · INTELLIGENCE") no topo das peças de feed e poster.
- Usar a escada de espaçamento `{spacing.*}` — nunca valores ad-hoc.

### Don't
- Não usar fotografias coloridas. A DZ só usa fotos em P&B — sem exceção.
- Não arredondar cantos de nenhum elemento além do `{components.oval-accent}`.
- Não usar peso menor que 700 em headlines e displays — o Black 900 é a voz da tipografia da marca.
- Não introduzir cores além da paleta de 5 (`{colors.green-deep}`, `{colors.green-mid}`, `{colors.cream}`, `{colors.black}`, `{colors.white}`).
- Não escrever "DZEstudio" sem acento. Sempre "DZEstúdio" no corpo e "DZESTÚDIO" em display.
- Não usar sombras (`box-shadow`, `drop-shadow`) — a DZ não usa nenhum recurso de sombra.
- Não criar títulos em caixa baixa. Toda tipografia de headline é UPPERCASE.
- Não misturar mais de dois fundos de canvas distintos em uma mesma peça.

---

## Comportamento Responsivo

### Breakpoints

| Nome | Largura | Mudanças-chave |
|---|---|---|
| Mobile | < 640px | Display-xl 120px → 48px; feed-square reduz padding para 24px; nai-bar em versão compacta |
| Tablet | 640–1024px | Display-xl → 80px; layout de poster em coluna única |
| Desktop | 1024–1280px | Display-xl completo; grade de 3 colunas para feeds |
| Wide | > 1280px | Conteúdo editorial limitado a 1280px; fundos full-bleed |

### Estratégia de escala tipográfica
A tipografia da DZ usa `clamp()` para adaptar-se fluidamente entre breakpoints:

```css
display-xl: clamp(48px, 10vw, 120px)
display-lg: clamp(32px, 7vw, 80px)
display-md: clamp(24px, 5vw, 48px)
display-sm: clamp(20px, 4vw, 32px)
```

---

## Guia de Iteração

1. Definir o canvas (fundo) primeiro — ele determina a versão do `dz-mark` e a cor de texto.
2. Escolher o modo tipográfico: **density** (tipo preenche o campo) ou **airy** (fundo dominante).
3. Headlines sempre em `{typography.display-lg}` ou maior, UPPERCASE, `{rounded.none}`.
4. Inserir a mistura `{typography.serif-accent}` em palavras-chave do headline de campanha.
5. Fotografias: aplicar `{components.photo-bw}` antes de posicionar.
6. Posicionar `{components.nai-bar}` no topo e `{components.footer-strip}` na base.
7. Assinar com `{components.dz-mark-primary}` e opcionalmente `{components.trusted-by}`.
8. Usar apenas valores da escada `{spacing.*}` — nunca px avulso.
9. Checar: toda borda tem `{rounded.none}`? Toda foto está em P&B? O fundo é da paleta de 5?

---

## Lacunas Conhecidas

- A fonte exata da DZ é uma grotesca licenciada não documentada publicamente — Helvetica Neue Black ou similar. Inter 800/900 é o substituto open-source documentado.
- Animações e micro-interações (transições de hover, animações de entrada para o wordmark-repeat) fora do escopo.
- Superfícies digitais internas (dashboard, área do cliente) não capturadas — este documento cobre apenas comunicação externa.
- Versões de peças para impressão especial (hot stamping, relevo, verniz localizado) não documentadas.
- Tokens de cor exatos derivados de análise visual das peças — podem variar ±5% dos valores originais do MIV.
