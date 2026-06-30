'use client'

import { useRouter } from 'next/navigation'

export default function CollectionTabs({
  collections,
  active,
}: {
  collections: string[]
  active: string
}) {
  const router = useRouter()
  const tabs = ['TODOS', ...collections]

  return (
    <div
      data-tour="collection-tabs"
      style={{
        display: 'flex', alignItems: 'center', padding: '0 20px',
        borderBottom: '1px solid var(--border)', overflowX: 'auto',
      }}>
      {tabs.map((tab) => {
        const isActive = active === tab || (active === '' && tab === 'TODOS')
        return (
          <button
            key={tab}
            onClick={() => router.push(tab === 'TODOS' ? '/feed' : `/feed?collection=${encodeURIComponent(tab)}`)}
            style={{
              background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid var(--text)' : '2px solid transparent',
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              fontFamily: 'var(--font)', fontSize: '9px', fontWeight: 700,
              letterSpacing: '1.2px', textTransform: 'uppercase',
              padding: '9px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              marginBottom: '-1px',
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
