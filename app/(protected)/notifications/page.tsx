import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import { getMyNotifications, markAllRead, timeAgo } from '@/lib/notifications'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null // middleware protege a rota

  // Carrega primeiro para capturar estado não-lido, depois marca como lidas
  const notifications = await getMyNotifications(user.id)
  await markAllRead(user.id)

  const typeLabels: Record<string, string> = {
    mention: 'mencionou você em',
    like: 'curtiu seu pin',
    save: 'salvou seu pin',
  }

  return (
    <>
      <NavBar />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px' }}>
        <h1 className="display-sm" style={{ marginBottom: '28px' }}>NOTIFICAÇÕES</h1>

        {notifications.length === 0 ? (
          <p className="caption" style={{ color: 'var(--text-faint)' }}>
            NENHUMA NOTIFICAÇÃO
          </p>
        ) : (
          <div>
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={`/pin/${n.pinId}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: n.read ? '14px 0' : '14px 14px',
                  marginLeft: n.read ? '0' : '-2px',
                  borderLeft: n.read ? 'none' : '2px solid var(--text)',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none', color: 'inherit',
                  opacity: n.read ? 0.65 : 1,
                }}
              >
                <span
                  className="avatar"
                  style={{ width: '28px', height: '28px', fontSize: '11px', flexShrink: 0 }}
                >
                  {n.fromInitials || '?'}
                </span>

                <p style={{ flex: 1, fontSize: '12px', lineHeight: 1.5, color: 'var(--text)', margin: 0 }}>
                  <strong style={{ fontWeight: 700 }}>@{n.fromHandle}</strong>
                  {' '}{typeLabels[n.type] ?? n.type}{' '}
                  <strong style={{ fontWeight: 700 }}>&quot;{n.pinTitle}&quot;</strong>
                </p>

                <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {timeAgo(n.createdAt)}
                </span>

                {!n.read && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--text)', flexShrink: 0,
                  }} />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
