import { ChevronRight, History, Trophy } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { TrendChart } from "@/components/stats/TrendChart"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader, SegmentedControl } from "@/components/ui/controls"
import { EmptyState, ErrorState } from "@/components/ui/state"
import { getExerciseDetail, type ExerciseDetail } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { describeSet, describeTarget, formatDuration } from "@/lib/exercise-kind"
import { formatNumber, formatWeight } from "@/lib/format"

export function ExerciseDetailPage() {
  const key = decodeURIComponent(useParams().key ?? "")
  const { data } = useAppData()
  const [detail, setDetail] = useState<ExerciseDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [metric, setMetric] = useState<"weight" | "oneRepMax" | "volume">("weight")
  const libraryEntry = key.startsWith("lib:") ? data?.exerciseLibrary.find((item) => item.id === key.slice(4)) : undefined

  function load() {
    setError(null)
    getExerciseDetail(key).then(setDetail, (caught) => setError(caught instanceof Error ? caught.message : "加载失败"))
  }

  useEffect(load, [key])

  if (error) {
    return <ErrorState description={error} onRetry={load} />
  }

  if (!detail) {
    return <div className="skeleton h-64 rounded-[2rem]" />
  }

  const name = detail.name || libraryEntry?.name || key.replace(/^(lib|name):/, "")
  const kind = detail.sessions.length ? detail.kind : (libraryEntry?.kind ?? "strength")
  const chronological = [...detail.sessions].reverse()
  const points = chronological.map((session) => {
    if (kind === "cardio") return { label: session.date, value: Math.round(session.totalDurationSec / 60), detail: session.totalDistanceM ? `${formatNumber(session.totalDistanceM / 1000, 2)} km` : undefined }
    if (kind === "duration") return { label: session.date, value: Math.max(...session.sets.map((set) => set.durationSec ?? 0)) }
    if (metric === "oneRepMax") return { label: session.date, value: session.oneRepMax }
    if (metric === "volume") return { label: session.date, value: session.volume }
    return { label: session.date, value: session.bestWeight, detail: `× ${session.bestReps}` }
  })
  const unit = kind === "cardio" ? "分钟" : kind === "duration" ? "秒" : "kg"

  const tiles =
    kind === "cardio"
      ? [
          ["训练次数", `${detail.sessions.length} 次`],
          ["累计时长", formatDuration(chronological.reduce((sum, session) => sum + session.totalDurationSec, 0))],
          ["累计距离", `${formatNumber(chronological.reduce((sum, session) => sum + session.totalDistanceM, 0) / 1000, 1)} km`],
        ]
      : kind === "duration"
        ? [
            ["训练次数", `${detail.sessions.length} 次`],
            ["最长一组", formatDuration(Math.max(0, ...chronological.flatMap((session) => session.sets.map((set) => set.durationSec ?? 0))))],
            ["总组数", `${detail.totalSets} 组`],
          ]
        : [
            ["最佳重量", `${formatWeight(detail.bestWeight)} kg`],
            ["估算 1RM", `${formatNumber(detail.bestOneRepMax, 1)} kg`],
            ["单次最大容量", `${formatNumber(detail.bestVolume, 0)} kg`],
          ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="text-2xl font-bold">{name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {detail.muscle || libraryEntry?.muscleGroup}
              {libraryEntry ? ` · 默认 ${describeTarget(libraryEntry.kind, libraryEntry.defaultSets, libraryEntry.defaultReps, libraryEntry.defaultWeight)}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {tiles.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-muted/45 px-1 py-2.5">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          {kind === "strength" && detail.bestOneRepMax > 0 ? (
            <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-warning" />
              1RM 为按 Epley 公式估算，仅作进步参考。
            </p>
          ) : null}
        </CardContent>
      </Card>

      {detail.sessions.length === 0 ? (
        <EmptyState icon={History} title="还没有记录" description="在训练中完成这个动作后，这里会显示历史成绩和变化趋势。" />
      ) : (
        <>
          <section className="space-y-2">
            <SectionHeader title="变化趋势" />
            <Card>
              <CardContent className="space-y-3 p-4">
                {kind === "strength" ? (
                  <SegmentedControl
                    options={[
                      { value: "weight" as const, label: "最大重量" },
                      { value: "oneRepMax" as const, label: "估算 1RM" },
                      { value: "volume" as const, label: "容量" },
                    ]}
                    value={metric}
                    onChange={setMetric}
                  />
                ) : null}
                {points.length >= 2 ? (
                  <TrendChart points={points.slice(-30)} unit={unit} digits={kind === "strength" && metric !== "volume" ? 1 : 0} />
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">再记录一次就能看到趋势。</p>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2">
            <SectionHeader title={`历史记录 · ${detail.sessions.length} 次`} />
            <Card>
              <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
                {detail.sessions.map((session) => (
                  <Link key={session.id} to={`/workout?date=${session.dateKey}`} className="pressable flex items-center justify-between gap-3 rounded-[1.1rem] px-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{session.date}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{session.sets.map((set) => describeSet(kind, set)).join(" · ")}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
