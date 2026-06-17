import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 
let supabase = null

if (supabaseUrl && supabaseAnonKey) {
  supabase =
    typeof window !== 'undefined'
      ? createBrowserClient(supabaseUrl, supabaseAnonKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'afb-auth',
          },
        })
} else {
  console.warn('Supabase client not initialized: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}
 
export { supabase }
export default supabase
