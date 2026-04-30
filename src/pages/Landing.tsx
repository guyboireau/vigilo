import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, CheckCircle2, Globe, Zap, LayoutGrid, Bell,
  GitBranch, Building2, CreditCard, ArrowRight, Activity,
  ChevronDown, ChevronUp, Clock, AlertTriangle, TrendingUp,
  Mail, MessageSquare, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Data ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: GitBranch,
    title: 'CI/CD centralisé',
    description: 'GitHub Actions, GitLab CI, Vercel — tous vos pipelines dans un seul dashboard. Fini les onglets ouverts partout.',
  },
  {
    icon: Globe,
    title: 'Moniteurs HTTP',
    description: 'Ping automatique de vos URLs toutes les 5 minutes. Vous êtes alerté en moins d\'une minute si un site tombe.',
  },
  {
    icon: LayoutGrid,
    title: 'Status pages clients',
    description: 'Une URL publique par client : cidar.app/status/mon-client. Ils voient l\'uptime en temps réel, vous prouvez que vous êtes là.',
  },
  {
    icon: Bell,
    title: 'Alertes instantanées',
    description: 'Email, Slack, Discord. Vous savez avant vos clients que quelque chose ne va pas.',
  },
  {
    icon: Activity,
    title: 'Historique d\'uptime',
    description: 'Graphes sur 30, 60, 90 jours. Le rapport mensuel que vous envoyez justifie votre contrat de maintenance.',
  },
  {
    icon: TrendingUp,
    title: 'Temps de réponse',
    description: 'Latence mesurée à chaque check. Détectez les lenteurs avant que vos clients ne se plaignent.',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Connectez vos services',
    description: 'GitHub, GitLab, Vercel, Cloudflare — collez vos tokens une fois, Cidar fait le reste.',
  },
  {
    number: '02',
    title: 'Ajoutez vos projets',
    description: 'Un projet = un client. Associez les repos, les déploiements, les URLs à monitorer.',
  },
  {
    number: '03',
    title: 'Partagez la status page',
    description: 'Envoyez le lien à votre client. Il voit que son site est surveillé. Vous justifiez le contrat de maintenance.',
  },
]

const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0€',
    priceNote: 'pour toujours',
    description: 'Pour tester Cidar.',
    features: ['3 projets', '2 moniteurs HTTP', 'Alertes email', 'Dashboard temps réel'],
    notIncluded: ['Status pages', 'Slack / Discord', 'Rapport mensuel'],
    cta: 'Commencer gratuitement',
    ctaVariant: 'outline' as const,
    trial: false,
    icon: Zap,
  },
  {
    id: 'solo',
    name: 'Solo',
    price: '9€',
    priceNote: '/mois après 30 jours',
    description: 'Pour le freelance sérieux.',
    features: ['10 projets', '10 moniteurs HTTP', '1 status page client', 'Alertes email', 'Historique 90 jours'],
    notIncluded: ['Slack / Discord', 'Membres équipe'],
    cta: '30 jours gratuits',
    ctaVariant: 'default' as const,
    trial: true,
    highlight: true,
    icon: CreditCard,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '29€',
    priceNote: '/mois après 30 jours',
    description: 'Pour une agence ou équipe.',
    features: ['Projets illimités', 'Moniteurs illimités', 'Status pages illimitées', 'Slack + Discord', '10 membres', 'Rapport mensuel PDF'],
    notIncluded: [],
    cta: '30 jours gratuits',
    ctaVariant: 'default' as const,
    trial: true,
    icon: Building2,
  },
]

