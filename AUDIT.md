# Audit technique — Cidar

> Date : 2026-04-29
> Projet : `/Users/guyboireau/Dev/cidar`

---

## 1. Vue d'ensemble

| Item | Valeur |
|------|--------|
| **Type** | SaaS de monitoring DevOps (status page + health checks) |
| **Framework** | React 19 + Vite + TypeScript |
| **Style** | Tailwind CSS 3.4.19 |
| **Base de données** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email + OAuth GitHub/Google) |
| **État serveur** | TanStack React Query |
| **Forms** | React Hook Form + Zod v4 |
| **Déploiement** | Vercel |
| **Tests** | 0 test écrit |

Architecture par features (pages, services, hooks, components). Bonne séparation services/hooks. Lazy loading des routes via `React.lazy`. README.md est le template par défaut de Vite (non adapté).

---

## 2. Dépendances

### Packages majeurs

| Package | Version actuelle | Statut |
|---------|-----------------|--------|
| `react` / `react-dom` | `^19.2.5` | OK |
| `vite` | `^6.3.4` | OK |
| `tailwindcss` | `3.4.19` | **À METTRE À JOUR** — v4 disponible, migration recommandée |
| `@tanstack/react-query` | `^5.74.4` | OK |
| `@supabase/supabase-js` | `^2.49.4` | OK |
| `react-hook-form` | `^7.74.0` | OK |
| `@hookform/resolvers` | `^5.2.2` | OK |
| `zod` | `^4.3.6` | OK (installé mais quasi inutilisé hors formulaires) |
| `lucide-react` | `^1.11.0` | **OBSOLÈTE / ERREUR** — lucide-react est en 0.x (dernière ~0.469). La contrainte `^1.11.0` ne correspond à aucune release publiée |
| `typescript` | `~6.0.2` | **SUSPECT** — TypeScript n'a pas de version 6.x (dernière ~5.8). Vérifier `node_modules/typescript/package.json` |
| `eslint` | `^10.2.1` | **SUSPECT** — ESLint v10 n'était pas sorti en avril 2025. À vérifier |
| `@types/node` | `^24.12.2` | **SUSPECT** — Node.js 24 n'existe pas encore (LTS = 22). À vérifier |

**Action immédiate** : vérifier `pnpm-lock.yaml` pour `lucide-react`, `typescript`, `eslint`, `@types/node`. Ces versions majeures n'existent probablement pas sur le registry npm.

---

## 3. Dette technique

### 3.1 Recherche `TODO` / `FIXME` / `HACK`

Aucun marqueur `TODO`, `FIXME` ou `HACK` trouvé dans le code source utilisateur.

### 3.2 Usage de `any` en TypeScript

**~15+ occurrences** dans le code source. Principaux hotspots :

- `src/pages/Monitors.tsx:52` : `resolver: zodResolver(schema) as any` — masque un problème de compatibilité Zod v4 / `@hookform/resolvers`
- `src/services/projects.ts` : `as OrgWithPlan[]`
- `src/services/monitors.ts` : `as HttpMonitor[]`
- `src/services/statusPages.ts` : `as HttpMonitor[]`
- `src/services/linkedAccounts.ts` : `as LinkedAccount[]`
- `src/services/resources.ts` : `as Resource[]`
- `src/pages/PublicStatus.tsx` : `as ProjectRow[]`, `as HttpMonitor[]`

**Problème** : `tsconfig.app.json` n'a pas `"strict": true`. Seuls `noUnusedLocals` et `noUnusedParameters` sont activés. `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc. sont désactivés — ce qui masque des bugs potentiels.

### 3.3 Absence de tests

- **0** fichier de test (`*.test.ts` / `*.test.tsx`) dans `src/`.
- Vitest n'est même pas configuré (pas de `vitest.config.ts`).
- Aucune couverture sur les services, hooks, composants et pages.

### 3.4 Fonctions / composants trop longs

| Fichier | Lignes | Problème |
|---------|--------|----------|
| `src/pages/Landing.tsx` | ~606 | Monolithe marketing : hero, features, pricing, testimonials, FAQ, footer. Tout en un seul fichier page. |
| `src/pages/Settings.tsx` | ~303 | Mélange intégrations tierces, notifications, dialog token, formulaire profil. |
| `src/pages/Projects.tsx` | ~302 | Gestion des ressources, formulaire complexe, tableau, logique CRUD. |
| `src/pages/Onboarding.tsx` | ~282 | Wizard avec états locaux et logique directe Supabase. |
| `src/pages/StatusPages.tsx` | ~180 | CRUD + preview public. |

### 3.5 Duplication de code

