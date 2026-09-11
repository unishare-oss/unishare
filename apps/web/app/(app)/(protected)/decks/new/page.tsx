'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DeckCreateForm } from '@/components/decks/deck-create-form'

export default function NewDeckPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="New deck"
        subtitle="Describe the topic and pick a look. Generation runs in the background."
      />

      <div className="flex-1 bg-card">
        <div className="max-w-3xl p-6 space-y-6">
          <Link
            href="/decks"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground transition-colors motion-reduce:transition-none w-fit"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            Back to decks
          </Link>

          <DeckCreateForm />
        </div>
      </div>
    </div>
  )
}
