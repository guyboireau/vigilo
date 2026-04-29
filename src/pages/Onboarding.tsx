import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, GitBranch, Globe, CheckCircle2, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/hooks/useAuth'
import { useUpsertLinkedAccount } from '@/hooks/useIntegrations'
import { useCreateMonitor } from '@/hooks/useMonitors'
import { completeOnboarding } from '@/services/auth'
import { useOrg } from '@/contexts/OrgContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

type Step = 'welcome' | 'connect' | 'monitor' | 'done'

const STEPS: Step[] = ['welcome', 'connect', 'monitor', 'done']

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
            i < idx ? 'bg-emerald-500 text-white' :
            i === idx ? 'bg-primary text-primary-foreground' :
            'bg-muted text-muted-foreground'
          }`}>
            {i < idx ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 rounded ${i < idx ? 'bg-emerald-500' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const session = useSession()
  const { currentOrg } = useOrg()
  const queryClient = useQueryClient()
  const upsertLinked = useUpsertLinkedAccount(session?.user?.id ?? '')
  const createMonitor = useCreateMonitor(session?.user?.id ?? '')

  const [step, setStep] = useState<Step>('welcome')
  const [githubToken, setGithubToken] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [vercelToken, setVercelToken] = useState('')
  const [monitorName, setMonitorName] = useState('')
  const [monitorUrl, setMonitorUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [creatingMonitor, setCreatingMonitor] = useState(false)
  const [skippedConnect, setSkippedConnect] = useState(false)
  const [skippedMonitor, setSkippedMonitor] = useState(false)

  async function handleConnect() {
    if (!githubToken && !vercelToken) {
      setSkippedConnect(true)
      setStep('monitor')
      return
    }
    setConnecting(true)
    try {
      if (githubToken) {
        await upsertLinked.mutateAsync({ provider: 'github', token: githubToken, username: githubUsername })
      }
      if (vercelToken) {
        await upsertLinked.mutateAsync({ provider: 'vercel', token: vercelToken })
      }
      setStep('monitor')
    } catch {
      toast.error('Erreur lors de la connexion. Vérifiez vos tokens.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleMonitor() {
    if (!monitorUrl) {
      setSkippedMonitor(true)
      setStep('done')
      return
    }
    setCreatingMonitor(true)
    try {
      await createMonitor.mutateAsync({
        name: monitorName || monitorUrl,
        url: monitorUrl,
        expected_status: 200,
        interval_minutes: 5,
        project_id: null,
        org_id: currentOrg?.id ?? null,
      })
      setStep('done')
    } catch {
      toast.error('Erreur création moniteur. Vérifiez l\'URL.')
    } finally {
      setCreatingMonitor(false)
    }
  }

  async function handleFinish() {
    if (!session?.user?.id) return
    await completeOnboarding(session.user.id)
    await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] })
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold">Bienvenue sur Vigilo</h1>
          <p className="text-sm text-muted-foreground text-center">
            Configurez votre espace en 3 minutes.
          </p>
        </div>

        <StepIndicator current={step} />

        {/* Steps */}
        <div className="rounded-xl border bg-card p-6 space-y-6">
          {step === 'welcome' && (
            <>
              <div className="space-y-2">
                <h2 className="font-bold text-lg">Votre dashboard de monitoring</h2>
                <p className="text-sm text-muted-foreground">
                  Vigilo surveille vos projets web, vos déploiements et vos APIs — et vous alerte instantanément quand quelque chose tombe.
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  { icon: GitBranch, text: 'CI/CD GitHub, GitLab, Vercel en un coup d\'œil' },
                  { icon: Globe, text: 'Moniteurs HTTP pour vos APIs et sites' },
                  { icon: Zap, text: 'Alertes email, Slack, Discord' },
                  { icon: CheckCircle2, text: 'Status pages publiques pour vos clients' },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
              <Button className="w-full gap-2" onClick={() => setStep('connect')}>
                Commencer la configuration <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 'connect' && (
            <>
              <div className="space-y-1">
                <h2 className="font-bold text-lg">Connectez vos services</h2>
                <p className="text-sm text-muted-foreground">Optionnel — vous pouvez le faire plus tard dans Paramètres.</p>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <GitBranch className="h-4 w-4" /> GitHub
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Personal Access Token</Label>
                      <Input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxx"
                        value={githubToken}
                        onChange={e => setGithubToken(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nom d'utilisateur (optionnel)</Label>
                      <Input
                        placeholder="votre-username"
                        value={githubUsername}
                        onChange={e => setGithubUsername(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Globe className="h-4 w-4" /> Vercel
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Access Token</Label>
                    <Input
                      type="password"
                      placeholder="xxxxxxxxxxxxxx"
                      value={vercelToken}
                      onChange={e => setVercelToken(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setSkippedConnect(true); setStep('monitor') }}>
                  Passer cette étape
                </Button>
                <Button className="flex-1 gap-2" onClick={handleConnect} loading={connecting}>
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 'monitor' && (
            <>
              <div className="space-y-1">
                <h2 className="font-bold text-lg">Votre premier moniteur HTTP</h2>
                <p className="text-sm text-muted-foreground">Entrez une URL à surveiller. Vigilo la pingera toutes les 5 minutes.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>URL à surveiller</Label>
                  <Input
                    placeholder="https://mon-site.fr"
                    value={monitorUrl}
                    onChange={e => setMonitorUrl(e.target.value)}
                    type="url"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom (optionnel)</Label>
                  <Input
                    placeholder="Mon site principal"
                    value={monitorName}
                    onChange={e => setMonitorName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setSkippedMonitor(true); setStep('done') }}>
                  Passer cette étape
                </Button>
                <Button className="flex-1 gap-2" onClick={handleMonitor} loading={creatingMonitor}>
                  Créer le moniteur <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-bold text-xl">Tout est prêt !</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {skippedConnect && skippedMonitor
                      ? 'Vous pouvez tout configurer depuis le dashboard.'
                      : 'Votre espace Vigilo est configuré. Ajoutez vos projets depuis le dashboard.'}
                  </p>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={handleFinish}>
                Aller au dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
