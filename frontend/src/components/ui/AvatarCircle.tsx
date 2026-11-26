const COLORS = ['#2563EB', '#7C3AED', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899']

export default function AvatarCircle({ photo, name, size = 32, className = '' }: { photo?: string | null; name: string; size?: number; className?: string }) {
  if (photo) {
    return <img src={photo} alt={name} className={`rounded-full object-cover ${className}`} style={{ width: size, height: size }} />
  }
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length
  return (
    <div className={`rounded-full flex items-center justify-center text-white font-bold ${className}`} style={{ width: size, height: size, background: COLORS[colorIndex], fontSize: size * 0.38 }}>
      {initials}
    </div>
  )
}
