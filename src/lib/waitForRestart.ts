// After "restart ytpt" the API disappears for a few seconds and comes back. This watches
// /api/health through that: first until it goes away (or `downGraceMs` passes, in case the
// restart was too quick to catch), then until it answers again.

export interface WaitOptions {
	/** Resolves true when the API answers. Must not throw. */
	isUp: () => Promise<boolean>
	sleep?: (ms: number) => Promise<void>
	now?: () => number
	intervalMs?: number
	/** Stop waiting for it to go down after this long and just wait for it to be up. */
	downGraceMs?: number
	/** Give up after this long in total. */
	timeoutMs?: number
}

export type WaitResult = 'back' | 'timeout'

export async function waitForRestart(opts: WaitOptions): Promise<WaitResult> {
	const sleep = opts.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
	const now = opts.now ?? Date.now
	const interval = opts.intervalMs ?? 1000
	const downGrace = opts.downGraceMs ?? 15_000
	const timeout = opts.timeoutMs ?? 120_000
	const started = now()

	let wentDown = false
	while (now() - started < timeout) {
		const up = await opts.isUp()
		if (!up) wentDown = true
		else if (wentDown || now() - started >= downGrace) return 'back'
		await sleep(interval)
	}
	return 'timeout'
}

/** Is the ytpt API answering through the GUI server? Never throws. */
export async function apiIsUp(signal?: AbortSignal): Promise<boolean> {
	try {
		const res = await fetch('/api/health', { cache: 'no-store', signal })
		// The GUI server answers 502 (with its own header) while ytpt is down.
		return res.ok && res.headers.get('x-ytpt-proxy-error') === null
	} catch {
		return false
	}
}
