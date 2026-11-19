import { ExternalLink, History, Video } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { useSource, useSourceVideos, useTimeline } from '../api/queries'
import { SourceActions } from '../components/SourceActions'
import { SourceIcon } from '../components/SourceCard'
import { SourceCounts } from '../components/SourceCounts'
import { TimelineEntryCard } from '../components/Timeline'
import { Badge, EmptyState, ErrorState, Skeleton, Spinner } from '../components/ui/Feedback'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { Button } from '../components/ui/Button'
import { VideoCard } from '../components/VideoCard'
import { GRID_CLASS, GridSkeleton, LoadMore } from '../components/VideoGrid'
import { ApiError } from '../api/client'
import { formatBytes } from '../lib/format'
import { TYPE_LABEL, checkSummary } from '../lib/sourceSummary'
import { useNow } from '../lib/useNow'
import { NotFoundPage } from './NotFound'

function VideosTab({ id }: { id: number }) {
	const videos = useSourceVideos(id)
	if (videos.isPending) return <GridSkeleton count={8} />
	if (videos.isError) return <ErrorState error={videos.error} onRetry={() => videos.refetch()} />
	const items = videos.data.pages.flatMap((p) => p.items)
	const total = videos.data.pages.at(-1)?.total ?? 0
	if (items.length === 0) {
		return (
			<EmptyState icon={<Video />} title="No videos yet">
				The first check has not found any videos yet.
			</EmptyState>
		)
	}
	return (
		<>
			<div className={GRID_CLASS}>
				{items.map((v) => (
					<VideoCard key={v.youtube_id} video={v} index={v.position + 1} />
				))}
			</div>
			<LoadMore shown={items.length} total={total} hasNextPage={videos.hasNextPage} isFetchingNextPage={videos.isFetchingNextPage} onLoadMore={() => videos.fetchNextPage()} />
		</>
	)
}

function TimelineTab({ id }: { id: number }) {
	const [params, setParams] = useSearchParams()
	const changesOnly = params.get('all') !== '1'
	const timeline = useTimeline(id, changesOnly)
	const now = useNow(60_000)

	const toggle = (
		<label className="mb-5 flex cursor-pointer items-center gap-2 text-sm text-muted">
			<input
				type="checkbox"
				className="size-4 accent-accent"
				checked={changesOnly}
				onChange={(e) =>
					setParams(
						(prev) => {
							const next = new URLSearchParams(prev)
							if (e.target.checked) next.delete('all')
							else next.set('all', '1')
							return next
						},
						{ replace: true },
					)
				}
			/>
			Hide checks with no changes
		</label>
	)

	if (timeline.isPending) {
		return (
			<>
				{toggle}
				<div className="flex flex-col gap-4">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-20" />
					))}
				</div>
			</>
		)
	}
	if (timeline.isError) return <ErrorState error={timeline.error} onRetry={() => timeline.refetch()} />

	const entries = timeline.data.pages.flatMap((p) => p.items)
	return (
		<>
			{toggle}
			{entries.length === 0 ? (
				<EmptyState icon={<History />} title={changesOnly && timeline.hasNextPage ? 'No recent changes' : 'No checks yet'}>
					{changesOnly && timeline.hasNextPage ? 'Older checks may have changes. Load more below.' : 'The history appears here after the first check.'}
				</EmptyState>
			) : (
				<ol className="relative ml-2 flex max-w-3xl flex-col gap-6 border-l border-line pl-6">
					{entries.map((e) => (
						<li key={e.snapshot_id} className="relative">
							<span className="absolute top-1.5 -left-[31px] size-2.5 rounded-full border-2 border-bg bg-accent" aria-hidden />
							<TimelineEntryCard entry={e} now={now} />
						</li>
					))}
				</ol>
			)}
			{timeline.hasNextPage && (
				<div className="mt-6 flex justify-center">
					<Button onClick={() => timeline.fetchNextPage()} loading={timeline.isFetchingNextPage}>
						Load older checks
					</Button>
				</div>
			)}
		</>
	)
}

export function SourceDetailPage() {
	const { id } = useParams()
	const sid = Number(id)
	const valid = Number.isInteger(sid) && sid > 0
	const navigate = useNavigate()
	const [params, setParams] = useSearchParams()
	const source = useSource(valid ? sid : 0)
	const now = useNow()

	if (!valid) return <NotFoundPage what="source" />
	if (source.isPending) {
		return (
			<div className="flex justify-center py-24">
				<Spinner className="size-8" />
			</div>
		)
	}
	if (source.isError) {
		if (source.error instanceof ApiError && source.error.status === 404) return <NotFoundPage what="source" />
		return <ErrorState error={source.error} onRetry={() => source.refetch()} />
	}

	const s = source.data
	const tab = params.get('tab') === 'timeline' ? 'timeline' : 'videos'

	return (
		<div>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex min-w-0 items-start gap-4">
					<div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted">
						<SourceIcon type={s.source_type} className="size-7" />
					</div>
					<div className="min-w-0">
						<h1 className="text-2xl font-semibold break-words">{s.title || s.url}</h1>
						<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
							<Badge>{TYPE_LABEL[s.source_type]}</Badge>
							{s.uploader && <span>{s.uploader}</span>}
							<SourceCounts source={s} />
							<span>{formatBytes(s.disk_bytes)}</span>
							{!s.enabled && <Badge tone="warning">Paused</Badge>}
						</div>
						<p className="mt-1 text-xs text-faint">{checkSummary(s, now)}</p>
						<a href={s.url} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
							Open on YouTube <ExternalLink className="size-3" aria-hidden />
						</a>
					</div>
				</div>
				<SourceActions source={s} onDeleted={() => navigate('/sources')} />
			</div>

			<Tabs
				value={tab}
				onValueChange={(value) =>
					setParams(
						(prev) => {
							const next = new URLSearchParams(prev)
							if (value === 'timeline') next.set('tab', 'timeline')
							else next.delete('tab')
							return next
						},
						{ replace: true },
					)
				}
			>
				<TabsList>
					<TabsTrigger value="videos">Videos</TabsTrigger>
					<TabsTrigger value="timeline">Timeline</TabsTrigger>
				</TabsList>
				<TabsContent value="videos">
					<VideosTab id={sid} />
				</TabsContent>
				<TabsContent value="timeline">
					<TimelineTab id={sid} />
				</TabsContent>
			</Tabs>
			<p className="mt-10 text-xs text-faint">
				<Link to="/sources" className="hover:underline">
					← All sources
				</Link>
			</p>
		</div>
	)
}
