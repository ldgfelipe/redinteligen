import { createClient, createServiceClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (user.email !== "ldgfelipecarrera@gmail.com") {
    // verificar is_admin en tabla si existe
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).maybeSingle()
    if (!profile?.is_admin) redirect("/dashboard")
  }

  const service = createServiceClient()
  // Listar todos los users via service (auth) y cruzar con profiles
  const { data: { users } } = await service.auth.admin.listUsers()
  const { data: profiles } = await service.from("user_profiles").select("id, email, approved, is_admin, created_at")

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

  async function approve(formData: FormData) {
    "use server"
    const userId = formData.get("userId") as string
    const service2 = createServiceClient()
    await service2.from("user_profiles").update({ approved: true }).eq("id", userId)
    // auto-confirm email si pendiente
    await service2.auth.admin.updateUserById(userId, { email_confirm: true })
    revalidatePath("/admin")
  }

  async function toggleAdmin(formData: FormData) {
    "use server"
    const userId = formData.get("userId") as string
    const current = profileMap.get(userId)?.is_admin
    const service2 = createServiceClient()
    await service2.from("user_profiles").update({ is_admin: !current }).eq("id", userId)
    revalidatePath("/admin")
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Panel Admin - Aprobación de usuarios</h1>
          <a href="/dashboard" className="text-sm underline">Volver al dashboard</a>
        </div>
        <p className="text-sm text-muted-foreground">Total usuarios: {users.length} | Pendientes: {users.filter(u => !profileMap.get(u.id)?.approved).length}</p>
        <div className="bg-white rounded border overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b">
              <tr><th className="text-left p-2">Email</th><th className="p-2">Estado</th><th className="p-2">Admin</th><th className="p-2">Acción</th></tr>
            </thead>
            <tbody>
              {users.map(u => {
                const p = profileMap.get(u.id)
                const approved = p?.approved ?? false
                return (
                  <tr key={u.id} className="border-b">
                    <td className="p-2">{u.email} <span className="text-xs text-zinc-400">{u.id.slice(0,8)}</span></td>
                    <td className="p-2 text-center">{approved ? <span className="text-green-600">Aprobado</span> : <span className="text-amber-600">Pendiente</span>}</td>
                    <td className="p-2 text-center">{p?.is_admin ? "Sí" : "No"}</td>
                    <td className="p-2 flex gap-2 justify-center">
                      {!approved && <form action={approve}><input type="hidden" name="userId" value={u.id} /><button className="border rounded px-2 py-1 text-xs bg-black text-white">Aprobar</button></form>}
                      <form action={toggleAdmin}><input type="hidden" name="userId" value={u.id} /><button className="border rounded px-2 py-1 text-xs">{p?.is_admin ? "Quitar admin" : "Hacer admin"}</button></form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
