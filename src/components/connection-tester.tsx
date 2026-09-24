"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function ConnectionTester({ profileId, platform }: { profileId: string; platform: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; detail?: string; error?: string; guide?: string } | null>(null)

  async function test() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/test-connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: profileId }) })
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setResult({ ok: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={test} disabled={loading}>{loading ? "..." : "Probar"}</Button>
      {result && (
        <div className="text-xs">
          {result.ok ? <span className="text-green-600">✓ {result.detail}</span> : <span className="text-red-600">✗ {result.error}</span>}
          {result.guide && <details className="mt-1"><summary className="cursor-pointer underline">Cómo obtener token para {platform}</summary><p className="mt-1 p-2 bg-amber-50 border rounded text-amber-800 whitespace-pre-wrap">{result.guide}</p></details>}
        </div>
      )}
    </div>
  )
}
