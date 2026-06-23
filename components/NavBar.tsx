import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SearchInput from './SearchInput'
import CreatePinButton from './CreatePinButton'

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

      <Suspense fallback={
        <div style={{
          flex: 1, maxWidth: '340px', margin: '0 24px',
          background: 'rgba(237,232,213,.07)', border: '1px solid var(--border)',
          padding: '6px 12px', height: '32px',
        }} />
      }>
        <SearchInput />
      </Suspense>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <CreatePinButton />
        <form action={signOut}>
          <button type="submit" className="btn-ghost" style={{ fontSize: '9px' }}>
            SAIR
          </button>
        </form>
        <a href="/profile" title={name} style={{ cursor: 'pointer', textDecoration: 'none' }}>
          <span
            className="avatar"
            style={{ width: '28px', height: '28px', fontSize: '11px' }}
          >
            {initials || '?'}
          </span>
        </a>
      </div>
    </nav>
  )
}
