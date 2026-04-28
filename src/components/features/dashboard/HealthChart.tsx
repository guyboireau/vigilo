import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { HealthCheck } from '@/types'

interface HealthChartProps {
  checks: HealthCheck[]
}

const statusColor: Record<string, string> = {
  success: 'bg-emerald-500',
  failure: 'bg-red-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  running: 'bg-blue-500',
  unknown: 'bg-muted-foreground/30',
  no_ci: 'bg-muted-foreground/30',
  not_found: 'bg-muted-foreground/30',
}

function computeOverall(c: HealthCheck): string {
  const statuses = [c.github_status, c.gitlab_status, c.vercel_status, c.cloudflare_status].filter(Boolean)
  if (statuses.includes('failure') || statuses.includes('error')) return 'failure'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.includes('success')) return 'success'
  return 'unknown'
}

export default function HealthChart({ checks }: HealthChartProps) {
  if (!checks.length) return (
    <p className="text-xs text-muted-foreground italic">Aucun historique disponible</p>
  )

  const sorted = [...checks].reverse()

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historique ({checks.length} checks)</p>
      <div className="flex items-end gap-0.5 h-10">
        {sorted.map((c) => {
          const overall = computeOverall(c)
          return (
            <div
              key={c.id}
              className={cn('flex-1 rounded-sm min-w-[4px] h-full transition-opacity hover:opacity-80', statusColor[overall] ?? 'bg-muted-foreground/30')}
              title={`${formatDate(c.checked_at)} — ${overall}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatDate(sorted[0]?.checked_at)}</span>
        <span>{formatDate(sorted[sorted.length - 1]?.checked_at)}</span>
      </div>
    </div>
  )
}
