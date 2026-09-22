"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const dynamic = "force-dynamic"

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabaseConfigured = isSupabaseConfigured()
  const getSupabase = () => createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!supabaseConfigured) {
      setMessage("Modo offline: Supabase no configurado. Ve a /dashboard para ver el sistema sin login, o configura env vars en Vercel.")
      return
    }
    setLoading(true)
    setMessage("")
    try {
      const supabase = getSupabase()
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/dashboard")
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setMessage("Revisa tu email para confirmar la cuenta. Luego podrás iniciar sesión.")
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    if (!supabaseConfigured) {
      setMessage("Google login requiere Supabase configurado.")
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setMessage(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{isLogin ? "Bienvenido a Omnify" : "Crea tu cuenta"}</CardTitle>
          <CardDescription>
            {supabaseConfigured
              ? isLogin
                ? "Ingresa tus credenciales para gestionar tus redes"
                : "Regístrate para empezar a programar posts"
              : "Modo offline - El sistema carga sin Supabase. Login deshabilitado."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!supabaseConfigured && (
            <div className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
              Supabase no configurado. Puedes entrar al dashboard demo sin login.
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => router.push("/dashboard")}>
                Ir al Dashboard (offline)
              </Button>
            </div>
          )}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {message && <p className="text-sm text-center p-2 rounded bg-muted text-muted-foreground">{message}</p>}
            <Button type="submit" className="w-full" disabled={loading || !supabaseConfigured}>
              {loading ? "Cargando..." : isLogin ? "Iniciar sesión" : "Registrarse"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">O continúa con</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} type="button" disabled={!supabaseConfigured}>
            Continuar con Google
          </Button>

          <p className="mt-6 text-center text-sm">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setMessage("") }} className="font-medium underline">
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
          <p className="mt-2 text-center">
            <a href="/dashboard" className="text-xs underline text-muted-foreground">Entrar sin login (demo)</a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
