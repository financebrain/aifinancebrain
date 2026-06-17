import { createServerClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseServerClient(cookieStore) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll ? cookieStore.getAll() : [];
        },
        setAll() {
          // no-op: this helper only needs to read session cookies for auth
        },
      },
    }
  );
}