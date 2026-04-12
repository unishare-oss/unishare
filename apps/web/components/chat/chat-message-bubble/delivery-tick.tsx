import { Check, CheckCheck } from 'lucide-react'
import type { DeliveryStatus } from '@/hooks/use-chat-mutations'

export function DeliveryTick({ status }: { status: DeliveryStatus }) {
  if (status === 'sending') {
    return <Check className="size-3 text-primary-foreground/35 shrink-0" />
  }
  if (status === 'seen') {
    return <CheckCheck className="size-3 text-emerald-400 shrink-0" />
  }
  return <CheckCheck className="size-3 text-primary-foreground/60 shrink-0" />
}
