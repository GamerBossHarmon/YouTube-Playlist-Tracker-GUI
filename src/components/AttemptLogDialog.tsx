import { useAttemptLog } from '../api/queries'
import { Button } from './ui/Button'
import { ErrorState, Spinner } from './ui/Feedback'
import { Modal } from './ui/Modal'

/** Verbose yt-dlp output for one download attempt. */
export function AttemptLogDialog({ attemptId, onClose }: { attemptId: number | null; onClose: () => void }) {
	const { data, isLoading, error, refetch } = useAttemptLog(attemptId)
	return (
		<Modal
			open={attemptId !== null}
			onOpenChange={(o) => !o && onClose()}
			title="Download attempt log"
			description={attemptId !== null ? `Attempt #${attemptId} — verbose yt-dlp output` : undefined}
			wide
			footer={
				<>
					<Button
						variant="ghost"
						disabled={!data}
						onClick={() => data && navigator.clipboard?.writeText(data)}
					>
						Copy
					</Button>
					<Button variant="primary" onClick={onClose}>
						Close
					</Button>
				</>
			}
		>
			<div className="pb-3">
				{isLoading ? (
					<div className="flex justify-center py-10">
						<Spinner />
					</div>
				) : error ? (
					<ErrorState error={error} onRetry={() => refetch()} />
				) : (
					<pre className="max-h-[60vh] overflow-auto rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-muted">{data || '(empty log)'}</pre>
				)}
			</div>
		</Modal>
	)
}
