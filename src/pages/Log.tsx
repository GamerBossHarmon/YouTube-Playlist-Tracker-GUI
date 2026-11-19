import { Filter, Radio, ScrollText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useEvents, type EventFilters } from '../api/queries'
import { SEVERITIES, type LogEvent, type Severity } from '../api/types'
import { Button } from '../components/ui/Button'
import { Badge, EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback'
import { Menu, MenuCheckbox, MenuSeparator } from '../components/ui/Menu'
import { cn } from '../lib/cn'
import { formatDateTime } from '../lib/format'
import { SEVERITY_TONE } from '../lib/labels'
import { useLive } from '../live/liveContext'

const EVENT_TYPES = [
	'source_checked',
	'source_check_failed',
	'download_started',
	'video_downloaded',
	'video_download_failed',
	'video_failed',
	'video_tombstoned',
	'scheduler_started',
]

// debug is hidden by default: it is the "no changes"/"download started" chatter.
const DEFAULT_SEVERITIES: Severity[] = ['info', 'warning', 'error']
const MAX_LIVE = 500

function toggle<T>(list: T[], item: T, on: boolean): T[] {
	return on ? (list.includes(item) ? list : [...list, item]) : list.filter((x) => x !== item)
}

function EventRow({ e, fresh }: { e: LogEvent; fresh: boolean }) {
	return (
		<li className={cn('grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 py-2.5 text-sm sm:grid-cols-[11rem_5rem_11rem_1fr]', fresh && 'bg-accent/5')}>
			<time dateTime={e.timestamp} className="text-xs text-muted tabular-nums sm:pt-0.5">
				{formatDateTime(e.timestamp)}
			</time>
			<span>
				<Badge tone={SEVERITY_TONE[e.severity]}>{e.severity}</Badge>
			</span>
			<code className="col-span-2 text-xs text-muted sm:col-span-1 sm:pt-0.5">{e.event_type}</code>
			<div className="col-span-2 min-w-0 sm:col-span-1">
				<p className="break-words">{e.message}</p>
				{(e.source_id != null || e.video_id) && (
					<p className="mt-0.5 flex gap-3 text-xs">
						{e.source_id != null && (
							<Link to={`/sources/${e.source_id}`} className="text-accent hover:underline">
								Source #{e.source_id}
							</Link>
						)}
						{e.video_id && (
							<Link to={`/watch/${e.video_id}`} className="text-accent hover:underline">
								Video {e.video_id}
							</Link>
						)}
					</p>
				)}
			</div>
		</li>
	)
}

/**
 * The list + live tail for one filter combination. LogPage renders it with a
 * `key` derived from the filters, so changing a filter remounts it and the
 * live-event buffer starts empty — no effect has to reset state.
 */
function LogList({ filters, liveOn }: { filters: EventFilters; liveOn: boolean }) {
	const events = useEvents(filters)
	const { subscribe } = useLive()
	const [liveEvents, setLiveEvents] = useState<LogEvent[]>([])

	// Live tail: events that arrive while this page is open, filtered client-side
	// the same way the server filters the list.
	useEffect(() => {
		if (!liveOn) return
		return subscribe((e) => {
			if (filters.severity.length > 0 && !filters.severity.includes(e.severity)) return
			if (filters.event_type.length > 0 && !filters.event_type.includes(e.event_type)) return
			setLiveEvents((prev) => [e, ...prev].slice(0, MAX_LIVE))
		})
	}, [liveOn, subscribe, filters])

	if (events.isPending) {
		return (
			<div className="flex flex-col gap-2" aria-busy="true">
				{Array.from({ length: 8 }, (_, i) => (
					<Skeleton key={i} className="h-11" />
				))}
			</div>
		)
	}
	if (events.isError) return <ErrorState error={events.error} onRetry={() => events.refetch()} />

	const fetched = events.data.pages.flatMap((p) => p.items)
	const fetchedIds = new Set(fetched.map((e) => e.id))
	const fresh = liveEvents.filter((e) => !fetchedIds.has(e.id)) // the list may already include what the stream delivered
	const rows = [...fresh.map((e) => ({ e, fresh: true })), ...fetched.map((e) => ({ e, fresh: false }))]

	if (rows.length === 0) {
		return (
			<EmptyState icon={<ScrollText />} title="No events match">
				{isDefaultFilter(filters) ? 'Nothing has happened yet.' : 'Try widening the filter (debug events are hidden by default).'}
			</EmptyState>
		)
	}
	return (
		<>
			<ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface" aria-label="Events, newest first">
				{rows.map(({ e, fresh }) => (
					<EventRow key={e.id} e={e} fresh={fresh} />
				))}
			</ul>
			{events.hasNextPage && (
				<div className="mt-6 flex justify-center">
					<Button onClick={() => events.fetchNextPage()} loading={events.isFetchingNextPage}>
						Load older events
					</Button>
				</div>
			)}
		</>
	)
}

function isDefaultFilter(f: EventFilters): boolean {
	return f.event_type.length === 0 && f.severity.length === DEFAULT_SEVERITIES.length && DEFAULT_SEVERITIES.every((s) => f.severity.includes(s))
}

export function LogPage() {
	const [severities, setSeverities] = useState<Severity[]>(DEFAULT_SEVERITIES)
	const [types, setTypes] = useState<string[]>([])
	const [liveOn, setLiveOn] = useState(true)
	const { status } = useLive()

	const filters: EventFilters = useMemo(() => ({ severity: severities, event_type: types }), [severities, types])
	const filterCount = (isDefaultFilter({ severity: severities, event_type: [] }) ? 0 : 1) + (types.length > 0 ? 1 : 0)

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-5 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Execution log</h1>
					<p className="text-sm text-muted">Everything ytpt has done: checks, downloads and failures.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant={liveOn ? 'secondary' : 'ghost'}
						aria-pressed={liveOn}
						icon={<Radio className={cn('size-4', liveOn && status === 'live' && 'text-success')} />}
						onClick={() => setLiveOn((v) => !v)}
					>
						{liveOn ? (status === 'live' ? 'Live' : 'Reconnecting…') : 'Paused'}
					</Button>
					<Menu
						trigger={
							<Button icon={<Filter className="size-4" />}>
								Filter{filterCount > 0 && <span className="ml-0.5 rounded-full bg-accent px-1.5 text-xs text-bg">{filterCount}</span>}
							</Button>
						}
					>
						{SEVERITIES.map((s) => (
							<MenuCheckbox key={s} checked={severities.includes(s)} onCheckedChange={(on) => setSeverities((cur) => toggle(cur, s, on))}>
								{s}
							</MenuCheckbox>
						))}
						<MenuSeparator />
						{EVENT_TYPES.map((t) => (
							<MenuCheckbox key={t} checked={types.includes(t)} onCheckedChange={(on) => setTypes((cur) => toggle(cur, t, on))}>
								<code className="text-xs">{t}</code>
							</MenuCheckbox>
						))}
					</Menu>
				</div>
			</div>

			<LogList key={JSON.stringify(filters)} filters={filters} liveOn={liveOn} />
		</div>
	)
}