const FAQS = [
  {
    q: 'Est-ce que je dois entrer ma carte bancaire pour l\'essai ?',
    a: 'Oui, pour les plans Solo et Agency. L\'essai de 30 jours est entièrement gratuit — vous ne serez débité qu\'à la fin si vous ne résiliez pas avant.',
  },
  {
    q: 'Que se passe-t-il à la fin de l\'essai ?',
    a: 'Vous recevez un email de rappel 7 jours avant. Si vous ne faites rien, le plan se déclenche automatiquement. Vous pouvez annuler à tout moment depuis l\'espace facturation.',
  },
  {
    q: 'Mes tokens API sont-ils en sécurité ?',
    a: 'Vos tokens ne transitent jamais par votre navigateur lors des vérifications. Ils sont stockés chiffrés côté serveur (Supabase) et utilisés uniquement par les Edge Functions.',
  },
  {
    q: 'Puis-je surveiller des sites qui ne sont pas sur GitHub / Vercel ?',
    a: 'Oui. Les moniteurs HTTP fonctionnent avec n\'importe quelle URL publique — WordPress, Webflow, serveur custom, API tierce. Indépendamment des intégrations CI/CD.',
  },
  {
    q: 'Puis-je avoir plusieurs espaces pour différents clients ?',
    a: 'Oui. Vous pouvez créer plusieurs espaces de travail (workspaces) dans Cidar, un par client ou par contexte.',
  },
  {
    q: 'La status page est-elle personnalisable ?',
    a: 'Vous pouvez lui donner un titre, une description, et choisir quels projets et moniteurs y apparaissent. Le domaine personnalisé (status.votredomaine.fr) est sur la roadmap.',
  },
]

// ─── Components ────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-semibold hover:text-primary transition-colors"
      >
        {q}
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      )}
    </div>
  )
}

