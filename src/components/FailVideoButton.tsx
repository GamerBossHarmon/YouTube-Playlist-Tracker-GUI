import { Ban } from 'lucide-react'
import { useFailVideo } from '../api/queries'
import { Button, IconButton } from './ui/Button'
import { useToast } from './ui/toastContext'

/**
 * Stops retrying a video: a waiting one is marked failed at once, a downloading one is aborted
 * within moments. It can be retried afterwards from the Failed view or the video's page.
 */
export function FailVideoButton({ youtubeId, downloading = false, compact = false }: { youtubeId: string; downloading?: boolean; compact?: boolean }) {
	const fail = useFailVideo()
	const toast = useToast()

	const run = () =>
		fail.mutate(youtubeId, {
			onSuccess: () => toast.success(downloading ? 'Stopping the download. It will be marked as failed.' : 'Marked as failed. You can retry it later.'),
			onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not mark it as failed.'),
		})

	if (compact) {
		return (
			<IconButton label="Fail this video" variant="ghost" disabled={fail.isPending} onClick={run}>
				<Ban className="size-4" />
			</IconButton>
		)
	}
	return (
		<Button
			size="sm"
			variant="danger"
			icon={<Ban className="size-4" />}
			loading={fail.isPending}
			title={downloading ? 'Stop this download and mark it failed, without further retries' : 'Mark as failed, without downloading it'}
			onClick={run}
		>
			Fail
		</Button>
	)
}
