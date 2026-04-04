import { createClient } from '@supabase/supabase-js'
import { env } from '@/core/env'

let adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseServerClient() {
  if (!adminClient) {
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}
