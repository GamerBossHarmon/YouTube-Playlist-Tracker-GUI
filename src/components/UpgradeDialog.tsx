import { Info } from 'lucide-react'
import { useState } from 'react'
import { useRequestUpgrade, useVideoFormats } from '../api/queries'
import type { FormatOption, VideoDetail } from '../api/types'
import { cn } from '../lib/cn'
import { formatBytes } from '../lib/format'
import { codecsLabel, describeFormat, qualityHeight, resolutionLabel } from '../lib/videoFormat'
import { Button } from './ui/Button'
import { ErrorState, Spinner } from './ui/Feedback'
import { Modal } from './ui/Modal'
import { useToast } from './ui/toastContext'

const PRESETS: Array<{ height: number | null; label: string }> = [
	{ height: 480, label: 'Up to 480p' },
	{ height: 720, label: 'Up to 720p (HD)' },
	{ height: 1080, label: 'Up to 1080p (Full HD)' },
	{ height: 1440, label: 'Up to 1440p (2K)' },
	{ height: 2160, label: 'Up to 2160p (4K)' },
	{ height: null, label: 'Best available' },
]

function optionLabel(o: FormatOption): string {
	const res = resolutionLabel(o) ?? o.note ?? o.format_id
	const bits = [res, codecsLabel({ vcodec: o.vcodec }), o.ext?.toUpperCase(), o.filesize_bytes ? `~${formatBytes(o.filesize_bytes)}` : null]
	return bits.filter(Boolean).join(' · ')
}

function Choice({ selected, onSelect, children, hint }: { selected: boolean; onSelect: () => void; children: React.ReactNode; hint?: string }) {
	return (
		<label
			className={cn(
				'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
				selected ? 'border-accent bg-accent/10' : 'border-line hover:bg-surface',
			)}
		>
			<input type="radio" name="upgrade-choice" checked={selected} onChange={onSelect} className="accent-[var(--color-accent)]" />
			<span className="min-w-0 flex-1">{children}</span>
			{hint && <span className="shrink-0 text-xs text-faint">{hint}</span>}
		</label>
	)
}

/**
 * Pick a different quality and queue a re-download. The new file is downloaded next to the
 * current one and nothing is replaced until it has been compared and confirmed on the video page.
 */
export function UpgradeDialog({ video, open, onOpenChange }: { video: VideoDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
	const toast = useToast()
	const request = useRequestUpgrade(video.youtube_id)
	const [height, setHeight] = useState<number | null>(1080)
	const [showAll, setShowAll] = useState(false)
	const [formatId, setFormatId] = useState<string | null>(null)
	const formats = useVideoFormats(video.youtube_id, open && showAll)

	const current = qualityHeight(video)
	const currentText = describeFormat(video) || 'format unknown'

	const submit = () =>
		request.mutate(
			formatId ? { format_id: formatId } : { target_height: height },
			{
				onSuccess: () => {
					toast.success('Upgrade queued. Your current file stays until you approve the new one.')
					onOpenChange(false)
				},
				onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not queue the upgrade.'),
			},
		)

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Re-download in another quality"
			description="The new file is downloaded next to the current one. Nothing is replaced until you have compared them and said so."
			footer={
				<>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="primary" loading={request.isPending} onClick={submit}>
						Start download
					</Button>
				</>
			}
		>
			<p className="mb-3 text-sm text-muted">
				Current file: <span className="font-medium text-fg">{currentText}</span>
				{video.file_size_bytes != null && <> · {formatBytes(video.file_size_bytes)}</>}
			</p>

			<div role="radiogroup" aria-label="Quality" className="flex flex-col gap-2">
				{PRESETS.map((p) => (
					<Choice
						key={p.label}
						selected={!formatId && height === p.height}
						onSelect={() => {
							setFormatId(null)
							setHeight(p.height)
						}}
						hint={p.height != null && current != null && p.height <= current ? 'not higher than now' : undefined}
					>
						{p.label}
					</Choice>
				))}
			</div>
			<p className="mt-2 flex items-start gap-2 text-xs text-faint">
				<Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
				<span>If YouTube has nothing sharper than your current file, you will see that when comparing and can discard the new one.</span>
			</p>

			<div className="mt-4 border-t border-line pt-3">
				<button type="button" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} className="cursor-pointer text-sm font-medium text-muted hover:text-fg">
					{showAll ? 'Hide the full format list' : 'Show every format YouTube offers…'}
				</button>
				{showAll && (
					<div className="mt-3">
						{formats.isPending && (
							<div className="flex items-center gap-2 text-sm text-muted">
								<Spinner /> Asking YouTube…
							</div>
						)}
						{formats.isError && <ErrorState error={formats.error} onRetry={() => formats.refetch()} title="Could not list the formats" />}
						{formats.data && (
							<div role="radiogroup" aria-label="Specific format" className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
								{formats.data.formats.length === 0 && <p className="text-sm text-muted">YouTube did not list any video formats.</p>}
								{formats.data.formats.map((o) => (
									<Choice key={o.format_id} selected={formatId === o.format_id} onSelect={() => setFormatId(o.format_id)} hint={o.acodec ? 'has audio' : 'audio is merged in'}>
										{optionLabel(o)}
									</Choice>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</Modal>
	)
}
