# DZtaque — Backend Fase 1: Fundação

**Data:** 2026-06-22
**Fase:** 1 de 5
**Entregável:** Projeto Next.js funcional com autenticação Google completa e perfis de usuário

---

## Contexto

DZtaque é uma plataforma interna de referências criativas para os colaboradores da DZEstúdio (~40 pessoas). O protótipo aprovado está em `index.html`. Este spec cobre apenas a Fase 1 — fundação do projeto. Fases subsequentes adicionam pins, feed, imagens, perfil e notificações.

## Fases do projeto

| Fase | Escopo |
|---|---|
| **1 — Fundação** (este spec) | Setup Next.js, Supabase, auth Google, profiles |
| 2 — Core pins e feed | Tabelas pins/likes/saves, feed, detalhe do pin |
| 3 — Criar pin + Cloudinary | Upload de imagem, drawer de criação |
| 4 — Perfil e coleções | Página de perfil com tabs |
| 5 — Notificações | Sistema de notificações em tempo real |

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth — Google OAuth |
| Imagens | Cloudinary (Fase 3) |
| Deploy | Vercel |

---

## Estrutura de arquivos

```
dztaque/
├── app/
│   ├── login/
│   │   └── page.tsx              # Tela de login
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # Handler do redirect OAuth
│   ├── (protected)/
│   │   ├── layout.tsx            # Auth guard — redireciona /login se sem sessão
│   │   ├── feed/
│   │   │   └── page.tsx          # Feed (placeholder na Fase 1)
│   │   ├── pin/
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Detalhe do pin (Fase 2)
│   │   ├── profile/
│   │   │   └── page.tsx          # Perfil (Fase 4)
│   │   └── notifications/
│   │       └── page.tsx          # Notificações (Fase 5)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Design system CSS
├── components/
│   └── NavBar.tsx                # Nav bar compartilhada
├── lib/
│   └── supabase/
│       ├── client.ts             # createBrowserClient (Client Components)
│       └── server.ts             # createServerClient (Server Components + API routes)
├── middleware.ts                 # Proteção de rotas + refresh de sessão
├── supabase/
│   └── migrations/
│       └── 001_profiles.sql      # Schema inicial
├── .env.local                    # Variáveis de ambiente (não commitado)
├── .env.example                  # Template das variáveis (commitado, sem valores)
└── package.json
```

O grupo `(protected)` do App Router aplica o layout de auth sem adicionar segmento na URL — `/feed` permanece `/feed`, não `/(protected)/feed`.

---

## Database schema — Fase 1

Apenas a tabela `profiles`. Tabelas de pins, likes, saves e notifications são criadas nas fases seguintes.

```sql
-- profiles: estende auth.users gerenciado pelo Supabase
CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name        TEXT NOT NULL,
  handle      TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- qualquer usuário autenticado lê qualquer perfil (necessário para @menções nas fases seguintes)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated USING (true);

-- cada usuário edita apenas o próprio perfil
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- trigger: cria profile automaticamente no primeiro login
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, handle, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Derivação do `handle`:** `marcelo.armesto@dzestudio.com.br` → `marcelo.armesto`. O `ON CONFLICT DO NOTHING` previne erro em re-logins.

---

## Fluxo de autenticação

```
Usuário acessa rota protegida
         ↓
middleware.ts — checa sessão Supabase
         ↓ sem sessão
/login — botão "ENTRAR COM GOOGLE @DZESTUDIO.COM.BR"
         ↓
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { hd: 'dzestudio.com.br', redirectTo: '/auth/callback' }
})
         ↓
Google OAuth → redireciona para /auth/callback?code=...
         ↓
route.ts — exchangeCodeForSession(code)
         ↓
Validação de domínio server-side:
  session.user.email.endsWith('@dzestudio.com.br')
  ├── false → supabase.auth.signOut() → redirect /login?error=domain
  └── true  → trigger on_auth_user_created cria/confirma profile
               → redirect /feed
```

**Dupla camada de validação de domínio:**
1. `hd: 'dzestudio.com.br'` no provider — filtra na tela de seleção de conta Google
2. Verificação server-side no callback — impede bypass via URL direta

**Autenticação por email+senha (para testes locais):**
Habilitada no Supabase Dashboard ao lado do Google OAuth. Credenciais de teste ficam exclusivamente no `.env.local` — nunca commitadas. O seed script usa `SEED_TEST_PASSWORD` do `.env.local`.

---

## Middleware

```typescript
// middleware.ts
// Protege todas as rotas exceto assets estáticos e /auth/*
// Refresca cookies de sessão em toda request (requisito do @supabase/ssr)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|auth).*)'],
}
```

Comportamento:
- Sem sessão + rota não-pública → `redirect('/login')`
- Com sessão + `/login` → `redirect('/feed')`
- Qualquer outra combinação → `NextResponse.next()` com cookies atualizados

---

## Design system

`app/globals.css` recebe as variáveis CSS do protótipo sem alteração:

```css
:root {
  --bg:           #111111;
  --surface:      #161616;
  --surface-hover:#1c1c1c;
  --text:         #EDE8D5;
  --text-muted:   rgba(237,232,213,0.4);
  --text-faint:   rgba(237,232,213,0.15);
  --border:       rgba(237,232,213,0.12);
  --border-strong:rgba(237,232,213,0.25);
  --accent:       #0A3D26;
  --font:         'Helvetica Neue', Helvetica, Arial, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
```

Componentes React usam `style={{}}` inline com essas variáveis — mesma abordagem do protótipo. Sem Tailwind nesta fase.

---

## NavBar — Fase 1

Componente Server Component que lê a sessão via `createServerClient`. Exibe:
- Esquerda: wordmark `DZTAQUE` linkando para `/feed`
- Direita: avatar circular com iniciais do nome + botão de logout

O botão de logout chama uma Server Action que invoca `supabase.auth.signOut()` e redireciona para `/login`. Sem estado client-side na nav bar da Fase 1.

---

## Variáveis de ambiente

**`.env.example`** (commitado, sem valores reais):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SEED_TEST_PASSWORD=
```

`NEXT_PUBLIC_*` são expostas no browser. `SUPABASE_SERVICE_ROLE_KEY` e `SEED_TEST_PASSWORD` são server-only — nunca prefixadas com `NEXT_PUBLIC_`.

---

## Dependências principais

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest"
  }
}
```

Sem UI library, sem Tailwind, sem ORM — stack mínimo.

---

## Entregável da Fase 1

Ao final desta fase, funcionando em `localhost:3000` e deploy na Vercel:

- [ ] Login com Google @dzestudio.com.br redireciona para `/feed`
- [ ] Email fora do domínio exibe mensagem de erro e não acessa a plataforma
- [ ] Profile é criado automaticamente na tabela `profiles` no primeiro login
- [ ] `/feed` exibe nav bar com nome e avatar do usuário logado
- [ ] Logout funciona e redireciona para `/login`
- [ ] Rotas protegidas redirecionam para `/login` sem sessão
- [ ] Seed script cria usuários de teste com `SEED_TEST_PASSWORD`

---

## Fora do escopo da Fase 1

- Pins, likes, saves, notifications (Fases 2–5)
- Upload de imagens / Cloudinary (Fase 3)
- Feed com dados reais (Fase 2)
- Responsividade mobile
