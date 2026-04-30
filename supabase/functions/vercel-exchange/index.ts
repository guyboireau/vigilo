import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { code, user_id } = await req.json()

    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Exchange code for access token
    const res = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('VERCEL_CLIENT_ID'),
        client_secret: Deno.env.get('VERCEL_CLIENT_SECRET'),
        code,
        redirect_uri: `${Deno.env.get('APP_URL') ?? 'https://cidar-omega.vercel.app'}/settings`,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(`Vercel token exchange failed: ${res.status} ${JSON.stringify(errData)}`)
    }

    const tokenRes = await res.json()

    if (!tokenRes.access_token) {
      return new Response(JSON.stringify({ error: 'No access_token in response' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch Vercel username
    let username: string | undefined
    try {
      const userRes = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${tokenRes.access_token}` },
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        username = userData.user?.username as string | undefined
      }
    } catch {
      // ignore
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upsert linked account
    const { error: upsertErr } = await supabase
      .from('linked_accounts')
      .upsert(
        {
          user_id,
          provider: 'vercel',
          access_token: tokenRes.access_token,
          username: username ?? null,
          metadata: { scope: tokenRes.scope ?? null, team_id: tokenRes.team_id ?? null },
        },
        { onConflict: 'user_id,provider' }
      )

    if (upsertErr) {
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Vercel exchange error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
