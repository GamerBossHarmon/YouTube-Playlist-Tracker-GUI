import { CheckCircle2, Clock, Download, ExternalLink, FileWarning, Film, RotateCcw, Search, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useAttempts, useLocateVideo, useQueue, useRedownloadVideo, useRetryVideo, useVideo } from '../api/queries'
import type { VideoDetail } from '../api/types'
import { Comments } from '../components/Comments'
import { DownloadNowButton } from '../components/DownloadNowButton'
import { FailVideoButton } from '../components/FailVideoButton'
import { AttemptLogDialog } from '../components/AttemptLogDialog'
import { Button } from '../components/ui/Button'
import { Badge, ErrorState, ProgressBar, Spinner } from '../components/ui/Feedback'
import { useToast } from '../components/ui/toastContext'
import { formatBytes, formatDate, formatDateTime, formatDuration, formatEta, formatRelative, formatSpeed } from '../lib/format'
import { cn } from '../lib/cn'
import { STATUS_EXPLANATION, STATUS_META, failureLabel } from '../lib/labels'
import { useProgress } from '../live/progressStore'
import { NotFoundPage } from './NotFound'

/** What stands in for the player when there is nothing playable. */
function Placeholder({ video }: { video: VideoDetail }) {
	const progress = useProgress(video.youtube_id)
	const queue = useQueue()
	const retry = useRetryVideo(video.youtube_id)
	const redownload = useRedownloadVideo(video.youtube_id)
	const locate = useLocateVideo(video.youtube_id)
	const toast = useToast()
	const position = queue.data?.queued.find((i) => i.video.youtube_id === video.youtube_id)?.position

	let icon = <Film className="size-14" aria-hidden />
	let title = ''
	let body: React.ReactNode = null

	const missingFile =
		!video.file_available && (video.status === 'downloaded' || (video.status === 'unavailable' && !!video.file_missing_at))
	if (missingFile) {
		icon = <FileWarning className="size-14 text-danger" aria-hidden />
		title = 'The video file is missing'
		body = (
			<>
				<p>ytpt recorded this download, but the file is no longer on disk (moved or deleted outside ytpt).</p>
				{video.file_missing_at && (
					<p className="mt-1 text-xs text-faint">
						Noticed {formatRelative(video.file_missing_at)}. If your storage was just offline, nothing is lost: it is flagged again or cleared on the next check.
					</p>
				)}
				<div className="mt-4 flex flex-wrap justify-center gap-2">
					{video.status === 'downloaded' && (
					<Button
						variant="primary"
						icon={<Download className="size-4" />}
						loading={redownload.isPending}
						onClick={() =>
							redownload.mutate(undefined, {
								onSuccess: () => toast.success('Re-queued at the top. Downloading shortly.'),
								onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not re-download.'),
							})
						}
					>
						Re-download
					</Button>
					)}
					<Button
						icon={<Search className="size-4" />}
						loading={locate.isPending}
						title="Look for the file in your data folders (matched by the video id in its name)"
						onClick={() =>
							locate.mutate(undefined, {
								onSuccess: (r) =>
									r.found ? toast.success('Found the file and linked it again.') : toast.info('Could not find the file in your data folders.'),
								onError: (err) => toast.error(err instanceof Error ? err.message : 'Search failed.'),
							})
						}
					>
						Search for file
					</Button>
				</div>
			</>
		)
	} else if (video.status === 'queued') {
		icon = <Clock className="size-14" aria-hidden />
		title = position ? `Queued — #${position} in line` : 'Queued'
		body = (
			<>
				<p>Waiting for its turn. Downloads run one at a time with a pause between each, to be polite to YouTube.</p>
				<div className="mt-4 flex flex-wrap justify-center gap-2">
					<DownloadNowButton youtubeId={video.youtube_id} size="md" variant="primary" />
					<FailVideoButton youtubeId={video.youtube_id} />
				</div>
			</>
		)
	} else if (video.status === 'downloading') {
		icon = <Download className="size-14" aria-hidden />
		title = 'Downloading…'
		body = (
			<div className="mx-auto w-full max-w-sm">
				<ProgressBar value={progress?.percent ?? null} label="Download progress" />
				<p className="mt-2 text-xs text-muted tabular-nums">
					{progress?.percent != null ? `${Math.round(progress.percent)}%` : 'Starting'}
					{progress?.downloaded_bytes != null && ` · ${formatBytes(progress.downloaded_bytes)}${progress.total_bytes ? ` of ${formatBytes(progress.total_bytes)}` : ''}`}
					{progress?.speed_bytes_per_sec != null && ` · ${formatSpeed(progress.speed_bytes_per_sec)}`}
					{progress?.eta_seconds != null && ` · ${formatEta(progress.eta_seconds)} left`}
				</p>
				<div className="mt-4">
					<FailVideoButton youtubeId={video.youtube_id} downloading />
				</div>
			</div>
		)
	} else if (video.status === 'failed') {
		icon = <XCircle className="size-14 text-danger" aria-hidden />
		title = 'Download failed'
		body = (
			<>
				<p>
					{video.failure_reason === 'cancelled'
						? 'You marked this video as failed.'
						: `${failureLabel(video.failure_reason) ?? 'Unknown error'} — gave up after ${video.retry_count} attempts.`}
				</p>
				<div className="mt-4 flex flex-wrap justify-center gap-2">
				<Button
					variant="primary"
					icon={<RotateCcw className="size-4" />}
					loading={retry.isPending}
					onClick={() =>
						retry.mutate(undefined, {
							onSuccess: () => toast.success('Re-queued. It will be retried shortly.'),
							onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not retry.'),
						})
					}
				>
					Retry download
				</Button>
				<DownloadNowButton youtubeId={video.youtube_id} size="md" />
				</div>
			</>
		)
	} else {
		title = STATUS_META[video.status].label
		body = STATUS_EXPLANATION[video.status] ?? null
	}

	return (
		<div className={cn('relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-surface px-6 text-center text-faint', missingFile && 'ring-2 ring-danger')}>
			{video.thumbnail_url && <img src={video.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover opacity-10 blur-sm" />}
			<div className="relative flex flex-col items-center gap-2">
				{icon}
				<h2 className="text-lg font-medium text-fg">{title}</h2>
				<div className="max-w-md text-sm text-muted">{body}</div>
			</div>
		</div>
	)
}

function Player({ video }: { video: VideoDetail }) {
	const [broken, setBroken] = useState(false)
	const id = video.youtube_id
	const first = video.subtitle_languages[0]
	const defaultLang = video.subtitle_languages.includes('en') ? 'en' : first

	return (
		<div>
			<video
				key={id}
				controls
				preload="metadata"
				poster={video.has_thumbnail ? (video.local_thumbnail_url ?? undefined) : undefined}
				className="aspect-video w-full rounded-xl bg-black"
				onError={() => setBroken(true)}
			>
				<source src={video.media_url ?? undefined} />
				{video.subtitle_languages.map((lang) => (
					<track key={lang} kind="subtitles" src={`/api/media/${encodeURIComponent(id)}/subtitles/${encodeURIComponent(lang)}`} srcLang={lang} label={lang.toUpperCase()} default={lang === defaultLang} />
				))}
			</video>
			{broken && (
				<p role="alert" className="mt-2 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
					Your browser could not play this file (its format may not be supported). You can still download it and open it in a media player.
				</p>
			)}
		</div>
	)
}

function Attempts({ id }: { id: string }) {
	const attempts = useAttempts(id)
	const [logFor, setLogFor] = useState<number | null>(null)
	if (attempts.isPending) return <Spinner />
	if (attempts.isError) return <ErrorState error={attempts.error} onRetry={() => attempts.refetch()} />
	if (attempts.data.length === 0) return <p className="text-sm text-muted">No download attempts yet.</p>
	return (
		<>
			<ul className="flex flex-col gap-2">
				{attempts.data.map((a) => (
					<li key={a.id} className="flex items-start gap-3 rounded-lg bg-surface p-3 text-sm">
						{a.success ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Succeeded" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Failed" />}
						<div className="min-w-0 flex-1">
							<p className="font-medium">{a.success ? 'Downloaded' : (failureLabel(a.failure_reason) ?? 'Failed')}</p>
							<p className="text-xs text-muted" title={formatDateTime(a.started_at)}>
								{formatRelative(a.started_at)}
								{a.bytes_downloaded != null && ` · ${formatBytes(a.bytes_downloaded)}`}
							</p>
						</div>
						{a.has_log && (
							<Button size="sm" variant="ghost" onClick={() => setLogFor(a.id)}>
								Log
							</Button>
						)}
					</li>
				))}
			</ul>
			<AttemptLogDialog attemptId={logFor} onClose={() => setLogFor(null)} />
		</>
	)
}

export function WatchPage() {
	const { id = '' } = useParams()
	const video = useVideo(id)
	const [descOpen, setDescOpen] = useState(false)

	if (video.isPending) {
		return (
			<div className="flex justify-center py-24">
				<Spinner className="size-8" />
			</div>
		)
	}
	if (video.isError) {
		if (video.error instanceof ApiError && video.error.status === 404) return <NotFoundPage what="video" />
		return <ErrorState error={video.error} onRetry={() => video.refetch()} />
	}

	const v = video.data
	const playable = v.file_available && !!v.media_url
	const meta = STATUS_META[v.status]
	const activeSources = v.sources.filter((s) => !s.removed_at)
	const removedSources = v.sources.filter((s) => s.removed_at)

	return (
		<div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<div className="min-w-0">
				{playable ? <Player video={v} /> : <Placeholder video={v} />}

				<h1 className="mt-4 text-xl leading-snug font-semibold break-words">{v.title || v.youtube_id}</h1>
				<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
					{v.channel && <span className="font-medium text-fg">{v.channel}</span>}
					{v.status !== 'downloaded' && <Badge tone={meta.tone}>{meta.label}</Badge>}
					{v.upload_date && <span>Uploaded {formatDate(v.upload_date)}</span>}
					{v.duration_seconds != null && <span>{formatDuration(v.duration_seconds)}</span>}
					{v.file_size_bytes != null && <span>{formatBytes(v.file_size_bytes)}</span>}
					{v.downloaded_at && <span title={formatDateTime(v.downloaded_at)}>Archived {formatRelative(v.downloaded_at)}</span>}
				</div>

				<div className="mt-4 flex flex-wrap gap-2">
					<a
						href={`https://www.youtube.com/watch?v=${encodeURIComponent(v.youtube_id)}`}
						target="_blank"
						rel="noreferrer noopener"
						className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium hover:bg-hover"
					>
						<ExternalLink className="size-4" aria-hidden /> Open on YouTube
					</a>
					{playable && (
						<a href={v.media_url ?? '#'} download className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium hover:bg-hover">
							<Download className="size-4" aria-hidden /> Download file
						</a>
					)}
				</div>

				{v.description && (
					<div className="mt-5 rounded-xl bg-surface p-4 text-sm">
						<p className={descOpen ? 'break-words whitespace-pre-wrap' : 'line-clamp-3 break-words whitespace-pre-wrap'}>{v.description}</p>
						{v.description.length > 200 && (
							<button type="button" onClick={() => setDescOpen((o) => !o)} className="mt-2 cursor-pointer text-xs font-medium text-muted hover:text-fg">
								{descOpen ? 'Show less' : 'Show more'}
							</button>
						)}
					</div>
				)}

				{v.status === 'downloaded' && <Comments youtubeId={v.youtube_id} />}
			</div>

			<aside className="flex min-w-0 flex-col gap-8">
				<section aria-labelledby="in-sources">
					<h2 id="in-sources" className="mb-3 text-base font-medium">
						In these sources
					</h2>
					{v.sources.length === 0 ? (
						<p className="text-sm text-muted">Not in any tracked source — it appears under Orphaned.</p>
					) : (
						<ul className="flex flex-col gap-2 text-sm">
							{activeSources.map((s) => (
								<li key={s.source_id} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2">
									<Link to={`/sources/${s.source_id}`} className="min-w-0 truncate hover:underline">
										{s.source_title || `Source #${s.source_id}`}
									</Link>
									<span className="shrink-0 text-xs text-muted">#{s.position + 1}</span>
								</li>
							))}
							{removedSources.map((s) => (
								<li key={s.source_id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted">
									<Link to={`/sources/${s.source_id}`} className="min-w-0 truncate hover:underline">
										{s.source_title || `Source #${s.source_id}`}
									</Link>
									<Badge tone="warning">removed {formatRelative(s.removed_at)}</Badge>
								</li>
							))}
						</ul>
					)}
				</section>

				<section aria-labelledby="attempts">
					<h2 id="attempts" className="mb-3 text-base font-medium">
						Download attempts
					</h2>
					<Attempts id={v.youtube_id} />
				</section>
			</aside>
		</div>
	)
}
