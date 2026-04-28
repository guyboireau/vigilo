export type Provider = 'github' | 'gitlab' | 'vercel' | 'cloudflare'

export type HealthStatus = 'success' | 'failure' | 'warning' | 'no_ci' | 'not_found' | 'error' | 'running' | 'unknown'

export interface Profile {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  created_at: string
}

export interface LinkedAccount {
  id: string
  user_id: string
  provider: Provider
  username: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  github_owner: string | null
  github_repo: string | null
  gitlab_namespace: string | null
  gitlab_project: string | null
  vercel_project_id: string | null
  cloudflare_zone_id: string | null
  cloudflare_worker_name: string | null
  check_interval_minutes: number
  last_overall_status: string | null
  enabled: boolean
  created_at: string
}

export interface HealthCheckRun {
  workflow: string
  status: HealthStatus
  branch: string
  url: string
  updated_at: string
}

export interface HealthCheckResult {
  status: HealthStatus
  runs?: HealthCheckRun[]
  url?: string
  branch?: string
  created_at?: string
  error?: string
}

export interface HealthCheck {
  id: string
  project_id: string
  user_id: string
  github_status: HealthStatus | null
  github_data: HealthCheckResult | null
  gitlab_status: HealthStatus | null
  gitlab_data: HealthCheckResult | null
  vercel_status: HealthStatus | null
  vercel_data: HealthCheckResult | null
  cloudflare_status: HealthStatus | null
  cloudflare_data: HealthCheckResult | null
  checked_at: string
}

export interface ProjectRow extends Project {
  overall_status: HealthStatus | null
  github_status: HealthStatus | null
  github_data: HealthCheckResult | null
  gitlab_status: HealthStatus | null
  gitlab_data: HealthCheckResult | null
  vercel_status: HealthStatus | null
  vercel_data: HealthCheckResult | null
  cloudflare_status: HealthStatus | null
  cloudflare_data: HealthCheckResult | null
  checked_at: string | null
}

export interface HttpMonitor {
  id: string
  user_id: string
  project_id: string | null
  name: string
  url: string
  expected_status: number
  interval_minutes: number
  enabled: boolean
  last_status: 'up' | 'down' | null
  last_checked_at: string | null
  last_response_ms: number | null
  created_at: string
}

export interface NotificationSettings {
  user_id: string
  email_on_failure: boolean
  email_on_recovery: boolean
  email_daily: boolean
  slack_webhook: string | null
  discord_webhook: string | null
  updated_at: string
}

export interface StatusPage {
  id: string
  user_id: string
  slug: string
  title: string
  description: string | null
  project_ids: string[]
  http_monitor_ids: string[]
  is_public: boolean
  created_at: string
}
