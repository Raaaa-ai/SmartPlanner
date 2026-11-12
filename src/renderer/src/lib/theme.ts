function accentChannels(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  if (value.length !== 6) return [0, 0, 0]
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ]
}

function luminanceFor(hex: string): number {
  const [r, g, b] = accentChannels(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function contrastFor(hex: string): string {
  return luminanceFor(hex) > 0.62 ? '#111827' : '#ffffff'
}

function inkFor(hex: string): string {
  if (luminanceFor(hex) <= 0.72) return hex
  return (
    '#' +
    accentChannels(hex)
      .map((channel) =>
        Math.round(channel * 0.38)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

export function applyAccent(accent: string): void {
  const root = document.documentElement
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-contrast', contrastFor(accent))
  root.style.setProperty('--accent-ink', inkFor(accent))
}
