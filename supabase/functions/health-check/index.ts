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

// ── GitHub ──────────────────────────────────────────────────────────────────
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
    const hasSuccess = results.some(r => r.status === 'success')
    const hasRunning = results.some(r => r.status === 'running')
    return { status: hasFail ? 'failure' : hasWarn ? 'warning' : hasSuccess ? 'success' : hasRunning ? 'running' : 'unknown', runs: results }
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

// ── GitLab ──────────────────────────────────────────────────────────────────
async function checkGitLab(namespace: string, project: string, token: string): Promise<CheckResult> {
  try {
    const encoded = encodeURIComponent(`${namespace}/${project}`)
    const res = await fetch(
      `https://gitlab.com/api/v4/projects/${encoded}/pipelines?per_page=5`,
      { headers: { Authorization: `Bearer ${token}` } }
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
    const hasSuccess = results.some(r => r.status === 'success')
    const hasRunning = results.some(r => r.status === 'running')
    return { status: hasFail ? 'failure' : hasWarn ? 'warning' : hasSuccess ? 'success' : hasRunning ? 'running' : 'unknown', runs: results }
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

// ── Vercel ───────────────────────────────────────────────────────────────────
async function checkVercel(projectId: string, token: string, teamId?: string): Promise<CheckResult> {
  try {
    const teamParam = teamId ? `?teamId=${teamId}` : ''
    const projectRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}${teamParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (projectRes.status === 404) return { status: 'not_found' }
    if (!projectRes.ok) return { status: 'error', error: `Vercel API ${projectRes.status}` }
    const project = await projectRes.json()

    const teamDeployParam = teamId ? `&teamId=${teamId}` : ''
    const deplRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=1&state=READY,ERROR,CANCELED${teamDeployParam}`,
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

// ── Cloudflare ───────────────────────────────────────────────────────────────
async function checkCloudflare(token: string, workerId?: string | null, zoneId?: string | null): Promise<CheckResult> {
  try {
    if (workerId) {
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

// ── Notifications ────────────────────────────────────────────────────────────
async function sendInstantAlert(
  projectName: string,
  newStatus: HealthStatus,
  oldStatus: string | null,
  notifSettings: { slack_webhook?: string | null; discord_webhook?: string | null; email_on_failure?: boolean; email_on_recovery?: boolean },
  userEmail: string | null
) {
  const isFailure = newStatus === 'failure' || newStatus === 'error'
  const isRecovery = (newStatus === 'success') && (oldStatus === 'failure' || oldStatus === 'error')
  const isWarning = newStatus === 'warning'

  if (!isFailure && !isRecovery && !isWarning) return

  const shouldNotify =
    ((isFailure || isWarning) && notifSettings.email_on_failure) ||
    (isRecovery && notifSettings.email_on_recovery)

  if (!shouldNotify) return

  const emoji = isRecovery ? '🟢' : isWarning ? '⚠️' : '🔴'
  const label = isRecovery ? 'est de nouveau nominal' : isWarning ? 'a des warnings' : 'est en erreur'
  const text = `${emoji} *${projectName}* ${label}`

  if (notifSettings.slack_webhook) {
    await fetch(notifSettings.slack_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => {})
  }

  if (notifSettings.discord_webhook) {
    await fetch(notifSettings.discord_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.replace(/\*/g, '**') }),
    }).catch(() => {})
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (resendKey && userEmail) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CIdar <alerts@cidar.dev>',
        to: [userEmail],
        subject: `${emoji} CIdar — ${projectName} ${label}`,
        html: `<p>${text.replace(/\n/g, '<br>').replace(/\*/g, '<strong>').replace(/<\/strong>/g, '</strong>')}</p>
          <p style="margin-top:16px"><a href="https://cidar.vercel.app/dashboard" style="background:#0f172a;color:#fff;padding:8px 20px;border-radius:6px;text-decoration:none;font-size:13px">Voir le dashboard →</a></p>`,
      }),
    }).catch(() => {})
  }
}

// ── Email daily report ────────────────────────────────────────────────────────
async function sendDailyReport(email: string, projects: { name: string; overall_status: string }[]) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return

  const failures = projects.filter(p => p.overall_status === 'failure' || p.overall_status === 'error')
  const warnings = projects.filter(p => p.overall_status === 'warning')
  const nominal = projects.filter(p => p.overall_status === 'success')

  const subject = failures.length
    ? `🚨 CIdar — ${failures.length} projet(s) en erreur`
    : warnings.length
    ? `⚠️ CIdar — ${warnings.length} warning(s) détecté(s)`
    : `✅ CIdar — Tous les projets sont nominaux`

  const statusEmoji = (s: string) =>
    s === 'success' ? '✅' : s === 'failure' || s === 'error' ? '❌' : s === 'warning' ? '⚠️' : '—'

  const rows = projects.map(p =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${p.name}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${statusEmoji(p.overall_status)} ${p.overall_status}</td></tr>`
  ).join('')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'CIdar <reports@cidar.dev>',
      to: [email],
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:18px">CIdar — Rapport quotidien</h1>
            <p style="color:#94a3b8;margin:4px 0 0;font-size:13px">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style="background:#f8fafc;padding:20px 24px">
            <div style="display:flex;gap:12px;margin-bottom:20px">
              <div style="flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:24px;font-weight:700;color:#10b981">${nominal.length}</div><div style="font-size:12px;color:#6b7280">Nominal</div></div>
              <div style="flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:24px;font-weight:700;color:#f59e0b">${warnings.length}</div><div style="font-size:12px;color:#6b7280">Warnings</div></div>
              <div style="flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:24px;font-weight:700;color:#ef4444">${failures.length}</div><div style="font-size:12px;color:#6b7280">Erreurs</div></div>
            </div>
            <table style="width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse">
              <thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Projet</th><th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase">Statut</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:16px;text-align:center"><a href="https://cidar.vercel.app" style="background:#0f172a;color:#fff;padding:8px 20px;border-radius:6px;text-decoration:none;font-size:13px">Voir le dashboard →</a></p>
          </div>
        </div>`,
    }),
  }).catch(() => {})
}

// ── Check projects for one user ───────────────────────────────────────────────
async function checkUserProjects(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  projectId?: string,
  userEmail?: string | null
) {
  const { data: accounts } = await supabase
    .from('linked_accounts')
    .select('provider, access_token, metadata')
    .eq('user_id', userId)

  const tokens: Record<string, string> = {}
  const accountsMeta: Record<string, Record<string, unknown>> = {}
  for (const a of accounts ?? []) {
    tokens[a.provider] = a.access_token
    accountsMeta[a.provider] = (a.metadata as Record<string, unknown>) ?? {}
  }

  let q = supabase.from('projects').select('*').eq('user_id', userId).eq('enabled', true)
  if (projectId) q = q.eq('id', projectId)
  const { data: projects } = await q
  if (!projects?.length) return []

  const { data: notifSettings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  return Promise.all(projects.map(async (project) => {
    const [githubResult, gitlabResult, vercelResult, cloudflareResult] = await Promise.all([
      project.github_owner && project.github_repo && tokens.github
        ? checkGitHub(project.github_owner, project.github_repo, tokens.github)
        : Promise.resolve(null),
      project.gitlab_namespace && project.gitlab_project && tokens.gitlab
        ? checkGitLab(project.gitlab_namespace, project.gitlab_project, tokens.gitlab)
        : Promise.resolve(null),
      project.vercel_project_id && tokens.vercel
        ? checkVercel(project.vercel_project_id, tokens.vercel, accountsMeta.vercel?.team_id as string | undefined)
        : Promise.resolve(null),
      tokens.cloudflare
        ? checkCloudflare(tokens.cloudflare, project.cloudflare_worker_name, project.cloudflare_zone_id)
        : Promise.resolve(null),
    ])

    const statuses = [githubResult?.status, gitlabResult?.status, vercelResult?.status, cloudflareResult?.status]
      .filter(Boolean) as HealthStatus[]
    const overall: HealthStatus = statuses.includes('failure') || statuses.includes('error') ? 'failure'
      : statuses.includes('warning') ? 'warning'
      : statuses.includes('success') ? 'success'
      : 'unknown'

    const { data: check } = await supabase
      .from('health_checks')
      .insert({
        project_id: project.id,
        user_id: userId,
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

    // Detect status change → instant alert
    if (notifSettings && project.last_overall_status !== overall) {
      await sendInstantAlert(project.name, overall, project.last_overall_status, notifSettings, userEmail ?? null)
      await supabase.from('projects').update({ last_overall_status: overall }).eq('id', project.id)
    }

    return { check, name: project.name, overall_status: overall }
  }))
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const body = await req.json().catch(() => ({}))
    const isCron = body.run_all === true && token === serviceRoleKey

    if (isCron) {
      const { data: usersData } = await supabase.auth.admin.listUsers()
      const users = usersData?.users ?? []

      const allResults = await Promise.all(users.map(async (u) => {
        const results = await checkUserProjects(supabase, u.id, undefined, u.email)
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('email_daily')
          .eq('user_id', u.id)
          .single()

        if (results.length > 0 && u.email && notifSettings?.email_daily !== false) {
          await sendDailyReport(u.email, results.map(r => ({ name: r.name, overall_status: r.overall_status })))
        }
        return results
      }))

      return new Response(
        JSON.stringify({ run_all: true, users: users.length, checks: allResults.flat().length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const results = await checkUserProjects(supabase, user.id, body.project_id, user.email)
    const checks = results.map(r => r.check)

    return new Response(
      JSON.stringify(body.project_id ? checks[0] : checks),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
