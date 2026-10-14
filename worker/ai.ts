// Photo → nutrition estimate through the owner's own model provider.
// The API key is stored in the owner's D1 (app_settings, key "ai") and only ever used
// server-side; the browser only sees a masked hint.

import { aiProviderPresets, customProviderId, findPreset, mealPhotoPrompt, type AiProtocol } from "../shared/ai-providers"

export type AiConfig = {
  providerId: string
  baseUrl: string
  model: string
  protocol: AiProtocol
  apiKey: string
}

export type AiConfigInput = {
  providerId?: string
  baseUrl?: string
  model?: string
  protocol?: string
  /** Omitted or empty → keep the stored key. */
  apiKey?: string
  clearKey?: boolean
}

export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

const settingsKey = "ai"
const requestTimeoutMs = 90_000
// 16×16 red PNG used by the connection test so it also checks image support.
const testImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGN4YGBAEmIY1TCqYfhqAADPxkAQTupUJwAAAABJRU5ErkJggg=="

export async function loadAiConfig(db: D1Database, userId: string): Promise<AiConfig | null> {
  const row = await db.prepare("SELECT value FROM app_settings WHERE key = ? AND user_id = ?").bind(settingsKey, userId).first<{ value: string }>()

  if (!row?.value) {
    return null
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<AiConfig>
    if (!parsed.model || !parsed.baseUrl) {
      return null
    }
    return {
      providerId: String(parsed.providerId ?? customProviderId),
      baseUrl: String(parsed.baseUrl),
      model: String(parsed.model),
      protocol: parsed.protocol === "anthropic" ? "anthropic" : "openai",
      apiKey: String(parsed.apiKey ?? ""),
    }
  } catch {
    return null
  }
}

/** What the browser is allowed to see. */
export function publicAiConfig(config: AiConfig | null) {
  if (!config) {
    return null
  }

  const key = config.apiKey
  return {
    providerId: config.providerId,
    baseUrl: config.baseUrl,
    model: config.model,
    protocol: config.protocol,
    hasKey: key.length > 0,
    keyHint: key.length > 8 ? `${key.slice(0, 3)}…${key.slice(-4)}` : key ? "已保存" : "",
  }
}

