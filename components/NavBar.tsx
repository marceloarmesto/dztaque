import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SearchInput from './SearchInput'

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

      <SearchInput />

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
