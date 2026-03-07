'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { authClient } from '@/src/lib/auth/client'

type Provider = 'google' | 'microsoft'

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'microsoft', label: 'Microsoft' },
]

export function ConnectedAccountsCard() {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<string | null>(null)

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => authClient.listAccounts().then((r) => r.data),
  })

  type Account = { providerId: string; createdAt: string | Date }
  const accountMap = new Map(accounts?.map((a: Account) => [a.providerId, a]) ?? [])

  async function handleUnlink(providerId: Provider) {
    setPending(providerId)
    await authClient.unlinkAccount({ providerId })
    setPending(null)
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }

  function handleLink(provider: Provider) {
    authClient.linkSocial({ provider, callbackURL: window.location.href })
  }

  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-8">
      <div className="border-b border-border pb-3 mb-5">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          Connected Accounts
        </h3>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {PROVIDERS.map(({ id, label }) => {
            const account = accountMap.get(id)
            console.log(account)
            const linked = !!account
            return (
              <div key={id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-foreground">{label}</span>
                  {account && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Connected {new Date(account.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {linked ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending === id}
                    onClick={() => handleUnlink(id)}
                  >
                    {pending === id ? 'Unlinking...' : 'Unlink'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending === id}
                    onClick={() => handleLink(id)}
                  >
                    Link
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
