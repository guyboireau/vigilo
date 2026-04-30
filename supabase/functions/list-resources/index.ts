import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const auth = req.headers.get('Authorization')
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

  const { data: { user }, error } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
  if (error || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })

  const url = new URL(req.url)
  const provider = url.searchParams.get('provider')

  const { data: account } = await supabase
    .from('linked_accounts')
    .select('access_token, username, metadata')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .single()

  if (!account) {
    return new Response(JSON.stringify({ error: `${provider} not connected` }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }

  const token = account.access_token

  try {
    let resources: unknown[] = []

    if (provider === 'github') {
      resources = await fetchAllPages(
        'https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator',
        { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        (item: Record<string, unknown>) => ({ label: item.full_name as string, owner: item.owner ? (item.owner as Record<string, unknown>).login as string : '', repo: item.name as string })
      )
    } else if (provider === 'gitlab') {
      resources = await fetchAllPages(
        'https://gitlab.com/api/v4/projects?per_page=100&order_by=last_activity_at&membership=true&simple=true',
        { Authorization: `Bearer ${token}` },
        (item: Record<string, unknown>) => ({ label: item.path_with_namespace as string, namespace: (item.namespace as Record<string, unknown>)?.path as string, project: item.path as string })
      )
    } else if (provider === 'vercel') {
      const teamId = (account.metadata as Record<string, unknown> | null)?.team_id as string | undefined
      const teamParam = teamId ? `&teamId=${teamId}` : ''
      const res = await fetch(`https://api.vercel.com/v9/projects?limit=100${teamParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      resources = (data.projects ?? []).map((p: Record<string, unknown>) => ({ label: p.name as string, id: p.name as string }))
    } else if (provider === 'cloudflare') {
      const accRes = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const accData = await accRes.json()
      const accountId = accData.result?.[0]?.id as string | undefined

      const [workersData, zonesData] = await Promise.all([
        accountId
          ? fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then(r => r.json())
          : Promise.resolve({ result: [] }),
        fetch('https://api.cloudflare.com/client/v4/zones?per_page=50', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ])
      resources = {
        workers: (workersData.result ?? []).map((w: Record<string, unknown>) => ({ label: w.id as string, id: w.id as string })),
        zones: (zonesData.result ?? []).map((z: Record<string, unknown>) => ({ label: `${z.name} (${z.id})`, id: z.id as string, name: z.name as string })),
      } as unknown as unknown[]
    }

    return new Response(JSON.stringify(resources), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

async function fetchAllPages(
  url: string,
  headers: Record<string, string>,
  map: (item: Record<string, unknown>) => unknown,
  maxPages = 3
): Promise<unknown[]> {
  let results: unknown[] = []
  let nextUrl: string | null = url
  let page = 0

  while (nextUrl && page < maxPages) {
    const res = await fetch(nextUrl, { headers })
    const data = await res.json()
    const items = Array.isArray(data) ? data : []
    results = results.concat(items.map(map))

    const link = res.headers.get('link') ?? ''
    const match = link.match(/<([^>]+)>;\s*rel="next"/)
    nextUrl = match ? match[1] : null
    page++
  }

  return results
}
