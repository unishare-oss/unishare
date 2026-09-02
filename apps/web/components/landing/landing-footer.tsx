import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GithubIcon } from './github-icon'

export function LandingFooter() {
  return (
    <footer className="border-t-2 border-border-strong bg-card">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/icon.svg"
                alt=""
                width={28}
                height={28}
                className="rounded-[7px] border border-border-strong/10"
              />
              <span className="font-mono text-base font-black tracking-tight">Unishare</span>
            </Link>
            <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-text-secondary">
              An open-source academic content sharing platform for university students — share
              notes, past papers and resources with your department.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href="https://github.com/unishare-oss/unishare"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-xl border-2 border-border-strong bg-card shadow-[2px_2px_0_0_var(--shadow-color)] hover:translate-y-px hover:shadow-[1px_1px_0_0_var(--shadow-color)]"
                aria-label="GitHub"
              >
                <GithubIcon className="size-4" />
              </a>
              <Link
                href="/changelog"
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border-strong bg-card px-3 py-2 font-mono text-xs font-bold shadow-[2px_2px_0_0_var(--shadow-color)]"
              >
                Changelog
              </Link>
              <span className="rounded-full bg-success/15 px-2.5 py-1 font-mono text-xs font-bold text-success">
                MIT
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm font-medium text-text-secondary">
              <li>
                <Link
                  href="/feed"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Feed
                </Link>
              </li>
              <li>
                <Link
                  href="/boards"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Boards
                </Link>
              </li>
              <li>
                <Link
                  href="/chat"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Chat
                </Link>
              </li>
              <li>
                <Link
                  href="/quizzes"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Quizzes
                </Link>
              </li>
              <li>
                <Link
                  href="/departments"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Departments
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Resources</h3>
            <ul className="mt-3 space-y-2 text-sm font-medium text-text-secondary">
              <li>
                <a
                  href="https://github.com/unishare-oss/unishare#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Documentation
                </a>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Changelog
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/unishare-oss/unishare/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Report an issue
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/unishare-oss/unishare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm font-medium text-text-secondary">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-foreground hover:underline underline-offset-4"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <span className="font-mono text-xs text-text-muted">
                  © {new Date().getFullYear()} Unishare
                </span>
              </li>
            </ul>
            <div className="mt-4 rounded-xl border-2 border-border-strong bg-amber-subtle p-3">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
                Stay in the loop
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Star us on GitHub — releases every week.
              </p>
              <Button asChild size="sm" className="mt-2 w-full rounded-full font-bold">
                <a
                  href="https://github.com/unishare-oss/unishare"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GithubIcon className="size-4" /> Star on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="font-mono text-xs text-text-muted">
            Built by students, for students. Self-hostable. Open source. Not affiliated with any
            university.
          </p>
        </div>
      </div>
    </footer>
  )
}
