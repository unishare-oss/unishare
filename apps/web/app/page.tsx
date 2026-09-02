import { LandingNav } from '@/components/landing/landing-nav'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingFeatures } from '@/components/landing/landing-features'
import { LandingHowItWorks } from '@/components/landing/landing-how-it-works'
import { LandingSelfHost } from '@/components/landing/landing-self-host'
import { LandingStats } from '@/components/landing/landing-stats'
import { LandingCta } from '@/components/landing/landing-cta'
import { LandingFooter } from '@/components/landing/landing-footer'

export const metadata = {
  title: 'Unishare — Every note, past paper and study guide, shared',
  description:
    "Every lecture note, past paper, and study guide — shared by students who've been there. Organized by course, enriched by discussion.",
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingSelfHost />
      <LandingStats />
      <LandingCta />
      <LandingFooter />
      <style>{`html{scroll-behavior:smooth}`}</style>
    </div>
  )
}
