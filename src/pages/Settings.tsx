import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GitBranch, GitFork, Globe, Cloud, Link, Link2Off, CheckCircle2, AlertCircle, Bell, Mail, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useSession } from '@/hooks/useAuth'
import { useLinkedAccounts, useUpsertLinkedAccount, useDeleteLinkedAccount } from '@/hooks/useIntegrations'
import { useNotificationSettings, useUpsertNotificationSettings } from '@/hooks/useNotifications'
import type { Provider } from '@/types'

const tokenSchema = z.object({ token: z.string().min(1, 'Token requis'), username: z.string().optional() })
type TokenForm = z.infer<typeof tokenSchema>

const notifSchema = z.object({
  email_on_failure: z.boolean(),
  email_on_recovery: z.boolean(),
  email_daily: z.boolean(),
  slack_webhook: z.string().optional(),
  discord_webhook: z.string().optional(),
})
type NotifForm = z.infer<typeof notifSchema>

const OAUTH_PROVIDERS = new Set<Provider>(['github', 'gitlab', 'vercel'])

const PROVIDERS: {
  id: Provider
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  placeholder: string
  usernamePlaceholder?: string
  docsUrl: string
  oauth?: boolean
}[] = [
  {
    id: 'github',
    label: 'GitHub',
    icon: GitBranch,
    description: 'Surveille les GitHub Actions. Connexion OAuth automatique — aucun token à copier.',
    placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
    usernamePlaceholder: 'guyboireau',
    docsUrl: 'https://github.com/settings/developers',
    oauth: true,
  },
  {
    id: 'gitlab',
    label: 'GitLab',
    icon: GitFork,
    description: 'Surveille les pipelines CI/CD GitLab. Connexion OAuth automatique — aucun token à copier.',
    placeholder: 'glpat-xxxxxxxxxxxxxxxxxxxx',
    usernamePlaceholder: 'guyboireau',
    docsUrl: 'https://gitlab.com/-/profile/applications',
    oauth: true,
  },
  {
    id: 'vercel',
    label: 'Vercel',
    icon: Globe,
    description: 'Surveille les déploiements Vercel. Connexion OAuth automatique — aucun token à copier.',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://vercel.com/dashboard/integrations',
    oauth: true,
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    icon: Cloud,
    description: 'Surveille les Workers et zones Cloudflare. API Token avec permissions `Zone:Read` et `Workers Scripts:Read`.',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },
]

