import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, apiText, buildUrl, extractDetail } from './client'

afterEach(() => vi.unstubAllGlobals())

/** Await a promise that must reject with an ApiError and hand the error back. */
async function fail(promise: Promise<unknown>): Promise<ApiError> {
	try {
		await promise
	} catch (e) {
		return e as ApiError
	}
	throw new Error('expected the request to be rejected')
}

function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
	const fn = vi.fn(impl)
	vi.stubGlobal('fetch', fn)
	return fn
}

describe('buildUrl', () => {
	it('skips empty values and repeats arrays', () => {
		expect(buildUrl('/api/videos')).toBe('/api/videos')
		expect(buildUrl('/api/videos', { q: '', status: undefined, source_id: null })).toBe('/api/videos')
		expect(buildUrl('/api/videos', { limit: 48, offset: 0 })).toBe('/api/videos?limit=48&offset=0')
		expect(buildUrl('/api/events', { severity: ['warning', 'error'] })).toBe('/api/events?severity=warning&severity=error')
		expect(buildUrl('/api/videos', { q: 'a b&c' })).toBe('/api/videos?q=a+b%26c')
	})
})

describe('extractDetail', () => {
	it('reads string and validation-array details', () => {
		expect(extractDetail({ detail: 'Source already exists' }, 'x')).toBe('Source already exists')
		expect(extractDetail({ detail: [{ msg: 'bad url' }, { msg: 'bad type' }] }, 'x')).toBe('bad url; bad type')
		expect(extractDetail({}, 'fallback')).toBe('fallback')
		expect(extractDetail(null, 'fallback')).toBe('fallback')
	})
})

describe('api', () => {
	it('returns parsed JSON and sends JSON bodies', async () => {
		const fetchMock = stubFetch(() => new Response(JSON.stringify({ id: 1 }), { status: 201 }))
		const out = await api<{ id: number }>('/api/sources', { method: 'POST', json: { url: 'https://x' } })
		expect(out).toEqual({ id: 1 })
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/sources')
		expect(init).toMatchObject({ method: 'POST', body: '{"url":"https://x"}', headers: { 'content-type': 'application/json' } })
	})

	it('handles 204 with no body', async () => {
		stubFetch(() => new Response(null, { status: 204 }))
		expect(await api('/api/sources/1', { method: 'DELETE' })).toBeUndefined()
	})

	it('turns API errors into ApiError with the server detail', async () => {
		stubFetch(() => new Response('{"detail":"Source already exists"}', { status: 409 }))
		const err = await fail(api('/api/sources', { method: 'POST', json: {} }))
		expect(err).toBeInstanceOf(ApiError)
		expect(err.status).toBe(409)
		expect(err.detail).toBe('Source already exists')
		expect(err.unreachable).toBe(false)
	})

	it('flags proxy 502s (ytpt API down) as unreachable', async () => {
		stubFetch(
			() => new Response('{"detail":"Cannot reach the ytpt API at http://x"}', { status: 502, headers: { 'x-ytpt-proxy-error': 'unreachable' } }),
		)
		const err = await fail(api('/api/system'))
		expect(err.status).toBe(502)
		expect(err.unreachable).toBe(true)
		expect(err.detail).toContain('Cannot reach the ytpt API')
	})

	it('does not treat a plain 502 from elsewhere as the proxy talking', async () => {
		stubFetch(() => new Response('bad gateway', { status: 502, statusText: 'Bad Gateway' }))
		const err = await fail(api('/api/system'))
		expect(err.unreachable).toBe(false)
		expect(err.detail).toBe('502 Bad Gateway')
	})

	it('maps network failures to an unreachable ApiError', async () => {
		stubFetch(() => Promise.reject(new TypeError('Failed to fetch')))
		const err = await fail(api('/api/system'))
		expect(err).toBeInstanceOf(ApiError)
		expect(err.status).toBe(0)
		expect(err.unreachable).toBe(true)
	})

	it('lets aborts through untouched', async () => {
		stubFetch(() => Promise.reject(new DOMException('aborted', 'AbortError')))
		await expect(api('/api/system')).rejects.toMatchObject({ name: 'AbortError' })
	})
})

describe('apiText', () => {
	it('returns the raw body', async () => {
		stubFetch(() => new Response('line 1\nline 2', { status: 200 }))
		expect(await apiText('/api/attempts/1/log')).toBe('line 1\nline 2')
	})
})
