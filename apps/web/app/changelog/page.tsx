'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface GitHubRelease {
  tag_name: string
  published_at: string
  body: string | null
}

interface Release {
  version: string
  date: string
  notes: string
}

export default function ChangelogPage() {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/unishare-oss/unishare/releases')
        const data = (await response.json()) as GitHubRelease[]

        const formattedReleases = data.map((release) => ({
          version: release.tag_name,
          date: release.published_at,
          notes: release.body || 'No release notes provided',
        }))

        setReleases(formattedReleases)
      } catch (error) {
        console.error('Failed to fetch releases:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReleases()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Changelog</h1>
          <p className="text-text-muted">
            See what&apos;s new in Unishare. We release updates regularly with new features,
            improvements, and bug fixes.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-muted">Loading releases...</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-muted">No releases yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {releases.map((release) => (
              <div key={release.version} className="border-l-2 border-amber pl-6 pb-8">
                <div className="flex items-baseline gap-3 mb-2">
                  <h2 className="text-2xl font-semibold">{release.version}</h2>
                  <span className="text-sm text-text-muted">
                    {formatDistanceToNow(new Date(release.date), { addSuffix: true })}
                  </span>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-sm text-foreground space-y-4 whitespace-pre-wrap break-words">
                    {release.notes.split('\n').map((line, i) => (
                      <div key={i}>{line || <br />}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
