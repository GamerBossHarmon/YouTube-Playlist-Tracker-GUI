import { Loader2 } from 'lucide-react'
import { dismissRestartNotice, useRestartPhase } from '../lib/restartStore'
import { Modal } from './ui/Modal'

/** Covers the app while ytpt restarts, so nobody clicks around a half-gone API. */
export function RestartOverlay() {
	const phase = useRestartPhase()
	if (phase === 'idle') return null
	return (
		<Modal
			open
			onOpenChange={(open) => {
				if (!open) dismissRestartNotice() // only has an effect once it has timed out; until then the overlay stays
			}}
			title={phase === 'restarting' ? 'Restarting ytpt…' : 'ytpt has not come back yet'}
		>
			{phase === 'restarting' ? (
				<p className="flex items-center gap-3 pb-4 text-sm text-muted">
					<Loader2 className="size-5 animate-spin" aria-hidden /> Waiting for the API to answer again. This continues by itself.
				</p>
			) : (
				<p className="pb-4 text-sm text-muted">
					The API did not answer for two minutes. If ytpt runs in a terminal, look there for errors; under Docker, check <code>docker logs</code>. The app reconnects by itself once ytpt is back.
				</p>
			)}
		</Modal>
	)
}
