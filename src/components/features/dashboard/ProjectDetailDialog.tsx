import { ExternalLink, CheckCircle2, XCircle, AlertTriangle, MinusCircle, GitBranch, GitFork, Globe, Cloud } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatRelative, formatDate, statusBgColor } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useProjectHealthHistory } from '@/hooks/useHealth'
import HealthChart from './HealthChart'
import type { HealthStatus, HealthCheckResult } from '@/types'

interface ServiceSectionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  status: HealthStatus | null
  data: HealthCheckResult | null
}

function ServiceSection({ icon: Icon, label, status, data }: ServiceSectionProps) {
  if (!status) return null

  const statusIcon = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    failure: <XCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  }[status as string] ?? <MinusCircle className="h-4 w-4 text-muted-foreground" />

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {statusIcon}
      </div>

      {data?.url && (
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

      {data?.error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 font-mono">
          {data.error}
        </div>
      )}

      {data?.runs && data.runs.length > 0 && (
        <div className="space-y-1">
          {data.runs.map((run, i) => (
            <div key={i} className={cn(
              'flex items-center justify-between rounded-md px-3 py-1.5 text-xs border',
              statusBgColor(run.status)
            )}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{run.workflow}</span>
                {run.branch && <span className="text-[10px] opacity-60 shrink-0">⎇ {run.branch}</span>}
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
      )}

      {data?.branch && data.branch !== '—' && !data.runs && (
        <div className="text-xs text-muted-foreground">⎇ {data.branch} · {formatDate(data.created_at ?? null)}</div>
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
    github_repo?: string | null
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
    { icon: GitBranch, label: 'GitHub Actions', status: project.github_status ?? null, data: project.github_data ?? null, show: !!project.github_repo },
    { icon: GitFork, label: 'GitLab CI', status: project.gitlab_status ?? null, data: project.gitlab_data ?? null, show: !!project.gitlab_project },
    { icon: Globe, label: 'Vercel', status: project.vercel_status ?? null, data: project.vercel_data ?? null, show: !!project.vercel_project_id },
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
              <ServiceSection key={s.label} icon={s.icon} label={s.label} status={s.status} data={s.data} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
