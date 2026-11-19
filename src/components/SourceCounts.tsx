import { AlertTriangle, XCircle } from 'lucide-react'
import type { Source } from '../api/types'
import { cn } from '../lib/cn'

/** "3 of 4 downloaded" plus loud chips for files gone from disk and downloads that gave up. */
export function SourceCounts({ source, className }: { source: Source; className?: string }) {
	const missing = source.missing_count ?? 0
	const failed = source.failed_count ?? 0
	return (
		<span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
			<span>
				{source.downloaded_count} of {source.video_count} downloaded
			</span>
			{missing > 0 && (
				<span
					className="inline-flex items-center gap-1 rounded-md bg-danger px-1.5 py-0.5 text-xs font-semibold text-black"
					title="Downloaded, but the file was not found on disk at the last check"
				>
					<AlertTriangle className="size-3" aria-hidden /> {missing} missing
				</span>
			)}
			{failed > 0 && (
				<span className="inline-flex items-center gap-1 rounded-md bg-warning/20 px-1.5 py-0.5 text-xs font-semibold text-warning" title="Gave up after repeated download failures">
					<XCircle className="size-3" aria-hidden /> {failed} failed
				</span>
			)}
		</span>
	)
}
