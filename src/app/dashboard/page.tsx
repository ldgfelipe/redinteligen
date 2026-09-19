import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Composer from "@/components/composer"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Obtener o crear workspace
  let { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("user_id", user.id)
    .limit(1)
    .single()

  if (!workspace) {
    const { data: created } = await supabase
      .from("workspaces")
      .insert({ user_id: user.id, name: "Mi Workspace" })
      .select("id, name")
      .single()
    workspace = created
  }

  const { data: profiles } = await supabase
    .from("social_profiles")
    .select("id, platform, username")
    .eq("workspace_id", workspace!.id)

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, base_content, scheduled_for, status, created_at")
    .eq("workspace_id", workspace!.id)
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
        <Composer workspaceId={workspace!.id} profiles={profiles ?? []} />
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
}
