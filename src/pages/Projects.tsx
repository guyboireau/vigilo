import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, FolderGit2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSession } from '@/hooks/useAuth'
import { useProjectsWithHealth, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects'
import StatusBadge from '@/components/features/dashboard/StatusBadge'
import type { HealthStatus, Project } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  github_owner: z.string().optional(),
  github_repo: z.string().optional(),
  gitlab_namespace: z.string().optional(),
  gitlab_project: z.string().optional(),
  vercel_project_id: z.string().optional(),
  cloudflare_zone_id: z.string().optional(),
  cloudflare_worker_name: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function emptyToNull(v: string | undefined): string | null {
  return v && v.trim() ? v.trim() : null
}

export default function Projects() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { data: projects = [], isLoading } = useProjectsWithHealth(userId)
  const createProject = useCreateProject(userId)
  const updateProject = useUpdateProject(userId)
  const deleteProject = useDeleteProject(userId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    setEditingProject(null)
    reset({})
    setDialogOpen(true)
  }

  function openEdit(p: Project) {
    setEditingProject(p)
    reset({
      name: p.name,
      github_owner: p.github_owner ?? '',
      github_repo: p.github_repo ?? '',
      gitlab_namespace: p.gitlab_namespace ?? '',
      gitlab_project: p.gitlab_project ?? '',
      vercel_project_id: p.vercel_project_id ?? '',
      cloudflare_zone_id: p.cloudflare_zone_id ?? '',
      cloudflare_worker_name: p.cloudflare_worker_name ?? '',
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    const payload = {
      name: data.name,
      github_owner: emptyToNull(data.github_owner),
      github_repo: emptyToNull(data.github_repo),
      gitlab_namespace: emptyToNull(data.gitlab_namespace),
      gitlab_project: emptyToNull(data.gitlab_project),
      vercel_project_id: emptyToNull(data.vercel_project_id),
      cloudflare_zone_id: emptyToNull(data.cloudflare_zone_id),
      cloudflare_worker_name: emptyToNull(data.cloudflare_worker_name),
    }
    if (editingProject) {
      await updateProject.mutateAsync({ id: editingProject.id, updates: payload })
    } else {
      await createProject.mutateAsync(payload)
    }
    setDialogOpen(false)
    reset({})
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Projets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gérez les projets à surveiller</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16 text-center">
          <FolderGit2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Aucun projet</p>
          <p className="text-xs text-muted-foreground mt-1">Créez votre premier projet à surveiller</p>
          <Button size="sm" className="mt-4 gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projet</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Services</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p: any) => (
                <tr key={p.id} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                      {p.github_repo && <span className="bg-muted px-1.5 py-0.5 rounded">GH: {p.github_owner}/{p.github_repo}</span>}
                      {p.gitlab_project && <span className="bg-muted px-1.5 py-0.5 rounded">GL: {p.gitlab_namespace}/{p.gitlab_project}</span>}
                      {p.vercel_project_id && <span className="bg-muted px-1.5 py-0.5 rounded">Vercel: {p.vercel_project_id}</span>}
                      {p.cloudflare_worker_name && <span className="bg-muted px-1.5 py-0.5 rounded">CF: {p.cloudflare_worker_name}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={(p.overall_status as HealthStatus) ?? 'unknown'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p as Project)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteProject.mutate(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
            <DialogDescription>
              Configurez les services à surveiller pour ce projet.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input id="name" placeholder="mon-app" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">GitHub owner</Label>
                <Input placeholder="guyboireau" {...register('github_owner')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">GitHub repo</Label>
                <Input placeholder="mon-app" {...register('github_repo')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">GitLab namespace</Label>
                <Input placeholder="guyboireau" {...register('gitlab_namespace')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">GitLab projet</Label>
                <Input placeholder="mon-app" {...register('gitlab_project')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Vercel project ID / slug</Label>
              <Input placeholder="mon-app-prod" {...register('vercel_project_id')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cloudflare Zone ID</Label>
                <Input placeholder="abc123..." {...register('cloudflare_zone_id')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">CF Worker name</Label>
                <Input placeholder="mon-worker" {...register('cloudflare_worker_name')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" loading={isSubmitting}>
                {editingProject ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
