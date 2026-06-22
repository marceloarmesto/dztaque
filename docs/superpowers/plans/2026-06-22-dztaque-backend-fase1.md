# DZtaque Backend — Fase 1: Fundação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold do projeto Next.js 14 com autenticação Google OAuth restrita a @dzestudio.com.br via Supabase, tabela `profiles` com trigger de criação automática, middleware de proteção de rotas, design system CSS preservado do protótipo, NavBar funcional com logout e seed script de usuários de teste.

**Architecture:** Next.js 14 App Router com TypeScript. Supabase gerencia auth (Google OAuth + email/senha para testes) e PostgreSQL. Clientes Supabase separados para browser e servidor. Middleware na raiz intercepta todas as requests para refresh de sessão e proteção de rotas. Sem Tailwind, sem ORM, sem UI library.

**Tech Stack:** Next.js 14, React 18, TypeScript 5, `@supabase/ssr`, `@supabase/supabase-js`, `tsx` (dev)

## Global Constraints

- Next.js 14 App Router — não usar Pages Router
- TypeScript strict mode — `"strict": true` no tsconfig
- `@supabase/ssr` para todos os clientes Supabase (não `@supabase/auth-helpers-nextjs`)
- Sem Tailwind, sem shadcn, sem UI library — inline styles com CSS custom properties
- Sem ORM — queries diretas via Supabase client
- Design system idêntico ao protótipo: `--bg: #111111`, `--text: #EDE8D5`, `border-radius: 0` em tudo exceto avatares
- `SEED_TEST_PASSWORD` nunca commitado — vive em `.env.local` apenas
- Validação de domínio em dupla camada: `hd: 'dzestudio.com.br'` no OAuth + verificação server-side no callback
- Diretório do projeto: `/Users/marceloarmesto/Desktop/Trabalho/AI/Claude/dztaque`

---

### Task 1: Project scaffold + design system

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `.env.example`
- Create: `.gitignore` (update)
- Create: `app/globals.css`
- Create: `app/layout.tsx`

**Interfaces:**
- Produces: projeto Next.js iniciável com `npm run dev`; variável CSS `--bg`, `--text`, etc. disponíveis globalmente; classes `.display-lg`, `.btn-ghost`, `.avatar` etc. disponíveis em todos os componentes

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "dztaque",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/ssr": "^0.5.1",
    "@supabase/supabase-js": "^2.43.4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tsx": "^4"
  }
}
```

- [ ] **Step 2: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Criar `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 4: Criar `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SEED_TEST_PASSWORD=
```

- [ ] **Step 5: Atualizar `.gitignore`**

Adicionar ao `.gitignore` existente:

```
# dependencies
/node_modules

# next.js
/.next/
/out/

# env files
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local
```

