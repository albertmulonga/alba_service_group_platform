import { useRef, useState } from 'react'
import { Camera, X, User } from 'lucide-react'

interface PhotoUploaderProps {
  /** Base64 data URL or https URL of current photo */
  value?: string | null
  onChange: (base64: string | null) => void
  size?: number        // px — diameter of the circle
  name?: string        // Initials fallback text
  label?: string
  disabled?: boolean
}

/**
 * Circular photo uploader.
 * Stores photo as base64 in localStorage / state.
 * Accepts JPG, PNG, WebP up to 5 MB.
 */
export default function PhotoUploader({
  value,
  onChange,
  size = 80,
  name = '',
  label = 'Changer la photo',
  disabled = false,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const initials = name
    ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : <User size={Math.floor(size * 0.4)} className="text-white/60" />

  const handleFile = (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) { setError('Fichier image requis (JPG, PNG, WebP).'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Taille max 5 Mo.'); return }

    const reader = new FileReader()
    reader.onload = e => {
      const base64 = e.target?.result as string
      // Resize to max 300×300 to avoid huge localStorage
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 300
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width  = Math.round(img.width  * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        onChange(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = base64
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circle */}
      <div
        className="relative group cursor-pointer flex-shrink-0"
        style={{ width: size, height: size }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        title={label}
      >
        {/* Photo or initials */}
        <div
          className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-white font-bold select-none border-4 border-white shadow-lg"
          style={{
            background: value ? 'transparent' : 'linear-gradient(135deg, #1E3A8A, #2563EB)',
            fontSize: Math.floor(size * 0.28),
          }}
        >
          {value
            ? <img src={value} alt="Photo" className="w-full h-full object-cover" />
            : (typeof initials === 'string' ? initials : initials)
          }
        </div>

        {/* Camera overlay on hover */}
        {!disabled && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={Math.floor(size * 0.3)} className="text-white" />
          </div>
        )}

        {/* Remove button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(null) }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md transition-colors"
            title="Supprimer la photo"
          >
            <X size={11} className="text-white" />
          </button>
        )}
      </div>

      {/* Label */}
      {!disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          {value ? '📷 Changer' : '📷 ' + label}
        </button>
      )}

      {error && <p className="text-[11px] text-red-600 text-center">{error}</p>}

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )
}
