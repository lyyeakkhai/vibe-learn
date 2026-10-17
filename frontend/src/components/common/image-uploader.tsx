import React, { useState, useRef } from "react"
import { UploadCloud, X, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react"
import { MediaService } from "@/services/media-service"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  label: string
  description?: string
  value?: string
  onChange: (url: string) => void
  folder?: "courses" | "instructors"
  aspectRatio?: "video" | "square"
  token?: string | null
  presets?: Array<{ label: string; value: string }>
  onUploadStateChange?: (uploading: boolean) => void
}

export function ImageUploader({
  label,
  description,
  value,
  onChange,
  folder = "courses",
  aspectRatio = "video",
  token,
  presets = [],
  onUploadStateChange,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlFallback, setShowUrlFallback] = useState(false)

  const handleFileSelect = async (file: File) => {
    if (!file) return

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP, SVG)")
      return
    }

    setError(null)
    setUploading(true)
    onUploadStateChange?.(true)

    try {
      const response = await MediaService.uploadImage(file, folder, token)
      onChange(response.url)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed"
      setError(message)
    } finally {
      setUploading(false)
      onUploadStateChange?.(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrlFallback(!showUrlFallback)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary-600 transition-colors"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlFallback ? "Hide URL / Presets" : "Enter URL or Presets"}</span>
        </button>
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0])
          }
        }}
      />

      {value ? (
        <div className="relative rounded-lg border border-border bg-card p-2.5 flex items-center gap-4">
          <div
            className={cn(
              "overflow-hidden rounded-md border border-border bg-neutral-100 dark:bg-neutral-800 shrink-0",
              aspectRatio === "video" ? "h-20 w-32" : "h-16 w-16 rounded-full"
            )}
          >
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = "none"
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-muted-foreground truncate">{value}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                Change Image
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
              >
                <X className="h-3.5 w-3.5 inline mr-1" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary-500 bg-primary-50/50 dark:bg-primary-950/20"
              : "border-border hover:border-primary-500/50 bg-neutral-50/50 dark:bg-neutral-900/30",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
              <p className="text-xs font-medium text-foreground">Uploading to Cloudinary...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-full bg-primary-50 p-2 text-primary-600 dark:bg-primary-950/50">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-foreground">
                <span className="text-primary-600 hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP or SVG up to 5MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showUrlFallback && (
        <div className="mt-3 space-y-2 rounded-md border border-border/80 bg-neutral-50/50 dark:bg-neutral-900/20 p-3">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://res.cloudinary.com/... or image URL"
            className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onChange(preset.value)}
                  className={cn(
                    "rounded border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    value === preset.value
                      ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                      : "border-border bg-background text-neutral-600 hover:text-primary-600 dark:text-neutral-400"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
