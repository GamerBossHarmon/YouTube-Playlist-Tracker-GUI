// @vitest-environment node
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createGuiServer, isApiPath, PROXY_ERROR_HEADER } from './index.mjs'

const VIDEO = Buffer.from(Array.from({ length: 100 }, (_, i) => i))

/** Stand-in for the ytpt API. */
function createFakeApi() {
	const seen = { sseClosed: false, lastRequest: null }
	const server = http.createServer((req, res) => {
		const chunks = []
		req.on('data', (c) => chunks.push(c))
		req.on('end', () => {
			seen.lastRequest = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }

			if (req.url === '/api/echo') {
				res.writeHead(201, { 'content-type': 'application/json', 'x-custom': 'yes' })
				res.end(JSON.stringify(seen.lastRequest))
			} else if (req.url === '/api/media/abc/video') {
				const range = /bytes=(\d+)-(\d+)/.exec(req.headers.range ?? '')
				if (range) {
					const [start, end] = [Number(range[1]), Number(range[2])]
					res.writeHead(206, {
						'content-type': 'video/webm',
						'content-range': `bytes ${start}-${end}/${VIDEO.length}`,
						'accept-ranges': 'bytes',
					})
					res.end(VIDEO.subarray(start, end + 1))
				} else {
					res.writeHead(200, { 'content-type': 'video/webm', 'accept-ranges': 'bytes' })
					res.end(VIDEO)
				}
			} else if (req.url === '/api/events/stream') {
				res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
				res.write('retry: 3000\n\n') // the first event goes out immediately; the stream then stays open
				res.on('close', () => {
					seen.sseClosed = true
				})
			} else {
				res.writeHead(404, { 'content-type': 'application/json' })
				res.end('{"detail":"nope"}')
			}
		})
	})
	return { server, seen }
}

function listen(server) {
	return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
}

let api, apiPort, gui, guiPort, distDir, outside

beforeAll(async () => {
	distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytpt-gui-dist-'))
	fs.mkdirSync(path.join(distDir, 'assets'))
	fs.writeFileSync(path.join(distDir, 'index.html'), '<html>app</html>')
	fs.writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), 'console.log(1)')
	fs.writeFileSync(path.join(distDir, 'favicon.svg'), '<svg/>')
	outside = path.join(path.dirname(distDir), 'ytpt-gui-secret.txt')
	fs.writeFileSync(outside, 'top secret')

	api = createFakeApi()
	apiPort = await listen(api.server)
	gui = createGuiServer({ apiUrl: `http://127.0.0.1:${apiPort}`, distDir })
	guiPort = await listen(gui)
})

afterAll(() => {
	gui.closeAllConnections()
	api.server.closeAllConnections()
	gui.close()
	api.server.close()
	fs.rmSync(distDir, { recursive: true, force: true })
	fs.rmSync(outside, { force: true })
})

const url = (p) => `http://127.0.0.1:${guiPort}${p}`

describe('isApiPath', () => {
	it('matches only /api and below', () => {
		expect(isApiPath('/api')).toBe(true)
		expect(isApiPath('/api/sources')).toBe(true)
		expect(isApiPath('/api?x=1')).toBe(true)
		expect(isApiPath('/apiary')).toBe(false)
		expect(isApiPath('/watch/api')).toBe(false)
	})
})

