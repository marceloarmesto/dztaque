import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import ProfileHeader from '@/components/ProfileHeader'
import ProfileTabs from '@/components/ProfileTabs'
import {
  getProfileWithStats,
  getAuthorPins,
  getSavedPins,
  groupByCollection,
} from '@/lib/pins'

export default async function ProfileHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = await getProfileWithStats(handle)
  if (!profile) notFound()

  const isOwnProfile = profile.id === (user?.id ?? '')

  const [authorPins, savedPins] = await Promise.all([
    getAuthorPins(profile.id),
    isOwnProfile ? getSavedPins(user!.id) : Promise.resolve([] as Awaited<ReturnType<typeof getSavedPins>>),
  ])

  const collections = groupByCollection(authorPins)

  return (
    <>
      <NavBar />
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
      <ProfileTabs
        authorPins={authorPins}
        savedPins={savedPins}
        collections={collections}
        isOwnProfile={isOwnProfile}
      />
    </>
  )
}
