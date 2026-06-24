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
        {'DZTAQUE '.repeat(500)}
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
