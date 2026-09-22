import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Composer from "@/components/composer"

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
  // MODO OFFLINE: si no hay Supabase, muestra dashboard sin bloquear
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <header className="border-b bg-white dark:bg-zinc-900">
          <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
            <h1 className="font-semibold text-lg">Omnify (Offline)</h1>
            <span className="text-sm text-amber-600">Modo demo - Sin Supabase</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Sistema cargado sin conexión externa. Configura Supabase en Vercel env vars para activar login y guardado real.
              El composer abajo funciona en modo demo local.
            </p>
          </div>
          <Composer workspaceId="demo-workspace" profiles={[]} />
          <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
            <h2 className="font-medium mb-3">Posts recientes (demo)</h2>
            <p className="text-sm text-muted-foreground">Sin Supabase no hay posts persistidos. Configura env vars y recarga.</p>
          </div>
        </main>
      </div>
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    let { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()

    if (!workspace) {
      const { data: created, error: createErr } = await supabase
        .from("workspaces")
        .insert({ user_id: user.id, name: "Mi Workspace" })
        .select("id, name")
        .single()
      if (createErr) throw new Error("No se pudo crear workspace: " + createErr.message)
      workspace = created
    }

    if (!workspace) throw new Error("Workspace no disponible")

    const { data: profiles } = await supabase
      .from("social_profiles")
      .select("id, platform, username")
      .eq("workspace_id", workspace.id)

    const { data: recentPosts } = await supabase
      .from("posts")
      .select("id, base_content, scheduled_for, status, created_at")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(5)

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <header className="border-b bg-white dark:bg-zinc-900">
          <div className="mx-auto max-w-5xl flex h-14 items-center justify-between px-4">
            <h1 className="font-semibold text-lg">Omnify</h1>
            <span className="text-sm text-muted-foreground">{user.email} · {workspace?.name}</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4 md:p-6 space-y-6">
          <Composer workspaceId={workspace.id} profiles={profiles ?? []} />
          <div className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
            <h2 className="font-medium mb-3">Posts recientes</h2>
            {recentPosts?.length ? (
              <ul className="space-y-2">
                {recentPosts.map((p) => (
                  <li key={p.id} className="flex justify-between text-sm border-b py-2 last:border-0">
                    <span className="truncate max-w-[60%]">{p.base_content}</span>
                    <span className="text-muted-foreground text-xs">{p.status} {p.scheduled_for ? `· ${new Date(p.scheduled_for).toLocaleString()}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no hay posts.</p>
            )}
          </div>
        </main>
      </div>
    )
  } catch (e) {
    // Si Supabase falla, no crashear, mostrar offline
    console.error("Dashboard error, fallback offline:", e)
    return (
      <div className="min-h-screen bg-zinc-50 p-8">
        <h1 className="text-xl font-semibold">Omnify - Error de conexión</h1>
        <p className="text-sm text-muted-foreground mt-2">{e instanceof Error ? e.message : String(e)}</p>
        <p className="text-sm mt-4">El sistema cargó pero Supabase no responde. Revisa env vars en Vercel.</p>
        <a href="/login" className="underline text-sm mt-4 inline-block">Ir a login</a>
      </div>
    )
  }
}
