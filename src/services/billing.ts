import { supabase } from '@/lib/supabase'
import type { Plan, Subscription } from '@/types'

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly', { ascending: true })
  if (error) throw error
  return (data ?? []) as Plan[]
}

export async function getSubscription(orgId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as Subscription | null
}

export async function createCheckoutSession(params: {
  orgId: string
  planId: string
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        org_id: params.orgId,
        plan_id: params.planId,
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error ?? 'Erreur création session de paiement')
  }

  const { url } = await response.json()
  return url
}

export function isLimitReached(
  current: number,
  max: number
): boolean {
  if (max === -1) return false
  return current >= max
}

export function getPlanLabel(planId: string): string {
  const labels: Record<string, string> = {
    free: 'Gratuit',
    solo: 'Solo',
    agency: 'Agency',
  }
  return labels[planId] ?? planId
}
