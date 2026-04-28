import { supabase } from '@/lib/supabase'
import type { HealthCheck } from '@/types'

export async function triggerHealthCheck(projectId: string): Promise<HealthCheck> {
  const { data, error } = await supabase.functions.invoke('health-check', {
    body: { project_id: projectId },
  })
  if (error) throw error
  return data as HealthCheck
}

export async function triggerAllHealthChecks(userId: string): Promise<HealthCheck[]> {
  const { data, error } = await supabase.functions.invoke('health-check', {
    body: { user_id: userId },
  })
  if (error) throw error
  return data as HealthCheck[]
}

export async function getHealthHistory(projectId: string, limit = 20): Promise<HealthCheck[]> {
  const { data, error } = await supabase
    .from('health_checks')
    .select('*')
    .eq('project_id', projectId)
    .order('checked_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