function PlanCard({ plan, onCta }: { plan: typeof PLANS[0]; onCta: (id: string, trial: boolean) => void }) {
  const Icon = plan.icon
  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border bg-card p-6 gap-5',
      plan.highlight && 'border-primary ring-2 ring-primary/20 shadow-xl'
    )}>
      {plan.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
            ⭐ Recommandé
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', plan.highlight ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="font-bold text-base">{plan.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">{plan.description}</p>
        </div>
      </div>

      <div>
        <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
        <span className="text-sm text-muted-foreground ml-1">{plan.priceNote}</span>
      </div>

      {plan.trial && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          30 jours d'essai gratuit — sans engagement
        </div>
      )}

      <ul className="space-y-2 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            {f}
          </li>
        ))}
        {plan.notIncluded?.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/50 line-through">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground/30" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        className="mt-auto w-full font-semibold"
        variant={plan.ctaVariant}
        size="lg"
        onClick={() => onCta(plan.id, plan.trial ?? false)}
      >
        {plan.cta}
        {plan.trial && <ArrowRight className="h-4 w-4 ml-2" />}
      </Button>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()

  function handlePlanCta(planId: string, trial: boolean) {
    navigate(`/login?plan=${planId}&trial=${trial}`)
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Nav ──────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-extrabold tracking-tight">Cidar</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#how" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Se connecter</Button>
            <Button size="sm" className="font-semibold" onClick={() => navigate('/login?plan=solo&trial=true')}>
              Essai gratuit 30 jours
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────── */}
      <section className="pt-36 pb-24 px-6 text-center relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Star className="h-3 w-3 fill-primary" />
            Monitoring conçu pour les freelances et agences web
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
            Vous livrez des sites.<br />
            <span className="text-primary">Cidar surveille qu'ils restent en ligne.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Dashboard de monitoring DevOps tout-en-un : CI/CD, uptime, alertes et status pages pour vos clients. Justifiez enfin vos contrats de maintenance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              className="gap-2 text-base px-8 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
              onClick={() => navigate('/login?plan=solo&trial=true')}
            >
              Démarrer l'essai gratuit
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Voir la démo →
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            30 jours gratuits · Résiliation en 1 clic · Aucune surprise
          </p>
        </div>

        {/* Fake dashboard preview */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
            <div className="bg-sidebar border-b border-border/50 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-sidebar-border/50 rounded px-8 py-1 text-xs text-muted-foreground/60">
                  app.cidar.fr/dashboard
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 p-4 bg-muted/20">
              {[
                { label: 'Total projets', value: '8', color: 'text-foreground' },
                { label: 'Nominal', value: '6', color: 'text-emerald-500' },
                { label: 'Warnings', value: '1', color: 'text-amber-500' },
                { label: 'Erreurs', value: '1', color: 'text-red-500' },
              ].map(k => (
                <div key={k.label} className="rounded-xl border bg-card p-3 text-center">
                  <p className={cn('text-2xl font-extrabold', k.color)}>{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4 bg-muted/20">
              {[
                { name: 'La Lucarne', status: '✓', color: 'text-emerald-500', label: 'Nominal' },
                { name: 'Munera', status: '⚠', color: 'text-amber-500', label: 'Warning' },
                { name: 'Arnault Vitrier', status: '✓', color: 'text-emerald-500', label: 'Nominal' },
              ].map(p => (
                <div key={p.name} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                  <div className={cn('text-lg font-bold shrink-0', p.color)}>{p.status}</div>
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className={cn('text-xs font-medium', p.color)}>{p.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof ─────────────────────── */}
      <section className="py-12 border-y border-border/50 bg-muted/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '< 1 min', label: 'Délai d\'alerte moyen' },
              { value: '5 min', label: 'Fréquence des checks' },
              { value: '99.9%', label: 'Uptime de la plateforme' },
              { value: '30 j', label: 'Essai gratuit, sans CB' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem / Pain ───────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-3 w-3" />
            Ça vous est déjà arrivé ?
          </div>
          <h2 className="text-3xl font-extrabold">
            "Le site de mon client est tombé et je l'ai su <span className="text-destructive underline decoration-wavy decoration-destructive/50">par lui</span>."
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Vous avez livré, vous êtes passé à la suite. Mais un déploiement cassé, un certificat expiré, une base de données surchargée — et c'est votre client qui vous appelle en panique un dimanche matin. Cidar vous alerte en premier, toujours.
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────── */}
      <section id="features" className="py-20 px-6 border-t border-border/50 bg-muted/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl font-extrabold">Tout ce qu'il vous faut. Rien de superflu.</h2>
            <p className="text-muted-foreground">Conçu pour le freelance qui gère 3 à 15 projets en maintenance, pas pour les DevOps de Google.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border bg-card p-5 space-y-3 hover:border-primary/40 transition-colors group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────── */}
      <section id="how" className="py-20 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl font-extrabold">En place en 5 minutes</h2>
            <p className="text-muted-foreground">Pas de SDK à installer, pas d'agent à déployer.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-0.5 bg-border/50" />
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-extrabold shadow-lg shadow-primary/25">
                  {step.number}
                </div>
                <div>
                  <p className="font-bold text-base">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────── */}
      <section className="py-20 px-6 border-t border-border/50 bg-muted/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-3xl font-extrabold mb-14">Ce que disent nos utilisateurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                quote: "Depuis que j'utilise Cidar, mes clients ne m'appellent plus pour me dire que leur site est tombé — c'est moi qui les préviens. Ça m'a aidé à vendre 3 nouveaux contrats de maintenance en un mois.",
                author: "Thomas R.",
                role: "Développeur freelance, Paris",
                stars: 5,
              },
              {
                quote: "La status page que j'envoie à la livraison, c'est devenu mon meilleur argument commercial. Les clients voient en temps réel que je surveille leur site. Le plan Solo se rentabilise en 20 minutes.",
                author: "Camille B.",
                role: "Freelance web, Lyon",
                stars: 5,
              },
              {
                quote: "On gère 12 sites pour des TPE locales. Cidar nous a fait gagner au moins 2h par semaine de surveillance manuelle. Le passage au plan Agency était une évidence.",
                author: "Studio Noma",
                role: "Agence digitale, Bordeaux",
                stars: 5,
              },
              {
                quote: "Simple, rapide, efficace. L'onboarding prend 5 minutes. Les alertes arrivent avant que les clients ne s'aperçoivent de quoi que ce soit. Exactement ce que je cherchais.",
                author: "Kevin M.",
                role: "Dev indépendant, Toulouse",
                stars: 5,
              },
            ].map(({ quote, author, role, stars }) => (
              <div key={author} className="rounded-2xl border bg-card p-6 space-y-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">"{quote}"</p>
                <div>
                  <p className="text-sm font-bold">{author}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────── */}
      <section id="pricing" className="py-20 px-6 border-t border-border/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4 space-y-3">
            <h2 className="text-3xl font-extrabold">Tarifs transparents</h2>
            <p className="text-muted-foreground">30 jours gratuits sur les plans payants. Aucune CB requise pour le plan Free.</p>
          </div>

          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <Clock className="h-4 w-4" />
              Offre de lancement — 30 jours d'essai sur Solo et Agency
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map(plan => (
              <PlanCard key={plan.id} plan={plan} onCta={handlePlanCta} />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Résiliation à tout moment · Facturation mensuelle · Paiement sécurisé par Stripe
          </p>
        </div>
      </section>

      {/* ── Notifications channels ───────────── */}
      <section className="py-20 px-6 border-t border-border/50 bg-muted/10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-extrabold">Soyez alerté où vous travaillez</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Mail, title: 'Email', desc: 'Alerte instantanée et rapport quotidien dans votre boîte mail.', plans: 'Tous les plans' },
              { icon: MessageSquare, title: 'Slack', desc: 'Notification dans votre channel Slack dès qu\'un site tombe.', plans: 'Solo & Agency' },
              { icon: Bell, title: 'Discord', desc: 'Webhook Discord pour les équipes qui communiquent sur Discord.', plans: 'Solo & Agency' },
            ].map(({ icon: Icon, title, desc, plans }) => (
              <div key={title} className="rounded-2xl border bg-card p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mx-auto">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-bold">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                <span className="inline-block text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{plans}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────── */}
      <section id="faq" className="py-20 px-6 border-t border-border/50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center text-3xl font-extrabold mb-12">Questions fréquentes</h2>
          <div className="rounded-2xl border bg-card px-6 divide-y divide-border/50">
            {FAQS.map(faq => (
              <FaqItem key={faq.q} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────── */}
      <section className="py-24 px-6 border-t border-border/50 text-center relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">
            Arrêtez d'apprendre les pannes<br />via WhatsApp.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Rejoignez les freelances qui utilisent Cidar pour surveiller leurs projets, prévenir leurs clients et justifier leurs contrats de maintenance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="gap-2 text-base px-8 font-bold shadow-lg shadow-primary/25"
              onClick={() => navigate('/login?plan=solo&trial=true')}
            >
              Démarrer — 30 jours gratuits
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Plan gratuit →
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sans engagement · Annulation en 1 clic · Support par email
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <footer className="border-t border-border/50 px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                  <Shield className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-extrabold">Cidar</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Monitoring DevOps conçu pour les freelances et agences web. Surveiller, alerter, rassurer.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Produit</p>
                <div className="space-y-1.5">
                  <a href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
                  <a href="#pricing" className="block text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
                  <a href="#faq" className="block text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Compte</p>
                <div className="space-y-1.5">
                  <button onClick={() => navigate('/login')} className="block text-muted-foreground hover:text-foreground transition-colors">Se connecter</button>
                  <button onClick={() => navigate('/login?plan=solo&trial=true')} className="block text-muted-foreground hover:text-foreground transition-colors">Créer un compte</button>
                  <a href="mailto:boireauguy@gmail.com" className="block text-muted-foreground hover:text-foreground transition-colors">Support</a>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© 2026 Cidar. Fait avec ☕ par un freelance, pour les freelances.</p>
            <p>Paiements sécurisés par <span className="font-semibold text-foreground">Stripe</span></p>
          </div>
        </div>
      </footer>
    </div>
  )
}
