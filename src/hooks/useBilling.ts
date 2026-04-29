import { useQuery, useMutation } from '@tanstack/react-query'
import { useOrg } from '@/contexts/OrgContext'
import { getPlans, getSubscription, createCheckoutSession } from '@/services/billing'

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
    staleTime: Infinity,
  })
}

export function useSubscription() {
  const { currentOrg } = useOrg()
  return useQuery({
    queryKey: ['subscription', currentOrg?.id],
    queryFn: () => getSubscription(currentOrg!.id),
    enabled: !!currentOrg?.id,
  })
}

export function useCheckout() {
  const { currentOrg } = useOrg()
  return useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      createCheckoutSession({
        orgId: currentOrg!.id,
        planId,
        successUrl: `${window.location.origin}/billing?success=1`,
        cancelUrl: `${window.location.origin}/billing`,
      }),
    onSuccess: (url) => {
      window.location.href = url
    },
  })
}
