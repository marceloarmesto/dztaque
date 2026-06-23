import NavBar from '@/components/NavBar'
import CollectionTabs from '@/components/CollectionTabs'
import FeedGrid from '@/components/FeedGrid'
import { getFeedPins, getRecentCollections } from '@/lib/pins'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string; q?: string }>
}) {
  const { collection, q } = await searchParams
  const [{ pins, nextCursor }, collections] = await Promise.all([
    getFeedPins({ collection, search: q }),
    getRecentCollections(3),
  ])

  return (
    <>
      <NavBar />
      <CollectionTabs collections={collections} active={collection ?? ''} />
      <div style={{ padding: '12px 20px' }}>
        <FeedGrid
          initialPins={pins}
          nextCursor={nextCursor}
          collection={collection ?? 'TODOS'}
          q={q ?? ''}
        />
      </div>
    </>
  )
}
