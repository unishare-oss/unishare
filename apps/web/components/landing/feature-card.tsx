type FeatureCardProps = {
  icon: React.ElementType
  title: string
  desc: string
  accent: string
}

export function FeatureCard({ icon: Icon, title, desc, accent }: FeatureCardProps) {
  return (
    <div className="card-pop card-pop-hover flex flex-col gap-4 rounded-2xl bg-card p-6">
      <div
        className="flex size-11 items-center justify-center rounded-xl border-2 border-border text-card-foreground"
        style={{ background: accent }}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="text-[15px] font-black tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{desc}</p>
      </div>
    </div>
  )
}