export async function saveAiConfig(db: D1Database, userId: string, input: AiConfigInput) {
  const existing = await loadAiConfig(db, userId)
  const preset = findPreset(input.providerId)
  const providerId = preset ? preset.id : customProviderId
  const baseUrl = normalizeBaseUrl(preset ? preset.baseUrl : input.baseUrl || "")
  const model = (input.model ?? "").trim()
  const protocol: AiProtocol = preset ? preset.protocol : input.protocol === "anthropic" ? "anthropic" : "openai"

  if (!model || model.length > 120) {
    throw new AiError(400, "请填写模型名称")
  }

  const newKey = (input.apiKey ?? "").trim()
  // Never reuse a key saved for one service with a different endpoint.
  const sameEndpoint = existing?.baseUrl === baseUrl
  const apiKey = input.clearKey ? "" : newKey || (sameEndpoint ? existing?.apiKey ?? "" : "")

  if (!apiKey) {
    throw new AiError(400, existing?.apiKey && !sameEndpoint ? "更换了模型服务，请填写新服务的 API 密钥" : "请填写 API 密钥")
  }

  if (apiKey.length > 512) {
    throw new AiError(400, "密钥过长")
  }

  const config: AiConfig = { providerId, baseUrl, model, protocol, apiKey }

  await db
    .prepare(
      `INSERT INTO app_settings (key, user_id, value, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(settingsKey, userId, JSON.stringify(config), Date.now())
    .run()

  return config
}

export async function deleteAiConfig(db: D1Database, userId: string) {
  await db.prepare("DELETE FROM app_settings WHERE key = ? AND user_id = ?").bind(settingsKey, userId).run()
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "")

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new AiError(400, "接口地址格式不正确")
  }

  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new AiError(400, "接口地址必须以 https:// 开头")
  }

  return trimmed.replace(/\/chat\/completions$/, "").replace(/\/v1\/messages$/, "")
}

/** Sends one photo + the meal prompt to the configured model and returns its raw text reply. */
export async function analyzeMealPhoto(config: AiConfig | null, image: unknown, note: unknown) {
  if (!config || !config.apiKey) {
    throw new AiError(400, "还没有设置 AI 识别，请先在「我的 → AI 识别」中填写模型和密钥")
  }

  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp|gif);base64,/.test(image)) {
    throw new AiError(400, "图片格式不支持")
  }

  if (image.length > 8_000_000) {
    throw new AiError(413, "图片太大，请重新拍摄")
  }

  const extra = typeof note === "string" && note.trim() ? `\n\n补充说明：${note.trim().slice(0, 300)}` : ""
  const started = Date.now()
  const text = await callModel(config, mealPhotoPrompt + extra, image, 4096)

  return { text, model: config.model, elapsedMs: Date.now() - started }
}

/** Checks key, model and image support with a tiny image. */
export async function testAiConfig(config: AiConfig | null) {
  if (!config || !config.apiKey) {
    throw new AiError(400, "请先保存模型和密钥")
  }

  const started = Date.now()
  const text = await callModel(config, "这张图片是什么颜色？只用一个词回答。", testImage, 1024)
  return { ok: true, reply: text.trim().slice(0, 80), model: config.model, elapsedMs: Date.now() - started }
}

export type ChatMessage = { role: "user" | "assistant"; content: string }

type LlmRequest = {
  system?: string
  messages: ChatMessage[]
  /** Attached to the last user message. */
  image?: string
  maxTokens: number
  temperature?: number
}

async function callModel(config: AiConfig, prompt: string, image: string, maxTokens: number): Promise<string> {
  return callLlm(config, { messages: [{ role: "user", content: prompt }], image, maxTokens })
}

/** One non-streaming completion against the configured provider (OpenAI-compatible or Anthropic). */
export async function callLlm(config: AiConfig, request: LlmRequest, useExtras = true): Promise<string> {
  const built = config.protocol === "anthropic" ? anthropicRequest(config, request) : openAiRequest(config, request, useExtras)

  let response: Response
  try {
    response = await fetch(built.url, {
      method: "POST",
      headers: built.headers,
      body: JSON.stringify(built.body),
      signal: AbortSignal.timeout(requestTimeoutMs),
    })
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
    throw new AiError(504, timedOut ? "模型响应超时，请稍后重试" : `无法连接模型服务：${error instanceof Error ? error.message : "网络错误"}`)
  }

  const raw = await response.text()
  let payload: Record<string, unknown> | null = null
  try {
    payload = JSON.parse(raw) as Record<string, unknown>
  } catch {
    payload = null
  }

  if (!response.ok) {
    // Some endpoints reject the "turn off thinking" fields; retry once without them.
    if (response.status === 400 && useExtras && config.protocol === "openai" && findPreset(config.providerId)?.extraBody) {
      return callLlm(config, request, false)
    }
    throw new AiError(502, describeProviderError(response.status, payload, raw))
  }

  const text = config.protocol === "anthropic" ? extractAnthropicText(payload) : extractOpenAiText(payload)

  if (!text.trim()) {
    throw new AiError(502, describeEmptyReply(payload, Boolean(request.image)))
  }

  return text
}

export function requireAiConfig(config: AiConfig | null): AiConfig {
  if (!config || !config.apiKey) {
    throw new AiError(400, "还没有设置 AI，请先在「我的 → AI 识别」中选择模型并填写密钥")
  }
  return config
}

function openAiRequest(config: AiConfig, request: LlmRequest, useExtras: boolean) {
  const messages: Array<Record<string, unknown>> = []
  if (request.system) {
    messages.push({ role: "system", content: request.system })
  }
  request.messages.forEach((message, index) => {
    const isLast = index === request.messages.length - 1
    if (isLast && request.image && message.role === "user") {
      messages.push({
        role: "user",
        content: [
          { type: "image_url", image_url: { url: request.image } },
          { type: "text", text: message.content },
        ],
      })
    } else {
      messages.push({ role: message.role, content: message.content })
    }
  })

  return {
    url: `${config.baseUrl}/chat/completions`,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens,
      stream: false,
      ...(useExtras ? (findPreset(config.providerId)?.extraBody ?? {}) : {}),
      messages,
    },
  }
}

function anthropicRequest(config: AiConfig, request: LlmRequest) {
  const messages = request.messages.map((message, index) => {
    const isLast = index === request.messages.length - 1
    if (isLast && request.image && message.role === "user") {
      const [, mediaType, data] = /^data:(image\/[a-z]+);base64,(.*)$/s.exec(request.image) ?? []
      return {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: message.content },
        ],
      }
    }
    return { role: message.role, content: message.content }
  })

  return {
    url: `${config.baseUrl}/v1/messages`,
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: {
      model: config.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0.2,
      ...(request.system ? { system: request.system } : {}),
      messages,
    },
  }
}

/** Explains why a 200 response had no usable text (most often: a "thinking" model spent the whole budget reasoning). */
function describeEmptyReply(payload: Record<string, unknown> | null, withImage = true) {
  const choice = (payload?.choices as Array<Record<string, unknown>> | undefined)?.[0]
  const message = choice?.message as Record<string, unknown> | undefined
  const finish = String(choice?.finish_reason ?? payload?.stop_reason ?? "")
  const reasoning = typeof message?.reasoning_content === "string" ? message.reasoning_content : ""
  const refusal = typeof message?.refusal === "string" ? message.refusal : ""

  if (refusal) {
    return `模型拒绝了请求：${refusal.slice(0, 160)}`
  }
  if (reasoning && (finish === "length" || finish === "max_tokens")) {
    return "模型在「思考」阶段就用完了输出长度，没有给出答案。请换用非思考（快速）模型，或稍后重试。"
  }
  if (reasoning) {
    return `模型只返回了思考过程，没有给出答案（finish_reason=${finish || "无"}）。`
  }
  if (finish === "content_filter" || finish === "sensitive") {
    return withImage ? "模型的内容审核拦截了这张图片，请换一张重试。" : "模型的内容审核拦截了这次请求。"
  }
  if (!choice && payload) {
    return `模型返回了无法识别的格式：${JSON.stringify(payload).slice(0, 200)}`
  }
  return `模型没有返回内容（finish_reason=${finish || "无"}）。${withImage ? "这个模型可能不支持图片输入。" : ""}`
}

function extractOpenAiText(payload: Record<string, unknown> | null) {
  const choices = payload?.choices as Array<{ message?: { content?: unknown } }> | undefined
  const content = choices?.[0]?.message?.content

  if (typeof content === "string") {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : ""))
      .join("")
  }

  return ""
}

function extractAnthropicText(payload: Record<string, unknown> | null) {
  const content = payload?.content as Array<{ type?: string; text?: string }> | undefined
  return (content ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
}

function describeProviderError(status: number, payload: Record<string, unknown> | null, raw: string) {
  const error = payload?.error as { message?: string } | string | undefined
  const detail = (typeof error === "string" ? error : error?.message) ?? (typeof payload?.message === "string" ? payload.message : "") ?? ""
  const snippet = (detail || raw).replace(/\s+/g, " ").slice(0, 200)

  if (status === 401 || status === 403) {
    return `密钥无效或没有权限（${status}）${snippet ? `：${snippet}` : ""}`
  }
  if (status === 404) {
    return `找不到模型或接口地址（404）${snippet ? `：${snippet}` : ""}`
  }
  if (status === 429) {
    return `请求过于频繁或额度不足（429）${snippet ? `：${snippet}` : ""}`
  }
  if (/image|vision|multimodal|图片|图像/i.test(snippet)) {
    return `这个模型可能不支持图片输入：${snippet}`
  }
  return `模型服务返回错误（${status}）${snippet ? `：${snippet}` : ""}`
}

export { aiProviderPresets }
