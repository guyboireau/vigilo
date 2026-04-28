import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendAlert(
  slackWebhook: string | null,
  discordWebhook: string | null,
  email: string | null,
  resendKey: string | null,
  monitorName: string,
  url: string,
  status: 'down' | 'up',
  responseMs?: number
) {
  const emoji = status === 'down' ? '🔴' : '🟢'
  const text = status === 'down'
    ? `${emoji} *${monitorName}* est DOWN\nURL: ${url}`
    : `${emoji} *${monitorName}* est de nouveau UP (${responseMs}ms)\nURL: ${url}`

  if (slackWebhook) {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => {})
  }

  if (discordWebhook) {
    await fetch(discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.replace(/\*/g, '**') }),
    }).catch(() => {})
  }

  if (email && resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'CIdar <alerts@cidar.dev>',
        to: [email],
        subject: status === 'down' ? `🔴 ${monitorName} est DOWN` : `🟢 ${monitorName} est de nouveau UP`,
        html: `<p>${text.replace(/\n/g, '<br>')}</p>`,
      }),
    }).catch(() => {})
  }
}

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
    const isCron = token === serviceRoleKey

    let userIds: string[] = []

    if (isCron) {
      const { data: users } = await supabase.auth.admin.listUsers()
      userIds = (users?.users ?? []).map(u => u.id)
    } else {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
      userIds = [user.id]
    }

    const resendKey = Deno.env.get('RESEND_API_KEY') ?? null

    for (const userId of userIds) {
      const { data: monitors } = await supabase
        .from('http_monitors')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)

      if (!monitors?.length) continue

      const { data: notifSettings } = await supabase
        .from('notification_settings')
        .select('slack_webhook, discord_webhook, email_on_failure, email_on_recovery')
        .eq('user_id', userId)
        .single()

      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const userEmail = authUser?.user?.email ?? null

      await Promise.all(monitors.map(async (monitor) => {
        const start = Date.now()
        let newStatus = 'down'
        let responseMs = 0

        try {
          const res = await fetch(monitor.url, { signal: AbortSignal.timeout(10000) })
          responseMs = Date.now() - start
          newStatus = res.status === monitor.expected_status ? 'up' : 'down'
        } catch {
          responseMs = Date.now() - start
          newStatus = 'down'
        }

        await supabase
          .from('http_monitors')
          .update({ last_status: newStatus, last_checked_at: new Date().toISOString(), last_response_ms: responseMs })
          .eq('id', monitor.id)

        const statusChanged = monitor.last_status !== newStatus
        if (statusChanged && notifSettings) {
          const shouldAlert =
            (newStatus === 'down' && notifSettings.email_on_failure) ||
            (newStatus === 'up' && notifSettings.email_on_recovery)

          if (shouldAlert) {
            await sendAlert(
              notifSettings.slack_webhook,
              notifSettings.discord_webhook,
              userEmail,
              resendKey,
              monitor.name,
              monitor.url,
              newStatus as 'down' | 'up',
              responseMs
            )
          }
        }
      }))
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
