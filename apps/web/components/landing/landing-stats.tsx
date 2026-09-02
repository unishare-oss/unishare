export function LandingStats() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { k: 'Course-aware', v: 'Search & filters', sub: 'Dept → Course → Module' },
            { k: 'Real-time', v: 'Chat & boards', sub: 'Socket.IO live cursors' },
            {
              k: 'Private by default',
              v: 'Your cohort only',
              sub: 'University allow-list & SSO',
            },
          ].map((s) => (
            <div key={s.v} className="text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
                {s.k}
              </p>
              <p className="mt-1 text-xl font-black tracking-tight">{s.v}</p>
              <p className="font-mono text-xs text-text-muted">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
