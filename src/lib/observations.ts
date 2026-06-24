import type { SupabaseClient } from '@supabase/supabase-js'

export async function getRecentObservations(
  supabase: SupabaseClient,
  userId: string,
  placeId?: string,
  limit = 3,
) {
  let query = supabase
    .from('observations')
    .select('observed_at, title, body, type, place_id')
    .eq('user_id', userId)
    .order('observed_at', { ascending: false })
    .limit(limit)

  if (placeId) query = query.eq('place_id', placeId)

  const { data, error } = await query
  if (error || !data?.length) return ''

  const lines = data.map((o) => {
    const date = new Date(o.observed_at).toLocaleDateString()
    const note = [o.title, o.body].filter(Boolean).join(': ') || 'Untitled observation'
    return `- ${date} [${o.type}]: ${note}`
  })
  return `\nRECENT OBSERVATIONS (steward's own journal — reference warmly, ask follow-ups):\n${lines.join('\n')}`
}
