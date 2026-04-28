import { supabase } from '@/lib/supabase'
import type { LinkedAccount, Provider } from '@/types'

export async function getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  const { data, error } = await supabase
    .from('linked_accounts')
    .select('id, user_id, provider, username, metadata, created_at')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function upsertLinkedAccount(
  userId: string,
  provider: Provider,
  accessToken: string,
  username?: string,
  metadata?: Record<string, unknown>
): Promise<LinkedAccount> {
  const { data, error } = await supabase
    .from('linked_accounts')
    .upsert(
      { user_id: userId, provider, access_token: accessToken, username: username ?? null, metadata: metadata ?? {} },
      { onConflict: 'user_id,provider' }
    )
    .select('id, user_id, provider, username, metadata, created_at')
    .single()
  if (error) throw error
  return data
}

export async function deleteLinkedAccount(userId: string, provider: Provider): Promise<void> {
  const { error } = await supabase
    .from('linked_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)
  if (error) throw error
}
