// ytpt-gui server: serves the built GUI (dist/) and reverse-proxies /api/* to the ytpt API.
//
// The browser only ever talks to THIS origin.
// The proxy streams in both directions without buffering.
// So <video> seeking (Range requests) and the live event stream (SSE) working.
//
// Zero dependencies on purpose (node:http only).
//
// Config (env):
//   YTPT_API_URL    where the ytpt API lives            (default http://127.0.0.1:8000)
//   YTPT_GUI_HOST   interface to listen on              (default 127.0.0.1)
//   YTPT_GUI_PORT   port to listen on                   (default 8080)
//   YTPT_GUI_DIST   directory with the built GUI        (default ../dist)

import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

// Headers that describe a single hop and must not be forwarded (RFC 9110 §7.6.1).
const HOP_BY_HOP = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
])

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
}

/** Marks an error response as coming from the proxy itself (not from ytpt). */
export const PROXY_ERROR_HEADER = 'x-ytpt-proxy-error'

function stripHopByHop(headers) {
	const out = {}
	for (const [name, value] of Object.entries(headers)) {
		if (!HOP_BY_HOP.has(name.toLowerCase()) && value !== undefined) out[name] = value
	}
	return out
}

function sendJson(res, status, body, extraHeaders = {}) {
	const payload = JSON.stringify(body)
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'content-length': Buffer.byteLength(payload),
		'cache-control': 'no-store',
		...extraHeaders,
	})
	res.end(payload)
}

export function isApiPath(urlPath) {
	return urlPath === '/api' || urlPath.startsWith('/api/') || urlPath.startsWith('/api?')
}

/** Forward one request to the API and stream the response back. */
function proxy(apiUrl, req, res) {
	const client = apiUrl.protocol === 'https:' ? https : http
	const headers = stripHopByHop(req.headers)
	headers.host = apiUrl.host // the API sees its own address, not the GUI's

	const upstream = client.request(
		{
			protocol: apiUrl.protocol,
			hostname: apiUrl.hostname,
			port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
			method: req.method,
			path: req.url,
			headers,
		},
		(upRes) => {
			res.writeHead(upRes.statusCode ?? 502, upRes.statusMessage, stripHopByHop(upRes.headers))
			// flushHeaders so SSE clients see the stream open before the first event.
			res.flushHeaders()
			upRes.pipe(res)
			upRes.on('error', () => res.destroy())
		},
	)

	upstream.on('error', (err) => {
		if (res.headersSent) {
			res.destroy() // mid-stream failure: the only honest signal is a dropped connection
			return
		}
		sendJson(
			res,
			502,
			{ detail: `Cannot reach the ytpt API at ${apiUrl.origin} (${err.code ?? err.message}).` },
			{ [PROXY_ERROR_HEADER]: 'unreachable' },
		)
	})

	// Browser went away (closed tab, aborted Range request, SSE disconnect):
	// stop pulling from the API too, or long streams would leak.
	res.on('close', () => upstream.destroy())
	req.pipe(upstream)
}

/** Resolve a request path to a file inside dist, or null if it escapes dist / doesn't exist. */
function resolveStatic(distDir, urlPath) {
	let decoded
	try {
		decoded = decodeURIComponent(urlPath.split('?')[0])
	} catch {
		return null
	}
	if (decoded.includes('\0')) return null
	const candidate = path.resolve(distDir, '.' + path.posix.normalize('/' + decoded))
	if (candidate !== distDir && !candidate.startsWith(distDir + path.sep)) return null
	try {
		const stat = fs.statSync(candidate)
		if (stat.isFile()) return candidate
		if (stat.isDirectory()) {
			const index = path.join(candidate, 'index.html')
			if (fs.statSync(index).isFile()) return index
		}
	} catch {
		/* not found */
	}
	return null
}

function serveFile(req, res, file, { immutable }) {
	const ext = path.extname(file).toLowerCase()
	const stat = fs.statSync(file)
	res.writeHead(200, {
		'content-type': MIME[ext] ?? 'application/octet-stream',
		'content-length': stat.size,
		// Vite fingerprints everything under /assets/, so it can be cached forever;
		// index.html must always be revalidated so new builds are picked up.
		'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
	})
	if (req.method === 'HEAD') return res.end()
	fs.createReadStream(file).on('error', () => res.destroy()).pipe(res)
}

/**
 * Build the HTTP server. Exported for tests; `node server/index.mjs` runs it.
 * @param {{ apiUrl?: string, distDir?: string }} options
 */
export function createGuiServer({ apiUrl = 'http://127.0.0.1:8000', distDir = path.resolve(HERE, '..', 'dist') } = {}) {
	const api = new URL(apiUrl)
	const dist = path.resolve(distDir)

	return http.createServer((req, res) => {
		const urlPath = req.url ?? '/'

		if (isApiPath(urlPath)) {
			proxy(api, req, res)
			return
		}

		if (req.method !== 'GET' && req.method !== 'HEAD') {
			sendJson(res, 405, { detail: 'Method not allowed' })
			return
		}

		const file = resolveStatic(dist, urlPath)
		if (file) {
			serveFile(req, res, file, { immutable: file.startsWith(path.join(dist, 'assets') + path.sep) })
			return
		}

		// Single-page app: unknown paths without a file extension are client-side
		// routes (/watch/abc) and get index.html. Missing assets are real 404s.
		const hasExtension = path.extname(urlPath.split('?')[0]) !== ''
		const index = path.join(dist, 'index.html')
		if (!hasExtension && fs.existsSync(index)) {
			serveFile(req, res, index, { immutable: false })
			return
		}

		if (!fs.existsSync(index)) {
			sendJson(res, 404, { detail: 'GUI not built yet. Run `npm run build` first.' })
			return
		}
		sendJson(res, 404, { detail: 'Not found' })
	})
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
	const apiUrl = process.env.YTPT_API_URL || 'http://127.0.0.1:8000'
	const host = process.env.YTPT_GUI_HOST || '127.0.0.1'
	const port = Number(process.env.YTPT_GUI_PORT || 8080)
	const distDir = process.env.YTPT_GUI_DIST || path.resolve(HERE, '..', 'dist')

	const server = createGuiServer({ apiUrl, distDir })
	server.listen(port, host, () => {
		console.log(`ytpt-gui listening on http://${host}:${port}`)
		console.log(`  serving   ${path.resolve(distDir)}`)
		console.log(`  proxying  /api/*  ->  ${new URL(apiUrl).origin}`)
		if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
			console.warn(
				'  WARNING: listening beyond loopback. ytpt has no authentication, so anyone who can reach\n' +
				'  this port can manage your archive. Use Tailscale or a reverse proxy with auth.',
			)
		}
	})

	const shutdown = () => {
		// closeAllConnections: SSE streams never end on their own and would block a plain close().
		server.close(() => process.exit(0))
		server.closeAllConnections()
		setTimeout(() => process.exit(0), 2000).unref()
	}
	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)
}
