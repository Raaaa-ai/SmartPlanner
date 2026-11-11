export const MOODS = [
  { value: 'great', label: '很好' },
  { value: 'good', label: '不错' },
  { value: 'ok', label: '一般' },
  { value: 'low', label: '低落' },
  { value: 'bad', label: '糟糕' }
]

export function moodLabel(value: string): string {
  return MOODS.find((mood) => mood.value === value)?.label ?? value
}
