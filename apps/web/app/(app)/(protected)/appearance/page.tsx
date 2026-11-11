import { PageHeader } from '@/components/shared/page-header'
import { AppearanceCard } from '@/components/profile/appearance-card'

export default function AppearancePage() {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-var(--mobile-topbar-h,0px))]">
      <PageHeader title="Theme & Appearance" />
      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          <AppearanceCard />
        </div>
      </div>
    </div>
  )
}
