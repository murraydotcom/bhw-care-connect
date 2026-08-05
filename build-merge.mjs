// After `vite build` produces app/dist, bring the standalone patient pages and
// brand assets into the publish folder so Care Connect (the React hub at the
// root) and the patient destination pages (Personal Health Blueprint + the
// program pages) are served together from one deploy.
import { cpSync, readdirSync, copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const base = new URL('./', import.meta.url)          // repo root
const dist = new URL('./app/dist/', import.meta.url) // Netlify publish dir

if (!existsSync(fileURLToPath(dist))) {
  console.error('build-merge: app/dist not found — run the Vite build first.')
  process.exit(1)
}

// 1) Brand assets → dist/assets (merges with Vite's hashed output; names don't clash).
const assetsSrc = new URL('./assets/', base)
if (existsSync(fileURLToPath(assetsSrc))) {
  cpSync(assetsSrc, new URL('./assets/', dist), { recursive: true })
}

// 2) Patient destination pages (pages/*.html) → dist root, so relative links
//    like `bhw-patient-portal-mockup.html` resolve at the site root.
let copied = 0
const pagesSrc = new URL('./pages/', base)
if (existsSync(fileURLToPath(pagesSrc))) {
  for (const f of readdirSync(pagesSrc)) {
    if (!f.endsWith('.html')) continue
    copyFileSync(new URL('./' + f, pagesSrc), new URL('./' + f, dist))
    copied++
  }
}
console.log(`build-merge: copied ${copied} patient page(s) + assets into app/dist`)
