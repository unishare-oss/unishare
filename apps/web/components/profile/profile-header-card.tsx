import { Camera } from 'lucide-react'
import { UserAvatar } from '@/components/shared/user-avatar'
import type { User } from '@/lib/mock-data'

interface ProfileHeaderCardProps {
  user: User
}

export function ProfileHeaderCard({ user }: ProfileHeaderCardProps) {
  return (
    <div className="border border-border rounded-[6px] p-6 bg-card mb-6">
      <div className="flex items-start gap-5">
        <div className="relative group shrink-0">
          <UserAvatar name={user.name} size="lg" />
          <div className="absolute inset-0 rounded-[6px] bg-surface-dark/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150 cursor-pointer">
            <Camera className="size-5 text-card" strokeWidth={1.5} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
          <p className="font-mono text-sm text-text-muted mt-0.5">{user.email}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-[4px] text-foreground">
              {user.role}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-[4px] text-foreground">
              {user.department}
            </span>
          </div>
          <p
            className="font-mono text-[13px] text-amber mt-2 cursor-help"
            title="Based on enrollment year + academic calendar"
          >
            Year {user.yearLevel} Student
          </p>
        </div>
      </div>
    </div>
  )
}
