import { ChevronDown, UserRound, Zap } from 'lucide-react'
import { useAccounts, useDownloadNow } from '../api/queries'
import { Button, IconButton } from './ui/Button'
import { Menu, MenuItem } from './ui/Menu'
import { useToast } from './ui/toastContext'

/**
 * Puts one video at the front of the queue and skips the pause before the next download.
 * When extra accounts exist, a small menu offers a one-time "download with this account"
 * (e.g. a members-only video only a side account can open).
 */
export function DownloadNowButton({
	youtubeId,
	size = 'sm',
	variant = 'secondary',
}: {
	youtubeId: string
	size?: 'sm' | 'md'
	variant?: 'primary' | 'secondary'
}) {
	const downloadNow = useDownloadNow()
	const { data: accounts } = useAccounts()
	const toast = useToast()
	const others = (accounts ?? []).filter((a) => !a.is_primary && a.present)

	const start = (account?: string, accountName?: string) =>
		downloadNow.mutate(
			{ id: youtubeId, account },
			{
				onSuccess: () => toast.success(accountName ? `Moved to the top. Downloading shortly with ${accountName}.` : 'Moved to the top. Downloading shortly.'),
				onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not start the download.'),
			},
		)

	return (
		<span className="inline-flex items-center gap-1">
			<Button size={size} variant={variant} icon={<Zap className="size-4" />} loading={downloadNow.isPending} title="Move to the top of the queue and skip the wait" onClick={() => start()}>
				Download now
			</Button>
			{others.length > 0 && (
				<Menu
					trigger={
						<IconButton label="Download with a different account" variant={variant === 'primary' ? 'secondary' : 'ghost'} disabled={downloadNow.isPending}>
							<ChevronDown className="size-4" />
						</IconButton>
					}
				>
					<p className="px-3 py-1.5 text-xs text-muted">Download this video once with…</p>
					{others.map((a) => (
						<MenuItem key={a.id} icon={<UserRound />} onSelect={() => start(a.id, a.name)}>
							{a.name}
						</MenuItem>
					))}
				</Menu>
			)}
		</span>
	)
}
