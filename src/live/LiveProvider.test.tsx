import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LogEvent } from '../api/types'
import { useLive } from './liveContext'
import { LiveProvider } from './LiveProvider'
import { getProgressSnapshot } from './progressStore'

class FakeEventSource {
	static instances: FakeEventSource[] = []
	onopen: (() => void) | null = null
	onerror: (() => void) | null = null
	closed = false
	readyState = 0 // 0 connecting, 1 open, 2 closed
	private handlers = new Map<string, Array<(m: MessageEvent<string>) => void>>()
	url: string
	constructor(url: string) {
		this.url = url
		FakeEventSource.instances.push(this)
	}
	addEventListener(type: string, fn: (m: MessageEvent<string>) => void) {
		this.handlers.set(type, [...(this.handlers.get(type) ?? []), fn])
	}
	close() {
		this.closed = true
		this.readyState = 2
	}
	emit(type: string, data: unknown) {
		for (const fn of this.handlers.get(type) ?? []) fn({ data: JSON.stringify(data) } as MessageEvent<string>)
	}
}

const logEvent = (over: Partial<LogEvent> = {}): LogEvent => ({
	id: 1,
	timestamp: '2026-11-14T12:00:00Z',
	event_type: 'video_downloaded',
	severity: 'info',
	message: 'Downloaded: x',
	source_id: 1,
	video_id: 'abc',
	attempt_id: 1,
	...over,
})

function Status() {
	const { status } = useLive()
	return <p>status:{status}</p>
}

function setup(extra?: React.ReactNode) {
	const qc = new QueryClient()
	const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue()
	const utils = render(
		<QueryClientProvider client={qc}>
			<LiveProvider createSource={(u) => new FakeEventSource(u) as unknown as EventSource}>
				<Status />
				{extra}
			</LiveProvider>
		</QueryClientProvider>,
	)
	const es = FakeEventSource.instances.at(-1)!
	return { qc, spy, es, ...utils }
}

beforeEach(() => {
	FakeEventSource.instances = []
	vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('LiveProvider', () => {
	it('opens one stream on the same-origin events endpoint and reports connection state', () => {
		const { es } = setup()
		expect(FakeEventSource.instances).toHaveLength(1)
		expect(es.url).toBe('/api/events/stream')
		expect(screen.getByText('status:connecting')).toBeInTheDocument()

		act(() => es.onopen?.())
		expect(screen.getByText('status:live')).toBeInTheDocument()
		expect(FakeEventSource.instances).toHaveLength(1) // state changes must not reconnect the stream
	})

	it('batches invalidations from a burst of events into one pass', () => {
		const { es, spy } = setup()
		act(() => {
			es.emit('log', logEvent({ id: 1 }))
			es.emit('log', logEvent({ id: 2 }))
			es.emit('log', logEvent({ id: 3 }))
		})
		expect(spy).not.toHaveBeenCalled() // still collecting
		act(() => vi.advanceTimersByTime(300))

		const keys = spy.mock.calls.map((c) => JSON.stringify((c[0] as { queryKey: unknown }).queryKey))
		expect(keys).toContain('["video","abc"]')
		expect(new Set(keys).size).toBe(keys.length) // each query key invalidated exactly once
	})

	it('feeds progress frames into the progress store and clears it on disconnect', () => {
		const { es } = setup()
		const item = { video_id: 'abc', status: 'downloading', downloaded_bytes: 5, total_bytes: 10, speed_bytes_per_sec: 1, eta_seconds: 2, percent: 50, updated_at: 1 }
		act(() => es.emit('progress', { items: [item] }))
		expect(getProgressSnapshot().get('abc')?.percent).toBe(50)

		act(() => es.emit('progress', { items: [] }))
		expect(getProgressSnapshot().size).toBe(0)

		act(() => es.emit('progress', { items: [item] }))
		act(() => es.onerror?.())
		expect(getProgressSnapshot().size).toBe(0) // stale bars are worse than none
	})

	it('opens a NEW stream itself when the browser gives up (e.g. the proxy answered 502), with backoff', () => {
		const { es } = setup()
		act(() => es.onopen?.())
		expect(FakeEventSource.instances).toHaveLength(1)

		// Non-200 response -> the browser closes the EventSource for good and fires one last error.
		act(() => {
			es.readyState = 2
			es.onerror?.()
		})
		expect(screen.getByText('status:connecting')).toBeInTheDocument()
		expect(FakeEventSource.instances).toHaveLength(1) // not yet: waiting out the backoff

		act(() => vi.advanceTimersByTime(1_000))
		expect(FakeEventSource.instances).toHaveLength(2)
		const second = FakeEventSource.instances[1]

		// Still down: the next attempt waits longer (2s), then succeeds and resyncs.
		act(() => {
			second.readyState = 2
			second.onerror?.()
		})
		act(() => vi.advanceTimersByTime(1_000))
		expect(FakeEventSource.instances).toHaveLength(2)
		act(() => vi.advanceTimersByTime(1_000))
		expect(FakeEventSource.instances).toHaveLength(3)
		act(() => FakeEventSource.instances[2].onopen?.())
		expect(screen.getByText('status:live')).toBeInTheDocument()
	})

	it('does not reconnect after unmount', () => {
		const { es, unmount } = setup()
		act(() => {
			es.readyState = 2
			es.onerror?.()
		})
		unmount()
		act(() => vi.advanceTimersByTime(20_000))
		expect(FakeEventSource.instances).toHaveLength(1)
	})

	it('refetches everything after reconnecting from an error', () => {
		const { es, spy } = setup()
		act(() => es.onopen?.())
		expect(spy).not.toHaveBeenCalled() // first connect needs no resync

		act(() => es.onerror?.())
		expect(screen.getByText('status:connecting')).toBeInTheDocument()
		act(() => es.onopen?.())
		expect(spy).toHaveBeenCalledWith() // invalidateQueries() with no filter = everything
	})

	it('fans log events out to subscribers until they unsubscribe', () => {
		const seen: number[] = []
		const handle = { off: () => { } }
		function Probe() {
			const { subscribe } = useLive()
			useEffect(() => {
				handle.off = subscribe((e) => seen.push(e.id))
				return handle.off
			}, [subscribe])
			return null
		}
		const { es } = setup(<Probe />)

		act(() => es.emit('log', logEvent({ id: 7 })))
		expect(seen).toEqual([7])

		handle.off()
		act(() => es.emit('log', logEvent({ id: 8 })))
		expect(seen).toEqual([7])
	})

	it('ignores malformed frames and closes the stream on unmount', () => {
		const { es, unmount } = setup()
		expect(() => act(() => (es as unknown as { handlers: Map<string, Array<(m: unknown) => void>> }).handlers.get('log')![0]({ data: '{nope' }))).not.toThrow()
		unmount()
		expect(es.closed).toBe(true)
	})
})
