import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Unishare collects, uses, and protects your personal information.',
  openGraph: {
    title: 'Privacy Policy | Unishare',
    description: 'Learn how Unishare collects, uses, and protects your personal information.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Unishare' }],
  },
}

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
            <p className="text-text-secondary">
              This Privacy Policy explains how Unishare (&quot;we&quot;, &quot;us&quot;, or
              &quot;our&quot;) collects, uses, discloses, and protects your personal data in
              accordance with Thailand&apos;s Personal Data Protection Act B.E. 2562 (PDPA) and
              applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">1. Data Controller</h2>
            <p className="text-text-secondary">
              The operator of this Unishare instance acts as the data controller. For questions
              about your personal data, contact the platform administrator via the email address
              provided during account setup or displayed in the platform footer.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">2. Personal Data We Collect</h2>
            <p className="text-text-secondary mb-2">
              We collect the following categories of personal data:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>
                <span className="font-medium text-foreground">Identity data:</span> name and profile
                picture (from Google/Microsoft or provided directly)
              </li>
              <li>
                <span className="font-medium text-foreground">Contact data:</span> email address
              </li>
              <li>
                <span className="font-medium text-foreground">Academic data:</span> department and
                enrollment year (optional)
              </li>
              <li>
                <span className="font-medium text-foreground">Content data:</span> posts, uploaded
                files, comments, and reactions you create
              </li>
              <li>
                <span className="font-medium text-foreground">Usage data:</span> post views, saved
                posts, reading lists, follow relationships
              </li>
              <li>
                <span className="font-medium text-foreground">Technical data:</span> session tokens,
                login timestamps, IP address (for security)
              </li>
              <li>
                <span className="font-medium text-foreground">Consent record:</span> timestamp of
                when you consented to this policy
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">3. Lawful Basis for Processing</h2>
            <p className="text-text-secondary mb-2">
              We process your personal data on the following lawful bases under PDPA Section 24:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>
                <span className="font-medium text-foreground">Consent (Section 24(1)):</span>{' '}
                collected at account registration for data processing activities described in this
                policy
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Contractual necessity (Section 24(3)):
                </span>{' '}
                to provide the platform services you have signed up for
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Legitimate interests (Section 24(5)):
                </span>{' '}
                platform security, fraud prevention, and abuse detection
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">4. How We Use Your Data</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>Operate and maintain the Unishare platform</li>
              <li>Display your name and profile on content you share</li>
              <li>
                Send account-related notifications (new comments, reactions, moderation outcomes)
              </li>
              <li>Enforce our Terms of Service and maintain platform safety</li>
              <li>Generate anonymised aggregate statistics for administrators</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">5. Data Sharing and Disclosure</h2>
            <p className="text-text-secondary mb-2">
              We do not sell your personal data. Data may be shared with:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>
                <span className="font-medium text-foreground">Other users:</span> your name, profile
                picture, department, and content you post are visible to other platform users
              </li>
              <li>
                <span className="font-medium text-foreground">Service providers:</span> cloud
                storage (file hosting) and email delivery, under data processing agreements
              </li>
              <li>
                <span className="font-medium text-foreground">Legal obligations:</span> when
                required by Thai law or a competent authority
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">6. Data Retention</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-text-secondary">
              <li>
                <span className="font-medium text-foreground">Account data:</span> retained while
                your account is active and deleted within 30 days of account deletion
              </li>
              <li>
                <span className="font-medium text-foreground">Content (posts, comments):</span>{' '}
                deleted with your account; anonymised soft-deleted copies may be retained for up to
                90 days for abuse investigation
              </li>
              <li>
                <span className="font-medium text-foreground">Security logs:</span> retained for up
                to 12 months
              </li>
              <li>
                <span className="font-medium text-foreground">Consent records:</span> retained for 3
                years after account deletion as required by PDPA
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">7. Cookies and Sessions</h2>
            <p className="text-text-secondary">
              We use strictly necessary session cookies to keep you signed in. Session cookies
              expire after 7 days of inactivity. We do not use advertising or third-party tracking
              cookies. No cookie consent banner is required for strictly necessary cookies under
              PDPA.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">8. File Storage</h2>
            <p className="text-text-secondary">
              Files you upload are stored in cloud object storage. Access is controlled via
              short-lived signed URLs. Files are deleted when you delete your account or the
              associated post.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-3">9. Your Rights Under PDPA</h2>
            <p className="text-text-secondary mb-3">
              As a data subject under Thailand&apos;s PDPA, you have the following rights:
            </p>
            <div className="flex flex-col gap-3">
              {[
                {
                  right: 'Right to be informed',
                  desc: 'To know what data we hold and how we use it — covered by this policy.',
                },
                {
                  right: 'Right of access',
                  desc: 'To obtain a copy of your personal data. Use the "Download my data" option in your profile settings.',
                },
                {
                  right: 'Right to rectification',
                  desc: 'To correct inaccurate data. Update your profile directly in settings.',
                },
                {
                  right: 'Right to erasure',
                  desc: 'To request deletion of your account and personal data. Use "Delete account" in profile settings.',
                },
                {
                  right: 'Right to data portability',
                  desc: 'To receive your data in a machine-readable format. Use "Download my data" in profile settings.',
                },
                {
                  right: 'Right to object',
                  desc: 'To object to processing based on legitimate interests. Contact us at the address in Section 1.',
                },
                {
                  right: 'Right to withdraw consent',
                  desc: 'To withdraw consent at any time without affecting prior processing. Delete your account or contact us.',
                },
                {
                  right: 'Right to lodge a complaint',
                  desc: 'To file a complaint with the Personal Data Protection Committee (PDPC) of Thailand.',
                },
              ].map(({ right, desc }) => (
                <div key={right} className="pl-4 border-l-2 border-border">
                  <p className="font-medium text-foreground">{right}</p>
                  <p className="text-text-secondary mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-semibold mb-2">10. Security</h2>
            <p className="text-text-secondary">
              We implement appropriate technical and organisational measures to protect your
              personal data against unauthorised access, loss, or disclosure, including encrypted
              connections (HTTPS), hashed passwords, and access controls.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">11. Changes to This Policy</h2>
            <p className="text-text-secondary">
              We may update this policy from time to time. We will notify you of significant changes
              via a notice on the platform or by email. Continued use after notice constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">12. Contact</h2>
            <p className="text-text-secondary">
              To exercise your rights or ask questions about this policy, contact the platform
              administrator. We will respond to verified requests within 30 days as required by
              PDPA.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
