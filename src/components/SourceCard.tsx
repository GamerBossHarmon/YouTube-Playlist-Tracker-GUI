import { Film, ListVideo, Loader2, Tv, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { Source, SourceType } from '../api/types'
import { formatBytes } from '../lib/format'
import { TYPE_LABEL, checkSummary } from '../lib/sourceSummary'
import { useNow } from '../lib/useNow'
import { SourceActions } from './SourceActions'
import { SourceCounts } from './SourceCounts'
import { Badge, ProgressBar } from './ui/Feedback'

export function SourceIcon({ type, className }: { type: SourceType; className?: string }) {
	const Icon = type === 'playlist' ? ListVideo : type === 'channel' ? Tv : Film
	return <Icon className={className} aria-hidden />
}

/** Cover art for the grid view: the first video's thumbnail, or a 2x2 collage once the source has four. */
function SourceCover({ source }: { source: Source }) {
	const thumbs = source.thumbnail_urls ?? []
	return (
		<div className="aspect-video w-full overflow-hidden rounded-lg bg-white/10">
			{thumbs.length >= 4 ? (
				<div className="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
					{thumbs.slice(0, 4).map((src) => (
						<img key={src} src={src} alt="" loading="lazy" className="size-full object-cover" />
					))}
				</div>
			) : thumbs.length > 0 ? (
				<img src={thumbs[0]} alt="" loading="lazy" className="size-full object-cover" />
			) : (
				<div className="flex size-full items-center justify-center text-faint">
					<SourceIcon type={source.source_type} className="size-10" />
				</div>
			)}
		</div>
	)
}

export function SourceCard({ source, layout = 'list' }: { source: Source; layout?: 'list' | 'grid' }) {
	const now = useNow()
	const navigate = useNavigate()
	const pct = source.video_count > 0 ? (source.downloaded_count / source.video_count) * 100 : 0

	if (layout === 'grid') {
		return (
			<article className="flex h-full flex-col gap-3 rounded-xl bg-surface p-3">
				<Link to={`/sources/${source.id}`} tabIndex={-1} aria-hidden>
					<SourceCover source={source} />
				</Link>
				<div className="flex items-start gap-3 px-1">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted">
						<SourceIcon type={source.source_type} className="size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<Link to={`/sources/${source.id}`} className="line-clamp-2 text-base font-medium hover:underline" title={source.title || source.url}>
							{source.title || source.url}
						</Link>
						{source.uploader && <p className="truncate text-sm text-muted">{source.uploader}</p>}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Badge>{TYPE_LABEL[source.source_type]}</Badge>
					{source.check_running && (
						<Badge tone="info">
							<Loader2 className="size-3 animate-spin" aria-hidden /> Checking
						</Badge>
					)}
					{!source.enabled && <Badge tone="warning">Paused</Badge>}
					{source.account && (
						<Badge>
							<UserRound className="size-3" aria-hidden /> {source.account_label ?? source.account}
						</Badge>
					)}
				</div>
				<div>
					<ProgressBar value={pct} label="Downloaded share" />
					<p className="mt-1.5 text-xs text-muted">
						<SourceCounts source={source} /> · {formatBytes(source.disk_bytes)}
					</p>
					<p className="mt-1 text-xs text-faint">{checkSummary(source, now)}</p>
				</div>
				<div className="mt-auto self-end">
					<SourceActions source={source} onDeleted={() => navigate('/sources')} />
				</div>
			</article>
		)
	}

	return (
		<article className="flex flex-col gap-4 rounded-xl bg-surface p-4 sm:flex-row sm:items-center">
			<div className="flex min-w-0 flex-1 items-start gap-4">
				<div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted">
					<SourceIcon type={source.source_type} className="size-5" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<Link to={`/sources/${source.id}`} className="min-w-0 truncate text-base font-medium hover:underline" title={source.title || source.url}>
							{source.title || source.url}
						</Link>
						<Badge>{TYPE_LABEL[source.source_type]}</Badge>
						{source.check_running && (
							<Badge tone="info">
								<Loader2 className="size-3 animate-spin" aria-hidden /> Checking
							</Badge>
						)}
						{!source.enabled && <Badge tone="warning">Paused</Badge>}
						{source.account && (
							<Badge>
								<UserRound className="size-3" aria-hidden /> {source.account_label ?? source.account}
							</Badge>
						)}
					</div>
					{source.uploader && <p className="truncate text-sm text-muted">{source.uploader}</p>}
					<div className="mt-2 flex items-center gap-3">
						<ProgressBar value={pct} className="max-w-48" label="Downloaded share" />
						<span className="text-xs text-muted">
							<SourceCounts source={source} /> · {formatBytes(source.disk_bytes)}
						</span>
					</div>
					<p className="mt-1 text-xs text-faint">{checkSummary(source, now)}</p>
				</div>
			</div>
			<div className="self-end sm:self-center">
				<SourceActions source={source} onDeleted={() => navigate('/sources')} />
			</div>
		</article>
	)
}
