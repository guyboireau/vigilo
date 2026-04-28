import { CheckCircle2, XCircle, AlertTriangle, Loader2, MinusCircle } from 'lucide-react'
import { cn, statusBgColor } from '@/lib/utils'
import type { HealthStatus } from '@/types'

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  failure: XCircle,
  warning: AlertTriangle,
  running: Loader2,
}

interface StatusBadgeProps {
  status: HealthStatus | null
  label?: string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const Icon = status ? (icons[status] ?? MinusCircle) : MinusCircle

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        statusBgColor(status)
      )}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', status === 'running' && 'animate-spin')} />
      {label ?? statusLabel(status)}
    </span>
  )
}

function statusLabel(status: HealthStatus | null): string {
  switch (status) {
    case 'success': return 'OK'
    case 'failure': return 'Erreur'
    case 'warning': return 'Warning'
    case 'running': return 'En cours'
    case 'no_ci': return 'Pas de CI'
    case 'not_found': return 'Introuvable'
    case 'error': return 'Erreur'
    default: return '—'
  }
}
