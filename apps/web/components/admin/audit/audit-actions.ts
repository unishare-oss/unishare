import {
  Ban,
  CheckCircle2,
  FileX,
  KeyRound,
  LogIn,
  MessageSquareX,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { AuditLogEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export type AuditCategoryFilter = 'ALL' | 'report' | 'post' | 'comment' | 'user' | 'auth'

export const AUDIT_CATEGORY_FILTERS: { value: AuditCategoryFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'report', label: 'Reports' },
  { value: 'post', label: 'Posts' },
  { value: 'comment', label: 'Comments' },
  { value: 'user', label: 'Users' },
  { value: 'auth', label: 'Sign-ins' },
]

type Tone = 'destructive' | 'success' | 'amber' | 'muted'

interface ActionMeta {
  label: string
  icon: LucideIcon
  tone: Tone
}

const ACTIONS: Record<string, ActionMeta> = {
  'report.approve': { label: 'Removed reported post', icon: CheckCircle2, tone: 'destructive' },
  'report.reject': { label: 'Dismissed report', icon: XCircle, tone: 'muted' },
  'post.delete': { label: 'Deleted post', icon: FileX, tone: 'destructive' },
  'post.status_change': { label: 'Changed post status', icon: RefreshCw, tone: 'amber' },
  'comment.delete': { label: 'Deleted comment', icon: MessageSquareX, tone: 'destructive' },
  'user.set_role': { label: 'Changed role', icon: ShieldCheck, tone: 'amber' },
  'user.ban': { label: 'Banned user', icon: Ban, tone: 'destructive' },
  'user.unban': { label: 'Unbanned user', icon: UserCheck, tone: 'success' },
  'user.delete': { label: 'Deleted account', icon: UserX, tone: 'destructive' },
  'user.delete_via_uniauth': {
    label: 'Account deleted in uniauth',
    icon: UserX,
    tone: 'destructive',
  },
  'user.consent': { label: 'Accepted terms', icon: KeyRound, tone: 'muted' },
  'auth.sign_in': { label: 'Signed in', icon: LogIn, tone: 'muted' },
}

export const TONE_CLASS: Record<Tone, string> = {
  destructive: 'text-destructive',
  success: 'text-success',
  amber: 'text-amber',
  muted: 'text-text-muted',
}

export function actionMeta(action: string): ActionMeta {
  return ACTIONS[action] ?? { label: action, icon: RefreshCw, tone: 'muted' }
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** The one-line "what happened to what", shown under the action label. */
export function describeEntry(entry: AuditLogEntity): string | null {
  const m = entry.metadata ?? {}
  switch (entry.action) {
    case 'user.set_role':
      return `${str(m.targetName) ?? 'user'}: ${str(m.from) ?? '?'} → ${str(m.to) ?? '?'}`
    case 'user.ban':
    case 'user.unban':
      return str(m.targetName)
    case 'user.delete':
      return m.self ? 'Deleted their own account' : str(m.targetName)
    case 'post.status_change':
      return `${str(m.title) ?? '(Untitled)'}: ${str(m.from) ?? '?'} → ${str(m.to) ?? '?'}`
    case 'post.delete':
      return str(m.title) ?? '(Untitled)'
    case 'report.approve':
    case 'report.reject':
      return str(m.reason) ? `Reason: ${String(m.reason).toLowerCase()}` : null
    default:
      return null
  }
}

/** Where the target lives in the app, if it still can be opened. */
export function targetHref(entry: AuditLogEntity): string | null {
  const m = entry.metadata ?? {}
  if (entry.action === 'user.delete' || entry.action === 'user.delete_via_uniauth') return null
  if (entry.targetType === 'post' && entry.targetId) return `/posts/${entry.targetId}`
  if (entry.targetType === 'user' && entry.targetId) return `/users/${entry.targetId}`
  const postId = str(m.postId)
  return postId ? `/posts/${postId}` : null
}
