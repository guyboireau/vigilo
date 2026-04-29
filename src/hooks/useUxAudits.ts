import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAudits, createAudit, deleteAudit, scanUrl } from '@/services/uxAudits'
import type { ScanResult } from '@/services/uxAudits'

export function useAudits(userId: string, orgId?: string | null) {
  return useQuery({
    queryKey: ['ux-audits', userId, orgId],
    queryFn: () => getAudits(userId, orgId),
    enabled: !!userId,
  })
}

export function useCreateAudit(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scan, orgId, projectId }: { scan: ScanResult; orgId?: string | null; projectId?: string | null }) =>
      createAudit(userId, scan, orgId, projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ux-audits'] })
      toast.success('Audit enregistré')
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })
}

export function useDeleteAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAudit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ux-audits'] })
      toast.success('Audit supprimé')
    },
  })
}

export function useScanUrl() {
  return useMutation({
    mutationFn: scanUrl,
    onError: () => toast.error('Erreur lors du scan'),
  })
}
