'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GitFork, LogOut, MessageSquareHeart } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  moderationItems,
  phoneOnlyNavigation,
  yourStuffNavigation,
  type NavigationItem,
} from '@/components/navigation/navigation-config'
import { signOut } from '@/src/lib/auth/sign-out'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'

const rowClass =
  'flex items-center gap-3 rounded-(--r-s) bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-[inset_0_0_0_2px_var(--line)] outline-none transition-colors hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/50'

function StuffLink({ item }: { item: NavigationItem }) {
  return (
    <Link href={item.href} className={rowClass}>
      <item.icon className="size-5 shrink-0" strokeWidth={2} />
      {item.label}
    </Link>
  )
}

const headingClass =
  'font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase'

/**
 * Profile's "Your stuff". Desktop's sidebar holds the rest, so below md it also lists what the
 * old More drawer held: the sidebar-only pages, Moderation, Feedback, GitHub and Sign out.
 */
export function YourStuff() {
  const { session } = useAuth()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const moderation = moderationItems(session?.user.role)

  return (
    <section aria-labelledby="your-stuff" className="grid gap-3">
      <h2 id="your-stuff" className={headingClass}>
        Your stuff
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {yourStuffNavigation.map((item) => (
          <StuffLink key={item.href} item={item} />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:hidden">
        {phoneOnlyNavigation.map((item) => (
          <StuffLink key={item.href} item={item} />
        ))}
      </div>

      {moderation.length > 0 && (
        <div className="grid gap-2 md:hidden">
          <h3 className={headingClass}>Moderation</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {moderation.map((item) => (
              <StuffLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 md:hidden">
        <button type="button" className={rowClass} onClick={() => setFeedbackOpen(true)}>
          <MessageSquareHeart className="size-5 shrink-0" strokeWidth={2} />
          Feedback or bug report
        </button>
        <a
          href="https://github.com/unishare-oss/unishare"
          target="_blank"
          rel="noopener noreferrer"
          className={rowClass}
        >
          <GitFork className="size-5 shrink-0" strokeWidth={2} />
          Open source · Contribute
        </a>
        <button type="button" className={rowClass} onClick={() => signOut()}>
          <LogOut className="size-5 shrink-0" strokeWidth={2} />
          Sign out
        </button>
      </div>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </section>
  )
}
