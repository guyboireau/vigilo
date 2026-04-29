import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  PenTool, Check, Trash2, Plus, Save, X, FileText,
  AlertTriangle, Info, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useSession } from '@/hooks/useAuth'
import { useOrg } from '@/contexts/OrgContext'
import { useStyleGuides, useStyleChecks, useCreateStyleCheck, useDeleteStyleCheck, useAnalyzeStyle } from '@/hooks/useStyleGuard'
import { getStyleScoreLabel } from '@/services/styleGuard'
import type { StyleIssue } from '@/types'

const checkSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  content: z.string().min(10, 'Minimum 10 caractères'),
})
type CheckForm = z.infer<typeof checkSchema>

const SEVERITY_COLORS = {
  warning: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-600 bg-red-500/10 border-red-500/20',
}

export default function StyleGuard() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { currentOrg } = useOrg()
  const { data: guides = [] } = useStyleGuides(currentOrg?.id)
  const { data: checks = [], isLoading } = useStyleChecks(userId, currentOrg?.id)
  const analyzeMutation = useAnalyzeStyle()
  const createCheck = useCreateStyleCheck(userId)
  const deleteCheck = useDeleteStyleCheck()

  const [activeTab, setActiveTab] = useState<'check' | 'guides'>('check')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null)
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CheckForm>({
    resolver: zodResolver(checkSchema),
  })

  async function onSubmit(data: CheckForm) {
    const guide = guides.find(g => g.id === selectedGuide)
    const result = await analyzeMutation.mutateAsync({
      content: data.content,
      rules: guide?.rules,
    })
    if (result) {
      await createCheck.mutateAsync({
        result: { ...result, title: data.title },
        orgId: currentOrg?.id,
        guideId: selectedGuide,
      })
      reset()
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">StyleGuard</h1>
            <p className="text-xs text-muted-foreground">Cohérence rédactionnelle et style guide.</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant={activeTab === 'check' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('check')}>
            <FileText className="h-4 w-4 mr-1" /> Analyser
          </Button>
          <Button variant={activeTab === 'guides' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('guides')}>
            <BookOpen className="h-4 w-4 mr-1" /> Style Guides
          </Button>
        </div>
      </div>

      {activeTab === 'check' && (
        <>
          {/* Analysis form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border bg-card p-4">
            <div>
              <Label>Titre *</Label>
              <Input {...register('title')} placeholder="Article de blog - Mars 2024" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div>
              <Label>Style Guide (optionnel)</Label>
              <select
                value={selectedGuide || ''}
                onChange={e => setSelectedGuide(e.target.value || null)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Règles par défaut</option>
                {guides.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Contenu à analyser *</Label>
              <textarea
                {...register('content')}
                rows={8}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Collez votre texte ici..."
              />
              {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={analyzeMutation.isPending || createCheck.isPending}>
                <PenTool className="h-4 w-4 mr-1" /> Analyser le style
              </Button>
            </div>
          </form>

          {/* History */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Historique des analyses</h2>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg border bg-card animate-pulse" />)}</div>
            ) : checks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-12 text-center">
                <PenTool className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">Aucune analyse</p>
                <p className="text-xs text-muted-foreground mt-1">Analysez votre premier texte ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checks.map((check) => {
                  const severity = getStyleScoreLabel(check.score)
                  const isExpanded = expandedCheck === check.id
                  return (
                    <div key={check.id} className="rounded-lg border bg-card overflow-hidden">
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                            check.score >= 90 ? 'bg-emerald-500/10 text-emerald-600' :
                            check.score >= 70 ? 'bg-amber-500/10 text-amber-600' :
                            'bg-red-500/10 text-red-600'
                          }`}>
                            {check.score >= 90 ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{check.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ${severity.color === 'emerald' ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' : severity.color === 'amber' ? 'text-amber-600 bg-amber-500/10 border-amber-500/20' : 'text-red-600 bg-red-500/10 border-red-500/20'}`}>
                                {severity.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {check.total_issues} issue{check.total_issues > 1 ? 's' : ''} · {check.score}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => setExpandedCheck(isExpanded ? null : check.id)}>
                            {isExpanded ? 'Réduire' : 'Détails'}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(check.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && check.issues?.length > 0 && (
                        <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
                          {check.issues.map((issue: StyleIssue, i: number) => (
                            <div key={i} className={`rounded-md border px-3 py-2 ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.warning}`}>
                              <div className="flex items-center gap-2">
                                <Info className="h-3.5 w-3.5" />
                                <span className="text-sm font-medium capitalize">{issue.type}</span>
                              </div>
                              <p className="text-xs mt-1 opacity-80">{issue.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'guides' && (
        <div className="space-y-4">
          {guides.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">Aucun style guide</p>
              <p className="text-xs text-muted-foreground mt-1">Un style guide par défaut sera créé automatiquement</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guides.map((guide) => (
                <div key={guide.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{guide.name}</p>
                      {guide.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Défaut</span>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{guide.description}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Règles actives :</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(guide.rules || {}).filter(([_, v]) => v === true).map(([key]) => (
                        <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{key}</span>
                      ))}
                    </div>
                  </div>
                  {guide.rules?.custom_terms?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Terminologie :</p>
                      <div className="text-xs space-y-0.5">
                        {guide.rules.custom_terms.slice(0, 3).map((t: { wrong: string; right: string }, i: number) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="text-destructive line-through">{t.wrong}</span>
                            <span>→</span>
                            <span className="text-emerald-600">{t.right}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer l'analyse"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        loading={deleteCheck.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteCheck.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
