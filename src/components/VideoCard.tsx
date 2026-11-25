import { AlertTriangle, Film } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { Video } from '../api/types'
import { formatBytes, formatDuration, formatRelative } from '../lib/format'
import { failureLabel } from '../lib/labels'
import { describeFormat, resolutionLabel } from '../lib/videoFormat'
import { useProgress } from '../live/progressStore'
import { cn } from '../lib/cn'
import { Badge, ProgressBar } from './ui/Feedback'

/** Local thumbnail first, then the remote YouTube one, then a placeholder. */
function Thumb({ video, dim, missing = false }: { video: Video; dim: boolean; missing?: boolean }) {
	const sources = [video.local_thumbnail_url, video.thumbnail_url].filter((s): s is string => !!s)
	const [failed, setFailed] = useState(0)
	const src = sources[failed]
	if (!src) {
		return (
			<div className="flex size-full items-center justify-center bg-surface text-faint">
				<Film className="size-10" aria-hidden />
			</div>
		)
	}
	return (
		<img
			key={src}
			src={src}
			alt=""
			loading="lazy"
			onError={() => setFailed((n) => n + 1)}
			className={cn('size-full object-cover transition-opacity', dim && 'opacity-50', missing && 'grayscale')}
		/>
	)
}

interface VideoCardProps {
	video: Video
	/** 1-based place in the download queue, if queued. */
	queuePosition?: number
	/** Playlist position badge (source detail view). */
	index?: number
}

export function VideoCard({ video, queuePosition, index }: VideoCardProps) {
	const progress = useProgress(video.youtube_id)
	const done = video.status === 'downloaded'
	const title = video.title || video.youtube_id
	const quality = resolutionLabel(video)

	let statusBadge: React.ReactNode = null
	if (video.status === 'queued') {
		statusBadge = <Badge>{queuePosition ? `Queued · #${queuePosition}` : 'Queued'}</Badge>
	} else if (video.status === 'downloading') {
		statusBadge = <Badge tone="info">{progress?.percent != null ? `Downloading · ${Math.round(progress.percent)}%` : 'Downloading'}</Badge>
	} else if (video.status === 'failed') {
		statusBadge = <Badge tone="danger">Failed</Badge>
	} else if (video.status === 'tombstoned') {
		statusBadge = <Badge tone="warning">Removed from YouTube</Badge>
	} else if (video.status === 'unavailable') {
		statusBadge = <Badge tone="warning">No longer on YouTube</Badge>
	}
	// Set by the re-check when the file is gone from disk (moved, deleted, or storage offline).
	const missing = !!video.file_missing_at && (video.status === 'downloaded' || video.status === 'unavailable')

	const meta = missing
		? `Not found on disk · noticed ${formatRelative(video.file_missing_at)}`
		: done
		? [formatBytes(video.file_size_bytes), `archived ${formatRelative(video.downloaded_at)}`].filter((s) => s !== '—').join(' · ')
		: video.status === 'failed'
			? [failureLabel(video.failure_reason), video.retry_count ? `${video.retry_count} attempts` : null].filter(Boolean).join(' · ')
			: ''

	return (
		<Link to={`/watch/${video.youtube_id}`} className="group flex min-w-0 flex-col gap-3 rounded-xl focus-visible:outline-offset-4">
			<div className={cn('relative aspect-video overflow-hidden rounded-xl bg-surface', missing && 'ring-2 ring-danger')}>
				<Thumb video={video} dim={!done || missing} missing={missing} />
				{missing && (
					<span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-md bg-danger px-2 py-1 text-xs font-bold text-black shadow-lg">
						<AlertTriangle className="size-3.5" aria-hidden /> File missing
					</span>
				)}
				{quality && done && !missing && (
						<span className="absolute top-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium" title={describeFormat(video)}>
							{quality}
						</span>
					)}
					{video.duration_seconds != null && done && (
					<span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium">{formatDuration(video.duration_seconds)}</span>
				)}
				{index != null && <span className="absolute top-1.5 left-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-muted">#{index}</span>}
				{statusBadge && <div className="absolute bottom-1.5 left-1.5">{statusBadge}</div>}
				{video.status === 'downloading' && (
					<div className="absolute inset-x-0 bottom-0">
						<ProgressBar value={progress?.percent ?? null} className="rounded-none" label={`Downloading ${title}`} />
					</div>
				)}
			</div>
			<div className="min-w-0 px-0.5">
				<h3 className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-white" title={title}>
					{title}
				</h3>
				{video.channel && <p className="mt-1 truncate text-xs text-muted">{video.channel}</p>}
				{meta && <p className={cn('truncate text-xs', missing ? 'font-medium text-danger' : 'text-faint')}>{meta}</p>}
			</div>
		</Link>
	)
}
