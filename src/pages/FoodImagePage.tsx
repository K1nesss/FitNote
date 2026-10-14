import { Camera, ClipboardCopy, ClipboardPaste, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { copyText } from "@/lib/format"
import { useSelectedDateParam } from "@/lib/use-selected-date"
import { aiPrompt } from "@/pages/FoodPage"

const steps = [
  { icon: ClipboardCopy, title: "复制提示词", text: "点下面的按钮，提示词会复制到剪贴板。" },
  { icon: Camera, title: "在 AI 应用里发照片", text: "打开常用的 AI 应用，粘贴提示词，并拍下或选择这一餐的照片后发送。" },
  { icon: ClipboardPaste, title: "复制结果回来粘贴", text: "复制 AI 返回的 JSON，回到饮食页粘贴，核对后保存。" },
]

export function FoodImagePage() {
  const { showToast } = useToast()
  const { selectedDate } = useSelectedDateParam()

  async function copyPrompt() {
    const ok = await copyText(aiPrompt)
    showToast(ok ? { title: "提示词已复制" } : { title: "复制失败", description: "请手动复制下方提示词。", tone: "error" })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/14 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">照片不会上传到 FitNote，识别由你自己的 AI 应用完成。</p>
          </div>
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{index + 1}</span>
                <div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <details className="rounded-[1.75rem] bg-muted/40 px-4 py-3 text-sm">
        <summary className="cursor-pointer select-none py-1 font-medium">查看提示词</summary>
        <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground select-text">{aiPrompt}</pre>
      </details>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={copyPrompt}>
          <ClipboardCopy className="h-5 w-5" />
          复制提示词
        </Button>
        <Button asChild size="lg">
          <Link to={`/food?date=${selectedDate}`}>去粘贴结果</Link>
        </Button>
      </div>
    </div>
  )
}
