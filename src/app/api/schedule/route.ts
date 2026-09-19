import { NextResponse } from "next/server"
import { Client } from "@upstash/qstash"

export async function POST(req: Request) {
  try {
    const { post_id, scheduled_for } = await req.json()
    if (!post_id || !scheduled_for) {
      return NextResponse.json({ error: "post_id y scheduled_for requeridos" }, { status: 400 })
    }

    const runAt = new Date(scheduled_for)
    if (runAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "scheduled_for debe ser en el futuro" }, { status: 400 })
    }

    if (!process.env.QSTASH_TOKEN || process.env.QSTASH_TOKEN.includes("TU_QSTASH")) {
      // Modo dev sin QStash: no falla, solo avisa
      console.warn("[Omnify Schedule] QSTASH_TOKEN no configurado, simulando programación")
      return NextResponse.json({ ok: true, simulated: true, message: "QStash no configurado - post quedará scheduled" })
    }

    const qstash = new Client({ token: process.env.QSTASH_TOKEN! })
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const destination = `${appUrl.replace(/\/$/, "")}/api/publish`

    // notBefore = timestamp Unix en segundos (QStash espera segundos)
    const notBefore = Math.floor(runAt.getTime() / 1000)

    const result = await qstash.publishJSON({
      url: destination,
      body: { post_id },
      notBefore,
      // reintentos si tu webhook falla
      retries: 3,
    })

    return NextResponse.json({ ok: true, qstashMessageId: result.messageId, notBefore, destination })
  } catch (err: unknown) {
    console.error("QStash schedule error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error QStash" }, { status: 500 })
  }
}
