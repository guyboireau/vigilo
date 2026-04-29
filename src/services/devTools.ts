import { supabase } from '@/lib/supabase'

export interface CodeSnippet {
  id: string
  user_id: string
  org_id: string | null
  title: string
  code: string
  language: string
  tags: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface PrTemplate {
  id: string
  org_id: string
  name: string
  type: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'hotfix' | 'chore'
  template: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// ── Code Snippets ────────────────────────────────────────────

export async function getSnippets(userId: string, orgId?: string | null): Promise<CodeSnippet[]> {
  let query = supabase
    .from('code_snippets')
    .select('*')
    .order('updated_at', { ascending: false })

  if (orgId) {
    query = query.or(`org_id.eq.${orgId},user_id.eq.${userId}`)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query.limit(100)
  if (error) throw error
  return (data ?? []) as CodeSnippet[]
}

export async function createSnippet(
  userId: string,
  snippet: Omit<CodeSnippet, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<CodeSnippet> {
  const { data, error } = await supabase
    .from('code_snippets')
    .insert({ ...snippet, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as CodeSnippet
}

export async function updateSnippet(id: string, updates: Partial<CodeSnippet>): Promise<CodeSnippet> {
  const { data, error } = await supabase
    .from('code_snippets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as CodeSnippet
}

export async function deleteSnippet(id: string): Promise<void> {
  const { error } = await supabase.from('code_snippets').delete().eq('id', id)
  if (error) throw error
}

// ── PR Templates ───────────────────────────────────────────

export async function getPrTemplates(orgId: string): Promise<PrTemplate[]> {
  const { data, error } = await supabase
    .from('pr_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PrTemplate[]
}

export async function createPrTemplate(template: Omit<PrTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PrTemplate> {
  const { data, error } = await supabase
    .from('pr_templates')
    .insert(template)
    .select()
    .single()
  if (error) throw error
  return data as PrTemplate
}

export async function updatePrTemplate(id: string, updates: Partial<PrTemplate>): Promise<PrTemplate> {
  const { data, error } = await supabase
    .from('pr_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as PrTemplate
}

export async function deletePrTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('pr_templates').delete().eq('id', id)
  if (error) throw error
}

// ── Generators ─────────────────────────────────────────────

export function generatePrMarkdown(params: {
  type: string
  title: string
  summary: string
  issue?: string
  breaking?: boolean
  tests?: boolean
  docs?: boolean
}): string {
  const typeEmoji: Record<string, string> = {
    feature: '✨', bugfix: '🐛', refactor: '♻️', docs: '📚', hotfix: '🚨', chore: '🔧',
  }

  let md = `## ${typeEmoji[params.type] || '📝'} ${params.type.charAt(0).toUpperCase() + params.type.slice(1)}: ${params.title || 'Description'}\n\n`
  md += `### Summary\n${params.summary || '_Describe your changes here..._'}\n\n`
  if (params.issue) md += `### Related Issue\nCloses ${params.issue}\n\n`
  md += `### Changes\n- \n\n`
  md += `### Type of Change\n`
  md += `- [${params.type === 'feature' ? 'x' : ' '}] New feature\n`
  md += `- [${params.type === 'bugfix' ? 'x' : ' '}] Bug fix\n`
  md += `- [${params.type === 'refactor' ? 'x' : ' '}] Refactoring\n`
  md += `- [${params.breaking ? 'x' : ' '}] Breaking change\n\n`
  md += `### Checklist\n`
  md += `- [${params.tests ? 'x' : ' '}] Tests added/updated\n`
  md += `- [${params.docs ? 'x' : ' '}] Documentation updated\n`
  md += `- [ ] Self-reviewed code\n`
  md += `- [ ] No new warnings\n`
  return md
}

export function generateCommitMessage(params: {
  type: string
  scope?: string
  description: string
  body?: string
}): string {
  let msg = params.type
  if (params.scope) msg += `(${params.scope})`
  msg += `: ${params.description}`
  if (params.body) msg += `\n\n${params.body}`
  return msg
}

export function formatJson(input: string, minify = false): string {
  const parsed = JSON.parse(input)
  return minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2)
}

export function encodeBase64(input: string): string {
  return btoa(input)
}

export function decodeBase64(input: string): string {
  return atob(input)
}

export const LANGUAGE_OPTIONS = [
  'javascript', 'typescript', 'python', 'go', 'rust', 'sql',
  'html', 'css', 'json', 'yaml', 'dockerfile', 'bash', 'text',
]
