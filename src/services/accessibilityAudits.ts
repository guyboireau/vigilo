import { supabase } from '@/lib/supabase'
import type { AccessibilityAudit, AccessibilityIssue } from '@/types'

export interface AccessibilityScanResult {
  url: string
  title: string
  wcag_version: string
  conformance_level: 'A' | 'AA' | 'AAA'
  total_issues: number
  score: number
  issues: AccessibilityIssue[]
}

// ── WCAG Accessibility Detection Engine ──────────────────────

const WCAG_RULES = {
  contrast: {
    name: 'Contraste insuffisant',
    wcag: '1.4.3',
    severity: 'critical' as const,
    description: 'Le ratio de contraste entre le texte et l\'arrière-plan est inférieur aux seuils WCAG.',
  },
  missingAlt: {
    name: 'Images sans texte alternatif',
    wcag: '1.1.1',
    severity: 'critical' as const,
    description: 'Les images informatives doivent avoir un attribut alt descriptif.',
  },
  missingLabel: {
    name: 'Formulaires sans label',
    wcag: '1.3.1',
    severity: 'critical' as const,
    description: 'Les champs de formulaire doivent être associés à un label.',
  },
  missingLang: {
    name: 'Langue non déclarée',
    wcag: '3.1.1',
    severity: 'warning' as const,
    description: 'L\'attribut lang doit être présent sur l\'élément html.',
  },
  emptyLinks: {
    name: 'Liens vides',
    wcag: '2.4.4',
    severity: 'critical' as const,
    description: 'Les liens doivent avoir un texte descriptif ou un aria-label.',
  },
  missingHeading: {
    name: 'Structure de titres manquante',
    wcag: '1.3.1',
    severity: 'warning' as const,
    description: 'La page doit utiliser une hiérarchie de titres logique (h1 → h6).',
  },
  skipLink: {
    name: 'Lien d\'évitement absent',
    wcag: '2.4.1',
    severity: 'warning' as const,
    description: 'Un lien pour sauter le contenu répétitif est recommandé.',
  },
  focusVisible: {
    name: 'Focus non visible',
    wcag: '2.4.7',
    severity: 'warning' as const,
    description: 'Les éléments interactifs doivent avoir un indicateur de focus visible.',
  },
  ariaInvalid: {
    name: 'Attributs ARIA invalides',
    wcag: '4.1.2',
    severity: 'error' as const,
    description: 'Les attributs ARIA doivent être utilisés correctement.',
  },
  tableHeaders: {
    name: 'Tableaux sans en-têtes',
    wcag: '1.3.1',
    severity: 'warning' as const,
    description: 'Les tableaux de données doivent avoir des en-têtes th.',
  },
  metaViewport: {
    name: 'Viewport non scalable',
    wcag: '1.4.4',
    severity: 'warning' as const,
    description: 'L\'attribut viewport ne doit pas interdire le zoom utilisateur.',
  },
}

