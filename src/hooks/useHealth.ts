import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { triggerHealthCheck, triggerAllHealthChecks } from '@/services/health'
import { supabase } from '@/lib/supabase'
import type { HealthCheck } from '@/types'

export function useTriggerHealthCheck(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => triggerHealthCheck(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-health', userId] })
      toast.success('Vérification terminée')
    },
    onError: () => toast.error('Erreur lors de la vérification'),
  })
}

export function useTriggerAllHealthChecks(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => triggerAllHealthChecks(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects-health', userId] })
      toast.success('Analyse complète terminée')
    },
    onError: () => toast.error('Erreur lors de l\'analyse'),
  })
}

export function useProjectHealthHistory(projectId: string | null) {
  return useQuery({
    queryKey: ['health-history', projectId],
    queryFn: async (): Promise<HealthCheck[]> => {
      const { data, error } = await supabase
        .from('health_checks')
        .select('*')
        .eq('project_id', projectId!)
        .order('checked_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data ?? []
    },
    enabled: !!projectId,
    staleTime: 30_000,
  })
}
