import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let { data: workspace } = await supabase.from("workspaces").select("id").eq("user_id", user.id).maybeSingle()
  if (!workspace) {
    const { data: created } = await supabase.from("workspaces").insert({ user_id: user.id, name: "Mi Workspace" }).select("id").single()
    workspace = created
  }

  // Intentar cargar clients, si tabla no existe mostrar mensaje
  let clients: any[] = []
  let tableMissing = false
  try {
    const { data, error } = await supabase.from("clients").select("id, name, description, created_at").eq("workspace_id", workspace!.id).order("created_at", { ascending: false })
    if (error) throw error
    clients = data || []
  } catch (e: any) {
    tableMissing = e?.message?.includes("does not exist") || e?.message?.includes("clients")
    console.error("clients fetch error:", e)
  }

  async function createClientAction(formData: FormData) {
    "use server"
    const name = (formData.get("name") as string)?.trim()
    const description = (formData.get("description") as string)?.trim()
    if (!name || name.length < 2) return
    const supabase2 = await createClient()
    const { data: { user: u } } = await supabase2.auth.getUser()
    if (!u) return
    const { data: ws } = await supabase2.from("workspaces").select("id").eq("user_id", u.id).maybeSingle()
    if (!ws) return
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const { error } = await supabase2.from("clients").insert({ workspace_id: ws.id, name, slug, description: description || null })
    if (error) console.error("create client error", error)
    revalidatePath("/dashboard/clients")
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Clientes</h1>
          <Link href="/dashboard" className="text-sm underline">Volver al resumen</Link>
        </div>

        {tableMissing && (
          <Card className="border-amber-200 bg-amber-50"><CardContent className="pt-4"><p className="text-sm text-amber-800">Tabla <code>clients</code> no existe. Ejecuta <code>supabase_clients.sql</code> en Supabase SQL Editor.</p></CardContent></Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Crear nuevo cliente</CardTitle></CardHeader>
          <CardContent>
            <form action={createClientAction} className="space-y-3">
              <div className="space-y-2"><Label>Nombre del cliente *</Label><Input name="name" placeholder="Ej: Restaurante El Buen Sabor" required minLength={2} /></div>
              <div className="space-y-2"><Label>Descripción (opcional)</Label><Input name="description" placeholder="Ej: Cuenta principal - Instagram y Facebook" /></div>
              <Button type="submit">Crear cliente</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lista de clientes ({clients.length})</CardTitle></CardHeader>
          <CardContent>
            {clients.length ? (
              <div className="grid md:grid-cols-2 gap-3">
                {clients.map(c => (
                  <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="border rounded p-4 hover:bg-zinc-50 bg-white">
                    <h3 className="font-medium">{c.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{c.description || "Sin descripción"}</p>
                    <p className="text-xs text-zinc-400 mt-2">{new Date(c.created_at).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Aún no hay clientes. Crea el primero arriba.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
