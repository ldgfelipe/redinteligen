import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  )
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <header className="border-b bg-white dark:bg-zinc-900">
          <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
            <h1 className="font-semibold text-lg">Omnify (Offline)</h1>
            <span className="text-sm text-amber-600">Modo demo</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
          <Card><CardHeader><CardTitle>Resumen (offline)</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Configura Supabase para ver resumen real. <Link href="/dashboard/clients" className="underline">Ver clientes demo</Link></p></CardContent></Card>
        </main>
      </div>
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    let isApproved = true
    let isAdmin = user.email === "ldgfelipecarrera@gmail.com"
    try {
      const { data: profile } = await supabase.from("user_profiles").select("approved, is_admin").eq("id", user.id).maybeSingle()
      if (profile) { isApproved = profile.approved; isAdmin = profile.is_admin }
      else if (!isAdmin) { await supabase.from("user_profiles").insert({ id: user.id, email: user.email!, approved: false, is_admin: false }); isApproved = false }
    } catch {}
    if (!isApproved && !isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg border p-8 text-center space-y-3">
            <h1 className="text-xl font-semibold">Cuenta pendiente de aprobación</h1>
            <p className="text-sm text-muted-foreground">Tu registro con {user.email} está esperando que el administrador lo apruebe.</p>
            <form action="/auth/signout" method="post"><button className="text-sm underline mt-4">Cerrar sesión</button></form>
          </div>
        </div>
      )
    }

    let { data: workspace } = await supabase.from("workspaces").select("id, name").eq("user_id", user.id).limit(1).maybeSingle()
    if (!workspace) {
      const { data: created } = await supabase.from("workspaces").insert({ user_id: user.id, name: "Mi Workspace" }).select("id, name").single()
      workspace = created
    }
    if (!workspace) throw new Error("Workspace no disponible")

    // Resumen
    const [{ count: clientsCount }, { count: postsCount }, { data: postsByStatus }] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
      supabase.from("posts").select("status").eq("workspace_id", workspace.id),
    ])
    const statusCounts = (postsByStatus || []).reduce((acc: Record<string, number>, p) => { acc[p.status] = (acc[p.status]||0)+1; return acc }, {})
    const { data: recentPosts } = await supabase.from("posts").select("id, base_content, status, created_at, clients(name)").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(5)
    const { data: clients } = await supabase.from("clients").select("id, name, created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(5)

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <header className="border-b bg-white dark:bg-zinc-900">
          <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
            <h1 className="font-semibold text-lg">Omnify</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user.email} · {workspace?.name}</span>
              {isAdmin && <Link href="/admin" className="text-xs border rounded px-2 py-1">Admin</Link>}
              <Link href="/api/health" className="text-xs underline">Health</Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Clientes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{clientsCount ?? 0}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Posts totales</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{postsCount ?? 0}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Programados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{statusCounts["scheduled"] ?? 0}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Publicados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{statusCounts["published"] ?? 0}</p></CardContent></Card>
          </div>

          <div className="flex gap-2">
            <Link href="/dashboard/clients" className="inline-flex h-9 px-4 items-center rounded bg-black text-white text-sm">Ver clientes</Link>
            <Link href="/dashboard/clients" className="inline-flex h-9 px-4 items-center rounded border text-sm">+ Nuevo cliente</Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Clientes recientes</CardTitle></CardHeader>
              <CardContent>
                {clients?.length ? <ul className="space-y-2">{clients.map(c => <li key={c.id} className="flex justify-between text-sm border-b py-2 last:border-0"><Link href={`/dashboard/clients/${c.id}`} className="underline">{c.name}</Link><span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aún no hay clientes. <Link href="/dashboard/clients" className="underline">Crear uno</Link></p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Actividad reciente</CardTitle></CardHeader>
              <CardContent>
                {recentPosts?.length ? <ul className="space-y-2">{recentPosts.map((p: any) => <li key={p.id} className="flex justify-between text-sm border-b py-2 last:border-0"><span className="truncate max-w-[60%]">{p.base_content}</span><span className="text-xs text-muted-foreground">{p.status} {p.clients?.name ? `· ${p.clients.name}` : ""}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aún no hay posts.</p>}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  } catch (e) {
    console.error("Dashboard error:", e)
    return <div className="p-8"><h1 className="font-semibold">Error</h1><p className="text-sm">{e instanceof Error ? e.message : String(e)}</p></div>
  }
}
