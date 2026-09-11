import {
  Bookmark,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  MessageCircle,
  UploadCloud,
} from 'lucide-react'
import { FeatureCard } from './feature-card'

export function LandingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-amber">
          Why UniShare
        </p>
        <h2 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl">
          Built for how you study, not how files are stored
        </h2>
        <p className="mx-auto mt-3 max-w-[60ch] text-sm leading-relaxed text-text-secondary sm:text-base">
          Everything you need to share, find and actually learn from each other — in one calm,
          searchable place.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Layers}
          title="Organized by course & year"
          desc="Every post is tied to a department, course and module. Filter to exactly your year — no more hunting in Drive folders."
          accent="var(--amber)"
        />
        <FeatureCard
          icon={UploadCloud}
          title="Fast uploads & previews"
          desc="Drop PDFs, slides or docs. Instant previews, view counts and course-aware suggestions while you type."
          accent="var(--info)"
        />
        <FeatureCard
          icon={LayoutDashboard}
          title="Collaborative boards"
          desc="Sketch, pin references and map topics together on an infinite canvas. E2E-encrypted, live cursors included."
          accent="var(--type-exam)"
        />
        <FeatureCard
          icon={MessageCircle}
          title="Cohort chat & threads"
          desc="Course-group chats and post comments keep discussion where the material lives — searchable later."
          accent="var(--type-exercise)"
        />
        <FeatureCard
          icon={ClipboardCheck}
          title="Quizzes & practice"
          desc="Turn any set of notes into practice quizzes. Spaced repetition friendly, results stay private."
          accent="var(--success)"
        />
        <FeatureCard
          icon={Bookmark}
          title="Saves, reactions & trending"
          desc="Bookmark for later, react to help others surface the best, and follow the weekly trending board."
          accent="var(--amber)"
        />
      </div>
    </section>
  )
}
