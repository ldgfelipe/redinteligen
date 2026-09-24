import { NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

const GUIDES: Record<string, string> = {
  facebook: "Facebook: Ve a developers.facebook.com > Crear App > Añadir producto Facebook Login > Solicitar permisos pages_show_list, pages_read_engagement, pages_manage_posts. Genera un token de página (long-lived) en Graph API Explorer y pégalo aquí. Docs: https://developers.facebook.com/docs/graph-api/",
  instagram: "Instagram: Requiere cuenta Business conectada a una Página de Facebook. En developers.facebook.com crea App y añade Instagram Graph API con permiso instagram_content_publish. Genera token de página. Docs: https://developers.facebook.com/docs/instagram-api/",
  linkedin: "LinkedIn: Ve a developer.linkedin.com > Crear App > Verificar > Solicitar producto Share on LinkedIn (w_member_social, w_organization_social). Usa OAuth 2.0 para obtener access_token. Docs: https://learn.microsoft.com/linkedin/",
  pinterest: "Pinterest: Ve a developers.pinterest.com > Crear App > Solicitar acceso a boards:read, pins:write > OAuth. Genera token en la app. Docs: https://developers.pinterest.com/docs/api/v5/",
  x: "X (Twitter): Ve a developer.twitter.com > Crear Project/App > Generar API Key, API Secret, Access Token con permisos Read+Write. Docs: https://developer.twitter.com/",
  tiktok: "TikTok: Ve a developers.tiktok.com > Crear App > Solicitar Video Publish + Display API. OAuth. Docs: https://developers.tiktok.com/",
}

export async function POST(req: Request) {
  try {
    const { profile_id } = await req.json()
    if (!profile_id) return NextResponse.json({ error: "profile_id requerido" }, { status: 400 })

    const supabase = createServiceClient()
    const { data: profile, error } = await supabase.from("social_profiles").select("id, platform, username, access_token, workspace_id, client_id").eq("id", profile_id).single()
    if (error || !profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 })

    if (!profile.access_token) {
      return NextResponse.json({ ok: false, platform: profile.platform, error: "Sin access_token", guide: GUIDES[profile.platform] || "Configura el token de la red." })
    }

    // Intentos reales por plataforma (timeout 5s)
    let verified = false
    let detail = ""
    const token = profile.access_token

    try {
      if (profile.platform === "facebook") {
        const res = await fetch(`https://graph.facebook.com/me?access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(5000) })
        const j = await res.json()
        verified = !!j.id && !j.error
        detail = j.error ? j.error.message : `Facebook ID ${j.id} - ${j.name || ""}`
      } else if (profile.platform === "instagram") {
        const res = await fetch(`https://graph.facebook.com/me?access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(5000) })
        const j = await res.json()
        verified = !!j.id && !j.error
        detail = j.error ? j.error.message : "Token válido (usa mismo token de Página FB para IG)"
      } else if (profile.platform === "linkedin") {
        const res = await fetch("https://api.linkedin.com/v2/me", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) } as any)
        const j = await res.json().catch(() => ({}))
        verified = res.ok
        detail = res.ok ? `LinkedIn OK` : (j.message || `HTTP ${res.status}`)
      } else if (profile.platform === "pinterest") {
        const res = await fetch("https://api.pinterest.com/v5/user_account", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) } as any)
        verified = res.ok
        detail = res.ok ? "Pinterest OK" : `HTTP ${res.status}`
      } else {
        // Para X/TikTok sin endpoint simple, marcar como no verificable
        verified = true
        detail = "Token presente (verificación manual requerida para esta red)"
      }
    } catch (e: any) {
      detail = e.message || "Error de red"
      verified = false
    }

    if (verified) return NextResponse.json({ ok: true, platform: profile.platform, detail })
    return NextResponse.json({ ok: false, platform: profile.platform, error: detail, guide: GUIDES[profile.platform] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ guides: GUIDES })
}
