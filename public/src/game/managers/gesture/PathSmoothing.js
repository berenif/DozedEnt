// PathSmoothing.js
// Catmull–Rom spline smoothing utilities for gesture paths

export function catmullRomSpline(points, alpha = 0.5, resolution = 1) {
  if (!points || points.length < 2) return points || []
  const p = points
  const out = []
  const get = (i) => p[Math.max(0, Math.min(p.length - 1, i))]
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    // number of segments between p1 and p2
    const steps = Math.max(1, Math.round(distance(p1, p2) / Math.max(1, resolution)))
    for (let j = 0; j < steps; j++) {
      const t = j / steps
      out.push(catmullRom(p0, p1, p2, p3, t, alpha))
    }
  }
  out.push(p[p.length - 1])
  return out
}

function distance(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  return Math.hypot(dx, dy)
}

function catmullRom(p0, p1, p2, p3, t, alpha) {
  // Uniform or centripetal based on alpha
  const t0 = 0
  const t1 = tj(t0, p0, p1, alpha)
  const t2 = tj(t1, p1, p2, alpha)
  const t3 = tj(t2, p2, p3, alpha)
  const tt = t1 + (t2 - t1) * t

  const A1 = lerpP(p0, p1, (t1 - tt) / (t1 - t0))
  const A2 = lerpP(p1, p2, (t2 - tt) / (t2 - t1))
  const A3 = lerpP(p2, p3, (t3 - tt) / (t3 - t2))

  const B1 = lerpP(A1, A2, (t2 - tt) / (t2 - t0))
  const B2 = lerpP(A2, A3, (t3 - tt) / (t3 - t1))

  return lerpP(B1, B2, (t2 - tt) / (t2 - t1))
}

function tj(ti, pi, pj, alpha) {
  const dx = pj.x - pi.x
  const dy = pj.y - pi.y
  const d = Math.hypot(dx, dy)
  return ti + Math.pow(d, alpha)
}

function lerpP(a, b, w) {
  const u = 1 - w
  return { x: a.x * u + b.x * w, y: a.y * u + b.y * w }
}


