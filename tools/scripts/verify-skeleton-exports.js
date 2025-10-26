#!/usr/bin/env node
// Verifies required skeleton-related exports exist in a WASM module
// Usage: node tools/scripts/verify-skeleton-exports.js <path-to-game.wasm>

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const wasmPath = resolve(process.argv[2] || 'public/wasm/game.wasm')

const required = [
  'get_skeleton_joint_count',
  'get_skeleton_joint_x',
  'get_skeleton_joint_y',
  'get_balance_quality',
  'get_left_foot_grounded',
  'get_right_foot_grounded',
]

function fail(msg) {
  console.error('[verify-skeleton-exports] ' + msg)
  process.exit(1)
}

function runWasmDis() {
  const exe = process.platform === 'win32' ? 'wasm-dis.exe' : 'wasm-dis'
  const vendored = resolve('emsdk/upstream/bin/' + exe)
  const binPath = (process.env.WASM_DIS && resolve(process.env.WASM_DIS)) || (existsSync(vendored) ? vendored : exe)
  const proc = spawnSync(binPath, [wasmPath], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  if (proc.error || proc.status !== 0) {
    fail(`Failed to disassemble WASM via ${binPath}: ${proc.error?.message || proc.stderr}`)
  }
  return proc.stdout
}

try {
  const bytes = readFileSync(wasmPath)
  if (!bytes || bytes.length < 8) fail('Invalid WASM file: ' + wasmPath)
  const wat = runWasmDis()
  const missing = []
  for (const name of required) {
    const present = new RegExp(`\\(export\\s+"${name}"\\s+\\(func`, 'i').test(wat)
    if (!present) missing.push(name)
  }
  if (missing.length) {
    fail('Missing required exports: ' + missing.join(', '))
  }
  console.log('[verify-skeleton-exports] OK')
  process.exit(0)
} catch (err) {
  fail(err.message)
}


