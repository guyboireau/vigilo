import { supabase } from '@/lib/supabase'
import type { StatusPage } from '@/types'

export async function getStatusPages(userId: string): Promise<StatusPage[]> {
  const { data, error } = await supabase
    .from('status_pages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPublicStatusPage(slug: string): Promise<StatusPage | null> {
  const { data } = await supabase
    .from('status_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()
  return data
}

export async function createStatusPage(
  userId: string,
  page: Pick<StatusPage, 'slug' | 'title' | 'description' | 'project_ids' | 'http_monitor_ids'>
): Promise<StatusPage> {
  const { data, error } = await supabase
    .from('status_pages')
    .insert({ ...page, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStatusPage(id: string, updates: Partial<StatusPage>): Promise<StatusPage> {
  const { data, error } = await supabase
    .from('status_pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStatusPage(id: string): Promise<void> {
  const { error } = await supabase.from('status_pages').delete().eq('id', id)
  if (error) throw error
}
