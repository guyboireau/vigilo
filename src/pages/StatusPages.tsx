import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, LayoutGrid, ExternalLink, Trash2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useSession } from '@/hooks/useAuth'
import { useStatusPages, useCreateStatusPage, useDeleteStatusPage } from '@/hooks/useStatusPages'
import { useProjectsWithHealth } from '@/hooks/useProjects'
import { useMonitors } from '@/hooks/useMonitors'
import type { ProjectRow } from '@/types'

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  slug: z.string().min(2, 'Slug requis').regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement'),
  description: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function StatusPages() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { data: pages = [], isLoading } = useStatusPages(userId)
  const { data: projects = [] } = useProjectsWithHealth(userId)
  const { data: monitors = [] } = useMonitors(userId)
  const createPage = useCreateStatusPage(userId)
  const deletePage = useDeleteStatusPage(userId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedMonitors, setSelectedMonitors] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function toggleProject(id: string) {
    setSelectedProjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleMonitor(id: string) {
    setSelectedMonitors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function onSubmit(data: FormData) {
    await createPage.mutateAsync({
      ...data,
      description: data.description ?? null,
      project_ids: selectedProjects,
      http_monitor_ids: selectedMonitors,
    })
    setDialogOpen(false)
    reset()
    setSelectedProjects([])
    setSelectedMonitors([])
  }

  function copyUrl(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/status/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Status Pages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pages publiques de statut pour vos clients</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nouvelle page
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 rounded-lg border bg-card animate-pulse" />)}</div>
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16 text-center">
          <LayoutGrid className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Aucune status page</p>
          <p className="text-xs text-muted-foreground mt-1">Créez une page publique à partager avec vos clients</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle page
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <div key={page.id} className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{page.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {page.project_ids.length} projet{page.project_ids.length > 1 ? 's' : ''} · {page.http_monitor_ids.length} moniteur{page.http_monitor_ids.length > 1 ? 's' : ''}
                </p>
                <p className="text-[11px] text-primary mt-0.5 font-mono">{origin}/status/{page.slug}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyUrl(page.slug)} title="Copier l'URL">
                  {copied === page.slug ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <a href={`/status/${page.slug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                </a>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(page.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle status page</DialogTitle>
            <DialogDescription>Page publique accessible sans connexion.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input placeholder="Status de mon service" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Slug * <span className="text-muted-foreground font-normal">(dans l'URL)</span></Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">/status/</span>
                <Input placeholder="mon-service" {...register('slug')} />
              </div>
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              <Input placeholder="Statut opérationnel de nos services" {...register('description')} />
            </div>

            {projects.length > 0 && (
              <div className="space-y-1.5">
                <Label>Projets à inclure</Label>
                <div className="space-y-1 max-h-36 overflow-y-auto rounded-md border p-2">
                  {(projects as ProjectRow[]).map(p => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedProjects.includes(p.id)} onChange={() => toggleProject(p.id)} className="rounded" />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {monitors.length > 0 && (
              <div className="space-y-1.5">
                <Label>Moniteurs HTTP à inclure</Label>
                <div className="space-y-1 max-h-36 overflow-y-auto rounded-md border p-2">
                  {monitors.map(m => (
                    <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedMonitors.includes(m.id)} onChange={() => toggleMonitor(m.id)} className="rounded" />
                      {m.name} <span className="text-xs text-muted-foreground">{m.url}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" size="sm" loading={isSubmitting}>Créer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer la status page"
        description="La page ne sera plus accessible publiquement."
        confirmLabel="Supprimer"
        destructive
        loading={deletePage.isPending}
        onConfirm={() => {
          if (deleteTarget) deletePage.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
