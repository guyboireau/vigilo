import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type HealthStatus = 'success' | 'failure' | 'warning' | 'no_ci' | 'not_found' | 'error' | 'running' | 'unknown'

interface CheckResult {
  status: HealthStatus
  runs?: { workflow: string; status: HealthStatus; branch: string; url: string; updated_at: string }[]
  url?: string
  branch?: string
  created_at?: string
  error?: string
}

// ── GitHub ─────────────────────────────────────────────────────────────────
async function checkGitHub(owner: string, repo: string, token: string): Promise<CheckResult> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    )
    if (res.status === 404) return { status: 'not_found' }
    if (!res.ok) return { status: 'error', error: `GitHub API ${res.status}` }
    const data = await res.json()
    const runs: typeof data.workflow_runs = data.workflow_runs ?? []
    if (runs.length === 0) return { status: 'no_ci', runs: [] }

    const latestByWorkflow: Record<string, typeof runs[number]> = {}
    for (const run of runs) {
      if (!latestByWorkflow[run.name]) latestByWorkflow[run.name] = run
    }

    const results = Object.values(latestByWorkflow).map(run => ({
      workflow: run.name,
      status: mapGithubStatus(run.conclusion ?? run.status),
      branch: run.head_branch,
      url: run.html_url,
      updated_at: run.updated_at,
    }))

    const hasFail = results.some(r => r.status === 'failure')
    const hasWarn = results.some(r => r.status === 'warning')
    return { status: hasFail ? 'failure' : hasWarn ? 'warning' : 'success', runs: results }
  } catch (err) {
    return { status: 'error', error: String(err) }
  }
}

function mapGithubStatus(s: string): HealthStatus {
  if (s === 'success') return 'success'
  if (s === 'failure') return 'failure'
  if (['cancelled', 'skipped', 'timed_out', 'action_required'].includes(s)) return 'warning'
  if (s === 'in_progress' || s === 'queued') return 'running'
  return 'unknown'
}

// ── GitLab ─────────────────────────────────────────────────────────────────
async function checkGitLab(namespace: string, project: string, token: string): Promise<CheckResult> {
  try {
    const encoded = encodeURIComponent(`${namespace}/${project}`)
    const res = await fetch(
      `https://gitlab.com/api/v4/projects/${encoded}/pipelines?per_page=5`,
      { headers: { 'PRIVATE-TOKEN': token } }
    )
    if (res.status === 404) return { status: 'not_found' }
    if (!res.ok) return { status: 'error', error: `GitLab API ${res.status}` }
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return { status: 'no_ci', runs: [] }

    const results = data.map(pipe => ({
      workflow: `Pipeline #${pipe.id}`,
      status: mapGitlabStatus(pipe.status),
      branch: pipe.ref,
      url: pipe.web_url,
      updated_at: pipe.updated_at,
    }))
    const hasFail = results.some(r => r.status === 'failure')
    const hasWarn = results.some(r => r.status === 'warning')
    return { status: hasFail ? 'failure' : hasWarn ? 'warning' : 'success', runs: results }
  } catch (err) {
    return { status: 'error', error: String(err) }
  }
}

function mapGitlabStatus(s: string): HealthStatus {
  if (s === 'success') return 'success'
  if (s === 'failed') return 'failure'
  if (['canceled', 'skipped', 'manual', 'blocked'].includes(s)) return 'warning'
  if (['running', 'pending', 'created', 'waiting_for_resource'].includes(s)) return 'running'
  return 'unknown'
}

