// Fails if any user-visible string from the old UI (frontend/src) shows up verbatim in the new one.
// Compares whole strings, case-insensitively, so shared single words in different sentences do not trip it.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const oldSrc = resolve(root, '../frontend/src')
const newSrc = resolve(root, 'src')

// Names that are part of the backend protocol, not UI copy.
const ALLOW = new Set(['gotohp', 'files', 'startupload', 'uploadcancel', 'accounts.google.com', 'oauth_token'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(vue|ts)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p)
  }
  return out
}

const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase()

function strings(file) {
  const src = readFileSync(file, 'utf8')
  const found = new Set()
  const add = s => {
    const n = norm(s)
    if (n.length >= 4 && /[a-z]/.test(n) && !n.includes('{{') && !n.startsWith('http') && !ALLOW.has(n)) found.add(n)
  }
  const template = src.match(/<template>([\s\S]*)<\/template>/)?.[1] ?? ''
  for (const m of template.matchAll(/>([^<>]+)</g)) add(m[1])
  for (const m of template.matchAll(/\b(?:placeholder|title|aria-label|label)="([^"]+)"/g)) add(m[1])
  for (const m of src.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) if (m[2].includes(' ')) add(m[2])
  return found
}

const oldStrings = new Set(walk(oldSrc).flatMap(f => [...strings(f)]))
const clashes = []
for (const file of walk(newSrc)) {
  const own = strings(file)
  for (const s of own) if (oldStrings.has(s)) clashes.push(`${file.replace(root, '.')}: "${s}"`)
}

if (clashes.length) {
  console.error(`Found ${clashes.length} string(s) shared with the old UI:\n${clashes.join('\n')}`)
  process.exit(1)
}
console.log(`OK: checked ${oldStrings.size} old strings, none reused.`)
