import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg border p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Omnify</h1>
        <p className="text-sm text-zinc-600">Sistema de programación de redes sociales</p>
        <div className="flex flex-col gap-2 pt-4">
          <Link href="/login" className="bg-black text-white rounded py-2 text-sm">Ir a Login</Link>
          <Link href="/dashboard" className="border rounded py-2 text-sm">Ir a Dashboard (offline demo)</Link>
          <Link href="/api/health" className="text-xs underline text-zinc-500">Ver estado del sistema</Link>
        </div>
        <p className="text-xs text-zinc-400">Si ves esta página, el deploy funciona sin dependencias externas.</p>
      </div>
    </div>
  )
}
