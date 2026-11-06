'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { uniauthPickUniversityURL } from '@/src/lib/auth/mode'

/** Shown instead of page content to a signed-in member whose uniauth account has no university. */
export function NoUniversityNotice() {
  const pathname = usePathname()

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold text-foreground">Pick your university</h1>
      <p className="text-sm text-text-muted">
        Unishare shows the posts, departments and people of your university. Pick it on your Unicorp
        account to continue.
      </p>
      <Button asChild className="self-start">
        <a href={uniauthPickUniversityURL(pathname ?? '/feed')}>Pick your university</a>
      </Button>
    </div>
  )
}
