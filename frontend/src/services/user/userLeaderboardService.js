import { supabase } from '../../lib/supabase.js'

export async function fetchUserLeaderboard(limit = 50) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user?.id) throw new Error('Sign in to view the leaderboard.')

  const { data, error } = await supabase.rpc('get_user_leaderboard', { p_limit: limit })
  if (error) throw new Error(error.message || 'Could not load the user leaderboard.')
  return (Array.isArray(data) ? data : []).map((row) => {
    const name = row.display_name || 'FitKey Member'
    return {
      id: row.user_id,
      name,
      avatarUrl: row.avatar_url || '',
      xp: Number(row.available_xp || 0),
      rank: Number(row.rank || 0),
      initials: name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'F',
      current: row.user_id === authData.user.id,
      streak: 0,
      trend: 'same',
    }
  })
}
