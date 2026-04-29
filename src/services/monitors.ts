import { supabase } from '@/lib/supabase'
import type { HttpMonitor } from '@/types'

export async function getMonitors(userId: string): Promise<HttpMonitor[]> {
  const { data, error } = await supabase
    .from('http_monitors')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createMonitor(
  userId: string,
  monitor: Pick<HttpMonitor, 'name' | 'url' | 'expected_status' | 'interval_minutes' | 'project_id' | 'org_id'>
): Promise<HttpMonitor> {
  const { data, error } = await supabase
    .from('http_monitors')
    .insert({ ...monitor, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMonitor(id: string, updates: Partial<HttpMonitor>): Promise<HttpMonitor> {
  const { data, error } = await supabase
    .from('http_monitors')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMonitor(id: string): Promise<void> {
  const { error } = await supabase.from('http_monitors').delete().eq('id', id)
  if (error) throw error
}

export async function triggerMonitorCheck(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/http-monitor`,
    { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' }
  )
  if (!res.ok) throw new Error(`Monitor check failed: ${res.status}`)
}
