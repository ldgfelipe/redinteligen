"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Profile = { id: string; platform: string; username: string | null }

export default function Composer({ workspaceId, profiles }: { workspaceId: string; profiles: Profile[] }) {
  const [content, setContent] = useState("")
  const [topic, setTopic] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [geminiOptions, setGeminiOptions] = useState<string[]>([])
  const [loadingGemini, setLoadingGemini] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const supabase = createClient()

  async function handleGemini() {
    if (!topic.trim()) return setMessage("Escribe un tema para generar copys")
    setLoadingGemini(true)
    setMessage("")
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error Gemini")
      setGeminiOptions(data.copys)
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Error")
    } finally {
      setLoadingGemini(false)
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return setMessage("El contenido es requerido")
    setSaving(true)
    setMessage("")
    try {
      // 1. Crear post
      const scheduled = scheduledFor ? new Date(scheduledFor).toISOString() : null
      const status = scheduled && new Date(scheduled) > new Date() ? "scheduled" : "draft"

      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          workspace_id: workspaceId,
          base_content: content,
          scheduled_for: scheduled,
          status,
        })
        .select("id")
        .single()
      if (postError) throw postError

      // 2. Subir imagen si existe
      if (file && post) {
        const ext = file.name.split(".").pop()
        const path = `${(await supabase.auth.getUser()).data.user?.id}/${post.id}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("artes_posts")
          .upload(path, file, { upsert: true })
        if (uploadError) throw uploadError

        const { error: mediaError } = await supabase.from("post_media").insert({
          post_id: post.id,
          storage_path: path,
          media_type: file.type.startsWith("video") ? "video" : "image",
        })
        if (mediaError) throw mediaError
      }

      // 3. Si está programado, llamar a QStash vía API interna
      if (status === "scheduled" && post) {
        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: post.id, scheduled_for: scheduled }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || "Error programando con QStash")
        }
      }

      setMessage(status === "scheduled" ? "Post programado con éxito ✓" : "Post guardado como borrador ✓")
      setContent("")
      setFile(null)
      setScheduledFor("")
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gemini */}
        <div className="flex gap-2">
          <Input placeholder="Tema para IA ej: lanzamiento café premium" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <Button type="button" onClick={handleGemini} disabled={loadingGemini} variant="secondary">
            {loadingGemini ? "..." : "Generar con IA"}
          </Button>
        </div>
        {geminiOptions.length > 0 && (
          <div className="grid gap-2">
            {geminiOptions.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setContent(c)}
                className="text-left text-sm p-3 rounded border hover:bg-muted"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handlePublish} className="space-y-4">
          <div className="space-y-2">
            <Label>Contenido</Label>
            <Textarea placeholder="Escribe tu copy..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} required />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha y hora (opcional - programar)</Label>
              <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Imagen / Arte</Label>
              <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {profiles.length > 0 && (
            <p className="text-xs text-muted-foreground">Se publicará en: {profiles.map((p) => p.platform).join(", ")} (post_destinations se crea en webhook)</p>
          )}

          {message && <p className="text-sm p-2 rounded bg-muted text-center">{message}</p>}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : scheduledFor ? "Programar Post" : "Guardar Borrador"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
