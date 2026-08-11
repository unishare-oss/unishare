'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

const scopeLabels: Record<string, string> = {
  'boards:read': 'View your boards',
  'boards:write': 'Create and edit your boards',
}

function McpConsentForm() {
  const params = useSearchParams()
  const consentCode = params.get('consent_code') ?? ''
  const clientId = params.get('client_id') ?? 'Unknown MCP client'
  const requestedScopes = useMemo(
    () => (params.get('scope') ?? '').split(' ').filter((scope) => scope in scopeLabels),
    [params],
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(accept: boolean) {
    if (!consentCode) {
      setError('This consent request is missing or invalid.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/auth/oauth2/consent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept, consent_code: consentCode }),
      })
      const result = (await response.json()) as {
        data?: { redirectURI?: string }
        redirectURI?: string
        message?: string
      }
      const redirectURI = result.data?.redirectURI ?? result.redirectURI
      if (!response.ok || !redirectURI) throw new Error(result.message ?? 'Consent failed')
      window.location.assign(redirectURI)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Consent failed')
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <section className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Connect an MCP client</h1>
        <p className="mt-2 text-sm text-text-secondary">
          <span className="font-medium text-foreground">{clientId}</span> wants access to UniShare.
          Review what it may do.
        </p>

        <div className="mt-6 space-y-3">
          {requestedScopes.map((scope) => (
            <div key={scope} className="flex items-start gap-3 rounded-md border border-border p-3">
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {scopeLabels[scope]}
                </span>
                <span className="text-xs text-text-muted">{scope}</span>
              </span>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" disabled={submitting} onClick={() => submit(false)}>
            Deny
          </Button>
          <Button disabled={submitting} onClick={() => submit(true)}>
            {submitting ? 'Connecting…' : 'Allow'}
          </Button>
        </div>
      </section>
    </main>
  )
}

export default function McpConsentPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <McpConsentForm />
    </Suspense>
  )
}
