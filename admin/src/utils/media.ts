function backendOrigin() {
  const configured = (import.meta.env.VITE_MEDIA_BASE || '').replace(/\/$/, '')
  if (configured) return configured
  return `${window.location.protocol}//${window.location.hostname}:3001`
}

export function resolveMediaUrl(url?: string | null) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${backendOrigin()}${value}`
  return value
}

export function resolveAvatarUrl(url?: string | null) {
  const value = String(url || '').trim()
  if (!value || value.includes('default-avatar') || value.includes('default')) {
    return ''
  }
  return resolveMediaUrl(value)
}
