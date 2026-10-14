import { CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, Sparkles, Trash2, Wifi } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, SectionHeader, SegmentedControl } from "@/components/ui/controls"
import { ConfirmDialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { testAiSettings } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { cn } from "@/lib/utils"

import { aiProviderPresets, customProviderId, detectProvider, findPreset, type AiProtocol } from "../../shared/ai-providers"

export function AiSettingsPanel() {
  const { data, saveAiSettings, deleteAiSettings } = useAppData()
  const { showToast } = useToast()
  const saved = data?.settings.ai ?? null
  const [providerId, setProviderId] = useState(saved?.providerId ?? "deepseek")
  const preset = findPreset(providerId)
  const [model, setModel] = useState(saved?.model ?? preset?.models[0] ?? "")
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? preset?.baseUrl ?? "")
  const [protocol, setProtocol] = useState<AiProtocol>(saved?.protocol ?? "openai")
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [detectedNote, setDetectedNote] = useState("")
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveSubmit = useSubmitLock()
  const testSubmit = useSubmitLock()
  const deleteSubmit = useSubmitLock()
  const isCustom = providerId === customProviderId
  const endpointChanged = Boolean(saved) && (saved!.providerId !== providerId || (isCustom && saved!.baseUrl !== baseUrl.trim()))
  const keyStillValid = Boolean(saved?.hasKey) && !endpointChanged
  const dirty =
    !saved ||
    apiKey.trim() !== "" ||
    saved.providerId !== providerId ||
    saved.model !== model.trim() ||
    (isCustom && (saved.baseUrl !== baseUrl.trim() || saved.protocol !== protocol))

  function chooseProvider(id: string) {
    setProviderId(id)
    setDetectedNote("")
    setTestResult(null)
    const next = findPreset(id)
    if (next) {
      setBaseUrl(next.baseUrl)
      setProtocol(next.protocol)
      if (!next.models.includes(model)) {
        setModel(next.models[0] ?? "")
      }
    }
  }

  function changeModel(value: string) {
    setModel(value)
    setTestResult(null)
    // Typing e.g. "deepseek-v4-flash" or "qwen3-vl-plus" selects the matching provider automatically.
    const detected = detectProvider(value)
    if (detected && detected.id !== providerId && !["custom", "siliconflow", "openrouter"].includes(providerId)) {
      setProviderId(detected.id)
      setBaseUrl(detected.baseUrl)
      setProtocol(detected.protocol)
      setDetectedNote(`已根据模型名切换到 ${detected.name}`)
    }
  }

  async function save() {
    if (!model.trim()) {
      showToast({ title: "请填写模型名称", tone: "error" })
      return false
    }
    if (!keyStillValid && !apiKey.trim()) {
      showToast({ title: endpointChanged ? "更换了模型服务，请填写新服务的密钥" : "请填写 API 密钥", tone: "error" })
      return false
    }
    if (isCustom && !baseUrl.trim()) {
      showToast({ title: "请填写接口地址", tone: "error" })
      return false
    }

    return saveSubmit.run(async () => {
      await saveAiSettings({
        providerId,
        model: model.trim(),
        baseUrl: isCustom ? baseUrl.trim() : undefined,
        protocol: isCustom ? protocol : undefined,
        apiKey: apiKey.trim() || undefined,
      })
      setApiKey("")
      showToast({ title: "AI 识别已保存" })
    })
  }

  async function test() {
    if (dirty) {
      const ok = await save()
      if (!ok) {
        return
      }
    }

    setTestResult(null)
    await testSubmit.run(async () => {
      try {
        const result = await testAiSettings()
        setTestResult({ ok: true, text: `连接成功，${(result.elapsedMs / 1000).toFixed(1)} 秒。模型回复：“${result.reply || "（空）"}”` })
      } catch (caught) {
        setTestResult({ ok: false, text: caught instanceof Error ? caught.message : "测试失败" })
      }
    })
  }

  async function remove() {
    await deleteSubmit.run(async () => {
      await deleteAiSettings()
      setConfirmDelete(false)
      setApiKey("")
      setTestResult(null)
      showToast({ title: "已删除 AI 设置和密钥" })
    }, "删除失败")
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", saved?.hasKey ? "bg-primary/14 text-primary" : "bg-muted text-muted-foreground")}>
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{saved?.hasKey ? "拍照识别已启用" : "未启用"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {saved?.hasKey ? `${findPreset(saved.providerId)?.name ?? "自定义"} · ${saved.model}` : "选择模型服务并填写密钥后，饮食页的「拍照识别」即可使用。"}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <SectionHeader title="模型服务" />
        <div className="grid grid-cols-3 gap-2">
          {[...aiProviderPresets.map((item) => ({ id: item.id, name: item.name })), { id: customProviderId, name: "自定义" }].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseProvider(item.id)}
              aria-pressed={providerId === item.id}
              className={cn(
                "min-h-12 rounded-[1.1rem] px-2 text-sm font-semibold transition active:scale-95",
                providerId === item.id ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(23,105,166,0.2)]" : "bg-muted/55 text-foreground",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <Card>
        <CardContent className="space-y-4 p-5">
          <Field label="模型" hint={detectedNote || preset?.note || "需要支持图片输入（视觉）的模型。直接输入模型名也会自动匹配服务商。"}>
            <Input value={model} placeholder="例如 deepseek-v4-flash" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(event) => changeModel(event.target.value)} />
          </Field>
          {preset?.models.length ? (
            <div className="-mt-1 flex flex-wrap gap-1.5">
              {preset.models.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeModel(item)}
                  className={cn("h-8 rounded-full px-3 font-mono text-xs transition", model === item ? "bg-primary/14 text-primary" : "bg-muted/55 text-muted-foreground")}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          {isCustom ? (
            <>
              <Field label="接口地址" hint="OpenAI 兼容填到 /v1 为止，例如 https://api.example.com/v1">
                <Input value={baseUrl} inputMode="url" placeholder="https://" autoCapitalize="off" spellCheck={false} onChange={(event) => setBaseUrl(event.target.value)} />
              </Field>
              <Field label="接口格式">
                <SegmentedControl
                  options={[
                    { value: "openai" as const, label: "OpenAI 兼容" },
                    { value: "anthropic" as const, label: "Anthropic" },
                  ]}
                  value={protocol}
                  onChange={setProtocol}
                />
              </Field>
            </>
          ) : (
            <p className="break-all px-1 font-mono text-[11px] text-muted-foreground">{preset?.baseUrl}</p>
          )}

          <Field
            label="API 密钥"
            hint={
              keyStillValid
                ? `已保存密钥${saved!.keyHint && saved!.keyHint !== "已保存" ? `（${saved!.keyHint}）` : ""}，留空则保持不变`
                : endpointChanged && saved?.hasKey
                  ? "更换了模型服务，需要填写新服务的密钥"
                  : undefined
            }
          >
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                placeholder={keyStillValid ? "••••••••（不修改）" : "粘贴密钥，如 sk-…"}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="pr-12 font-mono"
                onChange={(event) => setApiKey(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? "隐藏密钥" : "显示密钥"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          {preset ? (
            <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="-mt-1 inline-flex items-center gap-1 px-1 text-sm font-medium text-primary">
              <KeyRound className="h-4 w-4" />
              获取 {preset.name} 密钥
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="secondary" onClick={test} disabled={testSubmit.pending || saveSubmit.pending}>
              <Wifi className="h-4 w-4" />
              {testSubmit.pending ? "测试中…" : "测试"}
            </Button>
            <Button onClick={() => void save()} disabled={saveSubmit.pending || !dirty}>
              {saveSubmit.pending ? "保存中…" : dirty ? "保存" : "已保存"}
            </Button>
          </div>

          {testResult ? (
            <p className={cn("flex gap-2 rounded-2xl px-4 py-3 text-sm", testResult.ok ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger")}>
              {testResult.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : null}
              <span className="break-words">{testResult.text}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <p>密钥只保存在你自己的 D1 数据库中，由 Worker 代为调用模型；不会返回给浏览器，也不会写入导出的备份文件。</p>
          <p>
            照片会发送给所选的模型服务商，费用按该服务商的计价从你的账户扣除。建议同时开启
            <Link to="/profile/settings/privacy" className="font-medium text-primary">访问密码</Link>。
          </p>
        </CardContent>
      </Card>

      {saved ? (
        <Button variant="danger-ghost" className="w-full" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" />
          删除 AI 设置和密钥
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="删除 AI 设置？"
        description="保存的模型和密钥会被删除，拍照识别将停用。"
        confirmLabel="删除"
        destructive
        pending={deleteSubmit.pending}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
