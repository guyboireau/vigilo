import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Globe, CheckCircle2, XCircle, RefreshCw, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useSession } from '@/hooks/useAuth'
import { useMonitors, useCreateMonitor, useDeleteMonitor, useTriggerMonitorCheck } from '@/hooks/useMonitors'
import { formatRelative } from '@/lib/utils'
import type { HttpMonitor } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  url: z.string().url('URL invalide'),
  expected_status: z.number().int().min(100).max(599),
  interval_minutes: z.number().int().min(1).max(1440),
})
type FormData = z.infer<typeof schema>

const INTERVALS = [
  { label: 'Toutes les 5 min', value: 5 },
  { label: 'Toutes les 15 min', value: 15 },
  { label: 'Toutes les 30 min', value: 30 },
  { label: 'Toutes les heures', value: 60 },
  { label: 'Toutes les 6h', value: 360 },
  { label: 'Quotidien', value: 1440 },
]

function StatusDot({ status }: { status: HttpMonitor['last_status'] }) {
  if (status === 'up') return <span className="flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> UP</span>
  if (status === 'down') return <span className="flex items-center gap-1 text-red-600 text-xs"><XCircle className="h-3.5 w-3.5" /> DOWN</span>
  return <span className="text-xs text-muted-foreground">—</span>
}

export default function Monitors() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { data: monitors = [], isLoading } = useMonitors(userId)
  const createMonitor = useCreateMonitor(userId)
  const deleteMonitor = useDeleteMonitor(userId)
  const triggerCheck = useTriggerMonitorCheck(userId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { expected_status: 200, interval_minutes: 15 },
  })

  async function onSubmit(data: FormData) {
    await createMonitor.mutateAsync({ ...data, project_id: null, org_id: null })
    setDialogOpen(false)
    reset()
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Moniteurs HTTP</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Surveillez la disponibilité de vos URLs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => triggerCheck.mutate()} loading={triggerCheck.isPending}>
            <RefreshCw className="h-4 w-4" />
            Vérifier tout
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau moniteur
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />)}
        </div>
      ) : monitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Aucun moniteur</p>
          <p className="text-xs text-muted-foreground mt-1">Ajoutez une URL à surveiller</p>
          <Button size="sm" className="mt-4 gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau moniteur
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">URL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Intervalle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Temps réponse</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monitors.map((m) => (
                <tr key={m.id} className="bg-card hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.name}</p>
                    {m.last_checked_at && (
                      <p className="text-[11px] text-muted-foreground">{formatRelative(m.last_checked_at)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px] block">
                      {m.url}
                    </a>
                  </td>
                  <td className="px-4 py-3"><StatusDot status={m.last_status} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {INTERVALS.find(i => i.value === m.interval_minutes)?.label ?? `${m.interval_minutes} min`}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {m.last_response_ms ? `${m.last_response_ms}ms` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau moniteur HTTP</DialogTitle>
            <DialogDescription>Surveillez la disponibilité d'une URL.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input placeholder="Mon API" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>URL *</Label>
              <Input placeholder="https://mon-app.com/health" {...register('url')} />
              {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status attendu</Label>
                <Input type="number" {...register('expected_status')} />
              </div>
              <div className="space-y-1.5">
                <Label>Intervalle</Label>
                <select
                  {...register('interval_minutes')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
            </div>
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
        title="Supprimer le moniteur"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        loading={deleteMonitor.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMonitor.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
