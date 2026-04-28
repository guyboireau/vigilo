import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLinkedAccounts, upsertLinkedAccount, deleteLinkedAccount } from '@/services/integrations'
import type { Provider } from '@/types'

export function useLinkedAccounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['linked-accounts', userId],
    queryFn: () => getLinkedAccounts(userId!),
    enabled: !!userId,
  })
}

export function useUpsertLinkedAccount(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, token, username }: { provider: Provider; token: string; username?: string }) =>
      upsertLinkedAccount(userId, provider, token, username),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['linked-accounts', userId] }),
  })
}

export function useDeleteLinkedAccount(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: Provider) => deleteLinkedAccount(userId, provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['linked-accounts', userId] }),
  })
}
