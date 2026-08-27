export const HALLS = [
  { id: '1', name: '1', rows: 8, cols: 12, vipRows: ['A'], capacity: 96 },
  { id: '2', name: '2', rows: 6, cols: 10, vipRows: ['A'], capacity: 60 },
  { id: '3', name: '3', rows: 10, cols: 14, vipRows: ['A', 'B'], capacity: 140 },
  { id: '4', name: '4', rows: 7, cols: 12, vipRows: ['A'], capacity: 84 }
]

export function getHallById(id) {
  return HALLS.find((h) => h.id === String(id)) || HALLS[0]
}
export function hallLabel(h) {
  if (!h) return ''
  return `Hall ${h.name} (${h.rows}×${h.cols} — ${h.capacity} seats)`
}
