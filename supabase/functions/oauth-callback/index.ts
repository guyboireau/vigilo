import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Provider = 'github' | 'gitlab' | 'vercel'

interface TokenResponse {
  access_token: string
  token_type?: string
  scope?: string
}

async function exchangeGitHub(code: string): Promise<TokenResponse> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: Deno.env.get('GITHUB_CLIENT_ID'),
      client_secret: Deno.env.get('GITHUB_CLIENT_SECRET'),
      code,
    }),
  })
  if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`)
  return res.json()
}

async function exchangeGitLab(code: string): Promise<TokenResponse> {
  const res = await fetch('https://gitlab.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('GITLAB_CLIENT_ID'),
      client_secret: Deno.env.get('GITLAB_CLIENT_SECRET'),
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`,
    }),
  })
  if (!res.ok) throw new Error(`GitLab token exchange failed: ${res.status}`)
  return res.json()
}

async function exchangeVercel(code: string): Promise<TokenResponse> {
  const res = await fetch('https://api.vercel.com/v2/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('VERCEL_CLIENT_ID'),
      client_secret: Deno.env.get('VERCEL_CLIENT_SECRET'),
      code,
      redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`,
    }),
  })
  if (!res.ok) throw new Error(`Vercel token exchange failed: ${res.status}`)
  return res.json()
}

async function fetchGitHubUsername(token: string): Promise<string | undefined> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return undefined
    const data = await res.json()
    return data.login as string
  } catch {
    return undefined
  }
}

async function fetchGitLabUsername(token: string): Promise<string | undefined> {
  try {
    const res = await fetch('https://gitlab.com/api/v4/user', {
      headers: { 'PRIVATE-TOKEN': token },
    })
    if (!res.ok) return undefined
    const data = await res.json()
    return data.username as string
  } catch {
    return undefined
  }
}

async function fetchVercelUsername(token: string): Promise<string | undefined> {
  try {
    const res = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return undefined
    const data = await res.json()
    return data.user?.username as string | undefined
  } catch {
    return undefined
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const rawState = url.searchParams.get('state') // contains user_id:provider

    if (!code || !rawState) {
      return new Response(JSON.stringify({ error: 'Missing code or state' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Decode state: userId:provider
    const stateParts = decodeURIComponent(rawState).split(':')
    const userId = stateParts[0]
    const provider = (stateParts[1] ?? '') as Provider

    if (!userId || !provider) {
      return new Response(JSON.stringify({ error: 'Invalid state format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['github', 'gitlab', 'vercel'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Unsupported provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify state = valid user_id
    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(userId)
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid state' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Exchange code for token
    let tokenRes: TokenResponse
    if (provider === 'github') tokenRes = await exchangeGitHub(code)
    else if (provider === 'gitlab') tokenRes = await exchangeGitLab(code)
    else tokenRes = await exchangeVercel(code)

    if (!tokenRes.access_token) {
      return new Response(JSON.stringify({ error: 'No access_token in response' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch username
    let username: string | undefined
    if (provider === 'github') username = await fetchGitHubUsername(tokenRes.access_token)
    else if (provider === 'gitlab') username = await fetchGitLabUsername(tokenRes.access_token)
    else username = await fetchVercelUsername(tokenRes.access_token)

    // Upsert linked account
    const { error: upsertErr } = await supabase
      .from('linked_accounts')
      .upsert(
        {
          user_id: userId,
          provider,
          access_token: tokenRes.access_token,
          username: username ?? null,
          metadata: { scope: tokenRes.scope ?? null },
        },
        { onConflict: 'user_id,provider' }
      )

    if (upsertErr) {
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Redirect back to app settings
    const redirectUrl = `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/settings?connected=${provider}`
    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    })
  } catch (err) {
    console.error('OAuth callback error:', err)
    const redirectUrl = `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/settings?error=oauth_failed`
    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl },
    })
  }
})
