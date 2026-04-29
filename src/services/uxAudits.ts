import { supabase } from '@/lib/supabase'
import type { UxAudit, UxAuditPattern } from '@/types'

export interface ScanResult {
  url: string
  title: string
  total: number
  severity_score: number
  patterns: UxAuditPattern[]
}

// ── Dark Pattern Detection Engine (porté depuis l'extension) ──

const DARK_PATTERNS = {
  preChecked: {
    name: 'Options pré-cochées',
    severity: 'high' as const,
    regulation: 'RGPD Art. 7',
    keywords: /newsletter|marketing|partenaire|partner|offre|offer|accept|consent|subscribe|abonner|communication|promotional|publicit/i,
  },
  hiddenUnsubscribe: {
    name: 'Désabonnement caché',
    severity: 'high' as const,
    regulation: 'DSA Art. 25',
    keywords: /d[ée]sabonner|unsubscribe|se d[ée]sinscrire|opt.?out|manage.?preferences|g[ée]rer.*pr[ée]f[ée]rences/i,
  },
  fakeUrgency: {
    name: 'Fausse urgence',
    severity: 'medium' as const,
    regulation: 'DSA Art. 25',
    keywords: /plus que \d+|seulement \d+|expire dans|limited time|countdown|stock restant|dernière chance|urgent/i,
  },
  confirmShaming: {
    name: 'Culpabilisation au refus',
    severity: 'medium' as const,
    regulation: 'DSA Art. 25',
    keywords: /non merci, je|i don'?t want|no thanks, i|refuser, je|d[ée]cliner, je/i,
  },
  trickConsent: {
    name: 'Consentement piégeur',
    severity: 'high' as const,
    regulation: 'RGPD + ePrivacy',
    keywords: /tout accepter|accept all|refuser.*tout|reject all|customiser|personnaliser/i,
  },
  forcedContinuity: {
    name: 'Continuité forcée',
    severity: 'high' as const,
    regulation: 'Dir. 2011/83/EU',
    keywords: /essai gratuit|free trial|renouvellement auto|auto.?renew|sans engagement.*puis|then \$\d/i,
  },
  hiddenCosts: {
    name: 'Coûts cachés',
    severity: 'high' as const,
    regulation: 'Dir. 2011/83/EU',
    keywords: /frais de|processing fee|service fee|handling fee|additional.*cost|suppl[ée]ment/i,
  },
  misdirection: {
    name: 'Détournement d\'attention',
    severity: 'medium' as const,
    regulation: 'DSA Art. 25',
    keywords: /recommand[ée]|suggested|popular|best seller|most chosen/i,
  },
}

export async function scanUrl(url: string): Promise<ScanResult> {
  // Cette fonction est normalement appelée côté serveur via Edge Function
  // Pour l'instant on simule un scan côté client avec fetch + analyse texte
  try {
    const res = await fetch(`/api/scan-ux?url=${encodeURIComponent(url)}`, {
      method: 'GET',
    })
    if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
    return res.json()
  } catch {
    // Fallback : analyse basique du texte si pas d'Edge Function
    return analyzeText(url)
  }
}

// Analyse textuelle basique (fallback ou mode client)
async function analyzeText(url: string): Promise<ScanResult> {
  try {
    const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
    if (!proxyRes.ok) throw new Error('Proxy failed')
    const html = await proxyRes.text()
    const text = html.toLowerCase()

    const patterns: UxAuditPattern[] = []
    let total = 0
    let severityScore = 100

    for (const [key, def] of Object.entries(DARK_PATTERNS)) {
      const matches: string[] = []
      let match
      const regex = new RegExp(def.keywords.source, 'gi')
      while ((match = regex.exec(text)) !== null) {
        const snippet = text.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30)
        if (!matches.includes(snippet)) matches.push(snippet)
      }

      if (matches.length > 0) {
        patterns.push({
          type: key,
          name: def.name,
          count: matches.length,
          severity: def.severity,
          regulation: def.regulation,
          examples: matches.slice(0, 3),
        })
        total += matches.length
        if (def.severity === 'high') severityScore -= 15 * matches.length
        else severityScore -= 8 * matches.length
      }
    }

    // Extract title
    const titleMatch = html.match(/<title[^\u003e]*>([^\u003c]*)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || url

    return {
      url,
      title,
      total,
      severity_score: Math.max(0, severityScore),
      patterns,
    }
  } catch {
    return { url, title: url, total: 0, severity_score: 100, patterns: [] }
  }
}

// ── CRUD ────────────────────────────────────────────────────

export async function getAudits(userId: string, orgId?: string | null): Promise<UxAudit[]> {
  let query = supabase
    .from('ux_audits')
    .select('*')
    .order('created_at', { ascending: false })

  if (orgId) {
    query = query.eq('org_id', orgId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return (data ?? []) as UxAudit[]
}

export async function createAudit(
  userId: string,
  scan: ScanResult,
  orgId?: string | null,
  projectId?: string | null
): Promise<UxAudit> {
  const { data, error } = await supabase
    .from('ux_audits')
    .insert({
      user_id: userId,
      org_id: orgId ?? null,
      project_id: projectId ?? null,
      url: scan.url,
      title: scan.title,
      total_patterns: scan.total,
      severity_score: scan.severity_score,
      patterns: scan.patterns,
    })
    .select()
    .single()
  if (error) throw error
  return data as UxAudit
}

export async function deleteAudit(id: string): Promise<void> {
  const { error } = await supabase.from('ux_audits').delete().eq('id', id)
  if (error) throw error
}

export function getSeverityLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '✅ Page propre', color: 'emerald' }
  if (score >= 50) return { label: '⚠️ Attention', color: 'amber' }
  return { label: '🚨 Alerte', color: 'red' }
}
