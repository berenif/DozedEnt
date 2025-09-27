// Generate a manifest of exports for built WASM modules
// Usage: node tools/scripts/generate-wasm-exports.js [--out path] [--verbose]
// Writes JSON report with export names and types per module.

import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(join(__dirname, '..', '..'))

function log(...args) {
  if (process.argv.includes('--verbose')) console.log('[wasm-exports]', ...args)
}

function detectWasmDis() {
  const exe = process.platform === 'win32' ? 'wasm-dis.exe' : 'wasm-dis'
  const envOverride = process.env.WASM_DIS && resolve(process.env.WASM_DIS)
  const vendored = resolve(join(repoRoot, 'emsdk', 'upstream', 'bin', exe))

  if (envOverride && existsSync(envOverride)) return envOverride
  if (existsSync(vendored)) return vendored
  // Fall back to PATH search; execFile will handle lookup
  return exe
}

function findWasmFiles() {
  const candidates = [
    join(repoRoot, 'game.wasm'),
    join(repoRoot, 'game-host.wasm'),
    join(repoRoot, 'dist', 'wasm', 'game.wasm'),
    join(repoRoot, 'dist', 'wasm', 'game-host.wasm'),
  ]
  // Deduplicate while preserving order
  const seen = new Set()
  const found = []
  for (const c of candidates) {
    if (!seen.has(c) && existsSync(c)) {
      seen.add(c)
      found.push(c)
    }
  }
  return found
}

function parseExportsFromWat(watText) {
  const lines = watText.split(/\r?\n/)
  const exportRegex = /\(export\s+"([^"]+)"\s+\((memory|func|global|table|tag)\b/i
  const exports = []
  for (const line of lines) {
    const m = exportRegex.exec(line)
    if (m) {
      const name = m[1]
      const kind = m[2].toLowerCase()
      exports.push({ name, kind })
    }
  }
  return exports
}

function runWasmDis(wasmDisPath, wasmPath) {
  return new Promise((resolvePromise, reject) => {
    execFile(wasmDisPath, [wasmPath], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const e = new Error(`wasm-dis failed for ${wasmPath}: ${err.message}\n${stderr}`)
        e.code = err.code
        return reject(e)
      }
      resolvePromise(stdout.toString())
    })
  })
}

async function main() {
  try {
    const outArgIndex = process.argv.indexOf('--out')
    const outPath = outArgIndex !== -1 && process.argv[outArgIndex + 1]
      ? resolve(process.argv[outArgIndex + 1])
      : resolve(join(repoRoot, 'WASM_EXPORTS.json'))

    const wasmDis = detectWasmDis()
    log('Using wasm-dis at', wasmDis)

    const wasmFiles = findWasmFiles()
    if (wasmFiles.length === 0) {
      console.error('No WASM files found. Expected game.wasm and/or game-host.wasm')
      process.exitCode = 1
      return
    }

    const report = {
      generatedAt: new Date().toISOString(),
      tools: { wasmDis },
      modules: []
    }

    for (const wasmPath of wasmFiles) {
      log('Disassembling', wasmPath)
      const wat = await runWasmDis(wasmDis, wasmPath)
      const exports = parseExportsFromWat(wat)
      const byType = exports.reduce((acc, e) => {
        acc[e.kind] ||= []
        acc[e.kind].push(e.name)
        return acc
      }, {})

      report.modules.push({
        file: wasmPath.replace(repoRoot + '\\', '').replace(repoRoot + '/', ''),
        exportCount: exports.length,
        byType,
        exports: exports.map(e => e.name)
      })
    }

    // Ensure directory exists
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, JSON.stringify(report, null, 2))

    // Optional compact summary to console
    for (const m of report.modules) {
      const kinds = Object.fromEntries(Object.entries(m.byType).map(([k, arr]) => [k, arr.length]))
      console.log(`Export manifest: ${m.file} -> ${m.exportCount} exports`, kinds)
    }
    console.log('WASM export manifest written to', outPath)
  } catch (err) {
    console.error('Failed to generate WASM export manifest:', err.message)
    process.exitCode = 1
  }
}

main()

