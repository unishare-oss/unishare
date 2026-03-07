import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-wider text-text-muted hover:text-foreground transition-colors"
        >
          ← Back
        </Link>

        <h1 className="text-2xl font-semibold text-foreground mt-8 mb-2">Terms of Service</h1>
        <p className="font-mono text-xs text-text-muted mb-10">Last updated: March 2026</p>

        <div className="flex flex-col gap-8 text-sm text-foreground leading-relaxed">
          <section>
            <h2 className="font-semibold mb-2">1. Acceptance</h2>
            <p className="text-text-secondary">
              By accessing or using Unishare, you agree to be bound by these Terms of Service. If
              you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">2. Use of the Platform</h2>
            <p className="text-text-secondary">
              Unishare is a platform for university students to share academic materials including
              lecture notes, past papers, and study guides. You may only use the platform for
              lawful, educational purposes.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">3. User Content</h2>
            <p className="text-text-secondary">
              You are solely responsible for the content you upload. By uploading content, you
              confirm that you have the right to share it and that it does not violate any
              copyright, intellectual property, or university policy. We reserve the right to remove
              any content that violates these terms.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">4. Prohibited Conduct</h2>
            <p className="text-text-secondary mb-2">You agree not to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>Upload content you do not have rights to share</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Use the platform to distribute malware or harmful content</li>
              <li>Impersonate other users or university staff</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">5. Account Suspension</h2>
            <p className="text-text-secondary">
              We reserve the right to suspend or terminate accounts that violate these terms,
              without prior notice.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">6. Disclaimer</h2>
            <p className="text-text-secondary">
              Unishare is provided as-is. We do not guarantee the accuracy, completeness, or
              usefulness of any content shared on the platform. Use at your own discretion.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">7. Changes</h2>
            <p className="text-text-secondary">
              We may update these terms at any time. Continued use of the platform after changes
              constitutes acceptance of the new terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
