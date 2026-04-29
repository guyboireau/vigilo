import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Shield, Search, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useSession } from '@/hooks/useAuth'
import { useOrg } from '@/contexts/OrgContext'
import { useAudits, useCreateAudit, useDeleteAudit, useScanUrl } from '@/hooks/useUxAudits'
import { getSeverityLabel } from '@/services/uxAudits'
import type { UxAuditPattern } from '@/types'

const schema = z.object({
  url: z.string().url('URL invalide'),
})
type FormData = z.infer<typeof schema>

const PATTERN_ICONS: Record<string, string> = {
  preChecked: '☑️',
  hiddenUnsubscribe: '🔍',
  fakeUrgency: '⏰',
  confirmShaming: '😢',
  trickConsent: '🍪',
  forcedContinuity: '💳',
  hiddenCosts: '💰',
  misdirection: '👁️',
}

const SEVERITY_COLORS = {
  high: 'text-red-600 bg-red-500/10 border-red-500/20',
  medium: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
}

export default function UxAudits() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { currentOrg } = useOrg()
  const { data: audits = [], isLoading } = useAudits(userId, currentOrg?.id)
  const scanMutation = useScanUrl()
  const createAudit = useCreateAudit(userId)
  const deleteAudit = useDeleteAudit()

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    const result = await scanMutation.mutateAsync(data.url)
    if (result) {
      await createAudit.mutateAsync({
        scan: result,
        orgId: currentOrg?.id,
      })
      reset()
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Audit UX</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scannez vos pages pour détecter les dark patterns et vérifier la conformité DSA/RGPD.
          </p>
        </div>
      </div>

      {/* Scan form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="https://mon-site.fr"
            {...register('url')}
            className="h-10"
          />
          {errors.url && <p className="text-xs text-destructive mt-1">{errors.url.message}</p>}
        </div>
        <Button type="submit" loading={isSubmitting || scanMutation.isPending || createAudit.isPending} className="gap-2">
          <Search className="h-4 w-4" />
          Scanner
        </Button>
      </form>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg border bg-card animate-pulse" />)}</div>
      ) : audits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-16 text-center">
          <Shield className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Aucun audit</p>
          <p className="text-xs text-muted-foreground mt-1">Scannez une URL pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => {
            const severity = getSeverityLabel(audit.severity_score)
            const isExpanded = expandedAudit === audit.id
            return (
              <div key={audit.id} className="rounded-lg border bg-card overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                      audit.severity_score >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                      audit.severity_score >= 50 ? 'bg-amber-500/10 text-amber-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {audit.severity_score >= 80 ? <CheckCircle2 className="h-5 w-5" /> :
                       audit.severity_score >= 50 ? <AlertTriangle className="h-5 w-5" /> :
                       <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{audit.title || audit.url}</p>
                      <a href={audit.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        {audit.url} <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${severity.color === 'emerald' ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' : severity.color === 'amber' ? 'text-amber-600 bg-amber-500/10 border-amber-500/20' : 'text-red-600 bg-red-500/10 border-red-500/20'}`}>
                          {severity.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(audit.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}>
                      {isExpanded ? 'Réduire' : `${audit.total_patterns} pattern${audit.total_patterns > 1 ? 's' : ''}`}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(audit.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && audit.patterns?.length > 0 && (
                  <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                    {audit.patterns.map((pattern: UxAuditPattern) => (
                      <div key={pattern.type} className={`rounded-md border px-3 py-2 ${SEVERITY_COLORS[pattern.severity as 'high' | 'medium' | 'low']}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{PATTERN_ICONS[pattern.type] || '⚠️'}</span>
                            <span className="text-sm font-medium">{pattern.name}</span>
                            <span className="text-[11px] opacity-70">×{pattern.count}</span>
                          </div>
                          <span className="text-[11px] opacity-70">{pattern.regulation}</span>
                        </div>
                        {pattern.examples?.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {pattern.examples.slice(0, 2).map((ex: string, i: number) => (
                              <code key={i} className="block text-[11px] bg-black/5 dark:bg-white/5 px-2 py-1 rounded truncate">{ex}</code>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer l'audit"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        loading={deleteAudit.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteAudit.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
