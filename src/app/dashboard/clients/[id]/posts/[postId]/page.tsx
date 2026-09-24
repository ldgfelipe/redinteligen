import { createClient } from "@/utils/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function PostDetailPage({ params }: { params: Promise<{ id: string; postId: string }> }) {
  const { id, postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: workspace } = await supabase.from("workspaces").select("id").eq("user_id", user.id).limit(1).maybeSingle()
  if (!workspace) redirect("/dashboard")

  const { data: client } = await supabase.from("clients").select("id, name, workspace_id").eq("id", id).maybeSingle()
  if (!client || client.workspace_id !== workspace.id) notFound()

  const { data: post } = await supabase.from("posts").select("id, base_content, status, scheduled_for, created_at, updated_at, workspace_id, client_id").eq("id", postId).maybeSingle()
  if (!post || post.workspace_id !== workspace.id) notFound()

  const { data: media } = await supabase.from("post_media").select("id, storage_path, media_type").eq("post_id", postId)
  const { data: destinations } = await supabase.from("post_destinations").select("id, status, error_message, published_at, social_profile_id, social_profiles(platform, username)").eq("post_id", postId)

  let imageUrls: string[] = []
  if (media?.length) {
    for (const m of media) {
      const { data } = supabase.storage.from("artes_posts").getPublicUrl(m.storage_path)
      imageUrls.push(data.publicUrl)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Detalle de publicación</h1>
          <Link href={`/dashboard/clients/${id}`} className="text-sm underline">Volver a {client.name}</Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Contenido</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{post.base_content}</p>
              <div className="text-xs space-y-1 border-t pt-3">
                <p><span className="font-medium">Estado:</span> <span className={`px-2 py-0.5 rounded text-xs ${post.status === "published" ? "bg-green-100 text-green-700" : post.status === "scheduled" ? "bg-amber-100 text-amber-700" : "bg-zinc-100"}`}>{post.status}</span></p>
                <p><span className="font-medium">Programado:</span> {post.scheduled_for ? new Date(post.scheduled_for).toLocaleString() : "—"}</p>
                <p><span className="font-medium">Creado:</span> {new Date(post.created_at).toLocaleString()}</p>
                <p><span className="font-medium">Actualizado:</span> {new Date(post.updated_at).toLocaleString()}</p>
                <p><span className="font-medium">Cliente:</span> {client.name}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Media</CardTitle></CardHeader>
            <CardContent>
              {imageUrls.length ? (
                <div className="space-y-2">{imageUrls.map((url, i) => <img key={i} src={url} alt="arte" className="rounded border w-full" />)}</div>
              ) : <p className="text-sm text-muted-foreground">Sin imagen</p>}
              {media?.length ? <ul className="text-xs mt-2 space-y-1">{media.map(m => <li key={m.id} className="truncate">{m.storage_path} ({m.media_type})</li>)}</ul> : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Destinos ({destinations?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {destinations?.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left border-b"><th className="py-2">Red</th><th>Estado</th><th>Publicado</th><th>Error</th></tr></thead>
                <tbody>{destinations.map((d: any) => <tr key={d.id} className="border-b"><td>{d.social_profiles?.platform} {d.social_profiles?.username ? `· ${d.social_profiles.username}` : ""}</td><td><span className={`px-2 py-0.5 rounded text-xs ${d.status === "published" ? "bg-green-100 text-green-700" : d.status === "failed" ? "bg-red-100 text-red-700" : "bg-zinc-100"}`}>{d.status}</span></td><td className="text-xs">{d.published_at ? new Date(d.published_at).toLocaleString() : "—"}</td><td className="text-xs text-red-600 truncate max-w-[200px]">{d.error_message || "—"}</td></tr>)}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground">Aún no hay destinos. Se crean al publicar/programar según las redes conectadas al cliente.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
