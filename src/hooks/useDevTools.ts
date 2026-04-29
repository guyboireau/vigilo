import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSnippets, createSnippet, updateSnippet, deleteSnippet,
  getPrTemplates, createPrTemplate, updatePrTemplate, deletePrTemplate,
} from '@/services/devTools'
import type { CodeSnippet, PrTemplate } from '@/services/devTools'

// ── Snippets ────────────────────────────────────────────────

export function useSnippets(userId: string, orgId?: string | null) {
  return useQuery({
    queryKey: ['snippets', userId, orgId],
    queryFn: () => getSnippets(userId, orgId),
    enabled: !!userId,
  })
}

export function useCreateSnippet(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (snippet: Omit<CodeSnippet, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      createSnippet(userId, snippet),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snippets'] })
      toast.success('Snippet créé')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })
}

export function useUpdateSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CodeSnippet> }) => updateSnippet(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snippets'] }),
  })
}

export function useDeleteSnippet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSnippet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snippets'] })
      toast.success('Snippet supprimé')
    },
  })
}

// ── PR Templates ───────────────────────────────────────────

export function usePrTemplates(orgId: string | undefined) {
  return useQuery({
    queryKey: ['pr-templates', orgId],
    queryFn: () => getPrTemplates(orgId!),
    enabled: !!orgId,
  })
}

export function useCreatePrTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPrTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pr-templates'] })
      toast.success('Template créé')
    },
  })
}

export function useUpdatePrTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PrTemplate> }) => updatePrTemplate(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pr-templates'] }),
  })
}

export function useDeletePrTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePrTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pr-templates'] })
      toast.success('Template supprimé')
    },
  })
}
