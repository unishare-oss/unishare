import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-wider text-text-muted hover:text-foreground transition-colors"
        >
          ← Back
        </Link>

        <h1 className="text-2xl font-semibold text-foreground mt-8 mb-2">Privacy Policy</h1>
        <p className="font-mono text-xs text-text-muted mb-10">Last updated: March 2026</p>

        <div className="flex flex-col gap-8 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="font-semibold mb-2">1. Information We Collect</h2>
            <p className="text-text-secondary mb-2">When you use Unishare, we collect:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>
                Account information: name, email address, and profile picture (from your Google or
                Microsoft account, or provided directly)
              </li>
              <li>
                Academic information: department and enrollment year, if you choose to provide them
              </li>
              <li>Content you upload: files, posts, and comments</li>
              <li>Usage data: pages visited, actions taken, and timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">2. How We Use Your Information</h2>
            <p className="text-text-secondary mb-2">We use your information to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>Provide and operate the Unishare platform</li>
              <li>Display your name and profile on content you share</li>
              <li>Send important account-related notifications</li>
              <li>Enforce our Terms of Service and maintain platform safety</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">3. Data Sharing</h2>
            <p className="text-text-secondary">
              We do not sell your personal data. Your name and content are visible to other users of
              the platform. We may share data with service providers (e.g. cloud storage, email)
              only as necessary to operate the platform.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">4. File Storage</h2>
            <p className="text-text-secondary">
              Files you upload are stored securely in cloud object storage. Access to files is
              controlled and may require signed URLs. We do not access your files except for
              moderation purposes.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">5. Cookies & Sessions</h2>
            <p className="text-text-secondary">
              We use cookies to maintain your session. Session cookies expire after 7 days of
              inactivity. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">6. Your Rights</h2>
            <p className="text-text-secondary">
              You may request deletion of your account and associated data at any time by contacting
              us. Note that content you have shared may remain visible to others unless explicitly
              removed.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">7. Changes</h2>
            <p className="text-text-secondary">
              We may update this policy from time to time. We will notify you of significant changes
              via email or a notice on the platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
