import { supabase } from './supabase'

// Single source of truth for the localStorage-cached user blob. Every client
// component that needs role/dealer_id/email now reads through these two helpers
// instead of hand-rolling `JSON.parse(localStorage.getItem('user') || '{}')`.
// Same trust level as before — this is a UI-convenience cache, NOT a security
// boundary; RLS remains the real enforcement.
export function getStoredUser(): { email?: string; username?: string; role?: string; client_id?: string; dealer_id?: string } {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}

export function getUserRole(): string {
  return getStoredUser()?.role || ''
}

export async function loginUser(username: string, password: string) {
  // Step 1: Lookup user by username to get email
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('email, role, client_id, dealer_id')
    .eq('username', username)
    .single()

  if (userError || !userData) {
    throw new Error('Invalid username')
  }

  // Step 2: Authenticate with Supabase Auth using email + password
  const { data, error } = await supabase.auth.signInWithPassword({
    email: userData.email,
    password: password,
  })

  if (error) {
    throw new Error('Invalid password')
  }

  // Store user info in localStorage for quick access
  localStorage.setItem(
    'user',
    JSON.stringify({
      email: userData.email,
      username: username,
      role: userData.role,
      client_id: userData.client_id,
      dealer_id: userData.dealer_id,
    })
  )

  return data
}

export async function getCurrentUser() {
  const stored = localStorage.getItem('user')
  if (stored) {
    return JSON.parse(stored)
  }

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: userRecord } = await supabase
    .from('users')
    .select('role, client_id, username')
    .eq('email', user.email)
    .single()

  const userData = { ...user, ...userRecord }
  localStorage.setItem('user', JSON.stringify(userData))
  return userData
}

export async function logoutUser() {
  localStorage.removeItem('user')
  await supabase.auth.signOut()
}
