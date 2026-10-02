// Expands maps.app.goo.gl short links, which the browser can't follow itself
// because of CORS. POST { url } -> 200 { url } or 400 { error }.
// Deployed with JWT verification off: publishable keys are not JWTs.

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isShortLink(url: string): boolean {
  try {
    return SHORT_LINK_HOSTS.includes(new URL(url).hostname)
  } catch {
    return false
  }
}

// Follows redirects only while still on a short-link host, so the result is
// the first real google.com/maps URL (and not, say, a consent page after it).
async function resolveShortLink(url: string): Promise<string> {
  let current = url

  for (let hop = 0; hop < 5 && isShortLink(current); hop += 1) {
    const response = await fetch(current, { redirect: 'manual' })
    const location = response.headers.get('location')
    await response.body?.cancel()

    if (!location) {
      throw new Error('The short link did not expand')
    }

    current = new URL(location, current).toString()
  }

  if (isShortLink(current)) {
    throw new Error('Too many redirects')
  }

  return current
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { url } = await request.json()
    const link = String(url ?? '').trim()

    if (!isShortLink(link)) {
      return json({ error: 'Not a Google Maps short link' }, 400)
    }

    return json({ url: await resolveShortLink(link) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request error'
    return json({ error: message }, 400)
  }
})
