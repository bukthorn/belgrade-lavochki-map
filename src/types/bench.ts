// A row of public.benches (see supabase/migrations)
export type BenchItem = {
  id: number
  latitude: number
  longitude: number
  place: string
  type: string
  // ISO date, YYYY-MM-DD
  date: string
}

// What the add-bench form sends; the date is set by the database
export type NewBench = {
  latitude: number
  longitude: number
  place: string
  type: string
}
