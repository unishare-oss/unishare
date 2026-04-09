'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { authClient } from '@/src/lib/auth/client'
import { usersControllerSetPassword } from '@/src/lib/api/generated/users/users'

type Provider = 'google' | 'microsoft'

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'microsoft', label: 'Microsoft' },
]

const setPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SetPasswordValues = z.infer<typeof setPasswordSchema>

export function ConnectedAccountsCard() {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<string | null>(null)
  const [setPasswordOpen, setSetPasswordOpen] = useState(false)
  const [serverError, setServerError] = useState('')

  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  })

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => authClient.listAccounts().then((r) => r.data),
  })

  type Account = { providerId: string; createdAt: string | Date }
  const accountMap = new Map(accounts?.map((a: Account) => [a.providerId, a]) ?? [])
  const hasPassword = accountMap.has('credential')
  const canUnlink = (accounts?.length ?? 0) > 1

  async function handleUnlink(providerId: Provider) {
    setPending(providerId)
    await authClient.unlinkAccount({ providerId })
    setPending(null)
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }

  function handleLink(provider: Provider) {
    authClient.linkSocial({ provider, callbackURL: window.location.href })
  }

  async function onSetPassword({ newPassword }: SetPasswordValues) {
    setServerError('')
    try {
      await usersControllerSetPassword({ newPassword })
      setSetPasswordOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to set password'
      setServerError(msg)
    }
  }

  function handleDialogChange(open: boolean) {
    setSetPasswordOpen(open)
    if (!open) {
      form.reset()
      setServerError('')
    }
  }

  return (
    <>
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
              const linked = !!account
              const isLastMethod = linked && !canUnlink
              return (
                <div key={id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-foreground">{label}</span>
                    {account && (
                      <p className="text-xs text-text-muted mt-0.5">
                        Connected {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    )}
                    {isLastMethod && !hasPassword && (
                      <p className="text-xs text-text-muted mt-0.5">
                        Set a password first to unlink
                      </p>
                    )}
                  </div>
                  {linked ? (
                    <div className="flex items-center gap-2">
                      {isLastMethod && !hasPassword && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSetPasswordOpen(true)}
                        >
                          Set password
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending === id || isLastMethod}
                        onClick={() => handleUnlink(id)}
                      >
                        {pending === id ? 'Unlinking...' : 'Unlink'}
                      </Button>
                    </div>
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

      <Dialog open={setPasswordOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set a password</DialogTitle>
            <DialogDescription>
              Add a password to your account so you can sign in without a social provider.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSetPassword)} className="flex flex-col gap-4 pt-2">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                      New Password
                    </label>
                    <FormControl>
                      <Input type="password" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
                      Confirm Password
                    </label>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {serverError && <p className="text-xs text-destructive">{serverError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Setting...' : 'Set Password'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
