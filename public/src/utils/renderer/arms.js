// 2D rendering of physics-driven arms using WASM-exported joint positions
import { wasmToWorld, worldToScreen } from './coords.js'

function getJointTriplet(prefix) {
  const x = typeof window.wasmExports[prefix + '_x'] === 'function' ? window.wasmExports[prefix + '_x']() : 0.5
  const y = typeof window.wasmExports[prefix + '_y'] === 'function' ? window.wasmExports[prefix + '_y']() : 0.5
  const z = typeof window.wasmExports[prefix + '_z'] === 'function' ? window.wasmExports[prefix + '_z']() : 0
  return { x, y, z }
}

export function renderPlayerArms(renderer) {
  if (!window.wasmExports) return
  const ctx = renderer.ctx

  const ls = getJointTriplet('get_left_shoulder')
  const le = getJointTriplet('get_left_elbow')
  const lh = getJointTriplet('get_left_hand')
  const rs = getJointTriplet('get_right_shoulder')
  const re = getJointTriplet('get_right_elbow')
  const rh = getJointTriplet('get_right_hand')

  const lsw = wasmToWorld(renderer, ls.x, ls.y)
  const lew = wasmToWorld(renderer, le.x, le.y)
  const lhw = wasmToWorld(renderer, lh.x, lh.y)
  const rsw = wasmToWorld(renderer, rs.x, rs.y)
  const rew = wasmToWorld(renderer, re.x, re.y)
  const rhw = wasmToWorld(renderer, rh.x, rh.y)

  const lss = worldToScreen(renderer, lsw.x, lsw.y)
  const les = worldToScreen(renderer, lew.x, lew.y)
  const lhs = worldToScreen(renderer, lhw.x, lhw.y)
  const rss = worldToScreen(renderer, rsw.x, rsw.y)
  const res = worldToScreen(renderer, rew.x, rew.y)
  const rhs = worldToScreen(renderer, rhw.x, rhw.y)

  const drawArm = (s, e, h, color) => {
    ctx.save()
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.strokeStyle = color
    // shoulder->elbow
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke()
    // elbow->hand
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(h.x, h.y); ctx.stroke()
    // joints
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(h.x, h.y, 6, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }

  drawArm(lss, les, lhs, '#60a5fa')
  drawArm(rss, res, rhs, '#34d399')
}





