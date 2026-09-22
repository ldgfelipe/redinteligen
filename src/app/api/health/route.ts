import { NextResponse } from "next/server"

export async function GET() {
  const supabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"))
  const gemini = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("TU_GEMINI"))
  const qstash = Boolean(process.env.QSTASH_TOKEN && !process.env.QSTASH_TOKEN.includes("TU_QSTASH"))
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      supabase,
      gemini,
      qstash,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "not set",
    },
    mode: !supabase ? "offline - sistema carga sin Supabase" : "online",
    message: "Si ves este JSON, el sistema está desplegado correctamente sin 500/404",
  })
}
