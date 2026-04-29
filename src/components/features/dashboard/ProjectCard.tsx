import { GitBranch, GitFork, Globe, Cloud, RefreshCw, Trash2, Pencil } from 'lucide-react'
import { cn, formatRelative, statusBgColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import StatusBadge from './StatusBadge'
import type { HealthStatus } from '@/types'

interface ProjectCardProps {
  id: string
  name: string
  githubOwner?: string | null
  githubRepo?: string | null
  gitlabNamespace?: string | null
  gitlabProject?: string | null
  vercelProjectId?: string | null
  cloudflareZoneId?: string | null
  cloudflareWorkerName?: string | null
  githubStatus?: HealthStatus | null
  gitlabStatus?: HealthStatus | null
  vercelStatus?: HealthStatus | null
  cloudflareStatus?: HealthStatus | null
  overallStatus?: HealthStatus | null
  checkedAt?: string | null
  onRefresh?: () => void
  onDelete?: () => void
  onEdit?: () => void
  onCardClick?: () => void
  refreshing?: boolean
}

const overallBorder: Record<string, string> = {
  success: 'border-emerald-500/30',
  failure: 'border-red-500/40',
  warning: 'border-amber-500/30',
  running: 'border-blue-500/30',
}

export default function ProjectCard({
  name, githubOwner, githubRepo, gitlabNamespace, gitlabProject, vercelProjectId, cloudflareWorkerName,
  githubStatus, gitlabStatus, vercelStatus, cloudflareStatus, overallStatus,
  checkedAt, onRefresh, onDelete, onEdit, onCardClick, refreshing,
}: ProjectCardProps) {
  const borderClass = overallStatus ? (overallBorder[overallStatus] ?? 'border-border') : 'border-border'

  const services = [
    { icon: GitBranch, label: 'GitHub', status: githubStatus, show: !!githubRepo, url: githubOwner && githubRepo ? `https://github.com/${githubOwner}/${githubRepo}` : undefined },
    { icon: GitFork, label: 'GitLab', status: gitlabStatus, show: !!gitlabProject, url: gitlabNamespace && gitlabProject ? `https://gitlab.com/${gitlabNamespace}/${gitlabProject}` : undefined },
    { icon: Globe, label: 'Vercel', status: vercelStatus, show: !!vercelProjectId, url: vercelProjectId ? `https://vercel.com/guyboireaus-projects/${vercelProjectId}` : undefined },
    { icon: Cloud, label: 'Cloudflare', status: cloudflareStatus, show: !!(cloudflareWorkerName) },
  ].filter(s => s.show)

  return (
    <div
      className={cn('rounded-lg border bg-card p-4 flex flex-col gap-3 transition-colors', borderClass, onCardClick && 'cursor-pointer hover:bg-muted/30')}
      onClick={onCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          {checkedAt && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelative(checkedAt)}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {overallStatus && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
              statusBgColor(overallStatus)
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', {
                'bg-emerald-500 animate-pulse-slow': overallStatus === 'success',
                'bg-red-500': overallStatus === 'failure',
                'bg-amber-500': overallStatus === 'warning',
                'bg-blue-500': overallStatus === 'running',
                'bg-muted-foreground': !['success','failure','warning','running'].includes(overallStatus),
              })} />
              {overallStatus === 'success' ? 'Nominal' :
               overallStatus === 'failure' ? 'Erreur' :
               overallStatus === 'warning' ? 'Warning' :
               overallStatus === 'running' ? 'En cours' : '—'}
            </span>
          )}
        </div>
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {services.map(({ icon: Icon, label, status, url }) => (
            <div key={label} className="flex items-center gap-1">
              <Icon className="h-3 w-3 text-muted-foreground" />
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  <StatusBadge status={status ?? 'unknown'} label={label} />
                </a>
              ) : (
                <StatusBadge status={status ?? 'unknown'} label={label} />
              )}
            </div>
          ))}
        </div>
      )}

      {services.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Aucun service configuré</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/50" onClick={e => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
          loading={refreshing}
        >
          <RefreshCw className="h-3 w-3" />
          Vérifier
        </Button>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
            Modifier
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-destructive ml-auto"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
