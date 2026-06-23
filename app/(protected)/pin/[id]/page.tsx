import Link from 'next/link'
import NavBar from '@/components/NavBar'
import PinCard from '@/components/PinCard'
import LikeButton from '@/components/LikeButton'
import SaveButton from '@/components/SaveButton'
import BackButton from '@/components/BackButton'
import { getPinById, getRelatedPins } from '@/lib/pins'

export default async function PinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pin = await getPinById(id)

  if (!pin) {
    return (
      <>
        <NavBar />
        <p className="caption" style={{ padding: '48px', color: 'var(--text-faint)' }}>
          PIN NÃO ENCONTRADO
        </p>
      </>
    )
  }

  const related = await getRelatedPins(pin)
  const relCols: typeof related[] = [[], [], []]
  related.forEach((p, i) => relCols[i % 3].push(p))

  return (
    <>
      <NavBar />
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
        <BackButton />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '60fr 40fr',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ padding: '24px 20px', borderRight: '1px solid var(--border)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pin.imageUrl}
            alt={pin.title}
            style={{ width: '100%', display: 'block', background: 'var(--surface-hover)' }}
          />
        </div>

        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Link
            href={`/feed?collection=${encodeURIComponent(pin.collection)}`}
            style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textDecoration: 'none' }}
          >
            {pin.collection} ↗
          </Link>
          <h1 className="display-sm">{pin.title}</h1>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 0',
            borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          }}>
            <span className="avatar" style={{ width: '34px', height: '34px', fontSize: '13px' }}>
              {pin.authorInitials}
            </span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{pin.authorName}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>@{pin.authorHandle}</p>
            </div>
          </div>

          {pin.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {pin.tags.map((t) => <span key={t} className="tag-pill">{t}</span>)}
            </div>
          )}

          {pin.notes && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{pin.notes}</p>
          )}

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <LikeButton pinId={pin.id} initialLiked={pin.likedByMe} initialCount={pin.likeCount} />
            <SaveButton pinId={pin.id} initialSaved={pin.savedByMe} />
            {pin.sourceUrl && (
              <a
                href={pin.sourceUrl}
                target="_blank"
                rel="noopener"
                className="btn-ghost"
                style={{ gap: '6px', textDecoration: 'none' }}
              >
                ABRIR LINK ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <p className="caption" style={{ marginBottom: '14px', color: 'var(--text-muted)' }}>
          MAIS DA COLEÇÃO &quot;{pin.collection}&quot;
        </p>
        {related.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            {relCols.map((col, idx) => (
              <div key={idx}>{col.map((p) => <PinCard key={p.id} pin={p} />)}</div>
            ))}
          </div>
        ) : (
          <p className="caption" style={{ color: 'var(--text-faint)' }}>
            NENHUM OUTRO PIN NESTA COLEÇÃO
          </p>
        )}
      </div>
    </>
  )
}