- [ ] **Step 6: Criar `app/globals.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

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

html, body {
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.display-lg  { font-size: clamp(32px,7vw,80px);  font-weight:900; line-height:0.92; letter-spacing:-2.4px; text-transform:uppercase; }
.display-md  { font-size: clamp(24px,5vw,48px);  font-weight:900; line-height:0.95; letter-spacing:-1.44px; text-transform:uppercase; }
.display-sm  { font-size: 32px; font-weight:900; line-height:1.0;  letter-spacing:-0.96px; text-transform:uppercase; }
.subheading  { font-size: 20px; font-weight:400; line-height:1.2; }
.body-sm     { font-size: 12px; font-weight:400; line-height:1.5; }
.caption     { font-size: 10px; font-weight:700; line-height:1.4;  letter-spacing:1.2px; text-transform:uppercase; }
.wordmark    { font-size: 24px; font-weight:900; letter-spacing:-0.48px; text-transform:uppercase; }

.btn-ghost {
  display:inline-flex; align-items:center; justify-content:center;
  border:1px solid var(--border-strong); background:transparent;
  color:var(--text); font-family:var(--font); font-size:9px;
  font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
  padding:7px 14px; cursor:pointer; border-radius:0; transition:background 0.15s;
}
.btn-ghost:hover { background:rgba(237,232,213,0.07); }

.btn-primary {
  display:flex; align-items:center; justify-content:center;
  border:none; background:var(--text); color:#111111;
  font-family:var(--font); font-size:10px; font-weight:700;
  letter-spacing:1.2px; text-transform:uppercase;
  padding:12px; cursor:pointer; border-radius:0; width:100%;
}
.btn-primary:hover { opacity:0.9; }

input, select, textarea {
  width:100%; background:rgba(237,232,213,0.05);
  border:1px solid var(--border); color:var(--text);
  font-family:var(--font); font-size:12px; padding:8px 10px;
  border-radius:0; outline:none; -webkit-appearance:none;
}
input:focus, select:focus, textarea:focus { border-color:var(--border-strong); }
input::placeholder, textarea::placeholder { color:var(--text-muted); }

label.field-label {
  display:block; font-size:9px; font-weight:700;
  letter-spacing:1.2px; text-transform:uppercase;
  color:var(--text-muted); margin-bottom:5px;
}
.field { margin-bottom:14px; }

.avatar {
  border-radius:50%; background:rgba(237,232,213,0.12);
  display:inline-flex; align-items:center; justify-content:center;
  font-weight:700; color:var(--text); flex-shrink:0;
  border:1px solid rgba(237,232,213,0.2);
}

.tag-pill {
  display:inline-flex; align-items:center; gap:4px;
  border:0.5px solid rgba(237,232,213,0.25); padding:2px 8px;
  font-size:9px; font-weight:700; letter-spacing:0.8px;
  text-transform:uppercase; color:var(--text-muted); cursor:default;
}
.tag-pill .remove { cursor:pointer; font-size:12px; line-height:1; }
.tag-pill .remove:hover { color:var(--text); }

::-webkit-scrollbar { width:4px; height:4px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:var(--border); }
```

- [ ] **Step 7: Criar `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DZTAQUE',
  description: 'Referências que robô não tem',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: Instalar dependências**

```bash
npm install
```

Expected: `node_modules/` criado, sem erros.

- [ ] **Step 9: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sem erros de TypeScript. (Vai reclamar de `next-env.d.ts` até o primeiro `next dev` — ignorar por ora.)

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json next.config.ts .env.example .gitignore app/globals.css app/layout.tsx
git commit -m "feat: scaffold next.js 14 + design system"
```

---

### Task 2: Supabase clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` do environment
- Produces:
  - `createClient()` em `lib/supabase/client.ts` → `SupabaseBrowserClient` (usa em Client Components e scripts)
  - `createClient()` em `lib/supabase/server.ts` → `Promise<SupabaseServerClient>` (usa em Server Components, Route Handlers, Server Actions)

- [ ] **Step 1: Criar `.env.local` com valores reais do Supabase**

No Supabase Dashboard → Project Settings → API. Copiar:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SEED_TEST_PASSWORD=Dztaqueprav06!
```

Salvar em `.env.local` (não commitar).

- [ ] **Step 2: Criar `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Criar `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll chamado de Server Component — cookies já foram enviados
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/server.ts
git commit -m "feat: supabase client setup (browser + server)"
```

---

### Task 3: Database migration

**Files:**
- Create: `supabase/migrations/001_profiles.sql`

**Interfaces:**
- Produces: tabela `profiles` no Supabase com RLS habilitado; trigger `on_auth_user_created` que cria profile automaticamente no primeiro login

- [ ] **Step 1: Criar `supabase/migrations/001_profiles.sql`**

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

-- qualquer usuário autenticado lê qualquer perfil (necessário para @menções futuras)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated USING (true);

-- cada usuário edita apenas o próprio perfil
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- trigger: cria profile automaticamente no primeiro login Google ou email/senha
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

- [ ] **Step 2: Aplicar migration no Supabase**

No Supabase Dashboard → SQL Editor → New query. Colar o conteúdo de `supabase/migrations/001_profiles.sql` e executar.

Expected: "Success. No rows returned."

- [ ] **Step 3: Verificar tabela**

