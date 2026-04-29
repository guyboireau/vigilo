import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, FolderGit2 } from 'lucide-react'
import { useSession } from '@/hooks/useAuth'
import { useProjectsWithHealth, useDeleteProject, useUpdateProject } from '@/hooks/useProjects'
import { useTriggerHealthCheck } from '@/hooks/useHealth'
import { formatDate } from '@/lib/utils'
import KpiCard from '@/components/features/dashboard/KpiCard'
import ProjectCard from '@/components/features/dashboard/ProjectCard'
import ProjectDetailDialog from '@/components/features/dashboard/ProjectDetailDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { HealthStatus, HealthCheckResult, ProjectRow } from '@/types'

export default function Dashboard() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { data: projects = [], isLoading, dataUpdatedAt } = useProjectsWithHealth(userId)
  const triggerCheck = useTriggerHealthCheck(userId)
  const deleteProject = useDeleteProject(userId)
  const updateProject = useUpdateProject(userId)

  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null)
  const [editProject, setEditProject] = useState<ProjectRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const total = projects.length
  const nominal = projects.filter((p: ProjectRow) => !p.overall_status || p.overall_status === 'success').length
  const warnings = projects.filter((p: ProjectRow) => p.overall_status === 'warning').length
  const errors = projects.filter((p: ProjectRow) => p.overall_status === 'failure' || p.overall_status === 'error').length

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Tableau de Bord</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dataUpdatedAt ? `Dernière mise à jour: ${formatDate(new Date(dataUpdatedAt).toISOString())}` : 'Chargement...'}
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md border">
          {new Date().toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total projets" value={total} icon={FolderGit2} color="neutral" bar={100} />
        <KpiCard label="Nominal" value={nominal} icon={CheckCircle2} color="success" bar={total ? (nominal / total) * 100 : 0} />
        <KpiCard label="Warnings" value={warnings} icon={AlertTriangle} color="warning" bar={total ? (warnings / total) * 100 : 0} />
        <KpiCard label="Erreurs" value={errors} icon={XCircle} color="error" bar={total ? (errors / total) * 100 : 0} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">État des Projets</h2>
          <span className="text-xs text-muted-foreground">{total} projet{total > 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-lg border bg-card animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16 text-center">
            <FolderGit2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Aucun projet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez vos projets depuis l'onglet <a href="/projects" className="text-primary hover:underline">Projets</a>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(projects as ProjectRow[]).map((p) => (
              <ProjectCard
                key={p.id}
                id={p.id}
                name={p.name}
                githubOwner={p.github_owner}
                githubRepo={p.github_repo}
                gitlabNamespace={p.gitlab_namespace}
                gitlabProject={p.gitlab_project}
                vercelProjectId={p.vercel_project_id}
                cloudflareZoneId={p.cloudflare_zone_id}
                cloudflareWorkerName={p.cloudflare_worker_name}
                githubStatus={p.github_status as HealthStatus}
                gitlabStatus={p.gitlab_status as HealthStatus}
                vercelStatus={p.vercel_status as HealthStatus}
                cloudflareStatus={p.cloudflare_status as HealthStatus}
                overallStatus={p.overall_status as HealthStatus}
                checkedAt={p.checked_at}
                onCardClick={() => setSelectedProject(p)}
                onRefresh={() => triggerCheck.mutate(p.id)}
                onEdit={() => setEditProject(p)}
                onDelete={() => setDeleteTarget(p.id)}
                refreshing={triggerCheck.isPending && triggerCheck.variables === p.id}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectDetailDialog
        open={!!selectedProject}
        onOpenChange={open => { if (!open) setSelectedProject(null) }}
        project={selectedProject ? {
          id: selectedProject.id,
          name: selectedProject.name,
          github_repo: selectedProject.github_repo,
          gitlab_project: selectedProject.gitlab_project,
          vercel_project_id: selectedProject.vercel_project_id,
          cloudflare_worker_name: selectedProject.cloudflare_worker_name,
          github_status: selectedProject.github_status as HealthStatus,
          github_data: selectedProject.github_data as HealthCheckResult,
          gitlab_status: selectedProject.gitlab_status as HealthStatus,
          gitlab_data: selectedProject.gitlab_data as HealthCheckResult,
          vercel_status: selectedProject.vercel_status as HealthStatus,
          vercel_data: selectedProject.vercel_data as HealthCheckResult,
          cloudflare_status: selectedProject.cloudflare_status as HealthStatus,
          cloudflare_data: selectedProject.cloudflare_data as HealthCheckResult,
          checked_at: selectedProject.checked_at,
        } : null}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer le projet"
        description="Cette action est irréversible. Tout l'historique de ce projet sera supprimé."
        confirmLabel="Supprimer"
        destructive
        loading={deleteProject.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteProject.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
