// Refresh openapi.json from a running ytpt API (then `npm run gen:api` regenerates the types).
//   YTPT_API_URL=http://192.168.1.20:8000 npm run sync:api
import fs from 'node:fs'

const base = (process.env.YTPT_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const res = await fetch(`${base}/api/openapi.json`)
if (!res.ok) {
	console.error(`Could not fetch ${base}/api/openapi.json (HTTP ${res.status}). Is ytpt running with server.enabled = true?`)
	process.exit(1)
}
const doc = await res.json()
fs.writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(doc, null, 2) + '\n')
console.log(`Updated openapi.json from ${base} (ytpt API ${doc.info?.version ?? '?'})`)
