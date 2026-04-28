import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { HealthStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

export function statusColor(status: HealthStatus | null): string {
  switch (status) {
    case 'success': return 'text-emerald-500'
    case 'failure': return 'text-red-500'
    case 'warning': return 'text-amber-500'
    case 'running': return 'text-blue-500'
    default: return 'text-muted-foreground'
  }
}

export function statusBgColor(status: HealthStatus | null): string {
  switch (status) {
    case 'success': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'failure': return 'bg-red-500/10 text-red-600 border-red-500/20'
    case 'warning': return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    case 'running': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

export function overallStatus(check: { github_status: HealthStatus | null; gitlab_status: HealthStatus | null; vercel_status: HealthStatus | null; cloudflare_status: HealthStatus | null } | null): HealthStatus {
  if (!check) return 'unknown'
  const statuses = [check.github_status, check.gitlab_status, check.vercel_status, check.cloudflare_status].filter(Boolean) as HealthStatus[]
  if (statuses.includes('failure')) return 'failure'
  if (statuses.includes('warning')) return 'warning'
  if (statuses.includes('running')) return 'running'
  if (statuses.length === 0) return 'unknown'
  return 'success'
}
