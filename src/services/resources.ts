import { supabase } from '@/lib/supabase'

export interface GithubRepo { label: string; owner: string; repo: string }
export interface GitlabProject { label: string; namespace: string; project: string }
export interface VercelProject { label: string; id: string }
export interface CloudflareResources {
  workers: { label: string; id: string }[]
  zones: { label: string; id: string; name: string }[]
}

async function callListResources(provider: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-resources?provider=${provider}`,
    { headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
  )
  if (!res.ok) throw new Error(`Failed to fetch ${provider} resources`)
  return res.json()
}

export const getGithubRepos = (): Promise<GithubRepo[]> => callListResources('github')
export const getGitlabProjects = (): Promise<GitlabProject[]> => callListResources('gitlab')
export const getVercelProjects = (): Promise<VercelProject[]> => callListResources('vercel')
export const getCloudflareResources = (): Promise<CloudflareResources> => callListResources('cloudflare')
