export function formatTime(value) {
  const numericValue = Number(value)
  const secs = Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
