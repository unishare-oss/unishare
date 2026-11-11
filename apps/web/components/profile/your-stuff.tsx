'use client'

import Link from 'next/link'
import { MessageSquareHeart } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  buildModerationNavigation,
  phoneOnlyStuffNavigation,
  yourStuffNavigation,
  type NavigationItem,
} from '@/components/navigation/navigation-config'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

function StuffLink({ item }: { item: NavigationItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <item.icon className="size-5 shrink-0" strokeWidth={1.5} />
      {item.label}
    </Link>
  )
}

/**
 * Profile → "Your stuff". On desktop the sidebar holds the rest, so the phone-only
 * block, the moderation list and the feedback button show below md.
 */
export function YourStuff() {
  const { session } = useAuth()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const moderation = buildModerationNavigation(session?.user.role)

  return (
    <section aria-labelledby="your-stuff" className="space-y-4">
      <h2
        id="your-stuff"
        className="font-mono text-[11px] font-bold uppercase tracking-widest text-text-muted"
      >
        Your stuff
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {yourStuffNavigation.map((item) => (
          <StuffLink key={item.href} item={item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
        {phoneOnlyStuffNavigation.map((item) => (
          <StuffLink key={item.href} item={item} />
        ))}
        <ThemeToggle className="rounded-xl border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground" />
      </div>

      {moderation.length > 0 && (
        <div className="space-y-2 md:hidden">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Moderation
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {moderation.map((item) => (
              <StuffLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      )}

      <Button
        variant="quiet"
        className="w-full justify-start md:hidden"
        onClick={() => setFeedbackOpen(true)}
      >
        <MessageSquareHeart className="size-4" strokeWidth={1.5} />
        Feedback or bug report
      </Button>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </section>
  )
}
