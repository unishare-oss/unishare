import { LandingFeatureTour } from './landing-feature-tour'

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border bg-muted/30">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-text-muted">
            When there&apos;s no folder
          </p>
          <p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-amber">
            — we built our own campus
          </p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight sm:text-4xl">
            Tools that make sharing feel natural
          </h2>
        </div>

        <LandingFeatureTour />
      </div>
    </section>
  )
}
