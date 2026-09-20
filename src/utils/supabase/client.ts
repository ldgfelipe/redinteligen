import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // No crashear el build en Vercel si faltan env vars - el error se verá en runtime
    // Durante el build devolvemos un proxy que lanza error solo al usarse
    console.warn("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY")
    // Usamos placeholders para que el build no falle; en runtime sin env fallará con mensaje claro
    return createBrowserClient(
      url || "https://placeholder.supabase.co",
      key || "placeholder-key"
    )
  }
  return createBrowserClient(url, key)
}
