import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GitBranch, GitFork, Globe, Cloud, Link, Link2Off, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSession } from '@/hooks/useAuth'
import { useLinkedAccounts, useUpsertLinkedAccount, useDeleteLinkedAccount } from '@/hooks/useIntegrations'
import type { Provider } from '@/types'

const tokenSchema = z.object({ token: z.string().min(1, 'Token requis'), username: z.string().optional() })
type TokenForm = z.infer<typeof tokenSchema>

const PROVIDERS: {
  id: Provider
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  placeholder: string
  usernamePlaceholder?: string
  docsUrl: string
}[] = [
  {
    id: 'github',
    label: 'GitHub',
    icon: GitBranch,
    description: 'Surveille les GitHub Actions (workflows CI/CD). Nécessite un Personal Access Token avec scope `repo` et `workflow`.',
    placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    usernamePlaceholder: 'guyboireau',
    docsUrl: 'https://github.com/settings/tokens',
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    icon: GitFork,
    description: 'Surveille les pipelines CI/CD GitLab. Nécessite un Personal Access Token avec scope `read_api`.',
    placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
    usernamePlaceholder: 'guyboireau',
    docsUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens',
  },
  {
    id: 'vercel',
    label: 'Vercel',
    icon: Globe,
    description: 'Surveille les déploiements Vercel. Nécessite un Access Token depuis les paramètres Vercel.',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://vercel.com/account/tokens',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    icon: Cloud,
    description: 'Surveille les Workers, Pages et zones Cloudflare. Nécessite un API Token avec permissions `Zone:Read` et `Workers Scripts:Read`.',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
]

interface ProviderCardProps {
  provider: typeof PROVIDERS[number]
  isLinked: boolean
  username?: string | null
  onConnect: () => void
  onDisconnect: () => void
  loading?: boolean
}

function ProviderCard({ provider, isLinked, username, onConnect, onDisconnect, loading }: ProviderCardProps) {
  const Icon = provider.icon

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{provider.label}</p>
              {isLinked && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Connecté
                </span>
              )}
            </div>
            {isLinked && username && (
              <p className="text-xs text-muted-foreground">@{username}</p>
            )}
          </div>
        </div>
        <Button
          variant={isLinked ? 'outline' : 'default'}
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={isLinked ? onDisconnect : onConnect}
          loading={loading}
        >
          {isLinked ? (
            <><Link2Off className="h-3.5 w-3.5" />Déconnecter</>
          ) : (
            <><Link className="h-3.5 w-3.5" />Connecter</>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{provider.description}</p>
    </div>
  )
}

export default function Settings() {
  const session = useSession()
  const userId = session?.user?.id ?? ''
  const { data: accounts = [], isLoading } = useLinkedAccounts(userId)
  const upsert = useUpsertLinkedAccount(userId)
  const remove = useDeleteLinkedAccount(userId)

  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TokenForm>({
    resolver: zodResolver(tokenSchema),
  })

  function isLinked(id: Provider) {
    return accounts.some(a => a.provider === id)
  }

  function getAccount(id: Provider) {
    return accounts.find(a => a.provider === id)
  }

  async function onSubmit(data: TokenForm) {
    if (!activeProvider) return
    setError(null)
    try {
      await upsert.mutateAsync({ provider: activeProvider, token: data.token, username: data.username })
      setActiveProvider(null)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const activeProviderDef = PROVIDERS.find(p => p.id === activeProvider)

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Intégrations</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Connectez vos services pour surveiller vos projets. Les tokens sont stockés de façon sécurisée.
        </p>
      </div>

      <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex gap-2.5 text-xs text-amber-700 dark:text-amber-400">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Vos tokens sont transmis uniquement aux Edge Functions Supabase (serveur) et ne transitent jamais par votre navigateur lors des vérifications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {PROVIDERS.map(provider => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isLinked={isLinked(provider.id)}
              username={getAccount(provider.id)?.username}
              onConnect={() => { setActiveProvider(provider.id); setError(null); reset() }}
              onDisconnect={() => remove.mutate(provider.id)}
              loading={remove.isPending && remove.variables === provider.id}
            />
          ))}
        </div>
      )}

      {/* Token dialog */}
      <Dialog open={!!activeProvider} onOpenChange={open => { if (!open) { setActiveProvider(null); reset(); setError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connecter {activeProviderDef?.label}</DialogTitle>
            <DialogDescription>
              Entrez votre token API.{' '}
              {activeProviderDef && (
                <a href={activeProviderDef.docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Générer un token →
                </a>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {activeProviderDef?.usernamePlaceholder && (
              <div className="space-y-1.5">
                <Label>Username (optionnel)</Label>
                <Input placeholder={activeProviderDef.usernamePlaceholder} {...register('username')} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Token *</Label>
              <Input
                type="password"
                placeholder={activeProviderDef?.placeholder}
                autoComplete="off"
                {...register('token')}
              />
              {errors.token && <p className="text-xs text-destructive">{errors.token.message}</p>}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setActiveProvider(null); reset() }}>
                Annuler
              </Button>
              <Button type="submit" size="sm" loading={isSubmitting}>
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
