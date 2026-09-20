import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

  return createServerClient(url, key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Cliente con service_role (solo usar en server, nunca exponer al cliente)
// Útil para webhooks como /api/publish donde RLS no debe bloquear
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
