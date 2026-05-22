export interface Env {
  DB: D1Database
  AI_API_KEY?: string
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, service: "fitnote" }, { headers: jsonHeaders })
    }

    if (url.pathname === "/api/ai/estimate-meal" && request.method === "POST") {
      return Response.json(
        {
          calories: 690,
          protein: 58,
          carbs: 68,
          fat: 19,
          items: [
            { name: "米饭", calories: 260, protein: 5, carbs: 58, fat: 1 },
            { name: "鸡胸肉", calories: 220, protein: 42, carbs: 0, fat: 5 },
            { name: "鸡蛋", calories: 210, protein: 11, carbs: 10, fat: 13 },
          ],
        },
        { headers: jsonHeaders },
      )
    }

    return Response.json({ error: "Not found" }, { status: 404, headers: jsonHeaders })
  },
} satisfies ExportedHandler<Env>
