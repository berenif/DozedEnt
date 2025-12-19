// SimplifyRDP.js
// Ramer–Douglas–Peucker polyline simplification

export function simplifyRDP(points, epsilon = 8) {
  if (!points || points.length < 3) {return points || []}
  const first = 0
  const last = points.length - 1
  const keep = new Array(points.length).fill(false)
  keep[first] = keep[last] = true
  rdp(points, first, last, epsilon, keep)
  const out = []
  for (let i = 0; i < points.length; i++) {if (keep[i]) {out.push(points[i])}}
  return out
}

function rdp(points, first, last, epsilon, keep) {
  if (last <= first + 1) {return}
  let index = -1
  let maxDist = -1
  const A = points[first]
  const B = points[last]
  for (let i = first + 1; i < last; i++) {
    const d = perpendicularDistance(points[i], A, B)
    if (d > maxDist) { maxDist = d; index = i }
  }
  if (maxDist > epsilon) {
    keep[index] = true
    rdp(points, first, index, epsilon, keep)
    rdp(points, index, last, epsilon, keep)
  }
}

function perpendicularDistance(P, A, B) {
  const dx = B.x - A.x
  const dy = B.y - A.y
  if (dx === 0 && dy === 0) {return Math.hypot(P.x - A.x, P.y - A.y)}
  const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / (dx * dx + dy * dy)
  const proj = { x: A.x + t * dx, y: A.y + t * dy }
  return Math.hypot(P.x - proj.x, P.y - proj.y)
}


