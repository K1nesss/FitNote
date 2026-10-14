import type { ReactNode } from "react"

/**
 * Tiny, safe markdown renderer for AI replies: headings, bullet / numbered lists,
 * paragraphs and **bold**. Everything is rendered as React text, never as HTML.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p key={`p${blocks.length}`} className="whitespace-pre-line leading-relaxed">
          {inline(paragraph.join("\n"))}
        </p>,
      )
      paragraph = []
    }
  }
  const flushList = () => {
    if (list) {
      const items = list.items.map((item, index) => (
        <li key={index} className="pl-0.5 leading-relaxed">
          {inline(item)}
        </li>
      ))
      blocks.push(
        list.ordered ? (
          <ol key={`l${blocks.length}`} className="list-decimal space-y-1 pl-5 marker:text-muted-foreground">
            {items}
          </ol>
        ) : (
          <ul key={`l${blocks.length}`} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
            {items}
          </ul>
        ),
      )
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim())
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)、]\s+(.*)$/.exec(line)

    if (!line.trim()) {
      flushParagraph()
      flushList()
    } else if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1].length
      blocks.push(
        <p key={`h${blocks.length}`} className={level <= 2 ? "pt-1 text-base font-semibold" : "pt-1 text-[15px] font-semibold"}>
          {inline(heading[2])}
        </p>,
      )
    } else if (bullet || numbered) {
      flushParagraph()
      const ordered = Boolean(numbered && !bullet)
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? numbered)![1])
    } else if (list && /^\s{2,}/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()

  return <div className={className ?? "space-y-2 text-[15px]"}>{blocks}</div>
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={index} className="rounded bg-muted px-1 py-0.5 text-[13px]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={index}>{part}</span>
  })
}
