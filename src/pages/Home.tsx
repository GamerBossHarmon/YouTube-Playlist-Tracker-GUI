import { Download, Film, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQueue, useSources, useSystem, useVideos, type VideoFilters } from '../api/queries'
import { SORTS, VIDEO_STATUSES, type VideoStatus } from '../api/types'
import { AddSourceDialog } from '../components/SourceDialogs'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState } from '../components/ui/Feedback'
import { Select } from '../components/ui/Form'
import { VideoCard } from '../components/VideoCard'
import { GRID_CLASS, GridSkeleton, LoadMore } from '../components/VideoGrid'
import { cn } from '../lib/cn'
import { STATUS_META, defaultSort } from '../lib/labels'
import { useProgress } from '../live/progressStore'

function NowDownloading() {
	const { data } = useQueue()
	const current = data?.downloading[0]
	const progress = useProgress(current?.video.youtube_id ?? '')
	if (!current) return null
	const pct = progress?.percent
	return (
		<Link to="/queue" className="mb-5 flex items-center gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm hover:bg-accent/15">
			<Download className="size-4 shrink-0 text-accent" aria-hidden />
			<span className="min-w-0 flex-1 truncate">
				Downloading now: <strong className="font-medium">{current.video.title || current.video.youtube_id}</strong>
			</span>
			{pct != null && <span className="text-accent tabular-nums">{Math.round(pct)}%</span>}
			{data && data.queued_total > 0 && <span className="text-muted max-sm:hidden">{data.queued_total} waiting</span>}
		</Link>
	)
}

export function HomePage() {
	const [params, setParams] = useSearchParams()
	const system = useSystem()
	const sources = useSources()
	const queue = useQueue()
	const [adding, setAdding] = useState(false)

	const rawStatus = params.get('status')
	const status = VIDEO_STATUSES.includes(rawStatus as VideoStatus) ? (rawStatus as VideoStatus) : undefined
	const rawSource = Number(params.get('source'))
	const sourceId = Number.isInteger(rawSource) && rawSource > 0 ? rawSource : undefined
	const q = params.get('q') ?? ''
	const rawSort = params.get('sort')
	const sort = SORTS.some((s) => s.value === rawSort) ? (rawSort as string) : defaultSort(system.data)

	const filters: VideoFilters = { status, source_id: sourceId, q: q || undefined, sort }
	const videos = useVideos(filters)

	const setParam = (key: string, value: string | null) =>
		setParams(
			(prev) => {
				const next = new URLSearchParams(prev)
				if (value) next.set(key, value)
				else next.delete(key)
				return next
			},
			{ replace: true },
		)

	const positions = useMemo(() => new Map((queue.data?.queued ?? []).map((i) => [i.video.youtube_id, i.position ?? 0])), [queue.data])

	const items = videos.data?.pages.flatMap((p) => p.items) ?? []
	const total = videos.data?.pages.at(-1)?.total ?? 0
	const filtered = Boolean(status || sourceId || q)
	const hasSources = (sources.data?.length ?? 0) > 0

	return (
		<div>
			<NowDownloading />

			<div className="mb-6 flex flex-wrap items-center gap-2">
				<div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
					<button
						type="button"
						aria-pressed={!status}
						onClick={() => setParam('status', null)}
						className={cn('cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', !status ? 'bg-fg text-bg' : 'bg-surface hover:bg-hover')}
					>
						All
					</button>
					{VIDEO_STATUSES.map((s) => (
						<button
							key={s}
							type="button"
							aria-pressed={status === s}
							onClick={() => setParam('status', status === s ? null : s)}
							className={cn('cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', status === s ? 'bg-fg text-bg' : 'bg-surface hover:bg-hover')}
						>
							{STATUS_META[s].label}
						</button>
					))}
				</div>
				<div className="ml-auto flex flex-wrap gap-2">
					{hasSources && (
						<Select aria-label="Filter by source" value={sourceId ?? ''} onChange={(e) => setParam('source', e.target.value || null)} className="h-9 w-auto max-w-56">
							<option value="">All sources</option>
							{sources.data?.map((s) => (
								<option key={s.id} value={s.id}>
									{s.title || s.url}
								</option>
							))}
						</Select>
					)}
					<Select aria-label="Sort videos" value={sort} onChange={(e) => setParam('sort', e.target.value)} className="h-9 w-auto">
						{SORTS.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</Select>
				</div>
			</div>

			{q && (
				<p className="mb-4 flex items-center gap-2 text-sm text-muted">
					Results for <strong className="text-fg">&ldquo;{q}&rdquo;</strong>
					<button type="button" aria-label="Clear search" onClick={() => setParam('q', null)} className="cursor-pointer rounded-full p-1 hover:bg-surface">
						<X className="size-4" />
					</button>
				</p>
			)}

			{videos.isPending ? (
				<GridSkeleton />
			) : videos.isError ? (
				<ErrorState error={videos.error} onRetry={() => videos.refetch()} />
			) : items.length === 0 ? (
				filtered ? (
					<EmptyState icon={<Film />} title="No videos match" action={<Button onClick={() => setParams({}, { replace: true })}>Clear filters</Button>}>
						Nothing in the archive matches the current filters.
					</EmptyState>
				) : hasSources ? (
					<EmptyState icon={<Film />} title="Nothing archived yet">
						Your sources are being checked. Videos show up here as soon as they are discovered, and play once downloaded.
					</EmptyState>
				) : (
					<EmptyState
						icon={<Film />}
						title="Your archive is empty"
						action={
							<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
								Add your first source
							</Button>
						}
					>
						Give ytpt a YouTube playlist, channel or video. It will download everything and keep watching for changes.
					</EmptyState>
				)
			) : (
				<>
					<div className={GRID_CLASS}>
						{items.map((v) => (
							<VideoCard key={v.youtube_id} video={v} queuePosition={positions.get(v.youtube_id)} />
						))}
					</div>
					<LoadMore shown={items.length} total={total} hasNextPage={videos.hasNextPage} isFetchingNextPage={videos.isFetchingNextPage} onLoadMore={() => videos.fetchNextPage()} />
				</>
			)}
			<AddSourceDialog open={adding} onOpenChange={setAdding} />
		</div>
	)
}
