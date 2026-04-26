import { useMemo } from 'react'
import {
  useFollowsControllerGetFollowing,
  useFollowsControllerGetFollowers,
} from '@/src/lib/api/generated/follows/follows'
import type { FollowUserEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useAuth } from '@/contexts/auth-context'

export type NetworkUser = FollowUserEntity & { relationship: 'following' | 'follower' | 'mutual' }

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
    const userMap = new Map<string, NetworkUser>()
    following.forEach((u) => userMap.set(u.id, { ...u, relationship: 'following' }))
    followers.forEach((u) => {
      if (!userMap.has(u.id)) userMap.set(u.id, { ...u, relationship: 'follower' })
      else userMap.set(u.id, { ...userMap.get(u.id)!, relationship: 'mutual' })
    })
    return Array.from(userMap.values())
  }, [followingResponse, followersResponse])

  return {
    networkUsers,
    isLoading: followingLoading || followersLoading,
  }
}
