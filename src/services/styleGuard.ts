import { supabase } from '@/lib/supabase'
import type { StyleGuide, StyleCheck, StyleIssue } from '@/types'

export interface StyleCheckResult {
  title: string
  content: string
  total_issues: number
  score: number
  issues: StyleIssue[]
}

// ── StyleGuard Analysis Engine ───────────────────────────────

const DEFAULT_TERMS = [
  { wrong: 'e-mail', right: 'email' },
  { wrong: 'web site', right: 'website' },
  { wrong: 'utilisateur', right: 'user' },
  { wrong: 'cliquez ici', right: 'cliquez sur le bouton' },
  { wrong: 'bonjour', right: 'Bonjour' },
]

const INFORMAL_WORDS = /\b(gonna|kinda|lol|awesome|cool|super|genial|top|nul|bof|ouais|ok|donc|alors|bon|voila)\b/gi
const FORMAL_WORDS = /\b(furthermore|notwithstanding|pursuant|hereby|whereas|consequently|nevertheless)\b/gi

const PAST_PATTERNS = /\b(was|were|had|did|went|came|said|made|took|gave|found|knew|thought|got|used|worked|called|tried|asked|needed|looked|played|moved|lived|started|turned|showed|heard|wanted|happened)\b/gi
const PRESENT_PATTERNS = /\b(is|are|has|does|goes|comes|says|makes|takes|gives|finds|knows|thinks|gets|uses|works|calls|tries|asks|needs|looks|plays|moves|lives|starts|turns|shows|hears|wants|happens)\b/gi

export function analyzeStyle(content: string, rules?: StyleGuide['rules']): StyleCheckResult {
  const issues: StyleIssue[] = []
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 10)
  const words = content.split(/\s+/).filter(Boolean)

  const activeRules = {
    tense: rules?.tense !== false,
    tone: rules?.tone !== false,
    terminology: rules?.terminology !== false,
    punctuation: rules?.punctuation !== false,
    capitalization: rules?.capitalization !== false,
    repetition: rules?.repetition !== false,
    passive_voice: rules?.passive_voice === true,
    jargon: rules?.jargon === true,
    custom_terms: rules?.custom_terms || DEFAULT_TERMS,
  }

  // 1. Tense consistency
  if (activeRules.tense) {
    const pastCount = (content.match(PAST_PATTERNS) || []).length
    const presentCount = (content.match(PRESENT_PATTERNS) || []).length
    if (pastCount > 3 && presentCount > 3) {
      const dominant = pastCount > presentCount ? 'passé' : 'présent'
      const minority = pastCount > presentCount ? 'présent' : 'passé'
      issues.push({
        type: 'tense',
        severity: 'warning',
        message: `Changement de temps détecté : le texte est majoritairement au ${dominant} mais contient des verbes au ${minority}.`,
        line: 1,
      })
    }
  }

  // 2. Tone consistency
  if (activeRules.tone) {
    const informal = (content.match(INFORMAL_WORDS) || []).length
    const formal = (content.match(FORMAL_WORDS) || []).length
    if (informal > 0 && formal > 0) {
      issues.push({
        type: 'tone',
        severity: 'warning',
        message: 'Mélange de registres de langue détecté (formel et informel).',
        line: 1,
      })
    }
  }

  // 3. Terminology
  if (activeRules.terminology) {
    for (const term of activeRules.custom_terms) {
      const regex = new RegExp(`\\b${term.wrong}\\b`, 'gi')
      const matches = content.match(regex)
      if (matches) {
        issues.push({
          type: 'terminology',
          severity: 'warning',
          message: `"${term.wrong}" devrait être "${term.right}"`,
          line: 1,
        })
      }
    }
  }

  // 4. Punctuation
  if (activeRules.punctuation) {
    const doubleSpaces = content.match(/  +/g)
    if (doubleSpaces) {
      issues.push({
        type: 'punctuation',
        severity: 'warning',
        message: `${doubleSpaces.length} double${doubleSpaces.length > 1 ? 's' : ''} espace${doubleSpaces.length > 1 ? 's' : ''} détecté${doubleSpaces.length > 1 ? 's' : ''}.`,
        line: 1,
      })
    }
  }

  // 5. Capitalization
  if (activeRules.capitalization) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim())
    let titleCaseCount = 0
    let sentenceCaseCount = 0
    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      if (trimmed.length > 3) {
        const words = trimmed.split(/\s+/)
        const capitalized = words.filter(w => w[0]?.toUpperCase() === w[0]).length
        if (capitalized > words.length * 0.5) titleCaseCount++
        else sentenceCaseCount++
      }
    }
    if (titleCaseCount > 0 && sentenceCaseCount > 0) {
      issues.push({
        type: 'capitalization',
        severity: 'warning',
        message: 'Mélange de Title Case et sentence case détecté.',
        line: 1,
      })
    }
  }

  // 6. Repetition
  if (activeRules.repetition) {
    const wordCounts: Record<string, number> = {}
    for (const word of words) {
      const lower = word.toLowerCase().replace(/[^a-zà-ÿ]/g, '')
      if (lower.length > 3) {
        wordCounts[lower] = (wordCounts[lower] || 0) + 1
      }
    }
    for (const [word, count] of Object.entries(wordCounts)) {
      if (count >= 4) {
        issues.push({
          type: 'repetition',
          severity: 'warning',
          message: `Le mot "${word}" est utilisé ${count} fois.`,
          line: 1,
        })
      }
    }
  }

  // Calculate score
  const penalty = issues.length * 5
  const score = Math.max(0, 100 - penalty)

  return {
    title: 'Analyse de style',
    content: content.slice(0, 500),
    total_issues: issues.length,
    score,
    issues,
  }
}

