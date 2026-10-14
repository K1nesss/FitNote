/** 1234.5 → "1,234.5", 12 → "12". At most `digits` decimals, trailing zeros dropped. */
export function formatNumber(value: number, digits = 1) {
  if (!Number.isFinite(value)) {
    return "0"
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: digits })
}

/** Weight with up to 2 decimals (1.25 kg plates). */
export function formatWeight(value: number) {
  return formatNumber(value, 2)
}

/** Parses user input; empty/invalid → fallback. Accepts "，" and "," as decimal comma. */
export function parseDecimal(value: string, fallback = 0, digits = 2) {
  const normalized = value.trim().replace(/[，,]/g, ".")
  if (!normalized) {
    return fallback
  }
  const number = Number(normalized)
  if (!Number.isFinite(number)) {
    return fallback
  }
  const factor = 10 ** digits
  return Math.max(0, Math.round(number * factor) / factor)
}

export function parseInteger(value: string, fallback = 0, min = 0) {
  const number = Number(value.trim())
  return Number.isFinite(number) && value.trim() !== "" ? Math.max(min, Math.round(number)) : fallback
}

/** Copies text, falling back to a hidden textarea for browsers without the async clipboard API. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    let ok = false
    try {
      ok = document.execCommand("copy")
    } catch {
      ok = false
    }
    document.body.removeChild(textarea)
    return ok
  }
}

export async function readClipboardText() {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return null
  }
}
