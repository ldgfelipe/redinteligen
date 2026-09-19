import { NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

// Verificación opcional de QStash (si configuras signing keys)
// import { Receiver } from "@upstash/qstash"

export async function POST(req: Request) {
  try {
    // TODO: Descomentar para verificar firma QStash en producción
    // const signature = req.headers.get("upstash-signature")
    // if (process.env.QSTASH_CURRENT_SIGNING_KEY && signature) {
    //   const receiver = new Receiver({
    //     currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    //     nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    //   })
    //   const body = await req.text()
    //   await receiver.verify({ signature, body })
    // }

    const { post_id } = await req.json()
    if (!post_id) return NextResponse.json({ error: "post_id requerido" }, { status: 400 })

    const supabase = createServiceClient()

    // 1. Buscar post + media + destinos
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, base_content, workspace_id, status")
      .eq("id", post_id)
      .single()

    if (postError || !post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

    const { data: media } = await supabase
      .from("post_media")
      .select("storage_path, media_type")
      .eq("post_id", post_id)

    const { data: destinations } = await supabase
      .from("post_destinations")
      .select("id, social_profile_id, status")
      .eq("post_id", post_id)

    // Si no hay destinos, intentar crearlos a partir de social_profiles del workspace
    let dests = destinations
    if (!dests || dests.length === 0) {
      const { data: profiles } = await supabase
        .from("social_profiles")
        .select("id")
        .eq("workspace_id", post.workspace_id)

      if (profiles && profiles.length > 0) {
        const inserts = profiles.map((p) => ({
          post_id,
          social_profile_id: p.id,
          status: "pending",
        }))
        const { data: created } = await supabase.from("post_destinations").insert(inserts).select()
        dests = created ?? []
      }
    }

    // 2. Obtener URL pública de la imagen si existe
    let imageUrl: string | null = null
    if (media && media.length > 0) {
      const { data } = supabase.storage.from("artes_posts").getPublicUrl(media[0].storage_path)
      imageUrl = data.publicUrl
    }

    console.log(`[Omnify Publish] post=${post_id} content="${post.base_content.slice(0, 80)}" image=${imageUrl} dests=${dests?.length}`)

    // 3. Marcar como publishing
    await supabase.from("posts").update({ status: "publishing" }).eq("id", post_id)

    // ============================================
    // TODO: Integración con APIs reales
    // ============================================
    // for (const dest of dests ?? []) {
    //   const { data: profile } = await supabase
    //     .from("social_profiles")
    //     .select("platform, access_token")
    //     .eq("id", dest.social_profile_id)
    //     .single()
    //
    //   try {
    //     if (profile?.platform === "facebook") {
    //       // await publishToFacebook(profile.access_token, post.base_content, imageUrl)
    //     }
    //     if (profile?.platform === "linkedin") {
    //       // await publishToLinkedIn(profile.access_token, post.base_content, imageUrl)
    //     }
    //     if (profile?.platform === "instagram") {
    //       // await publishToInstagram(profile.access_token, post.base_content, imageUrl)
    //     }
    //     await supabase.from("post_destinations").update({ status: "published", published_at: new Date().toISOString() }).eq("id", dest.id)
    //   } catch (e) {
    //     await supabase.from("post_destinations").update({ status: "failed", error_message: String(e) }).eq("id", dest.id)
    //   }
    // }

    // Simulación MVP: marcar todo como publicado
    if (dests && dests.length > 0) {
      await supabase.from("post_destinations").update({ status: "published", published_at: new Date().toISOString() }).eq("post_id", post_id)
    }
    await supabase.from("posts").update({ status: "published" }).eq("id", post_id)

    return NextResponse.json({ ok: true, post_id, imageUrl, destinations: dests?.length ?? 0 })
  } catch (err: unknown) {
    console.error("Publish webhook error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error interno" }, { status: 500 })
  }
}

// QStash puede reintentar con GET si falla, permitir healthcheck
export async function GET() {
  return NextResponse.json({ ok: true, message: "Omnify publish webhook alive" })
}
