import { createClient } from "@/utils/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Composer from "@/components/composer"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: workspace } = await supabase.from("workspaces").select("id").eq("user_id", user.id).limit(1).maybeSingle()
  if (!workspace) redirect("/dashboard")

  const { data: client, error: cErr } = await supabase.from("clients").select("id, name, description, workspace_id").eq("id", id).maybeSingle()
  if (cErr || !client) notFound()
  if (client.workspace_id !== workspace.id) redirect("/dashboard/clients")

  const { data: profiles } = await supabase.from("social_profiles").select("id, platform, username").eq("workspace_id", workspace.id)
  // Filtrar por client si tiene client_id, si no mostrar todos del workspace (compatibilidad)
  const clientProfiles = profiles?.filter(p => (p as any).client_id === id || !(p as any).client_id) || []

  const { data: posts } = await supabase.from("posts").select("id, base_content, status, scheduled_for, created_at").eq("workspace_id", workspace.id).eq("client_id", id).order("created_at", { ascending: false }).limit(10)
  // Fallback si client_id no existe en posts viejos
  const postsToShow = posts || []

  async function connectProfile(formData: FormData) {
    "use server"
    const platform = formData.get("platform") as string
    const username = (formData.get("username") as string)?.trim()
    const access_token = (formData.get("access_token") as string)?.trim()
    if (!platform || !username) return
    const supabase2 = await createClient()
    const { data: { user: u } } = await supabase2.auth.getUser()
    if (!u) return
    const { data: ws } = await supabase2.from("workspaces").select("id").eq("user_id", u.id).limit(1).maybeSingle()
    if (!ws) return
    await supabase2.from("social_profiles").insert({ workspace_id: ws.id, client_id: id, platform, username, access_token: access_token || null })
    revalidatePath(`/dashboard/clients/${id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{client.description || "Sin descripción"}</p>
          </div>
          <Link href="/dashboard/clients" className="text-sm underline">Volver a clientes</Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Configurar redes sociales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Conecta las cuentas de este cliente. Luego podrás programar publicaciones que saldrán solo en estas redes.</p>
              {clientProfiles.length ? (
                <ul className="space-y-2">{clientProfiles.map(p => <li key={p.id} className="flex justify-between text-sm border rounded p-2"><span>{p.platform} - {p.username}</span><span className="text-xs text-zinc-400">{p.id.slice(0,6)}</span></li>)}</ul>
              ) : <p className="text-sm text-muted-foreground">Aún no hay redes conectadas.</p>}
              <form action={connectProfile} className="space-y-2 border-t pt-4">
                <Label className="text-xs">Añadir red (config manual - OAuth vendrá luego)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <select name="platform" className="border rounded px-2 py-2 text-sm" required>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="pinterest">Pinterest</option>
                    <option value="x">X</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                  <Input name="username" placeholder="@usuario o Page" required />
                </div>
                <Input name="access_token" placeholder="Access token (opcional por ahora)" />
                <Button type="submit" size="sm">Conectar</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Campañas / Posts de {client.name}</CardTitle></CardHeader>
            <CardContent>
              {postsToShow.length ? (
                <ul className="space-y-2">{postsToShow.map(p => <li key={p.id} className="text-sm border-b py-2 last:border-0"><p className="truncate">{p.base_content}</p><span className="text-xs text-muted-foreground">{p.status} {p.scheduled_for ? `· ${new Date(p.scheduled_for).toLocaleString()}` : ""}</span></li>)}</ul>
              ) : <p className="text-sm text-muted-foreground">Aún no hay publicaciones para este cliente.</p>}
            </CardContent>
          </Card>
        </div>

        <Composer workspaceId={workspace.id} profiles={clientProfiles} clientId={id} />
      </div>
    </div>
  )
}
