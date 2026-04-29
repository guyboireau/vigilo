import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getAccessibilityAudits, createAccessibilityAudit, deleteAccessibilityAudit, scanAccessibility } from '@/services/accessibilityAudits'
import type { AccessibilityScanResult } from '@/services/accessibilityAudits'

export function useAccessibilityAudits(userId: string, orgId?: string | null) {
  return useQuery({
    queryKey: ['accessibility-audits', userId, orgId],
    queryFn: () => getAccessibilityAudits(userId, orgId),
    enabled: !!userId,
  })
}

export function useCreateAccessibilityAudit(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scan, orgId, projectId }: { scan: AccessibilityScanResult; orgId?: string | null; projectId?: string | null }) =>
      createAccessibilityAudit(userId, scan, orgId, projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accessibility-audits'] })
      toast.success('Audit d\'accessibilité enregistré')
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  })
}

export function useDeleteAccessibilityAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAccessibilityAudit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accessibility-audits'] })
      toast.success('Audit supprimé')
    },
  })
}

export function useScanAccessibility() {
  return useMutation({
    mutationFn: scanAccessibility,
    onError: () => toast.error('Erreur lors du scan d\'accessibilité'),
  })
}
