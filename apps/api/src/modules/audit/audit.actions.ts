/** Every action written to the audit log. Dotted `<target>.<verb>` so the UI can group them. */
export const AuditAction = {
  ReportApprove: 'report.approve',
  ReportReject: 'report.reject',
  PostDelete: 'post.delete',
  PostStatusChange: 'post.status_change',
  CommentDelete: 'comment.delete',
  UserSetRole: 'user.set_role',
  UserBan: 'user.ban',
  UserUnban: 'user.unban',
  UserDelete: 'user.delete',
  UserDeleteViaUniauth: 'user.delete_via_uniauth',
  UserConsent: 'user.consent',
  AuthSignIn: 'auth.sign_in',
} as const

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction]

export const AUDIT_ACTIONS = Object.values(AuditAction) as AuditActionValue[]

/** The `<target>` half of an action, for filtering a whole group at once. */
export const AUDIT_CATEGORIES = ['report', 'post', 'comment', 'user', 'auth'] as const

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]

/** Audit rows older than this are pruned nightly. */
export const AUDIT_RETENTION_DAYS = 180