// ── Vercel ──────────────────────────────────────────────────────────────────
async function checkVercel(projectId: string, token: string): Promise<CheckResult> {
  try {
    const projectRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (projectRes.status === 404) return { status: 'not_found' }
    if (!projectRes.ok) return { status: 'error', error: `Vercel API ${projectRes.status}` }
    const project = await projectRes.json()

    const deplRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=1&state=READY,ERROR,CANCELED`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!deplRes.ok) return { status: 'no_ci' }
    const deplData = await deplRes.json()
    const deploy = deplData.deployments?.[0]
    if (!deploy) return { status: 'no_ci' }

    const stateMap: Record<string, HealthStatus> = { READY: 'success', ERROR: 'failure', CANCELED: 'warning' }
    return {
      status: stateMap[deploy.state] ?? 'unknown',
      url: `https://${deploy.url}`,
      branch: deploy.meta?.githubCommitRef ?? deploy.meta?.gitlabCommitRef ?? '—',
      created_at: new Date(deploy.createdAt).toISOString(),
    }
  } catch (err) {
    return { status: 'error', error: String(err) }
  }
}

// ── Cloudflare ──────────────────────────────────────────────────────────────
async function checkCloudflare(
  token: string,
  workerId?: string | null,
  zoneId?: string | null
): Promise<CheckResult> {
  try {
    if (workerId) {
      // Check worker deployments via Workers API
      const accountRes = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!accountRes.ok) return { status: 'error', error: `Cloudflare API ${accountRes.status}` }
      const accountData = await accountRes.json()
      const accountId = accountData.result?.[0]?.id
      if (!accountId) return { status: 'error', error: 'No Cloudflare account found' }

      const workerRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (workerRes.status === 404) return { status: 'not_found' }
      if (!workerRes.ok) return { status: 'error', error: `Worker ${workerRes.status}` }
      return { status: 'success' }
    }

    if (zoneId) {
      const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!zoneRes.ok) return { status: 'error', error: `Zone API ${zoneRes.status}` }
      const zoneData = await zoneRes.json()
      const zoneStatus = zoneData.result?.status
      if (zoneStatus === 'active') return { status: 'success' }
      if (zoneStatus === 'pending') return { status: 'warning' }
      return { status: 'failure' }
    }

    return { status: 'unknown' }
  } catch (err) {
    return { status: 'error', error: String(err) }
  }
}

// ── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json().catch(() => ({}))
    const { project_id, user_id } = body

    // Load linked accounts (tokens)
    const { data: accounts } = await supabase
      .from('linked_accounts')
      .select('provider, access_token, username')
      .eq('user_id', user.id)

    const tokens: Record<string, { token: string; username?: string }> = {}
    for (const a of accounts ?? []) {
      tokens[a.provider] = { token: a.access_token, username: a.username }
    }

    // Determine which projects to check
    let projectsQuery = supabase.from('projects').select('*').eq('user_id', user.id).eq('enabled', true)
    if (project_id) projectsQuery = projectsQuery.eq('id', project_id)
    const { data: projects } = await projectsQuery

    if (!projects?.length) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const results = await Promise.all(
      projects.map(async (project) => {
        const [githubResult, gitlabResult, vercelResult, cloudflareResult] = await Promise.all([
          project.github_owner && project.github_repo && tokens.github
            ? checkGitHub(project.github_owner, project.github_repo, tokens.github.token)
            : Promise.resolve(null),
          project.gitlab_namespace && project.gitlab_project && tokens.gitlab
            ? checkGitLab(project.gitlab_namespace, project.gitlab_project, tokens.gitlab.token)
            : Promise.resolve(null),
          project.vercel_project_id && tokens.vercel
            ? checkVercel(project.vercel_project_id, tokens.vercel.token)
            : Promise.resolve(null),
          tokens.cloudflare
            ? checkCloudflare(tokens.cloudflare.token, project.cloudflare_worker_name, project.cloudflare_zone_id)
            : Promise.resolve(null),
        ])

        const { data: check } = await supabase
          .from('health_checks')
          .insert({
            project_id: project.id,
            user_id: user.id,
            github_status: githubResult?.status ?? null,
            github_data: githubResult,
            gitlab_status: gitlabResult?.status ?? null,
            gitlab_data: gitlabResult,
            vercel_status: vercelResult?.status ?? null,
            vercel_data: vercelResult,
            cloudflare_status: cloudflareResult?.status ?? null,
            cloudflare_data: cloudflareResult,
          })
          .select()
          .single()

        return check
      })
    )

    return new Response(
      JSON.stringify(project_id ? results[0] : results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
