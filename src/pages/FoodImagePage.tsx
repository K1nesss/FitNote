import { Camera, ImagePlus, Sparkles, Upload } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState, LoadingState } from "@/components/ui/state"
import { useToast } from "@/components/ui/toast"

export function FoodImagePage() {
  const { showToast } = useToast()
  const [status, setStatus] = useState<"empty" | "preview" | "loading" | "error" | "done">("empty")

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">图片</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex aspect-[4/3] items-center justify-center rounded-[2rem] border border-dashed border-border bg-white/56">
            <div className="text-center">
              <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{status === "empty" ? "预览" : "meal_photo.jpg"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="quiet" onClick={() => setStatus("preview")}>
              <Camera className="h-4 w-4" />
              拍照
            </Button>
            <Button variant="quiet" onClick={() => setStatus("preview")}>
              <Upload className="h-4 w-4" />
              上传
            </Button>
          </div>
        </CardContent>
      </Card>

      {status === "loading" ? <LoadingState title="识别中" /> : null}
      {status === "error" ? <ErrorState title="识别失败" description="可改用文字记录。" /> : null}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="quiet"
          className="rounded-3xl"
          size="lg"
          disabled={status === "empty"}
          onClick={() => {
            setStatus("loading")
            window.setTimeout(() => {
              setStatus("done")
              showToast({ title: "识别完成" })
            }, 700)
          }}
        >
          <Sparkles className="h-5 w-5" />
          识别
        </Button>
        <Button asChild className="rounded-3xl" size="lg" disabled={status !== "done"}>
          <Link to="/food/confirm">结果</Link>
        </Button>
      </div>
      <Button variant="ghost" className="w-full" onClick={() => setStatus("error")}>
        模拟失败
      </Button>
    </div>
  )
}
