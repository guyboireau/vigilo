import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Wrench, Copy, Check, Trash2, Plus, FileText, GitCommit,
  Braces, Clock, Hash, Code2, Save, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useSession } from '@/hooks/useAuth'
import { useOrg } from '@/contexts/OrgContext'
import { useSnippets, useCreateSnippet, useDeleteSnippet } from '@/hooks/useDevTools'
import { generatePrMarkdown, generateCommitMessage, formatJson, encodeBase64, decodeBase64, LANGUAGE_OPTIONS } from '@/services/devTools'
import type { CodeSnippet } from '@/services/devTools'

const snippetSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  code: z.string().min(1, 'Code requis'),
  language: z.string().default('text'),
  tags: z.string().optional(),
})
type SnippetForm = z.infer<typeof snippetSchema>

const TAB_ICONS: Record<string, React.ReactNode> = {
  snippets: <Code2 className="h-4 w-4" />,
  pr: <FileText className="h-4 w-4" />,
  commit: <GitCommit className="h-4 w-4" />,
  json: <Braces className="h-4 w-4" />,
  base64: <Hash className="h-4 w-4" />,
  timestamp: <Clock className="h-4 w-4" />,
}

export default function DevTools() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { currentOrg } = useOrg()
  const { data: snippets = [], isLoading } = useSnippets(userId, currentOrg?.id)
  const createSnippet = useCreateSnippet(userId)
  const deleteSnippet = useDeleteSnippet()

  const [activeTab, setActiveTab] = useState<keyof typeof TAB_ICONS>('snippets')
  const [copied, setCopied] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showSnippetForm, setShowSnippetForm] = useState(false)

  // PR Generator state
  const [prType, setPrType] = useState('feature')
  const [prTitle, setPrTitle] = useState('')
  const [prSummary, setPrSummary] = useState('')
  const [prIssue, setPrIssue] = useState('')
  const [prBreaking, setPrBreaking] = useState(false)
  const [prTests, setPrTests] = useState(false)
  const [prDocs, setPrDocs] = useState(false)

  // Commit state
  const [commitType, setCommitType] = useState('feat')
  const [commitScope, setCommitScope] = useState('')
  const [commitDesc, setCommitDesc] = useState('')
  const [commitBody, setCommitBody] = useState('')

  // JSON state
  const [jsonInput, setJsonInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [jsonError, setJsonError] = useState('')

  // Base64 state
  const [b64Input, setB64Input] = useState('')
  const [b64Output, setB64Output] = useState('')

  // Timestamp state
  const [tsInput, setTsInput] = useState(Date.now().toString())
  const [tsDate, setTsDate] = useState(new Date().toISOString())

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SnippetForm>({
    resolver: zodResolver(snippetSchema),
  })

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function onSnippetSubmit(data: SnippetForm) {
    await createSnippet.mutateAsync({
      title: data.title,
      code: data.code,
      language: data.language,
      tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      is_public: false,
      org_id: currentOrg?.id ?? null,
    })
    setShowSnippetForm(false)
    reset()
  }

  function handleJsonFormat(minify = false) {
    setJsonError('')
    try {
      setJsonOutput(formatJson(jsonInput, minify))
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  function handleBase64(encode: boolean) {
    try {
      setB64Output(encode ? encodeBase64(b64Input) : decodeBase64(b64Input))
    } catch (e) {
      setB64Output(e instanceof Error ? e.message : 'Error')
    }
  }

  function updateTimestamp(value: string) {
    setTsInput(value)
    const num = parseInt(value)
    if (!isNaN(num)) {
      setTsDate(new Date(num < 1e10 ? num * 1000 : num).toISOString())
    }
  }

  const tabs = [
    { id: 'snippets' as const, label: 'Snippets' },
    { id: 'pr' as const, label: 'PR Template' },
    { id: 'commit' as const, label: 'Commit' },
    { id: 'json' as const, label: 'JSON' },
    { id: 'base64' as const, label: 'Base64' },
    { id: 'timestamp' as const, label: 'Timestamp' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Dev Tools</h1>
          <p className="text-xs text-muted-foreground">Templates, snippets, et utilitaires pour les développeurs.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-card border-x border-t text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {TAB_ICONS[tab.id]}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Snippets Tab ── */}
      {activeTab === 'snippets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{snippets.length} snippet{snippets.length > 1 ? 's' : ''}</p>
            <Button size="sm" className="gap-2" onClick={() => setShowSnippetForm(true)}>
              <Plus className="h-4 w-4" /> Nouveau
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg border bg-card animate-pulse" />)}</div>
          ) : snippets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card py-12 text-center">
              <Code2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">Aucun snippet</p>
              <p className="text-xs text-muted-foreground mt-1">Sauvegardez vos bouts de code réutilisables</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {snippets.map((snippet: CodeSnippet) => (
                <div key={snippet.id} className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted font-mono">{snippet.language}</span>
                      <span className="text-sm font-medium truncate">{snippet.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(snippet.code, snippet.id)}>
                        {copied === snippet.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(snippet.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-32"><code>{snippet.code.slice(0, 200)}{snippet.code.length > 200 && '...'}</code></pre>
                  {snippet.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {snippet.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showSnippetForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-xl border shadow-lg w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Nouveau snippet</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSnippetForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleSubmit(onSnippetSubmit)} className="space-y-3">
                  <div>
                    <Label>Titre *</Label>
                    <Input {...register('title')} placeholder="Helper de validation" />
                    {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
                  </div>
                  <div>
                    <Label>Langage</Label>
                    <select {...register('language')} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                      {LANGUAGE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Code *</Label>
                    <textarea {...register('code')} rows={6} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono" />
                    {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
                  </div>
                  <div>
                    <Label>Tags (séparés par des virgules)</Label>
                    <Input {...register('tags')} placeholder="validation, react, form" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowSnippetForm(false)}>Annuler</Button>
                    <Button type="submit" size="sm" loading={createSnippet.isPending}><Save className="h-4 w-4 mr-1" />Enregistrer</Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PR Template Tab ── */}
      {activeTab === 'pr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <select value={prType} onChange={e => setPrType(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {['feature', 'bugfix', 'refactor', 'docs', 'hotfix', 'chore'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Titre</Label>
                <Input value={prTitle} onChange={e => setPrTitle(e.target.value)} placeholder="Ajout de la feature X" />
              </div>
              <div>
                <Label>Résumé</Label>
                <textarea value={prSummary} onChange={e => setPrSummary(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" placeholder="Description des changements..." />
              </div>
              <div>
                <Label>Issue liée</Label>
                <Input value={prIssue} onChange={e => setPrIssue(e.target.value)} placeholder="#123" />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prBreaking} onChange={e => setPrBreaking(e.target.checked)} className="rounded" /> Breaking change</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prTests} onChange={e => setPrTests(e.target.checked)} className="rounded" /> Tests</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prDocs} onChange={e => setPrDocs(e.target.checked)} className="rounded" /> Docs</label>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Résultat</Label>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => copy(generatePrMarkdown({ type: prType, title: prTitle, summary: prSummary, issue: prIssue, breaking: prBreaking, tests: prTests, docs: prDocs }), 'pr')}>
                {copied === 'pr' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copier
              </Button>
            </div>
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre-wrap"><code>{generatePrMarkdown({ type: prType, title: prTitle, summary: prSummary, issue: prIssue, breaking: prBreaking, tests: prTests, docs: prDocs })}</code></pre>
          </div>
        </div>
      )}

      {/* ── Commit Tab ── */}
      {activeTab === 'commit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <select value={commitType} onChange={e => setCommitType(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Scope (optionnel)</Label>
                <Input value={commitScope} onChange={e => setCommitScope(e.target.value)} placeholder="auth, api, ui..." />
              </div>
              <div>
                <Label>Description *</Label>
                <Input value={commitDesc} onChange={e => setCommitDesc(e.target.value)} placeholder="ajoute la validation email" />
              </div>
              <div>
                <Label>Body (optionnel)</Label>
                <textarea value={commitBody} onChange={e => setCommitBody(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" placeholder="Détails supplémentaires..." />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Résultat</Label>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => copy(generateCommitMessage({ type: commitType, scope: commitScope, description: commitDesc, body: commitBody }), 'commit')}>
                {copied === 'commit' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copier
              </Button>
            </div>
            <pre className="text-sm bg-muted rounded-lg p-4 font-mono">{generateCommitMessage({ type: commitType, scope: commitScope, description: commitDesc, body: commitBody })}</pre>
          </div>
        </div>
      )}

      {/* ── JSON Tab ── */}
      {activeTab === 'json' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Input JSON</Label>
            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              rows={12}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
              placeholder='{"key": "value"}'
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleJsonFormat(false)}>Pretty Print</Button>
              <Button size="sm" variant="outline" onClick={() => handleJsonFormat(true)}>Minify</Button>
            </div>
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Résultat</Label>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => copy(jsonOutput, 'json')}>
                {copied === 'json' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copier
              </Button>
            </div>
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto"><code>{jsonOutput || 'Le résultat apparaîtra ici...'}</code></pre>
          </div>
        </div>
      )}

      {/* ── Base64 Tab ── */}
      {activeTab === 'base64' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Input</Label>
            <textarea value={b64Input} onChange={e => setB64Input(e.target.value)} rows={6} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleBase64(true)}>Encoder →</Button>
              <Button size="sm" variant="outline" onClick={() => handleBase64(false)}>← Décoder</Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Résultat</Label>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => copy(b64Output, 'b64')}>
                {copied === 'b64' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copier
              </Button>
            </div>
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto break-all"><code>{b64Output || 'Le résultat apparaîtra ici...'}</code></pre>
          </div>
        </div>
      )}

      {/* ── Timestamp Tab ── */}
      {activeTab === 'timestamp' && (
        <div className="space-y-6 max-w-lg">
          <div className="space-y-3">
            <Label>Timestamp (ms ou s)</Label>
            <Input value={tsInput} onChange={e => updateTimestamp(e.target.value)} type="number" />
          </div>
          <div className="space-y-3">
            <Label>Date ISO</Label>
            <div className="flex gap-2">
              <Input value={tsDate} readOnly className="font-mono" />
              <Button variant="ghost" size="icon" onClick={() => copy(tsDate, 'ts')}>
                {copied === 'ts' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Date locale</Label>
            <Input value={new Date(tsDate).toLocaleString('fr-FR')} readOnly />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null) }}
        title="Supprimer le snippet"
        description="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        loading={deleteSnippet.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteSnippet.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}
