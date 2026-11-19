import { Download, Film, Hourglass } from 'lucide-react'
import { Link } from 'react-router'
import { useQueue, useSystem } from '../api/queries'
import type { QueueItem } from '../api/types'
import { DownloadNowButton } from '../components/DownloadNowButton'
import { Badge, EmptyState, ErrorState, ProgressBar, Skeleton } from '../components/ui/Feedback'
import { formatBytes, formatEta, formatSpeed } from '../lib/format'
import { useNow } from '../lib/useNow'
import { useProgress } from '../live/progressStore'

function Thumb({ item }: { item: QueueItem }) {
	const src = item.video.thumbnail_url
	return src ? (
		<img src={src} alt="" loading="lazy" className="aspect-video w-32 shrink-0 rounded-lg object-cover sm:w-40" />
	) : (
		<div className="flex aspect-video w-32 shrink-0 items-center justify-center rounded-lg bg-white/10 text-faint sm:w-40">
			<Film className="size-8" aria-hidden />
		</div>
	)
}

function DownloadingRow({ item }: { item: QueueItem }) {
	const live = useProgress(item.video.youtube_id)
	// Live SSE frames are fresher than the last /queue fetch, so prefer them.
	const p = live ?? item.progress
	const pct = p?.percent ?? null
	return (
		<li className="flex gap-4 rounded-xl bg-surface p-3">
			<Thumb item={item} />
			<div className="min-w-0 flex-1">
				<Link to={`/watch/${item.video.youtube_id}`} className="line-clamp-2 font-medium hover:underline">
					{item.video.title || item.video.youtube_id}
				</Link>
				{item.video.channel && <p className="truncate text-sm text-muted">{item.video.channel}</p>}
				<ProgressBar value={pct} className="mt-3" label="Download progress" />
				<p className="mt-2 text-xs text-muted tabular-nums">
					{pct != null ? `${Math.round(pct)}%` : 'Starting…'}
					{p?.downloaded_bytes != null && ` · ${formatBytes(p.downloaded_bytes)}${p.total_bytes ? ` of ${formatBytes(p.total_bytes)}` : ''}`}
					{p?.speed_bytes_per_sec != null && ` · ${formatSpeed(p.speed_bytes_per_sec)}`}
					{p?.eta_seconds != null && ` · ${formatEta(p.eta_seconds)} left`}
				</p>
			</div>
		</li>
	)
}

export function QueuePage() {
	const queue = useQueue()
	const system = useSystem()
	const now = useNow(1000)

	if (queue.isPending) {
		return (
			<div className="mx-auto flex max-w-4xl flex-col gap-3">
				<Skeleton className="h-8 w-40" />
				<Skeleton className="h-28 rounded-xl" />
				<Skeleton className="h-28 rounded-xl" />
			</div>
		)
	}
	if (queue.isError) return <ErrorState error={queue.error} onRetry={() => queue.refetch()} />

	const q = queue.data
	// /queue reports seconds remaining as of when it was fetched; count down locally from there.
	const waited = (now - queue.dataUpdatedAt) / 1000
	const remaining = q.next_download_in_seconds != null ? Math.max(0, q.next_download_in_seconds - waited) : null
	const idle = q.downloading.length === 0 && q.queued_total === 0

	let status: string
	if (q.downloading.length > 0) status = 'One video at a time is downloading.'
	else if (remaining != null && remaining > 0) status = `Pausing between downloads. The next one starts in ${formatEta(remaining)}.`
	else if (q.queued_total > 0) status = 'The next download starts any moment.'
	else status = 'Nothing is waiting.'

	return (
		<div className="mx-auto max-w-4xl">
			<h1 className="text-2xl font-semibold">Download queue</h1>
			<p className="mt-1 text-sm text-muted">{status}</p>
			{system.data && !system.data.scheduler_running && (
				<p role="alert" className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
					The scheduler is not running, so nothing will download until it is started.
				</p>
			)}

			{idle ? (
				<EmptyState icon={<Download />} title="The queue is empty">
					New videos from your sources appear here while they wait to download. Failed ones are under{' '}
					<Link to="/?status=failed" className="text-accent hover:underline">
						Home → Failed
					</Link>
					.
				</EmptyState>
			) : (
				<>
					{q.downloading.length > 0 && (
						<section aria-labelledby="now" className="mt-6">
							<h2 id="now" className="mb-3 text-base font-medium">
								Downloading now
							</h2>
							<ul className="flex flex-col gap-3">
								{q.downloading.map((i) => (
									<DownloadingRow key={i.video.youtube_id} item={i} />
								))}
							</ul>
						</section>
					)}

					{remaining != null && remaining > 0 && q.downloading.length === 0 && (
						<div className="mt-6 flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm">
							<Hourglass className="size-4 text-muted" aria-hidden />
							Next download in <strong className="tabular-nums">{formatEta(remaining)}</strong>
						</div>
					)}

					{q.queued_total > 0 && (
						<section aria-labelledby="waiting" className="mt-8">
							<h2 id="waiting" className="mb-3 flex items-center gap-2 text-base font-medium">
								Waiting <Badge>{q.queued_total}</Badge>
							</h2>
							<ol className="flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface">
								{q.queued.map((i) => (
									<li key={i.video.youtube_id} className="flex items-center gap-4 px-4 py-2.5 text-sm">
										<span className="w-8 shrink-0 text-right text-muted tabular-nums">{i.position}</span>
										<Link to={`/watch/${i.video.youtube_id}`} className="min-w-0 flex-1 truncate hover:underline">
											{i.video.title || i.video.youtube_id}
										</Link>
										<DownloadNowButton youtubeId={i.video.youtube_id} />
									</li>
								))}
							</ol>
							{q.queued_total > q.queued.length && (
								<p className="mt-2 text-xs text-faint">…and {q.queued_total - q.queued.length} more waiting.</p>
							)}
						</section>
					)}
				</>
			)}
		</div>
	)
}