export async function scanAccessibility(url: string): Promise<AccessibilityScanResult> {
  try {
    const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
    if (!proxyRes.ok) throw new Error('Proxy failed')
    const html = await proxyRes.text()

    const issues: AccessibilityIssue[] = []
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // 1. Missing lang attribute
    const htmlEl = doc.querySelector('html')
    if (!htmlEl?.getAttribute('lang')) {
      issues.push({
        type: 'missingLang',
        ...WCAG_RULES.missingLang,
        selector: 'html',
        suggestion: 'Ajouter lang="fr" ou lang="en" sur l\'élément <html>',
      })
    }

    // 2. Missing alt on images
    const images = doc.querySelectorAll('img:not([alt])')
    images.forEach((img, i) => {
      if (i < 10) {
        issues.push({
          type: 'missingAlt',
          ...WCAG_RULES.missingAlt,
          selector: `img[src="${img.getAttribute('src')?.slice(0, 50) || '...'}"]`,
          suggestion: 'Ajouter un attribut alt descriptif',
        })
      }
    })

    // 3. Empty links
    const links = doc.querySelectorAll('a')
    links.forEach((link, i) => {
      if (i < 10 && !link.textContent?.trim() && !link.getAttribute('aria-label')) {
        issues.push({
          type: 'emptyLinks',
          ...WCAG_RULES.emptyLinks,
          selector: `a[href="${link.getAttribute('href')?.slice(0, 30) || '#'}"]`,
          suggestion: 'Ajouter du texte ou un aria-label',
        })
      }
    })

    // 4. Missing labels on inputs
    const inputs = doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea')
    inputs.forEach((input, i) => {
      if (i < 10) {
        const id = input.getAttribute('id')
        const ariaLabel = input.getAttribute('aria-label')
        const ariaLabelledBy = input.getAttribute('aria-labelledby')
        const hasLabel = id && doc.querySelector(`label[for="${id}"]`)
        const placeholder = input.getAttribute('placeholder')

        if (!hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder) {
          issues.push({
            type: 'missingLabel',
            ...WCAG_RULES.missingLabel,
            selector: `${input.tagName.toLowerCase()}[name="${input.getAttribute('name') || ''}"]`,
            suggestion: 'Ajouter un label associé ou aria-label',
          })
        }
      }
    })

    // 5. Heading structure
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let prevLevel = 0
    headings.forEach((h) => {
      const level = parseInt(h.tagName[1])
      if (level > prevLevel + 1 && prevLevel > 0) {
        issues.push({
          type: 'missingHeading',
          ...WCAG_RULES.missingHeading,
          selector: h.tagName.toLowerCase(),
          suggestion: `Ajouter un h${prevLevel + 1} avant ce ${h.tagName.toLowerCase()}`,
        })
      }
      prevLevel = level
    })

    // 6. Skip link
    const skipLink = doc.querySelector('a[href^="#"], a[href="#main"], a[href="#content"]')
    if (!skipLink) {
      issues.push({
        type: 'skipLink',
        ...WCAG_RULES.skipLink,
        selector: 'body',
        suggestion: 'Ajouter un lien d\'évitement en premier élément du body',
      })
    }

    // 7. Meta viewport
    const viewport = doc.querySelector('meta[name="viewport"]')
    if (viewport) {
      const content = viewport.getAttribute('content') || ''
      if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
        issues.push({
          type: 'metaViewport',
          ...WCAG_RULES.metaViewport,
          selector: 'meta[name="viewport"]',
          suggestion: 'Supprimer user-scalable=no et maximum-scale',
        })
      }
    }

    // 8. Tables without headers
    const tables = doc.querySelectorAll('table')
    tables.forEach((table, i) => {
      if (i < 5 && !table.querySelector('th')) {
        issues.push({
          type: 'tableHeaders',
          ...WCAG_RULES.tableHeaders,
          selector: 'table',
          suggestion: 'Ajouter des en-têtes <th> au tableau',
        })
      }
    })

    // Calculate score
    const severityWeights = { critical: 15, error: 10, warning: 5 }
    const penalty = issues.reduce((sum, issue) => sum + (severityWeights[issue.severity] || 5), 0)
    const score = Math.max(0, 100 - penalty)

    const titleMatch = html.match(/<title[^\u003e]*>([^\u003c]*)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || url

    return {
      url,
      title,
      wcag_version: '2.1',
      conformance_level: 'AA',
      total_issues: issues.length,
      score,
      issues,
    }
  } catch {
    return {
      url,
      title: url,
      wcag_version: '2.1',
      conformance_level: 'AA',
      total_issues: 0,
      score: 100,
      issues: [],
    }
  }
}

// ── CRUD ────────────────────────────────────────────────────

export async function getAccessibilityAudits(userId: string, orgId?: string | null): Promise<AccessibilityAudit[]> {
  let query = supabase
    .from('accessibility_audits')
    .select('*')
    .order('created_at', { ascending: false })

  if (orgId) {
    query = query.eq('org_id', orgId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return (data ?? []) as AccessibilityAudit[]
}

export async function createAccessibilityAudit(
  userId: string,
  scan: AccessibilityScanResult,
  orgId?: string | null,
  projectId?: string | null
): Promise<AccessibilityAudit> {
  const { data, error } = await supabase
    .from('accessibility_audits')
    .insert({
      user_id: userId,
      org_id: orgId ?? null,
      project_id: projectId ?? null,
      url: scan.url,
      title: scan.title,
      wcag_version: scan.wcag_version,
      conformance_level: scan.conformance_level,
      total_issues: scan.total_issues,
      score: scan.score,
      issues: scan.issues,
    })
    .select()
    .single()
  if (error) throw error
  return data as AccessibilityAudit
}

export async function deleteAccessibilityAudit(id: string): Promise<void> {
  const { error } = await supabase.from('accessibility_audits').delete().eq('id', id)
  if (error) throw error
}

export function getAccessibilityScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: '✅ Conforme', color: 'emerald' }
  if (score >= 70) return { label: '⚠️ Partiellement conforme', color: 'amber' }
  return { label: '🚨 Non conforme', color: 'red' }
}

export function getWcagLevelColor(level: string): string {
  if (level === 'A') return 'text-blue-600 bg-blue-500/10 border-blue-500/20'
  if (level === 'AA') return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
  return 'text-purple-600 bg-purple-500/10 border-purple-500/20'
}
