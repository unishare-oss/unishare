import Link from 'next/link'
import type { Metadata } from 'next'

const ISSUES_URL = 'https://github.com/unishare-oss/unishare/issues'
const NEW_ISSUE_URL = `${ISSUES_URL}/new/choose`

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with Unishare: quick answers, system status and how to report a problem.',
  openGraph: {
    title: 'Support | Unishare',
    description:
      'Get help with Unishare: quick answers, system status and how to report a problem.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Unishare' }],
  },
}

const FAQ = [
  {
    q: 'I cannot sign in',
    a: 'Unishare uses a shared sign-in. Check that you are using the account you registered with and try again. If the page will not load, check the system status below, then open an issue if it is still failing.',
  },
  {
    q: 'How do I report a post?',
    a: 'Use the report option on the post. Moderators for your university review reports.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Open your profile and use the delete option in the danger zone at the bottom. This cannot be undone.',
  },
  {
    q: 'I found a bug or have an idea',
    a: 'Open an issue on GitHub. Include what you did, what you expected and what happened, plus a screenshot if you can.',
  },
] as const

export default function SupportPage() {
  const statusUrl = process.env.STATUS_PAGE_URL

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-wider text-text-muted hover:text-foreground transition-colors"
        >
          ← Back
        </Link>

        <h1 className="font-display text-2xl font-semibold text-foreground mt-8 mb-2">Support</h1>
        <p className="text-sm text-text-secondary mb-10">
          Quick answers first. If you are still stuck, tell us on GitHub.
        </p>

        <div className="flex flex-col gap-8 text-sm text-foreground leading-relaxed">
          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="font-semibold mb-3">
              Quick answers
            </h2>
            <dl className="flex flex-col gap-4">
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <dt className="font-medium">{q}</dt>
                  <dd className="text-text-secondary mt-1">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {statusUrl ? (
            <section aria-labelledby="status-heading">
              <h2 id="status-heading" className="font-semibold mb-2">
                System status
              </h2>
              <p className="text-text-secondary">
                Something not loading? Check the{' '}
                <a
                  href={statusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  status page
                </a>{' '}
                for current incidents and uptime.
              </p>
            </section>
          ) : null}

          <section aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="font-semibold mb-2">
              Report a problem or request a feature
            </h2>
            <p className="text-text-secondary">
              We track everything on GitHub.{' '}
              <a
                href={NEW_ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Open an issue
              </a>{' '}
              or look through the{' '}
              <a
                href={ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                existing ones
              </a>{' '}
              first. Please do not post passwords or private information.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