No Supabase Dashboard → Table Editor. Confirmar que `profiles` aparece com as colunas: `id`, `name`, `handle`, `avatar_url`, `created_at`.

- [ ] **Step 4: Verificar RLS**

No Supabase Dashboard → Authentication → Policies. Confirmar que `profiles` tem RLS habilitado e as duas policies (`profiles_select`, `profiles_update`) listadas.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/001_profiles.sql
git commit -m "feat: profiles table + RLS + trigger"
```

---

### Task 4: Middleware

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `createServerClient` do `@supabase/ssr`; cookies da request; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Produces: redirect para `/login` quando sem sessão em rota protegida; redirect para `/feed` quando com sessão tentando acessar `/login`; refresh automático de cookies de sessão em toda request

- [ ] **Step 1: Criar `middleware.ts` na raiz do projeto**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() e não getSession() — verifica token no servidor
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/feed'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // exclui assets estáticos, imagens otimizadas e favicon
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 3: Testar redirect sem sessão**

```bash
npm run dev
```

Abrir `http://localhost:3000/feed` no browser sem estar logado.
Expected: redirect para `http://localhost:3000/login`.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: middleware - route protection + session refresh"
```

---

### Task 5: Auth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

**Interfaces:**
- Consumes: query param `code` do redirect OAuth do Google; `createServerClient` de `@supabase/ssr`
- Produces: sessão Supabase nos cookies; redirect para `/feed` em sucesso; redirect para `/login?error=domain` se email ≠ @dzestudio.com.br; redirect para `/login?error=auth_failed` em erro

- [ ] **Step 1: Criar `app/auth/callback/route.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const email = data.session.user.email ?? ''
  if (!email.endsWith('@dzestudio.com.br')) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=domain`)
  }

  return NextResponse.redirect(`${origin}/feed`)
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat: oauth callback with domain validation"
```

---

### Task 6: Login page

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/LoginButton.tsx`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server` (Server Component); `createClient` de `lib/supabase/client` (Client Component); query param `error` para mensagens de erro
- Produces: página de login renderizada com botão Google OAuth; ao clicar, inicia fluxo `signInWithOAuth` redirecionando para `/auth/callback`

- [ ] **Step 1: Criar `app/login/LoginButton.tsx`** (Client Component — precisa de browser para OAuth)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginButton() {
  async function handleLogin() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        hd: 'dzestudio.com.br',
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      className="btn-ghost"
      style={{ width: '100%', padding: '14px 20px', fontSize: '10px', gap: '10px' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      ENTRAR COM GOOGLE @DZESTUDIO.COM.BR
    </button>
  )
}
```

- [ ] **Step 2: Criar `app/login/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginButton from './LoginButton'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/feed')

  const { error } = await searchParams

  const errorMessages: Record<string, string> = {
    domain: 'Acesso restrito a contas @dzestudio.com.br',
    auth_failed: 'Falha na autenticação. Tente novamente.',
    no_code: 'Código de autorização ausente.',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* wordmark-repeat texture */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          opacity: 0.035, fontSize: '10px', fontWeight: 700,
          letterSpacing: '2px', textTransform: 'uppercase',
          color: 'var(--text)', display: 'flex', flexWrap: 'wrap',
          alignContent: 'flex-start', pointerEvents: 'none',
          userSelect: 'none', lineHeight: 2,
        }}
      >
        {'DZTAQUE '.repeat(500)}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '380px', width: '100%' }}>
        <div className="display-lg" style={{ marginBottom: '14px' }}>DZTAQUE</div>
        <p className="subheading" style={{ color: 'var(--text-muted)', marginBottom: '56px' }}>
          Referências que robô não tem
        </p>

        {error && errorMessages[error] && (
          <p style={{
            fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px',
            border: '1px solid var(--border)', padding: '10px 14px',
          }}>
            {errorMessages[error]}
          </p>
        )}

        <LoginButton />

        <p className="caption" style={{ color: 'var(--text-faint)', marginTop: '56px' }}>
          DZESTÚDIO
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 4: Testar página de login**

```bash
npm run dev
```

