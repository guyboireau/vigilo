import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: number
  icon: LucideIcon
  color: 'success' | 'warning' | 'error' | 'neutral'
  bar?: number
}

const colorMap = {
  success: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', border: 'border-emerald-500/20' },
  warning: { text: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500', border: 'border-amber-500/20' },
  error: { text: 'text-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500', border: 'border-red-500/20' },
  neutral: { text: 'text-blue-500', bg: 'bg-blue-500/10', bar: 'bg-blue-500', border: 'border-blue-500/20' },
}

export default function KpiCard({ label, value, icon: Icon, color, bar }: KpiCardProps) {
  const c = colorMap[color]

  return (
    <div className={cn('relative overflow-hidden rounded-lg border bg-card p-4', c.border)}>
      {bar !== undefined && (
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-border">
          <div className={cn('h-full transition-all', c.bar)} style={{ width: `${bar}%` }} />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn('text-3xl font-bold mt-1', c.text)}>{value}</p>
        </div>
        <div className={cn('rounded-md p-2', c.bg)}>
          <Icon className={cn('h-4 w-4', c.text)} />
        </div>
      </div>
    </div>
  )
}
