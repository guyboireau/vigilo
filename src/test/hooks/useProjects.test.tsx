import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useProjectsWithHealth,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/useProjects'
import * as projectsService from '@/services/projects'
import type { Project } from '@/types'
import type { ReactNode } from 'react'

vi.mock('@/services/projects')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockProjects: Project[] = [
  {
    id: 'proj-1',
    user_id: 'user-123',
    name: 'Mon Projet',
    github_owner: 'guyboireau',
    github_repo: 'vigilo',
    gitlab_namespace: null,
    gitlab_project: null,
    vercel_project_id: null,
    cloudflare_zone_id: null,
    cloudflare_worker_name: null,
    check_interval_minutes: 5,
    last_overall_status: 'success',
    enabled: true,
    created_at: '2024-01-15T10:00:00Z',
  },
]

describe('useProjectsWithHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('récupère les projets avec leur santé', async () => {
    vi.mocked(projectsService.getProjectsWithHealth).mockResolvedValueOnce(mockProjects)

    const { result } = renderHook(() => useProjectsWithHealth('user-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.data).toEqual(mockProjects)
    })

    expect(projectsService.getProjectsWithHealth).toHaveBeenCalledWith('user-123')
  })

  it('ne fait pas de requête si userId est undefined', () => {
    const { result } = renderHook(() => useProjectsWithHealth(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(projectsService.getProjectsWithHealth).not.toHaveBeenCalled()
  })

  it('ne fait pas de requête si userId est vide', () => {
    const { result } = renderHook(() => useProjectsWithHealth(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crée un projet et invalide le cache', async () => {
    const newProject = { ...mockProjects[0], id: 'proj-2' }
    vi.mocked(projectsService.createProject).mockResolvedValueOnce(newProject)

    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useCreateProject('user-123'), { wrapper: Wrapper })

    await result.current.mutateAsync({
      name: 'Nouveau Projet',
      github_owner: null,
      github_repo: null,
      gitlab_namespace: null,
      gitlab_project: null,
      vercel_project_id: null,
      cloudflare_zone_id: null,
      cloudflare_worker_name: null,
    })

    expect(projectsService.createProject).toHaveBeenCalledWith('user-123', expect.any(Object))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects-health', 'user-123'] })
  })
})

describe('useUpdateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour un projet et invalide le cache', async () => {
    vi.mocked(projectsService.updateProject).mockResolvedValueOnce({ ...mockProjects[0], name: 'Updated' })

    const { result } = renderHook(() => useUpdateProject('user-123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({ id: 'proj-1', updates: { name: 'Updated' } })

    expect(projectsService.updateProject).toHaveBeenCalledWith('proj-1', { name: 'Updated' })
  })
})

describe('useDeleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supprime un projet et invalide le cache', async () => {
    vi.mocked(projectsService.deleteProject).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useDeleteProject('user-123'), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('proj-1')

    expect(projectsService.deleteProject).toHaveBeenCalledWith('proj-1')
  })
})
