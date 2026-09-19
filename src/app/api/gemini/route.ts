import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: Request) {
  try {
    const { topic } = await req.json()
    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return NextResponse.json({ error: "Topic requerido (mín 3 caracteres)" }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("TU_GEMINI")) {
      return NextResponse.json({ error: "GEMINI_API_KEY no configurada en .env.local" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `Eres un copywriter experto en redes sociales (estilo Metricool).
Tema del cliente: "${topic}"
Genera EXACTAMENTE 3 copys distintos, adaptados para redes sociales, con emojis y hashtags relevantes.
Requisitos:
- Tono profesional pero cercano, español neutro.
- Máx 280 caracteres cada uno.
- Devuelve SOLO un JSON con la clave "copys": {"copys": ["texto1", "texto2", "texto3"]}
- Sin markdown, sin explicaciones.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Intentar parsear JSON, fallback a split
    let copys: string[] = []
    try {
      const cleaned = text.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(cleaned)
      copys = parsed.copys || parsed.options || []
    } catch {
      copys = text
        .split(/\n+/)
        .filter((l) => l.trim().length > 20)
        .slice(0, 3)
    }

    if (copys.length !== 3) {
      copys = copys.slice(0, 3)
      while (copys.length < 3) copys.push(copys[0] || "Copy generado")
    }

    return NextResponse.json({ copys })
  } catch (err: unknown) {
    console.error("Gemini error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error Gemini" }, { status: 500 })
  }
}
