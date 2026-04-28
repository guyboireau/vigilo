import { supabase } from '@/lib/supabase'
import type { Project } from '@/types'

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProjectsWithHealth(userId: string) {
  const { data, error } = await supabase
    .from('projects_with_latest_check')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProject(
  userId: string,
  project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'enabled' | 'check_interval_minutes' | 'last_overall_status'>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}
