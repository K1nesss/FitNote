import { Camera, ImageUp, RotateCw, Settings2, Sparkles } from "lucide-react"
import { useRef, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { analyzeMealPhoto } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { compressImage } from "@/lib/image"
import { cn } from "@/lib/utils"
import { parseMealJson, type MealDraft } from "@/pages/FoodPage"

export const mealPhotoStorageKey = "fitnote.mealPhoto"

type State =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "analyzing"; image: string }
  | { phase: "error"; image: string | null; message: string }

/**
 * "拍照识别": opens the camera (or photo library), sends the photo to the owner's
 * configured model through the Worker, parses the JSON and hands back a meal draft.
 */
export function MealPhotoCapture({ onRecognized }: { onRecognized: (draft: MealDraft, image: string, model: string) => void }) {
  const { data } = useAppData()
  const ai = data?.settings.ai
  const configured = Boolean(ai?.hasKey && ai.model)
  const cameraRef = useRef<HTMLInputElement | null>(null)
  const libraryRef = useRef<HTMLInputElement | null>(null)
  const requestId = useRef(0)
  const [state, setState] = useState<State>({ phase: "idle" })
  const [note, setNote] = useState("")
  const [setupOpen, setSetupOpen] = useState(false)

  function open(source: "camera" | "library") {
    if (!configured) {
      setSetupOpen(true)
      return
    }
    ;(source === "camera" ? cameraRef : libraryRef).current?.click()
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return
    }

    setState({ phase: "preparing" })
    let image: string
    try {
      image = await compressImage(file)
    } catch (caught) {
      setState({ phase: "error", image: null, message: caught instanceof Error ? caught.message : "无法读取图片" })
      return
    }
    await analyze(image)
  }

  async function analyze(image: string) {
    const id = ++requestId.current
    setState({ phase: "analyzing", image })

    try {
      const result = await analyzeMealPhoto(image, note)
      if (id !== requestId.current) {
        return
      }
      const draft = parseMealJson(result.text)
      if (!draft) {
        const refusal = /"error"\s*:\s*"([^"]+)"/.exec(result.text)?.[1]
        setState({ phase: "error", image, message: refusal ?? "模型返回的内容无法解析为营养数据，可以重试或换个角度再拍。" })
        return
      }
      setState({ phase: "idle" })
      setNote("")
      onRecognized(draft, image, result.model)
    } catch (caught) {
      if (id === requestId.current) {
        setState({ phase: "error", image, message: caught instanceof Error ? caught.message : "识别失败" })
      }
    }
  }

  function cancel() {
    requestId.current++
    setState({ phase: "idle" })
  }

  const busy = state.phase === "preparing" || state.phase === "analyzing"

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button size="lg" className="h-14" onClick={() => open("camera")} disabled={busy}>
          <Camera className="h-5 w-5" />
          拍照识别
        </Button>
        <Button size="lg" variant="secondary" className="h-14 w-14 px-0" onClick={() => open("library")} disabled={busy} aria-label="从相册选择">
          <ImageUp className="h-5 w-5" />
        </Button>
      </div>
      {configured ? (
        <Input className="h-11 text-sm" placeholder="补充说明（可选），如：只吃了一半、少油" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
      ) : (
        <p className="px-1 text-xs text-muted-foreground">
          需先在 <Link to="/profile/settings/ai" className="font-medium text-primary">我的 → AI 识别</Link> 选择模型并填写密钥。
        </p>
      )}

      <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = "" }} />
      <input ref={libraryRef} className="hidden" type="file" accept="image/*" onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = "" }} />

      <Dialog
        open={state.phase !== "idle"}
        title={state.phase === "error" ? "识别失败" : "正在识别"}
        description={state.phase === "error" ? undefined : `${ai?.model ?? ""} · 通常需要 5–20 秒`}
        placement="center"
        onClose={cancel}
      >
        {"image" in state && state.image ? (
          <div className="relative overflow-hidden rounded-[1.5rem]">
            <img src={state.image} alt="这一餐的照片" className={cn("aspect-[4/3] w-full object-cover", state.phase === "analyzing" && "scale-[1.02] blur-[1px] brightness-95")} />
            {state.phase === "analyzing" ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-medium text-white backdrop-blur">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  分析食物与份量…
                </span>
              </div>
            ) : null}
          </div>
        ) : state.phase === "preparing" ? (
          <div className="skeleton aspect-[4/3] w-full rounded-[1.5rem]" />
        ) : null}

        {state.phase === "error" ? (
          <>
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.message}</p>
            <div className="grid grid-cols-2 gap-2">
              {state.image ? (
                <Button onClick={() => void analyze(state.image!)}>
                  <RotateCw className="h-4 w-4" />
                  重试
                </Button>
              ) : (
                <Button onClick={() => { cancel(); open("camera") }}>
                  <Camera className="h-4 w-4" />
                  重拍
                </Button>
              )}
              <Button asChild variant="secondary">
                <Link to="/profile/settings/ai">
                  <Settings2 className="h-4 w-4" />
                  检查设置
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <Button variant="secondary" className="w-full" onClick={cancel}>
            取消
          </Button>
        )}
      </Dialog>

      <Dialog open={setupOpen} title="先设置 AI 识别" placement="center" onClose={() => setSetupOpen(false)}>
        <p className="text-sm text-muted-foreground">
          拍照后，照片会通过你自己的 Worker 发给你选择的模型服务（如 DeepSeek、通义千问、智谱），由模型估算热量和三大营养素。需要先选择模型并填写该服务的 API 密钥。
        </p>
        <div className="grid gap-2">
          <Button asChild size="lg">
            <Link to="/profile/settings/ai">去设置</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/food/image">暂不设置，用其他 AI 应用</Link>
          </Button>
        </div>
      </Dialog>
    </>
  )
}
