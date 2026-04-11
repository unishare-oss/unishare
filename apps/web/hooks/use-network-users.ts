import { useMemo } from 'react'
import {
  useFollowsControllerGetFollowing,
  useFollowsControllerGetFollowers,
} from '@/src/lib/api/generated/follows/follows'
import { useAuth } from '@/contexts/auth-context'

export function useNetworkUsers({ enabled = true }: { enabled?: boolean } = {}) {
  const { session } = useAuth()
  const currentUserId = session?.user?.id

  const { data: followingResponse, isLoading: followingLoading } = useFollowsControllerGetFollowing(
    currentUserId || '',
    { query: { enabled: !!currentUserId && enabled } },
  )

  const { data: followersResponse, isLoading: followersLoading } = useFollowsControllerGetFollowers(
    currentUserId || '',
    { query: { enabled: !!currentUserId && enabled } },
  )

  const networkUsers = useMemo(() => {
    const following = followingResponse?.data || []
    const followers = followersResponse?.data || []
    const userMap = new Map<string, any>()
    following.forEach((u) => userMap.set(u.id, u))
    followers.forEach((u) => {
      if (!userMap.has(u.id)) userMap.set(u.id, { ...u, relationship: 'follower' })
      else userMap.set(u.id, { ...userMap.get(u.id), relationship: 'mutual' })
    })
    following.forEach((u) => {
      if (userMap.get(u.id)?.relationship !== 'mutual') {
        userMap.set(u.id, { ...u, relationship: 'following' })
      }
    })
    return Array.from(userMap.values())
  }, [followingResponse, followersResponse])

  return {
    networkUsers,
    isLoading: followingLoading || followersLoading,
  }
}
