import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStatusPages, createStatusPage, updateStatusPage, deleteStatusPage } from '@/services/statusPages'
import type { StatusPage } from '@/types'

export function useStatusPages(userId: string) {
  return useQuery({
    queryKey: ['status-pages', userId],
    queryFn: () => getStatusPages(userId),
    enabled: !!userId,
  })
}

export function useCreateStatusPage(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: Pick<StatusPage, 'slug' | 'title' | 'description' | 'project_ids' | 'http_monitor_ids'>) =>
      createStatusPage(userId, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-pages', userId] })
      toast.success('Status page créée')
    },
    onError: (e: Error) => toast.error(e.message.includes('unique') ? 'Ce slug est déjà pris' : 'Erreur création'),
  })
}

export function useUpdateStatusPage(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StatusPage> }) => updateStatusPage(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status-pages', userId] }),
  })
}

export function useDeleteStatusPage(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStatusPage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status-pages', userId] })
      toast.success('Status page supprimée')
    },
  })
}
