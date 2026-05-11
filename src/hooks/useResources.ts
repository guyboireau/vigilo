import { useQuery } from '@tanstack/react-query'
import { getGithubRepos, getGitlabProjects, getVercelProjects, getCloudflareResources } from '@/services/resources'
import type { GithubRepo, GitlabProject, VercelProject, CloudflareResources } from '@/services/resources'

export function useGithubRepos(enabled: boolean) {
  return useQuery<GithubRepo[], Error>({
    queryKey: ['github-repos'],
    queryFn: getGithubRepos,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGitlabProjects(enabled: boolean) {
  return useQuery<GitlabProject[], Error>({
    queryKey: ['gitlab-projects'],
    queryFn: getGitlabProjects,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useVercelProjects(enabled: boolean) {
  return useQuery<VercelProject[], Error>({
    queryKey: ['vercel-projects'],
    queryFn: getVercelProjects,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCloudflareResources(enabled: boolean) {
  return useQuery<CloudflareResources, Error>({
    queryKey: ['cloudflare-resources'],
    queryFn: getCloudflareResources,
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
