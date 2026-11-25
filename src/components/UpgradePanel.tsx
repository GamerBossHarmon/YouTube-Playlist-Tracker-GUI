import { ArrowRight, CheckCircle2, Clock, Download, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useAcceptUpgrade, useDiscardUpgrade, useUpgrade } from '../api/queries'
import type { Upgrade, VideoDetail } from '../api/types'
import { formatBytes, formatEta, formatSpeed } from '../lib/format'
import { codecsLabel, resolutionLabel, upgradeVerdict } from '../lib/videoFormat'
import { useProgress } from '../live/progressStore'
import { Button } from './ui/Button'
import { ProgressBar } from './ui/Feedback'
import { Modal } from './ui/Modal'
import { useToast } from './ui/toastContext'

function Row({ label, now, next }: { label: string; now: string; next: string }) {
	const changed = now !== next
	return (
		<tr className="border-t border-line">
			<th scope="row" className="py-2 pr-3 text-left text-xs font-normal text-muted">
				{label}
			</th>
			<td className="py-2 pr-3">{now}</td>
			<td className={changed ? 'py-2 font-medium text-fg' : 'py-2 text-muted'}>{next}</td>
		</tr>
	)
}

function Compare({ video, upgrade }: { video: VideoDetail; upgrade: Upgrade }) {
	const toast = useToast()
	const accept = useAcceptUpgrade(video.youtube_id)
	const discard = useDiscardUpgrade(video.youtube_id)
	const [confirming, setConfirming] = useState(false)
	const busy = accept.isPending || discard.isPending

	const sizeNow = formatBytes(video.file_size_bytes)
	const sizeNext = formatBytes(upgrade.file_size_bytes)

	return (
		<section aria-labelledby="upgrade-title" className="mt-5 rounded-xl border border-accent/40 bg-accent/5 p-4">
			<h2 id="upgrade-title" className="flex items-center gap-2 text-base font-medium">
				<CheckCircle2 className="size-5 text-success" aria-hidden /> New version ready
			</h2>
			<p className="mt-1 text-sm text-muted">
				{upgradeVerdict(video, upgrade)} The player above is the current video, the one below is the newly downloaded video. Please pick witch one to keep, and witch one to discard.
			</p>

			<div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
				<video key={upgrade.media_url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black" aria-label="New version">
					<source src={upgrade.media_url ?? undefined} />
				</video>
				<div className="min-w-0">
					<table className="w-full text-sm">
						<thead>
							<tr>
								<th className="sr-only">Property</th>
								<th scope="col" className="pb-1 pr-3 text-left text-xs font-normal text-muted">
									Current
								</th>
								<th scope="col" className="pb-1 text-left text-xs font-normal text-muted">
									New
								</th>
							</tr>
						</thead>
						<tbody>
							<Row label="Resolution" now={resolutionLabel(video) ?? 'unknown'} next={resolutionLabel(upgrade) ?? 'unknown'} />
							<Row label="Codecs" now={codecsLabel(video) ?? 'unknown'} next={codecsLabel(upgrade) ?? 'unknown'} />
							<Row label="Container" now={video.ext?.toUpperCase() ?? 'unknown'} next={upgrade.ext?.toUpperCase() ?? 'unknown'} />
							<Row label="Size" now={sizeNow} next={sizeNext} />
						</tbody>
					</table>
					<div className="mt-4 flex flex-wrap gap-2">
						<Button variant="primary" icon={<ArrowRight className="size-4" />} disabled={busy} onClick={() => setConfirming(true)}>
							Replace with the new file
						</Button>
						<Button
							icon={<Trash2 className="size-4" />}
							loading={discard.isPending}
							disabled={busy}
							onClick={() =>
								discard.mutate(undefined, {
									onSuccess: () => toast.info('Discarded the new file. Your original was kept.'),
									onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not discard.'),
								})
							}
						>
							Keep current, discard new
						</Button>
					</div>
				</div>
			</div>

			<Modal
				open={confirming}
				onOpenChange={setConfirming}
				title="Replace the current file?"
				description="The current file, with its thumbnail, subtitles and info file, is deleted for good and the new one takes its place. This cannot be undone."
				footer={
					<>
						<Button variant="ghost" onClick={() => setConfirming(false)}>
							Not yet
						</Button>
						<Button
							variant="danger"
							loading={accept.isPending}
							onClick={() =>
								accept.mutate(undefined, {
									onSuccess: () => {
										setConfirming(false)
										toast.success('Replaced with the new file.')
									},
									onError: (err) => {
										setConfirming(false)
										toast.error(err instanceof Error ? err.message : 'Could not replace the file.')
									},
								})
							}
						>
							Delete the old file and replace
						</Button>
					</>
				}
			>
				<p className="text-sm text-muted">
					{resolutionLabel(video) ?? 'Current'} ({sizeNow}) → {resolutionLabel(upgrade) ?? 'new'} ({sizeNext})
				</p>
			</Modal>
		</section>
	)
}

function Waiting({ video, upgrade }: { video: VideoDetail; upgrade: Upgrade }) {
	const toast = useToast()
	const progress = useProgress(video.youtube_id)
	const cancel = useDiscardUpgrade(video.youtube_id)
	const downloading = upgrade.status === 'downloading'
	const live = progress ?? (upgrade.progress ? { ...upgrade.progress } : undefined)

	return (
		<section aria-labelledby="upgrade-title" className="mt-5 rounded-xl bg-surface p-4">
			<h2 id="upgrade-title" className="flex items-center gap-2 text-base font-medium">
				{downloading ? <Download className="size-5 text-accent" aria-hidden /> : <Clock className="size-5 text-muted" aria-hidden />}
				{downloading ? 'Downloading the new version…' : 'Upgrade queued'}
			</h2>
			<p className="mt-1 text-sm text-muted">
				{upgrade.format_id ? `Format ${upgrade.format_id}` : upgrade.target_height ? `Up to ${upgrade.target_height}p` : 'Best available quality'}
				{downloading ? '. Both versions will stays on disk until the new version is approved.' : '. Download will starts when the download worker is free.'}
			</p>
			{downloading && (
				<div className="mt-3 max-w-md">
					<ProgressBar value={live?.percent ?? null} label="Upgrade download progress" />
					<p className="mt-2 text-xs text-muted tabular-nums">
						{live?.percent != null ? `${Math.round(live.percent)}%` : 'Starting'}
						{live?.downloaded_bytes != null && ` · ${formatBytes(live.downloaded_bytes)}${live.total_bytes ? ` of ${formatBytes(live.total_bytes)}` : ''}`}
						{live?.speed_bytes_per_sec != null && ` · ${formatSpeed(live.speed_bytes_per_sec)}`}
						{live?.eta_seconds != null && ` · ${formatEta(live.eta_seconds)} left`}
					</p>
				</div>
			)}
			<div className="mt-3">
				<Button
					size="sm"
					variant="danger"
					loading={cancel.isPending}
					onClick={() =>
						cancel.mutate(undefined, {
							onSuccess: () => toast.info('Upgrade cancelled.'),
							onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not cancel.'),
						})
					}
				>
					Cancel upgrade
				</Button>
			</div>
		</section>
	)
}

function Failed({ video, upgrade, onRetry }: { video: VideoDetail; upgrade: Upgrade; onRetry: () => void }) {
	const dismiss = useDiscardUpgrade(video.youtube_id)
	return (
		<section aria-labelledby="upgrade-title" className="mt-5 rounded-xl bg-danger/10 p-4">
			<h2 id="upgrade-title" className="flex items-center gap-2 text-base font-medium text-danger">
				<XCircle className="size-5" aria-hidden /> The upgrade download failed
			</h2>
			<p className="mt-1 max-w-3xl text-sm break-words whitespace-pre-wrap text-muted">{upgrade.error_message ?? 'Unknown error.'}</p>
			<p className="mt-1 text-xs text-faint">Your current file was not touched.</p>
			<div className="mt-3 flex gap-2">
				<Button size="sm" variant="primary" onClick={onRetry}>
					Try another quality
				</Button>
				<Button size="sm" loading={dismiss.isPending} onClick={() => dismiss.mutate()}>
					Dismiss
				</Button>
			</div>
		</section>
	)
}

/** The video page's view of its quality upgrade: waiting, downloading, failed, or ready to compare. */
export function UpgradePanel({ video, onRetry }: { video: VideoDetail; onRetry: () => void }) {
	const upgrade = useUpgrade(video.youtube_id)
	if (!upgrade.data) return null
	const u = upgrade.data
	if (u.status === 'ready') return <Compare video={video} upgrade={u} />
	if (u.status === 'failed') return <Failed video={video} upgrade={u} onRetry={onRetry} />
	return <Waiting video={video} upgrade={u} />
}
