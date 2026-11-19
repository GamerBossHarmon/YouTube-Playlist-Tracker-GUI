// Thin fetch wrapper. Every request is same-origin ("/api/..."): in dev Vite
// proxies it, in production server/index.mjs does.

export class ApiError extends Error {
	status: number
	detail: string
	/** True when the GUI could not reach the ytpt API at all (as opposed to the API answering with an error). */
	unreachable: boolean

	constructor(status: number, detail: string, unreachable = false) {
		super(detail)
		this.name = 'ApiError'
		this.status = status
		this.detail = detail
		this.unreachable = unreachable
	}
}

type ParamValue = string | number | boolean | null | undefined
export type Params = Record<string, ParamValue | ParamValue[]>

export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	json?: unknown
	params?: Params
	signal?: AbortSignal
}

const PROXY_ERROR_HEADER = 'x-ytpt-proxy-error'

/** Build "/api/..." with a query string; arrays repeat the key, null/undefined/'' are skipped. */
export function buildUrl(path: string, params?: Params): string {
	if (!params) return path
	const search = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		for (const v of Array.isArray(value) ? value : [value]) {
			if (v === null || v === undefined || v === '') continue
			search.append(key, String(v))
		}
	}
	const qs = search.toString()
	return qs ? `${path}?${qs}` : path
}

/** FastAPI errors: {"detail": "text"} or, for validation, {"detail": [{"msg": "...", "loc": [...]}]}. */
export function extractDetail(body: unknown, fallback: string): string {
	if (body && typeof body === 'object' && 'detail' in body) {
		const detail = (body as { detail: unknown }).detail
		if (typeof detail === 'string') return detail
		if (Array.isArray(detail)) {
			const msgs = detail
				.map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : null))
				.filter(Boolean)
			if (msgs.length) return msgs.join('; ')
		}
	}
	return fallback
}

async function request(path: string, opts: RequestOptions): Promise<Response> {
	const headers: Record<string, string> = {}
	let body: string | undefined
	if (opts.json !== undefined) {
		headers['content-type'] = 'application/json'
		body = JSON.stringify(opts.json)
	}

	let res: Response
	try {
		res = await fetch(buildUrl(path, opts.params), { method: opts.method ?? 'GET', headers, body, signal: opts.signal })
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') throw err
		throw new ApiError(0, 'Cannot reach the GUI server. Is it running?', true)
	}

	if (!res.ok) {
		const proxyDown = res.headers.get(PROXY_ERROR_HEADER) !== null
		let parsed: unknown = null
		try {
			parsed = await res.json()
		} catch {
			/* non-JSON error body */
		}
		throw new ApiError(res.status, extractDetail(parsed, `${res.status} ${res.statusText}`.trim()), proxyDown)
	}
	return res
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
	const res = await request(path, opts)
	if (res.status === 204) return undefined as T
	return (await res.json()) as T
}

export async function apiText(path: string, opts: RequestOptions = {}): Promise<string> {
	return (await request(path, opts)).text()
}