Abrir `http://localhost:3000/login`. Verificar:
- Fundo preto `#111111`
- Wordmark "DZTAQUE" grande
- Tagline "Referências que robô não tem"
- Botão Google visível

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx app/login/LoginButton.tsx
git commit -m "feat: login page with google oauth button"
```

---

### Task 7: Protected layout + placeholder pages

**Files:**
- Create: `app/(protected)/layout.tsx`
- Create: `app/(protected)/feed/page.tsx`
- Create: `app/(protected)/pin/[id]/page.tsx`
- Create: `app/(protected)/profile/page.tsx`
- Create: `app/(protected)/notifications/page.tsx`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server`; `NavBar` de `components/NavBar` (definido na Task 8 — importar mas aceitar que falha até Task 8)
- Produces: guard de auth que redireciona para `/login` se sem sessão; `/feed` renderiza com NavBar após login

- [ ] **Step 1: Criar `app/(protected)/layout.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <>{children}</>
}
```

- [ ] **Step 2: Criar `app/(protected)/feed/page.tsx`** (placeholder — Fase 2 preenche)

```typescript
import NavBar from '@/components/NavBar'

export default function FeedPage() {
  return (
    <>
      <NavBar />
      <div style={{ padding: '64px 20px', textAlign: 'center' }}>
        <p className="caption" style={{ color: 'var(--text-faint)' }}>
          FEED EM BREVE — FASE 2
        </p>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Criar `app/(protected)/pin/[id]/page.tsx`** (placeholder)

```typescript
export default function PinPage() {
  return null
}
```

- [ ] **Step 4: Criar `app/(protected)/profile/page.tsx`** (placeholder)

```typescript
export default function ProfilePage() {
  return null
}
```

- [ ] **Step 5: Criar `app/(protected)/notifications/page.tsx`** (placeholder)

```typescript
export default function NotificationsPage() {
  return null
}
```

- [ ] **Step 6: Verificar typecheck**

```bash
npm run typecheck
```

Expected: erro sobre `NavBar` não encontrado — esperado, Task 8 cria o componente.

- [ ] **Step 7: Commit**

```bash
git add "app/(protected)/"
git commit -m "feat: protected layout + placeholder pages"
```

---

### Task 8: NavBar component

**Files:**
- Create: `components/NavBar.tsx`

**Interfaces:**
- Consumes: `createClient` de `lib/supabase/server`; tabela `profiles` via query Supabase
- Produces: componente Server Component renderizando wordmark + avatar com iniciais + botão de logout via Server Action

- [ ] **Step 1: Criar `components/NavBar.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function NavBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, handle')
    .eq('id', user?.id ?? '')
    .single()

  const name = profile?.name ?? ''
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('')

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px', borderBottom: '1px solid var(--border)',
    }}>
      <a
        href="/feed"
        className="wordmark"
        style={{ textDecoration: 'none', color: 'var(--text)', cursor: 'pointer' }}
      >
        DZTAQUE
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
    </nav>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: sem erros.

- [ ] **Step 3: Testar fluxo completo**

Com `npm run dev` rodando:

1. Acessar `http://localhost:3000` → redirect para `/login`
2. Acessar `http://localhost:3000/login` → página de login aparece
3. Acessar `http://localhost:3000/feed` sem sessão → redirect para `/login`
4. (Com Supabase configurado) Clicar "ENTRAR COM GOOGLE" → fluxo OAuth → `/feed` com nav bar
5. Nav bar exibe iniciais do usuário e botão "SAIR"
6. Clicar "SAIR" → redirect para `/login`

- [ ] **Step 4: Commit**

```bash
git add components/NavBar.tsx
git commit -m "feat: navbar with user initials and logout"
```

---

### Task 9: Seed script

**Files:**
- Create: `scripts/seed.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SEED_TEST_PASSWORD` do `.env.local`; Supabase Admin API (`auth.admin.createUser`)
- Produces: 8 usuários de teste criados no Supabase Auth com email @dzestudio.com.br e senha do `.env.local`; trigger `on_auth_user_created` cria profiles automaticamente

