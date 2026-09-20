import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Si no hay env vars (build o Vercel mal configurado), no bloquear - dejar pasar
    if (!url || !key) {
      console.warn("Middleware: Missing Supabase env vars, skipping auth check")
      return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

  const supabase = createServerClient(url, key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser()
    user = fetchedUser
  } catch (e) {
    console.error("Middleware getUser failed:", e)
    // No bloquear si Supabase no responde, dejar pasar
    return supabaseResponse
  }

  // Rutas protegidas
  const isProtected = request.nextUrl.pathname.startsWith("/dashboard")
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login")

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

    return supabaseResponse
  } catch (e) {
    console.error("Middleware fatal error (bypass):", e)
    return NextResponse.next({ request })
  }
}
