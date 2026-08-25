import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GithubIcon } from './github-icon'

export function LandingSelfHost() {
  return (
    <section id="self-host" className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
            Self-host • Open source
          </p>
          <h2 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            Your university. Your data. Your deploy.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            One Docker Compose file. Bring your Postgres, your S3 and your IdP. No lock-in, no data
            mining — just a well-lit place for students to learn together.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
              MIT License
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
              Docker ready
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
              S3 / R2 storage
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs font-bold">
              Postgres + Redis
            </span>
          </div>
          <div className="mt-6 flex gap-3">
            <Button asChild className="rounded-full">
              <a
                href="https://github.com/unishare-oss/unishare"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="size-4" /> View on GitHub
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-card">
              <Link href="/changelog">Release notes</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-[20px] border-2 border-border-strong bg-card p-3 shadow-[6px_6px_0_0_var(--shadow-color)] sm:p-4">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="size-3 rounded-full bg-destructive" />
            <span className="size-3 rounded-full bg-amber" />
            <span className="size-3 rounded-full bg-success" />
            <span className="ml-auto rounded bg-muted px-2 py-1 font-mono text-[11px] font-bold text-text-muted">
              bash — unishare
            </span>
          </div>
          <div className="rounded-xl bg-surface-dark p-4 font-mono text-[13px] leading-relaxed text-[#F7F3EE] sm:p-5">
            <div className="space-y-3">
              <div>
                <p className="text-white/40"># 1. Clone & configure</p>
                <p>
                  <span className="text-success">$</span> git clone
                  https://github.com/unishare-oss/unishare
                </p>
                <p>
                  <span className="text-success">$</span> cp apps/api/.env.example apps/api/.env
                </p>
                <p>
                  <span className="text-success">$</span> cp apps/web/.env.example apps/web/.env
                </p>
              </div>
              <div>
                <p className="text-white/40"># 2. Start everything</p>
                <p>
                  <span className="text-success">$</span> pnpm install
                </p>
                <p>
                  <span className="text-success">$</span> docker compose up -d
                </p>
                <p>
                  <span className="text-success">$</span> pnpm --filter api prisma migrate dev
                </p>
              </div>
              <div>
                <p className="text-white/40"># 3. Go</p>
                <p>
                  <span className="text-amber">→</span> web: http://localhost:3000
                </p>
                <p>
                  <span className="text-amber">→</span> api: http://localhost:3001/docs
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs">
              <span className="size-2 rounded-full bg-success animate-pulse" /> Self-host docs at{' '}
              <a
                href="https://github.com/unishare-oss/unishare#self-hosting"
                className="underline decoration-amber underline-offset-4"
              >
                /docs/self-host
              </a>
            </div>
          </div>
          <p className="px-2 pt-3 text-center font-mono text-xs text-text-muted">
            Deploy to Fly, Railway, Render or your own VPS — same compose file.
          </p>
        </div>
      </div>
    </section>
  )
}
