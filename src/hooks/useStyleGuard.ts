import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getStyleGuides, createStyleGuide, updateStyleGuide, deleteStyleGuide,
  getStyleChecks, createStyleCheck, deleteStyleCheck, analyzeStyle,
} from '@/services/styleGuard'
import type { StyleCheckResult } from '@/services/styleGuard'

// ── Style Guides ────────────────────────────────────────────

export function useStyleGuides(orgId: string | undefined) {
  return useQuery({
    queryKey: ['style-guides', orgId],
    queryFn: () => getStyleGuides(orgId!),
    enabled: !!orgId,
  })
}

export function useCreateStyleGuide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createStyleGuide,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['style-guides'] })
      toast.success('Style guide créé')
    },
  })
}

export function useUpdateStyleGuide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateStyleGuide>[1] }) =>
      updateStyleGuide(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['style-guides'] }),
  })
}

export function useDeleteStyleGuide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteStyleGuide,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['style-guides'] })
      toast.success('Style guide supprimé')
    },
  })
}

// ── Style Checks ────────────────────────────────────────────

export function useStyleChecks(userId: string, orgId?: string | null) {
  return useQuery({
    queryKey: ['style-checks', userId, orgId],
    queryFn: () => getStyleChecks(userId, orgId),
    enabled: !!userId,
  })
}

export function useCreateStyleCheck(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ result, orgId, guideId }: { result: StyleCheckResult; orgId?: string | null; guideId?: string | null }) =>
      createStyleCheck(userId, result, orgId, guideId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['style-checks'] })
      toast.success('Analyse enregistrée')
    },
  })
}

export function useDeleteStyleCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteStyleCheck,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['style-checks'] })
      toast.success('Analyse supprimée')
    },
  })
}

export function useAnalyzeStyle() {
  return useMutation({
    mutationFn: ({ content, rules }: { content: string; rules?: Record<string, unknown> }) =>
      Promise.resolve(analyzeStyle(content, rules as never)),
    onError: () => toast.error('Erreur lors de l\'analyse'),
  })
}
