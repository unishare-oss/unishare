'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/user-avatar'
import { useAuth } from '@/contexts/auth-context'
import { GithubIcon } from './github-icon'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Boards', href: '#boards' },
  { label: 'Self-host', href: '#self-host' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)
  const { user, session, isAuthenticated } = useAuth()

  const displayUser =
    user ?? (session?.user as { name?: string | null; image?: string | null } | null) ?? null

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Image
              src="/icon.svg"
              alt="Unishare"
              width={32}
              height={32}
              className="rounded-[8px] border border-border-strong/10"
            />
            <span className="font-mono text-[17px] font-black tracking-tight">Unishare</span>
            <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-text-muted">
              OSS
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <a
              href="https://github.com/unishare-oss/unishare"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-accent hover:text-foreground"
            >
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </nav>
        </div>

        {/* Right */}
        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated && displayUser ? (
            <Link
              href="/profile"
              aria-label={`Go to profile — ${displayUser.name ?? 'User'}`}
              className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <UserAvatar
                name={displayUser.name ?? 'User'}
                image={displayUser.image}
                size="md"
                priority
              />
            </Link>
          ) : (
            <Button asChild variant="ghost" size="sm" className="rounded-full font-bold">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            className="rounded-full gap-1.5 pr-3 font-bold shadow-[2px_2px_0_0_var(--shadow-color)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Link href="/feed">
              Browse feed <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Mobile */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-xl border-2 border-transparent text-foreground hover:bg-accent lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border bg-card lg:hidden">
          <nav className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-semibold hover:bg-accent"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="https://github.com/unishare-oss/unishare"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-accent"
              >
                <GithubIcon className="size-4" /> GitHub
              </a>
              <div className="mt-3 flex gap-2 border-t border-border pt-4">
                {isAuthenticated && displayUser ? (
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    aria-label={`Go to profile — ${displayUser.name ?? 'User'}`}
                    className="flex flex-1 items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-2 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <UserAvatar
                      name={displayUser.name ?? 'User'}
                      image={displayUser.image}
                      size="md"
                      priority
                    />
                    <span className="truncate text-sm">{displayUser.name ?? 'Profile'}</span>
                  </Link>
                ) : (
                  <Button asChild variant="outline" className="flex-1 rounded-full">
                    <Link href="/login" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                )}
                <Button asChild className="flex-1 rounded-full">
                  <Link href="/feed" onClick={() => setOpen(false)}>
                    Browse feed
                  </Link>
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
