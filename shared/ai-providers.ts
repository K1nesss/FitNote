// Model provider presets for photo-based meal recognition.
// Shared by the Worker (which calls the provider) and the settings UI.
//
// "openai" protocol = OpenAI-compatible Chat Completions (`POST {baseUrl}/chat/completions`
// with `image_url` content parts) — used by most providers.
// "anthropic" protocol = Anthropic Messages API (`POST {baseUrl}/v1/messages`).

export type AiProtocol = "openai" | "anthropic"

export type AiProviderPreset = {
  id: string
  name: string
  baseUrl: string
  protocol: AiProtocol
  /** Suggested vision-capable models; the user can type any model id. */
  models: string[]
  /** Where to get an API key. */
  keyUrl: string
  /** Model-id prefixes used to auto-detect this provider from a typed model name. */
  modelPrefixes: string[]
  note?: string
  /**
   * Extra request fields for this provider, used to switch off "thinking" mode:
   * reasoning models otherwise spend the output budget thinking and are much slower.
   */
  extraBody?: Record<string, unknown>
}

export const aiProviderPresets: AiProviderPreset[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    protocol: "openai",
    models: ["deepseek-v4-flash", "deepseek-flash", "deepseek-v4-flash-vision-exp"],
    keyUrl: "https://platform.deepseek.com/api_keys",
    modelPrefixes: ["deepseek"],
    extraBody: { thinking: { type: "disabled" } },
    note: "需要支持图片输入的模型，可用「测试」确认。",
  },
  {
    id: "qwen",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    protocol: "openai",
    models: ["qwen3-vl-plus", "qwen3-vl-flash", "qwen-vl-max"],
    keyUrl: "https://bailian.console.aliyun.com/?apiKey=1",
    modelPrefixes: ["qwen", "qvq"],
    extraBody: { enable_thinking: false },
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    protocol: "openai",
    models: ["glm-4.6v-flash", "glm-4.6v", "glm-4.5v"],
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    modelPrefixes: ["glm"],
    extraBody: { thinking: { type: "disabled" } },
  },
  {
    id: "doubao",
    name: "豆包",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    protocol: "openai",
    models: ["doubao-seed-1-6-vision-250815", "doubao-seed-1-6-flash-250828"],
    keyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    modelPrefixes: ["doubao"],
    extraBody: { thinking: { type: "disabled" } },
    note: "也可以填写方舟控制台里的推理接入点 ID（ep-…）。",
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    protocol: "openai",
    models: ["gpt-5-mini", "gpt-4.1-mini", "gpt-4o-mini"],
    keyUrl: "https://platform.openai.com/api-keys",
    modelPrefixes: ["gpt-", "o3", "o4", "chatgpt"],
  },
  {
    id: "gemini",
    name: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    protocol: "openai",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    keyUrl: "https://aistudio.google.com/apikey",
    modelPrefixes: ["gemini"],
  },
  {
    id: "anthropic",
    name: "Claude",
    baseUrl: "https://api.anthropic.com",
    protocol: "anthropic",
    models: ["claude-haiku-4-5-20251001", "claude-sonnet-5-5"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    modelPrefixes: ["claude"],
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    protocol: "openai",
    models: ["Qwen/Qwen3-VL-32B-Instruct", "zai-org/GLM-4.5V"],
    keyUrl: "https://cloud.siliconflow.cn/account/ak",
    modelPrefixes: [],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    protocol: "openai",
    models: ["google/gemini-2.5-flash", "qwen/qwen3-vl-32b-instruct"],
    keyUrl: "https://openrouter.ai/keys",
    modelPrefixes: [],
  },
]

export const customProviderId = "custom"

export function findPreset(id: string | null | undefined) {
  return aiProviderPresets.find((preset) => preset.id === id) ?? null
}

/** Guesses the provider from a model id such as "deepseek-v4-flash" or "qwen3-vl-plus". */
export function detectProvider(model: string) {
  const value = model.trim().toLowerCase()

  if (!value || value.includes("/")) {
    return null
  }

  return aiProviderPresets.find((preset) => preset.modelPrefixes.some((prefix) => value.startsWith(prefix))) ?? null
}

/** The prompt sent with every photo. The model must answer with JSON only. */
export const mealPhotoPrompt = `你是营养师。请识别这张饮食照片中的每一种食物，估算份量，并估算热量、蛋白质、碳水、脂肪。
只返回合法 JSON，不要 Markdown，不要解释。

JSON 格式：
{
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "items": [
    { "name": "食物名称（含估算份量，如：米饭 约150g）", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }
  ]
}

单位：calories 为 kcal，protein/carbs/fat 为 g，数值保留 1 位小数。
如果照片里没有食物，返回 {"calories":0,"protein":0,"carbs":0,"fat":0,"items":[],"error":"未识别到食物"}。`
