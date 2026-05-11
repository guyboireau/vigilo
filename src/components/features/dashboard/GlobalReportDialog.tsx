import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, FileText } from 'lucide-react'
import { cn, statusBgColor, statusColor, formatDate } from '@/lib/utils'
import type { HealthStatus, ProjectRow, HealthCheckResult } from '@/types'

interface GlobalReportDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  projects: ProjectRow[]
}

function statusIcon(status: HealthStatus | null) {
  switch (status) {
    case 'success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'failure': return <XCircle className="h-4 w-4 text-red-500" />
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />
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

interface ServiceItem {
  label: string
  status: HealthStatus | null
  data: HealthCheckResult | null
}

function getProjectServices(p: ProjectRow): ServiceItem[] {
  return [
    { label: 'GitHub', status: p.github_status, data: p.github_data },
    { label: 'GitLab', status: p.gitlab_status, data: p.gitlab_data },
    { label: 'Vercel', status: p.vercel_status, data: p.vercel_data },
    { label: 'Cloudflare', status: p.cloudflare_status, data: p.cloudflare_data },
  ].filter(s => s.status !== null)
}

export default function GlobalReportDialog({ open, onOpenChange, projects }: GlobalReportDialogProps) {
  const report = useMemo(() => {
    const total = projects.length
    const nominal = projects.filter(p => p.overall_status === 'success').length
    const warnings = projects.filter(p => p.overall_status === 'warning').length
    const errors = projects.filter(p => p.overall_status === 'failure' || p.overall_status === 'error').length
    const unknown = projects.filter(p => !p.overall_status || p.overall_status === 'unknown').length

    const failingProjects = projects.filter(p =>
      p.overall_status === 'failure' || p.overall_status === 'error' || p.overall_status === 'warning'
    )

    const allErrors: { project: string; service: string; message: string; status: HealthStatus }[] = []
    for (const p of projects) {
      const services = getProjectServices(p)
      for (const s of services) {
        if (s.status === 'failure' || s.status === 'error') {
          allErrors.push({
            project: p.name,
            service: s.label,
            message: s.data?.error ?? 'Échec détecté',
            status: s.status,
          })
        }
      }
    }

    return { total, nominal, warnings, errors, unknown, failingProjects, allErrors }
  }, [projects])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rapport Global
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card p-3 text-center">
              <p className="text-2xl font-bold">{report.total}</p>
              <p className="text-[11px] text-muted-foreground">Projets</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{report.nominal}</p>
              <p className="text-[11px] text-emerald-600/70">Nominal</p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{report.warnings}</p>
              <p className="text-[11px] text-amber-600/70">Warnings</p>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{report.errors}</p>
              <p className="text-[11px] text-red-600/70">Erreurs</p>
            </div>
          </div>

          {/* Health Bar */}
          {report.total > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Répartition</p>
              <div className="flex h-4 rounded-full overflow-hidden">
                {report.nominal > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(report.nominal / report.total) * 100}%` }}
                    title={`Nominal: ${report.nominal}`}
                  />
                )}
                {report.warnings > 0 && (
                  <div
                    className="bg-amber-500"
                    style={{ width: `${(report.warnings / report.total) * 100}%` }}
                    title={`Warnings: ${report.warnings}`}
                  />
                )}
                {report.errors > 0 && (
                  <div
                    className="bg-red-500"
                    style={{ width: `${(report.errors / report.total) * 100}%` }}
                    title={`Erreurs: ${report.errors}`}
                  />
                )}
                {report.unknown > 0 && (
                  <div
                    className="bg-muted-foreground/20"
                    style={{ width: `${(report.unknown / report.total) * 100}%` }}
                    title={`Inconnu: ${report.unknown}`}
                  />
                )}
              </div>
            </div>
          )}

          {/* Errors Summary */}
          {report.allErrors.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Erreurs détectées ({report.allErrors.length})
              </p>
              <div className="space-y-2">
                {report.allErrors.map((err, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{err.project}</span>
                        <span className="text-[10px] text-muted-foreground">· {err.service}</span>
                      </div>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', statusBgColor(err.status))}>
                        {statusLabelFull(err.status)}
                      </span>
                    </div>
                    <p className="text-[11px] text-red-600 font-mono">{err.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-project detail */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Détail par projet
            </p>
            <div className="space-y-2">
              {projects.map(p => {
                const services = getProjectServices(p)
                const hasIssue = p.overall_status === 'failure' || p.overall_status === 'error' || p.overall_status === 'warning'
                return (
                  <div
                    key={p.id}
                    className={cn(
                      'rounded-lg border p-3 space-y-2',
                      hasIssue ? 'border-red-500/10 bg-red-500/[0.02]' : 'border-border bg-card'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{p.name}</span>
                      <div className="flex items-center gap-1.5">
                        {statusIcon(p.overall_status)}
                        <span className={cn('text-xs font-semibold', statusColor(p.overall_status))}>
                          {statusLabelFull(p.overall_status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {services.map(s => (
                        <span
                          key={s.label}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                            statusBgColor(s.status)
                          )}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                    {p.checked_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Dernière vérification: {formatDate(p.checked_at)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
