import { Lock } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAppData } from "@/lib/app-data"

export function PasscodePage() {
  const { unlock } = useAppData()
  const [passcode, setPasscode] = useState("")
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!passcode.trim()) {
      return
    }
    setPending(true)
    setFailed(false)
    const ok = await unlock(passcode)
    setPending(false)
    setFailed(!ok)
  }

  return (
    <div className="flex min-h-[70dvh] items-center">
      <Card className="w-full">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-primary/14 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-semibold">输入访问密码</h2>
            <p className="mt-1 text-sm text-muted-foreground">这台设备会记住密码，之后不用再输入。</p>
          </div>
          <form className="space-y-3" onSubmit={submit}>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="访问密码"
              value={passcode}
              autoFocus
              onChange={(event) => setPasscode(event.target.value)}
              aria-invalid={failed}
            />
            {failed ? <p className="px-1 text-sm text-danger">密码不正确</p> : null}
            <Button type="submit" size="lg" className="w-full" disabled={pending || !passcode.trim()}>
              {pending ? "验证中…" : "进入"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