function getOAuthUrl(provider: Provider, userId: string): string {
  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-callback`
  // Encode provider in state since OAuth providers only return code + state
  const state = encodeURIComponent(`${userId}:${provider}`)

  if (provider === 'github') {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('repo workflow')}&state=${state}`
  }

  if (provider === 'gitlab') {
    const clientId = import.meta.env.VITE_GITLAB_CLIENT_ID
    return `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('read_api')}&state=${state}`
  }

  if (provider === 'vercel') {
    const clientId = import.meta.env.VITE_VERCEL_CLIENT_ID
    return `https://vercel.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  }

  return ''
}

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
                  <CheckCircle2 className="h-2.5 w-2.5" /> Connecté
                </span>
              )}
            </div>
            {isLinked && username && <p className="text-xs text-muted-foreground">@{username}</p>}
          </div>
        </div>
        <Button variant={isLinked ? 'outline' : 'default'} size="sm" className="shrink-0 gap-1.5" onClick={isLinked ? onDisconnect : onConnect} loading={loading}>
          {isLinked ? <><Link2Off className="h-3.5 w-3.5" />Déconnecter</> : <><Link className="h-3.5 w-3.5" />Connecter</>}
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
  const { data: notifSettings } = useNotificationSettings(userId)
  const upsertNotif = useUpsertNotificationSettings(userId)

  const [activeProvider, setActiveProvider] = useState<Provider | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const { register: regToken, handleSubmit: handleToken, reset: resetToken, formState: { errors: tokenErrors, isSubmitting: tokenSubmitting } } = useForm<TokenForm>({
    resolver: zodResolver(tokenSchema),
  })

  const { register: regNotif, handleSubmit: handleNotif, reset: resetNotif, formState: { isSubmitting: notifSubmitting } } = useForm<NotifForm>({
    resolver: zodResolver(notifSchema),
    defaultValues: {
      email_on_failure: true,
      email_on_recovery: true,
      email_daily: true,
      slack_webhook: '',
      discord_webhook: '',
    },
  })

  useEffect(() => {
    if (notifSettings) {
      resetNotif({
        email_on_failure: notifSettings.email_on_failure,
        email_on_recovery: notifSettings.email_on_recovery,
        email_daily: notifSettings.email_daily,
        slack_webhook: notifSettings.slack_webhook ?? '',
        discord_webhook: notifSettings.discord_webhook ?? '',
      })
    }
  }, [notifSettings, resetNotif])

  function isLinked(id: Provider) { return accounts.some(a => a.provider === id) }
  function getAccount(id: Provider) { return accounts.find(a => a.provider === id) }

  async function onTokenSubmit(data: TokenForm) {
    if (!activeProvider) return
    setTokenError(null)
    try {
      await upsert.mutateAsync({ provider: activeProvider, token: data.token, username: data.username })
      setActiveProvider(null)
      resetToken()
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function onNotifSubmit(data: NotifForm) {
    await upsertNotif.mutateAsync({
      email_on_failure: data.email_on_failure,
      email_on_recovery: data.email_on_recovery,
      email_daily: data.email_daily,
      slack_webhook: data.slack_webhook || null,
      discord_webhook: data.discord_webhook || null,
    })
  }

  const activeProviderDef = PROVIDERS.find(p => p.id === activeProvider)

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      {/* Integrations */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Intégrations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Connectez vos services. Les tokens sont stockés de façon sécurisée côté serveur.</p>
        </div>

        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex gap-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Vos tokens ne transitent jamais par votre navigateur lors des vérifications.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-lg border bg-card animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isLinked={isLinked(provider.id)}
                username={getAccount(provider.id)?.username}
                onConnect={() => {
                  if (OAUTH_PROVIDERS.has(provider.id)) {
                    window.location.href = getOAuthUrl(provider.id, userId)
                  } else {
                    setActiveProvider(provider.id)
                    setTokenError(null)
                    resetToken()
                  }
                }}
                onDisconnect={() => remove.mutate(provider.id)}
                loading={remove.isPending && remove.variables === provider.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <div>
            <h2 className="text-lg font-bold">Notifications</h2>
            <p className="text-xs text-muted-foreground">Configurez comment être alerté en cas de problème.</p>
          </div>
        </div>

        <form onSubmit={handleNotif(onNotifSubmit)} className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </div>
            <div className="space-y-2 pl-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...regNotif('email_on_failure')} className="rounded" />
                Alerte instantanée en cas d'erreur ou warning
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...regNotif('email_on_recovery')} className="rounded" />
                Alerte de rétablissement (retour à la normale)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...regNotif('email_daily')} className="rounded" />
                Rapport quotidien (7h Paris)
              </label>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Slack / Discord
            </div>
            <div className="space-y-3 pl-6">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Webhook Slack</Label>
                <Input placeholder="https://hooks.slack.com/services/..." {...regNotif('slack_webhook')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Webhook Discord</Label>
                <Input placeholder="https://discord.com/api/webhooks/..." {...regNotif('discord_webhook')} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={notifSubmitting}>Enregistrer</Button>
          </div>
        </form>
      </div>

      {/* Token dialog */}
      <Dialog open={!!activeProvider} onOpenChange={open => { if (!open) { setActiveProvider(null); resetToken(); setTokenError(null) } }}>
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
          <form onSubmit={handleToken(onTokenSubmit)} className="space-y-4">
            {activeProviderDef?.usernamePlaceholder && (
              <div className="space-y-1.5">
                <Label>Username (optionnel)</Label>
                <Input placeholder={activeProviderDef.usernamePlaceholder} {...regToken('username')} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Token *</Label>
              <Input type="password" placeholder={activeProviderDef?.placeholder} autoComplete="off" {...regToken('token')} />
              {tokenErrors.token && <p className="text-xs text-destructive">{tokenErrors.token.message}</p>}
            </div>
            {tokenError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{tokenError}</div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setActiveProvider(null); resetToken() }}>Annuler</Button>
              <Button type="submit" size="sm" loading={tokenSubmitting}>Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
