/**
 * Downscales a photo for upload: long side ≤ maxSize, JPEG. Keeps EXIF orientation.
 * Phone photos are 3–12 MB; this brings them to ~150–400 KB, which is plenty for food recognition.
 */
export async function compressImage(file: File, maxSize = 1280, quality = 0.82): Promise<string> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("无法处理图片")
  }

  context.fillStyle = "#fff"
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  if ("close" in bitmap && typeof bitmap.close === "function") {
    bitmap.close()
  }

  return canvas.toDataURL("image/jpeg", quality)
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      // Fall through (older Safari, HEIC, etc.)
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = "async"
    image.src = url
    await image.decode()
    return image
  } catch {
    throw new Error("无法读取这张图片，请换一张或使用 JPG/PNG 格式")
  } finally {
    URL.revokeObjectURL(url)
  }
}
