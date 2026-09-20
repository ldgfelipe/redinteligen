import { type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (e) {
    console.error("Root middleware error:", e)
    const { NextResponse } = await import("next/server")
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    // Solo correr en rutas que necesitan auth, no en cada asset/api
    "/dashboard/:path*",
    "/login",
  ],
}
