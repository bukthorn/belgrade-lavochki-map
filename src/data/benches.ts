import { createClient, FunctionsHttpError } from '@supabase/supabase-js'
import type { BenchItem, NewBench } from '../types/bench'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Without .env values the client is null, so the page still renders and
// shows the error in the stats panel instead of crashing on import.
const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

const COLUMNS = 'id, latitude, longitude, place, type, date'

function getClient() {
  if (!supabase) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set in .env',
    )
  }

  return supabase
}

// Matches "Max rows" in the Supabase API settings (1000 by default): the API
// never returns more per request, so the rows are fetched page by page
const PAGE_SIZE = 1000

export async function fetchBenchItems(): Promise<BenchItem[]> {
  const items: BenchItem[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await getClient()
      .from('benches')
      .select(COLUMNS)
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(error.message)
    }

    items.push(...(data as BenchItem[]))

    // A short page is the last one
    if (data.length < PAGE_SIZE) return items
  }
}

export async function addBench(bench: NewBench): Promise<BenchItem> {
  const { data, error } = await getClient()
    .from('benches')
    .insert(bench)
    .select(COLUMNS)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as BenchItem
}

export async function resolveMapsLink(url: string): Promise<string> {
  const { data, error } = await getClient().functions.invoke<{ url: string }>(
    'resolve-maps-link',
    { body: { url } },
  )

  if (error) {
    // The function explains a failure in the body: { error: '...' }
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      if (body?.error) throw new Error(body.error)
    }

    throw new Error(error.message)
  }

  if (!data?.url) {
    throw new Error('Empty response while expanding the link')
  }

  return data.url
}

let channelCount = 0

// Calls onInsert for every bench added by anyone, including this tab.
// Returns the unsubscribe function.
export function subscribeToNewBenches(
  onInsert: (bench: BenchItem) => void,
): () => void {
  if (!supabase) return () => {}

  // A unique topic per subscription: StrictMode mounts effects twice, and a
  // reused topic could hand back the channel that is still being removed.
  channelCount += 1

  const channel = supabase
    .channel(`benches-inserts-${channelCount}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'benches' },
      (payload) => onInsert(payload.new as BenchItem),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
