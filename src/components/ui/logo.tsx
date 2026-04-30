import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Cidar"
      width={size}
      height={size}
      className={cn('rounded-lg object-cover', className)}
      style={{ width: size, height: size }}
    />
  )
}
