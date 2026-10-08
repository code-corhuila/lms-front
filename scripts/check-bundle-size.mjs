// `npm run perf:bundle` — fails if the production build outgrows its budget.
// Sizes are gzip, which is what a browser actually downloads. The budgets sit
// ~25% above the build measured when this was added (largest chunk 63 KiB,
// all JS+CSS 207 KiB), so ordinary growth passes and an accidental heavy
// dependency (or a portal bundling its own React) does not.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = 'dist'
const BUDGET_KIB = { largestChunk: 80, total: 260 }

function* assets(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      // Type declarations for the remotes, never shipped to the browser.
      if (name !== '@mf-types') yield* assets(path)
    } else if (/\.(js|css)$/.test(name)) {
      yield path
    }
  }
}

let files
try {
  files = [...assets(DIST)].map((path) => ({
    file: relative(DIST, path).replaceAll('\\', '/'),
    gzip: gzipSync(readFileSync(path)).length / 1024,
  }))
} catch {
  console.error(`No ${DIST}/ to measure — run \`npm run build\` first.`)
  process.exit(1)
}

files.sort((a, b) => b.gzip - a.gzip)
const total = files.reduce((sum, f) => sum + f.gzip, 0)
const largest = files[0]

console.log('Largest assets (gzip):')
for (const f of files.slice(0, 5)) {
  console.log(`  ${f.gzip.toFixed(1).padStart(7)} KiB  ${f.file}`)
}
console.log(`[perf] bundle: files=${files.length} total=${total.toFixed(1)}KiB largest=${largest.gzip.toFixed(1)}KiB`)

const failures = []
if (largest.gzip > BUDGET_KIB.largestChunk) {
  failures.push(`largest chunk ${largest.gzip.toFixed(1)} KiB > ${BUDGET_KIB.largestChunk} KiB (${largest.file})`)
}
if (total > BUDGET_KIB.total) {
  failures.push(`total ${total.toFixed(1)} KiB > ${BUDGET_KIB.total} KiB`)
}
if (failures.length) {
  console.error(`Bundle over budget:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log(`Within budget (largest ≤ ${BUDGET_KIB.largestChunk} KiB, total ≤ ${BUDGET_KIB.total} KiB).`)
