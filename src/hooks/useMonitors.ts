import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getMonitors, createMonitor, updateMonitor, deleteMonitor, triggerMonitorCheck } from '@/services/monitors'
import type { HttpMonitor } from '@/types'

export function useMonitors(userId: string) {
  return useQuery({
    queryKey: ['monitors', userId],
    queryFn: () => getMonitors(userId),
    enabled: !!userId,
    refetchInterval: 60_000,
  })
}

export function useCreateMonitor(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (m: Pick<HttpMonitor, 'name' | 'url' | 'expected_status' | 'interval_minutes' | 'project_id' | 'org_id'>) =>
      createMonitor(userId, m),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitors', userId] })
      toast.success('Moniteur créé')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })
}

export function useUpdateMonitor(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<HttpMonitor> }) => updateMonitor(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitors', userId] }),
  })
}

export function useDeleteMonitor(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMonitor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitors', userId] })
      toast.success('Moniteur supprimé')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })
}

export function useTriggerMonitorCheck(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => triggerMonitorCheck(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitors', userId] }),
  })
}
