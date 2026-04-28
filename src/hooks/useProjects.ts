import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'enabled' | 'check_interval_minutes' | 'last_overall_status'>) =>
      createProject(userId, project),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects-health', userId] })
      toast.success('Projet créé')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })
}

export function useUpdateProject(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) => updateProject(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects-health', userId] })
      toast.success('Projet mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })
}

export function useDeleteProject(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects-health', userId] })
      toast.success('Projet supprimé')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })
}