- [ ] **Step 1: Criar `scripts/seed.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'fs'

// Carregar .env.local manualmente (tsx não carrega automaticamente)
const envContent = dotenv.readFileSync('.env.local', 'utf-8')
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const testPassword = process.env.SEED_TEST_PASSWORD

if (!supabaseUrl || !serviceRoleKey || !testPassword) {
  console.error('Missing env vars. Check .env.local has NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_TEST_PASSWORD')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEST_USERS = [
  { email: 'lucas.andrade@dzestudio.com.br', name: 'Lucas Andrade' },
  { email: 'ana.moraes@dzestudio.com.br',    name: 'Ana Moraes' },
  { email: 'beto.ramos@dzestudio.com.br',    name: 'Beto Ramos' },
  { email: 'carol.assis@dzestudio.com.br',   name: 'Carol Assis' },
  { email: 'feli.costa@dzestudio.com.br',    name: 'Feli Costa' },
  { email: 'mari.rocha@dzestudio.com.br',    name: 'Mari Rocha' },
  { email: 'duda.lima@dzestudio.com.br',     name: 'Duda Lima' },
  { email: 'tati.nunes@dzestudio.com.br',    name: 'Tati Nunes' },
]

async function seed() {
  console.log('Seeding test users...\n')
  for (const user of TEST_USERS) {
    const { error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    })
    if (error && !error.message.includes('already been registered')) {
      console.error(`✗ ${user.email}: ${error.message}`)
    } else {
      console.log(`✓ ${user.email}`)
    }
  }
  console.log('\nDone.')
  process.exit(0)
}

seed()
```

- [ ] **Step 2: Executar seed**

```bash
npx tsx scripts/seed.ts
```

Expected output:
```
Seeding test users...

✓ lucas.andrade@dzestudio.com.br
✓ ana.moraes@dzestudio.com.br
✓ beto.ramos@dzestudio.com.br
✓ carol.assis@dzestudio.com.br
✓ feli.costa@dzestudio.com.br
✓ mari.rocha@dzestudio.com.br
✓ duda.lima@dzestudio.com.br
✓ tati.nunes@dzestudio.com.br

Done.
```

- [ ] **Step 3: Verificar usuários no Supabase**

No Supabase Dashboard → Authentication → Users. Confirmar 8 usuários @dzestudio.com.br com status "Confirmed".

- [ ] **Step 4: Verificar profiles criados pelo trigger**

No Supabase Dashboard → Table Editor → profiles. Confirmar 8 rows com `handle` derivado do email (ex: `lucas.andrade`).

- [ ] **Step 5: Testar login com usuário de teste**

Na tela de login (`http://localhost:3000/login`), verificar que é possível autenticar com `lucas.andrade@dzestudio.com.br` e a senha do `.env.local`.

Expected: redirect para `/feed` com nav bar mostrando "LA" no avatar.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: seed script for test users"
```

---

## Checklist de self-review

**Spec coverage:**
- [x] Next.js 14 App Router — Task 1
- [x] TypeScript strict — Task 1 (`tsconfig.json`)
- [x] Supabase clients browser + server — Task 2
- [x] Database migration profiles + RLS + trigger — Task 3
- [x] Middleware proteção de rotas + session refresh — Task 4
- [x] Auth callback com domain validation — Task 5
- [x] Login page com Google OAuth — Task 6
- [x] Protected layout + placeholder pages — Task 7
- [x] NavBar com initials + logout — Task 8
- [x] Seed script com SEED_TEST_PASSWORD — Task 9
- [x] Design system CSS preservado — Task 1 (`globals.css`)
- [x] `.env.example` sem valores reais — Task 1
- [x] Dupla validação de domínio — Tasks 5 + 6

**Placeholders:** nenhum.

**Consistência de tipos:**
- `createClient()` em `lib/supabase/server.ts` retorna `Promise<SupabaseClient>` — consumido com `await` em Tasks 4, 5, 6, 7, 8 ✓
- `createClient()` em `lib/supabase/client.ts` retorna `SupabaseClient` síncrono — consumido diretamente em Task 6 (LoginButton) ✓