- **Skeleton loaders** : pattern `Array.from({ length: n })` dupliqué dans Dashboard, Projects, Monitors, StatusPages, etc.
- **Dialog de confirmation** : état `deleteTarget` + `onConfirm` répété dans chaque page (Projects, Monitors, StatusPages, Resources).
- **Tableaux HTML** : classes Tailwind identiques pour les `<table>` dans Projects, Monitors.
- **Appels Supabase boilerplate** : répétés dans tous les services (`import.meta.env.VITE_SUPABASE_URL`, `const { data, error } = await supabase.from(...)`).
- **`useSession` + `userId = session?.user?.id ?? ''`** : répété dans presque toutes les pages (Dashboard, Projects, Monitors, StatusPages, Settings, Billing).
- **Logique de statut global** : `overallStatus` calculée dans `lib/utils.ts` et dupliquée partiellement dans `PublicStatus.tsx`.

### 3.6 Imports non utilisés

`noUnusedLocals: true` dans `tsconfig.app.json` les catch à la compilation, mais ESLint ne le signale pas explicitement en dehors de la build.

### 3.7 Mauvaises pratiques de sécurité

| Problème | Fichier | Détails |
|----------|---------|---------|
| **OAuth callback non sécurisé** | `src/pages/AuthCallback.tsx` | Ne vérifie pas la présence d'un `code` ou d'un `error` dans l'URL. Appelle juste `getSession()`. Vulnérable à des redirections incorrectes. |
| **Appels Supabase directs dans un composant** | `src/pages/PublicStatus.tsx` | Appelle `supabase.from(...)` directement dans le composant React. Viole la règle "toute interaction Supabase passe par `src/services/`". |
| **Appel Supabase direct dans Onboarding** | `src/pages/Onboarding.tsx` | `supabase.from('profiles').update(...)` inline sans passer par un service. |
| **Pas de CSP** | `index.html`, `vercel.json` | Aucune `Content-Security-Policy` définie. |
| **CGU href="#"** | `src/pages/Login.tsx` | Liens conditions d'utilisation avec `href="#"` — anti-pattern UX/juridique. |
| **Boutons sans type** | `src/pages/Landing.tsx` | Des `<button>` sans `type="button"` dans le footer. Risque de soumission involontaire si jamais encapsulés dans un `<form>`. |

---

## 4. Améliorations suggérées

### Performance
- Migrer Tailwind CSS v3 → v4.
- Activer React Compiler (déjà documenté dans un commentaire).
- Lazy loading des images marketing dans `Landing.tsx`.

### Accessibilité
- `index.html` a `lang="en"` alors que l'app est en français. Corriger en `lang="fr"`.
- Ajouter `aria-label` et `role` sur les boutons du header et les tableaux.
- Ajouter `scope="col"` sur les `<th>` des tableaux.
- Ajouter un lien `skip-to-content`.
- Remplacer le `<select>` natif de `Monitors.tsx` par un composant Radix Select pour cohérence UI/UX.

### SEO
- `index.html` titre = `CIdar` (ancien nom). Mettre à jour en `Cidar`.
- Ajouter une meta description dans `index.html`.
- Intégrer `react-helmet-async` pour gérer les `<title>` et `<meta>` par page.

### Typage strict
- Activer `"strict": true` dans `tsconfig.app.json`.
- Générer les types Supabase avec `supabase gen types typescript` pour éviter les `as any` et `as OrgWithPlan[]`.
- Corriger `resolver: zodResolver(schema) as any` — aligner les versions Zod / resolvers.

---

## 5. Fichiers critiques à refactorer

### 1. `src/pages/Landing.tsx`
- **Pourquoi** : 606 lignes, monolithique marketing. Mélange data, UI et page.
- **Action** : découper en sections réutilisables (`HeroSection`, `FeatureSection`, `PricingSection`, `TestimonialsSection`, `FooterSection`).

### 2. `src/pages/Projects.tsx`
- **Pourquoi** : 302 lignes, logique métier dense (ressources, formulaire, table). Duplication de dialog confirmation.
- **Action** : extraire `ResourceTable`, `ProjectForm`, `ConfirmDialog` réutilisable.

### 3. `src/pages/Settings.tsx`
- **Pourquoi** : 303 lignes, mélange intégrations, notifications, dialog token.
- **Action** : extraire `ProviderCard`, `TokenDialog`, `NotificationSettings`.

### 4. `src/pages/Onboarding.tsx`
- **Pourquoi** : 282 lignes, wizard avec états locaux et logique directe Supabase.
- **Action** : découper en étapes séparées (`StepProfile`, `StepOrg`, `StepPlan`) et utiliser des services.

### 5. `src/pages/PublicStatus.tsx`
- **Pourquoi** : appels Supabase directs dans le composant. Logique de statut global dupliquée avec `lib/utils.ts`. Manque de gestion d'erreur réseau.
- **Action** : déplacer les requêtes dans `src/services/statusPages.ts`, réutiliser `overallStatus`, ajouter un état d'erreur.

---

## Résumé exécutif

- **Projet React 19 + Vite bien structuré** (architecture par features, bonne séparation services/hooks).
- **Dette principale** : 0 tests, `strict: false` TypeScript, composants monolithiques (Landing 606 lignes), duplication de patterns UI/dialog, appels Supabase directs hors `src/services/`.
- **Priorité immédiate** : activer `strict: true`, extraire Landing en sections, centraliser les appels Supabase dans les services, ajouter une CSP.

*Fin de l'audit.*
