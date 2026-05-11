import { ExternalLink, CheckCircle2, XCircle, AlertTriangle, MinusCircle, GitBranch, GitFork, Globe, Cloud, AlertOctagon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatRelative, formatDate, statusBgColor, statusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useProjectHealthHistory } from '@/hooks/useHealth'
import HealthChart from './HealthChart'
import type { HealthStatus, HealthCheckResult, HealthCheckRun } from '@/types'

function statusIcon(status: HealthStatus | null) {
  switch (status) {
    case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'failure': return <XCircle className="h-4 w-4 text-red-500" />
    case 'error': return <AlertOctagon className="h-4 w-4 text-red-500" />
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default: return <MinusCircle className="h-4 w-4 text-muted-foreground" />
  }
}

function statusLabelFull(status: HealthStatus | null): string {
  switch (status) {
    case 'success': return 'Nominal'
    case 'failure': return 'Échec'
    case 'error': return 'Erreur API'
    case 'warning': return 'Warning'
    case 'running': return 'En cours'
    case 'no_ci': return 'Pas de CI'
    case 'not_found': return 'Introuvable'
    case 'unknown': return 'Inconnu'
    default: return '—'
  }
}

interface ServiceSectionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  status: HealthStatus | null
  data: HealthCheckResult | null
  serviceUrl?: string
}

function groupRunsByBranch(runs: HealthCheckRun[]): Record<string, HealthCheckRun[]> {
  const groups: Record<string, HealthCheckRun[]> = {}
  for (const run of runs) {
    const branch = run.branch || 'default'
    if (!groups[branch]) groups[branch] = []
    groups[branch].push(run)
  }
  return groups
}

function ServiceSection({ icon: Icon, label, status, data, serviceUrl }: ServiceSectionProps) {
  if (!status) return null

  const hasError = status === 'failure' || status === 'error'
  const hasWarning = status === 'warning'

  return (
    <div className={cn(
      'rounded-lg border p-4 space-y-3',
      hasError ? 'border-red-500/20 bg-red-500/5' : hasWarning ? 'border-amber-500/20 bg-amber-500/5' : 'border-border bg-card'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {statusIcon(status)}
          <span className={cn('text-xs font-semibold', statusColor(status))}>{statusLabelFull(status)}</span>
        </div>
      </div>

      {/* Error block */}
      {data?.error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-600 space-y-2">
          <div className="flex items-start gap-2">
            <AlertOctagon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p className="font-mono leading-relaxed">{data.error}</p>
          </div>
          {serviceUrl && (
            <a
              href={serviceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-red-700 hover:underline font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              Ouvrir {label}
            </a>
          )}
        </div>
      )}

      {/* URL */}
      {data?.url && !data.error && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {data.url}
        </a>
      )}

      {/* Runs grouped by branch */}
      {data?.runs && data.runs.length > 0 && (
        <div className="space-y-3">
          {Object.entries(groupRunsByBranch(data.runs)).map(([branch, branchRuns]) => (
            <div key={branch} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <GitBranch className="h-3 w-3" />
                {branch}
                <span className="text-[10px] opacity-60">({branchRuns.length})</span>
              </div>
              <div className="space-y-1">
                {branchRuns.map((run, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between rounded-md px-3 py-2 text-xs border',
                    statusBgColor(run.status)
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{run.workflow}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] opacity-60">{formatDate(run.updated_at)}</span>
                      {run.url && (
                        <a href={run.url} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simple branch info (no runs) */}
      {data?.branch && data.branch !== '—' && !data.runs && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          {data.branch} · {formatDate(data.created_at ?? null)}
        </div>
      )}
    </div>
  )
}

interface ProjectDetailDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: {
    id?: string
    name: string
    github_owner?: string | null
    github_repo?: string | null
    gitlab_namespace?: string | null
    gitlab_project?: string | null
    vercel_project_id?: string | null
    cloudflare_worker_name?: string | null
    github_status?: HealthStatus | null
    github_data?: HealthCheckResult | null
    gitlab_status?: HealthStatus | null
    gitlab_data?: HealthCheckResult | null
    vercel_status?: HealthStatus | null
    vercel_data?: HealthCheckResult | null
    cloudflare_status?: HealthStatus | null
    cloudflare_data?: HealthCheckResult | null
    checked_at?: string | null
  } | null
}

export default function ProjectDetailDialog({ open, onOpenChange, project }: ProjectDetailDialogProps) {
  const { data: history = [] } = useProjectHealthHistory(open ? (project?.id ?? null) : null)

  if (!project) return null

  const services = [
    { icon: GitBranch, label: 'GitHub Actions', status: project.github_status ?? null, data: project.github_data ?? null, show: !!project.github_repo, serviceUrl: project.github_owner && project.github_repo ? `https://github.com/${project.github_owner}/${project.github_repo}` : undefined },
    { icon: GitFork, label: 'GitLab CI', status: project.gitlab_status ?? null, data: project.gitlab_data ?? null, show: !!project.gitlab_project, serviceUrl: project.gitlab_namespace && project.gitlab_project ? `https://gitlab.com/${project.gitlab_namespace}/${project.gitlab_project}` : undefined },
    { icon: Globe, label: 'Vercel', status: project.vercel_status ?? null, data: project.vercel_data ?? null, show: !!project.vercel_project_id, serviceUrl: project.vercel_project_id ? `https://vercel.com/guyboireaus-projects/${project.vercel_project_id}` : undefined },
    { icon: Cloud, label: 'Cloudflare', status: project.cloudflare_status ?? null, data: project.cloudflare_data ?? null, show: !!project.cloudflare_worker_name },
  ].filter(s => s.show)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {project.name}
            {project.checked_at && (
              <span className="text-xs font-normal text-muted-foreground">
                · vérifié {formatRelative(project.checked_at)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {history.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <HealthChart checks={history} />
            </div>
          )}

          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun service configuré.</p>
          ) : (
            services.map(s => (
              <ServiceSection key={s.label} icon={s.icon} label={s.label} status={s.status} data={s.data} serviceUrl={s.serviceUrl} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
