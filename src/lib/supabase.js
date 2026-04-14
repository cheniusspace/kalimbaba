import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

/** True when URL/key look usable (avoids hanging requests from empty env in dev). */
export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('http') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20,
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
