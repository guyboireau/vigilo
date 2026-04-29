import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Zap, Building2, CreditCard, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePlans } from '@/hooks/useBilling'
import { useCheckout } from '@/hooks/useBilling'
import { useOrg } from '@/contexts/OrgContext'
import { getPlanLabel } from '@/services/billing'
import type { Plan } from '@/types'

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  free: Zap,
  solo: CreditCard,
  agency: Building2,
}

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free: 'Pour découvrir et tester Vigilo.',
  solo: 'Pour un freelance qui gère ses propres projets.',
  agency: 'Pour une agence ou équipe qui livre pour des clients.',
}

function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuit'
  return `${(cents / 100).toFixed(0)}€/mois`
}

function PlanCard({ plan, currentPlanId, onUpgrade, loading }: {
  plan: Plan
  currentPlanId: string
  onUpgrade: (planId: string) => void
  loading: boolean
}) {
  const isCurrent = plan.id === currentPlanId
  const isDowngrade = ['free', 'solo'].includes(plan.id) && currentPlanId === 'agency'
    || plan.id === 'free' && currentPlanId === 'solo'
  const Icon = PLAN_ICONS[plan.id] ?? Zap

  const features = [
    plan.max_projects === -1 ? 'Projets illimités' : `${plan.max_projects} projets`,
    plan.max_monitors === -1 ? 'Moniteurs HTTP illimités' : `${plan.max_monitors} moniteurs HTTP`,
    plan.max_status_pages === 0
      ? 'Pas de status page'
      : plan.max_status_pages === -1
        ? 'Status pages illimitées'
        : `${plan.max_status_pages} status page${plan.max_status_pages > 1 ? 's' : ''}`,
    plan.max_members === 1 ? 'Utilisateur seul' : `${plan.max_members === -1 ? 'Membres illimités' : `${plan.max_members} membres`}`,
    'Alertes email',
    ...(plan.alerts_slack ? ['Alertes Slack'] : []),
    ...(plan.alerts_discord ? ['Alertes Discord'] : []),
  ]

  return (
    <div className={`relative rounded-xl border bg-card p-6 flex flex-col gap-4 transition-all ${
      isCurrent ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/40'
    } ${plan.id === 'solo' ? 'shadow-md' : ''}`}>
      {plan.id === 'solo' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full">
            Recommandé
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-base">{getPlanLabel(plan.id)}</p>
          <p className="text-xs text-muted-foreground">{PLAN_DESCRIPTIONS[plan.id]}</p>
        </div>
      </div>

      <div className="text-3xl font-extrabold tracking-tight">
        {formatPrice(plan.price_monthly)}
      </div>

      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${
              f.startsWith('Pas') ? 'text-muted-foreground/40' : 'text-emerald-500'
            }`} />
            <span className={f.startsWith('Pas') ? 'text-muted-foreground/60 line-through' : ''}>{f}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="mt-auto flex items-center justify-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 py-2 text-sm font-medium text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Plan actuel
        </div>
      ) : (
        <Button
          className="mt-auto w-full"
          variant={isDowngrade ? 'outline' : 'default'}
          onClick={() => onUpgrade(plan.id)}
          loading={loading}
          disabled={plan.id === 'free' && currentPlanId !== 'free'}
        >
          {plan.id === 'free' && currentPlanId !== 'free'
            ? 'Résilier (portail Stripe)'
            : isDowngrade
              ? 'Rétrograder'
              : 'Passer à ce plan'}
        </Button>
      )}
    </div>
  )
}

export default function Billing() {
  const [searchParams] = useSearchParams()
  const { currentOrg } = useOrg()
  const { data: plans = [], isLoading: plansLoading } = usePlans()
  const checkout = useCheckout()

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('Abonnement activé ! Bienvenue sur le plan payant.')
    }
  }, [searchParams])

  const currentPlanId = currentOrg?.plan_id ?? 'free'
  const periodEnd = currentOrg?.current_period_end
  const cancelAtEnd = currentOrg?.cancel_at_period_end
  const subscriptionStatus = currentOrg?.subscription_status

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">Facturation</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gérez votre abonnement et vos limites.
        </p>
      </div>

      {subscriptionStatus === 'past_due' && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 flex gap-2.5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Paiement en échec</p>
            <p className="text-xs mt-0.5">Mettez à jour votre moyen de paiement pour conserver l'accès aux fonctionnalités payantes.</p>
          </div>
        </div>
      )}

      {cancelAtEnd && periodEnd && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex gap-2.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Votre abonnement sera annulé le{' '}
            <strong>{new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
            Réabonnez-vous depuis le portail Stripe pour continuer.
          </p>
        </div>
      )}

      {plansLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-80 rounded-xl border bg-card animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={currentPlanId}
              onUpgrade={(planId) => checkout.mutate({ planId })}
              loading={checkout.isPending && checkout.variables?.planId === plan.id}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground space-y-1">
        <p>• Les abonnements sont gérés via Stripe. Résiliation possible à tout moment depuis le portail de facturation.</p>
        <p>• En cas de dépassement des limites du plan Free, la création de nouvelles ressources sera bloquée.</p>
        <p>• Questions ? <a href="mailto:boireauguy@gmail.com" className="text-primary hover:underline">Contactez-nous</a>.</p>
      </div>
    </div>
  )
}