describe('proxy', () => {
	it('forwards method, body, query and rewrites Host; passes status and headers back', async () => {
		const r = await fetch(url('/api/echo'), { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } })
		expect(r.status).toBe(201)
		expect(r.headers.get('x-custom')).toBe('yes')
		const seen = await r.json()
		expect(seen.method).toBe('POST')
		expect(seen.body).toBe('{"a":1}')
		expect(seen.headers.host).toBe(`127.0.0.1:${apiPort}`) // the API's own address, not the GUI's
	})

	it('passes API errors through untouched (and does not mark them as proxy errors)', async () => {
		const r = await fetch(url('/api/missing'))
		expect(r.status).toBe(404)
		expect(r.headers.get(PROXY_ERROR_HEADER)).toBeNull()
		expect(await r.json()).toEqual({ detail: 'nope' })
	})

	it('keeps Range requests byte-exact (video seeking)', async () => {
		const r = await fetch(url('/api/media/abc/video'), { headers: { range: 'bytes=10-19' } })
		expect(r.status).toBe(206)
		expect(r.headers.get('content-range')).toBe('bytes 10-19/100')
		expect(Buffer.from(await r.arrayBuffer())).toEqual(VIDEO.subarray(10, 20))

		const full = await fetch(url('/api/media/abc/video'))
		expect(full.headers.get('accept-ranges')).toBe('bytes')
		expect(Buffer.from(await full.arrayBuffer())).toEqual(VIDEO)
	})

	it('streams SSE without buffering and releases the upstream when the client leaves', async () => {
		api.seen.sseClosed = false
		const firstChunk = await new Promise((resolve, reject) => {
			const req = http.get(url('/api/events/stream'), (res) => {
				expect(res.headers['content-type']).toBe('text/event-stream')
				res.once('data', (chunk) => {
					// The upstream never ends this response: seeing data at all proves nothing is buffered.
					resolve(chunk.toString())
					req.destroy()
				})
			})
			req.on('error', (e) => (e.code === 'ECONNRESET' ? undefined : reject(e)))
		})
		expect(firstChunk).toBe('retry: 3000\n\n')

		for (let i = 0; i < 50 && !api.seen.sseClosed; i++) await new Promise((r) => setTimeout(r, 20))
		expect(api.seen.sseClosed).toBe(true) // browser closed -> proxy closed the API connection too
	})

	it('answers 502 JSON, marked as a proxy error, when the API is down', async () => {
		const dead = createGuiServer({ apiUrl: 'http://127.0.0.1:1', distDir })
		const port = await listen(dead)
		try {
			const r = await fetch(`http://127.0.0.1:${port}/api/system`)
			expect(r.status).toBe(502)
			expect(r.headers.get(PROXY_ERROR_HEADER)).toBe('unreachable')
			expect((await r.json()).detail).toMatch(/Cannot reach the ytpt API at http:\/\/127\.0\.0\.1:1/)
		} finally {
			dead.close()
		}
	})
})

describe('static files', () => {
	it('serves index.html at / without caching', async () => {
		const r = await fetch(url('/'))
		expect(r.status).toBe(200)
		expect(await r.text()).toBe('<html>app</html>')
		expect(r.headers.get('cache-control')).toBe('no-cache')
	})

	it('serves fingerprinted assets as immutable with the right type', async () => {
		const r = await fetch(url('/assets/app-abc123.js'))
		expect(r.headers.get('content-type')).toMatch(/javascript/)
		expect(r.headers.get('cache-control')).toMatch(/immutable/)
	})

	it('falls back to index.html for client-side routes but 404s missing files', async () => {
		expect(await (await fetch(url('/watch/abc123'))).text()).toBe('<html>app</html>')
		expect((await fetch(url('/assets/missing.js'))).status).toBe(404)
		expect((await fetch(url('/nope.png'))).status).toBe(404)
	})

	it('does not let a path escape the dist directory', async () => {
		const status = await new Promise((resolve) => {
			// http.get with a raw path: fetch() would normalise ../ away before sending.
			const req = http.request({ host: '127.0.0.1', port: guiPort, path: '/..%2fytpt-gui-secret.txt', method: 'GET' }, (res) => {
				res.resume()
				res.on('end', () => resolve([res.statusCode, null]))
			})
			req.end()
		})
		const body = await new Promise((resolve) => {
			http.get({ host: '127.0.0.1', port: guiPort, path: '/../../ytpt-gui-secret.txt' }, (res) => {
				let s = ''
				res.on('data', (c) => (s += c))
				res.on('end', () => resolve(s))
			})
		})
		expect(body).not.toContain('top secret')
		// Either an SPA-fallback page (no extension) or a 404 — never the secret file.
		expect([200, 404]).toContain(status[0])
	})

	it('rejects non-GET requests outside /api', async () => {
		expect((await fetch(url('/'), { method: 'POST', body: 'x' })).status).toBe(405)
	})
})
