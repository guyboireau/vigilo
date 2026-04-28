import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjectsWithHealth, createProject, updateProject, deleteProject } from '@/services/projects'
import type { Project } from '@/types'

export function useProjectsWithHealth(userId: string | undefined) {
  return useQuery({
    queryKey: ['projects-health', userId],
    queryFn: () => getProjectsWithHealth(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
  })
}

export function useCreateProject(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'enabled'>) =>
      createProject(userId, project),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects-health', userId] }),
  })
}

export function useUpdateProject(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      updateProject(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects-health', userId] }),
  })
}

export function useDeleteProject(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects-health', userId] }),
  })
}
