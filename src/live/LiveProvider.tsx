import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LiveProgress, LogEvent } from '../api/types'
import { keysForEvent } from './events'
import { LiveContext, type LiveStatus } from './liveContext'
import { clearProgress, setProgress } from './progressStore'

/** Wait this long collecting invalidations so a burst of events refetches each query once. */
const FLUSH_MS = 250

interface Props {
	children: ReactNode
	url?: string
	/** Injectable for tests. */
	createSource?: (url: string) => EventSource
}

/**
 * One app-wide EventSource on /api/events/stream. It
 *  - pushes progress frames into the progress store,
 *  - turns log events into targeted query invalidations (so pages update without polling),
 *  - fans log events out to subscribers (live tail),
 *  - on reconnect refetches everything: the browser replays missed events via
 *    Last-Event-ID, but the progress snapshot and anything we dropped are cheap to resync.
 */
// Module-level so its identity is stable: an inline default would be a new
// function every render and re-run the effect (reconnecting the stream) each time.
const defaultCreateSource = (u: string) => new EventSource(u)

/** EventSource.CLOSED — the numeric value, so this also works where the global is absent (tests). */
const EVENT_SOURCE_CLOSED = 2

export function LiveProvider({ children, url = '/api/events/stream', createSource = defaultCreateSource }: Props) {
	const qc = useQueryClient()
	const [status, setStatus] = useState<LiveStatus>('connecting')
	const listeners = useRef(new Set<(e: LogEvent) => void>())

	const subscribe = useCallback((listener: (e: LogEvent) => void) => {
		listeners.current.add(listener)
		return () => {
			listeners.current.delete(listener)
		}
	}, [])

	useEffect(() => {
		const pending = new Map<string, QueryKey>()
		let timer: ReturnType<typeof setTimeout> | undefined
		let hadError = false

		const flush = () => {
			timer = undefined
			const keys = [...pending.values()]
			pending.clear()
			for (const queryKey of keys) qc.invalidateQueries({ queryKey })
		}
		const schedule = (keys: QueryKey[]) => {
			for (const k of keys) pending.set(JSON.stringify(k), k)
			timer ??= setTimeout(flush, FLUSH_MS)
		}

		let es: EventSource | undefined
		let retryTimer: ReturnType<typeof setTimeout> | undefined
		let attempt = 0
		let disposed = false

		const connect = () => {
			const source = createSource(url)
			es = source

			source.onopen = () => {
				attempt = 0
				setStatus('live')
				if (hadError) {
					hadError = false
					qc.invalidateQueries() // resync after a gap
				}
			}
			source.onerror = () => {
				hadError = true
				setStatus('connecting')
				clearProgress() // stale bars are worse than none
				// While the connection is merely dropped the browser retries by itself. But if the server
				// answered with a non-200 (e.g. the GUI proxy's 502 while ytpt is down) the browser gives up
				// for good (readyState CLOSED) — so reopen it ourselves, with backoff.
				if (source.readyState === EVENT_SOURCE_CLOSED && !disposed) {
					source.close()
					retryTimer = setTimeout(connect, Math.min(15_000, 1_000 * 2 ** attempt++))
				}
			}
			source.addEventListener('log', (m) => {
				let event: LogEvent
				try {
					event = JSON.parse((m as MessageEvent<string>).data) as LogEvent
				} catch {
					return
				}
				schedule(keysForEvent(event))
				for (const l of listeners.current) l(event)
			})
			source.addEventListener('progress', (m) => {
				try {
					const payload = JSON.parse((m as MessageEvent<string>).data) as { items: LiveProgress[] }
					setProgress(payload.items ?? [])
				} catch {
					/* ignore a malformed frame */
				}
			})
		}
		connect()

		return () => {
			disposed = true
			es?.close()
			if (retryTimer) clearTimeout(retryTimer)
			if (timer) clearTimeout(timer)
			clearProgress()
		}
	}, [qc, url, createSource])

	const value = useMemo(() => ({ status, subscribe }), [status, subscribe])
	return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}
