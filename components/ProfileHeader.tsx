import type { ProfileWithStats } from '@/lib/pins'

function initialsFrom(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
}: {
  profile: ProfileWithStats
  isOwnProfile: boolean
}) {
  const initials = initialsFrom(profile.name)
  const stats = [
    { value: profile.pinsCount,       label: 'PINS' },
    { value: profile.collectionsCount, label: 'COLEÇÕES' },
    { value: profile.likesReceived,    label: 'CURTIDAS' },
  ]

  return (
    <div style={{ padding: '32px 20px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <span className="avatar" style={{ width: '56px', height: '56px', fontSize: '22px', flexShrink: 0, overflow: 'hidden' }}>
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : initials || '?'}
        </span>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
            {profile.name}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            @{profile.handle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '28px', textAlign: 'center', flexShrink: 0 }}>
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                {value}
              </p>
              <p className="caption" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {isOwnProfile && (
          <button
            className="btn-ghost"
            disabled
            style={{ fontSize: '9px', opacity: 0.4, cursor: 'not-allowed' }}
          >
            EDITAR PERFIL
          </button>
        )}
      </div>
    </div>
  )
}
