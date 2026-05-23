import { Camera, Clipboard, ImagePlus, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"

const imagePrompt = `请识别这张饮食图片，估算热量、蛋白质、碳水、脂肪，并只返回合法 JSON，不要解释。

JSON 格式：
{
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "items": [
    {
      "name": "食物名称",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ]
}

单位：calories 为 kcal，protein/carbs/fat 为 g。`

export function FoodImagePage() {
  const { showToast } = useToast()
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [fileName, setFileName] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function pickFile(file: File | undefined) {
    if (!file) {
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setFileName(file.name || "meal_photo.jpg")
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(imagePrompt)
    showToast({ title: "已复制" })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">图片</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[2rem] border border-dashed border-border bg-white/56">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center">
                <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">预览</p>
              </div>
            )}
          </div>
          {fileName ? <p className="truncate text-center text-sm text-muted-foreground">{fileName}</p> : null}
          <input
            ref={cameraInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
          <input
            ref={uploadInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="quiet" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4" />
              拍照
            </Button>
            <Button variant="quiet" onClick={() => uploadInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              上传
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="quiet" className="rounded-3xl" size="lg" onClick={copyPrompt}>
          <Clipboard className="h-5 w-5" />
          提示词
        </Button>
        <Button asChild className="rounded-3xl" size="lg">
          <Link to="/food">JSON</Link>
        </Button>
      </div>
    </div>
  )
}