// ── CRUD Style Guides ──────────────────────────────────────

export async function getStyleGuides(orgId: string): Promise<StyleGuide[]> {
  const { data, error } = await supabase
    .from('style_guides')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as StyleGuide[]
}

export async function createStyleGuide(guide: Omit<StyleGuide, 'id' | 'created_at' | 'updated_at'>): Promise<StyleGuide> {
  const { data, error } = await supabase
    .from('style_guides')
    .insert(guide)
    .select()
    .single()
  if (error) throw error
  return data as StyleGuide
}

export async function updateStyleGuide(id: string, updates: Partial<StyleGuide>): Promise<StyleGuide> {
  const { data, error } = await supabase
    .from('style_guides')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as StyleGuide
}

export async function deleteStyleGuide(id: string): Promise<void> {
  const { error } = await supabase.from('style_guides').delete().eq('id', id)
  if (error) throw error
}

// ── CRUD Style Checks ──────────────────────────────────────

export async function getStyleChecks(userId: string, orgId?: string | null): Promise<StyleCheck[]> {
  let query = supabase
    .from('style_checks')
    .select('*')
    .order('created_at', { ascending: false })

  if (orgId) {
    query = query.eq('org_id', orgId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return (data ?? []) as StyleCheck[]
}

export async function createStyleCheck(
  userId: string,
  result: StyleCheckResult,
  orgId?: string | null,
  guideId?: string | null
): Promise<StyleCheck> {
  const { data, error } = await supabase
    .from('style_checks')
    .insert({
      user_id: userId,
      org_id: orgId ?? null,
      style_guide_id: guideId ?? null,
      title: result.title,
      content: result.content,
      total_issues: result.total_issues,
      score: result.score,
      issues: result.issues,
    })
    .select()
    .single()
  if (error) throw error
  return data as StyleCheck
}

export async function deleteStyleCheck(id: string): Promise<void> {
  const { error } = await supabase.from('style_checks').delete().eq('id', id)
  if (error) throw error
}

export function getStyleScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: '✅ Style cohérent', color: 'emerald' }
  if (score >= 70) return { label: '⚠️ Quelques incohérences', color: 'amber' }
  return { label: '🚨 Style incohérent', color: 'red' }
}
