import { useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerHealthCheck, triggerAllHealthChecks } from '@/services/health'

export function useTriggerHealthCheck(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => triggerHealthCheck(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects-health', userId] }),
  })
}

export function useTriggerAllHealthChecks(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => triggerAllHealthChecks(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects-health', userId] }),
  })
}
