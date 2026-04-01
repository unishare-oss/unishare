'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/unishare-oss/unishare/releases',
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          },
        )

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const data = (await response.json()) as GitHubRelease[]

        const formattedReleases = data.map((release) => {
          // Remove the version heading that semantic-release includes
          let notes = release.body || 'No release notes provided'
          notes = notes.replace(/^#+\s+\[?\d+\.\d+\.\d+\]?\s*\(.*?\)\s*\n?/m, '').trim()
          return {
            version: release.tag_name,
            date: release.published_at,
            notes,
          }
        })

        setReleases(formattedReleases)
      } catch (err) {
        console.error('Failed to fetch releases:', err)
        setError('Failed to load releases. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchReleases()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3">Changelog</h1>
          <p className="text-text-muted text-lg">
            See what&apos;s new in Unishare. We release updates regularly with new features,
            improvements, and bug fixes.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-muted">Loading releases...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-muted">No releases yet</p>
          </div>
        ) : (
          <div className="space-y-8">
            {releases.map((release) => (
              <div key={release.version} className="border-l-2 border-amber pl-6 pb-8">
                <div className="flex items-baseline gap-3 mb-4 flex-wrap">
                  <h2 className="text-2xl font-semibold">{release.version}</h2>
                  <span className="text-sm text-text-muted">
                    {formatDistanceToNow(new Date(release.date), { addSuffix: true })}
                  </span>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground">
                  <ReactMarkdown
                    components={{
                      h2: ({ node, ...props }) => (
                        <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h4 className="text-base font-semibold mt-3 mb-2" {...props} />
                      ),
                      p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside mb-3 space-y-1" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />
                      ),
                      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                      a: ({ node, ...props }) => (
                        <a className="text-amber hover:underline" {...props} />
                      ),
                      code: ({ node, ...props }) => (
                        <code
                          className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {release.notes}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
