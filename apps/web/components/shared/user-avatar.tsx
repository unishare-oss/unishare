import { cn } from '@/lib/utils'

const sizeClasses = {
  xs: 'w-5 h-5 rounded-[4px] text-[9px]',
  sm: 'w-6 h-6 rounded-[4px] text-[9px]',
  md: 'w-8 h-8 rounded-[6px] text-xs',
  lg: 'w-[72px] h-[72px] rounded-[6px] text-xl',
}

interface UserAvatarProps {
  name: string
  image?: string | null
  size: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ name, image, size, className }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
  return (
    <div
      className={cn(
        sizeClasses[size],
        'bg-border flex items-center justify-center font-mono font-medium text-foreground overflow-hidden',
        className,
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}
