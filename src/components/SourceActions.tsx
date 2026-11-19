import { MoreVertical, RefreshCw, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useCheckSource, useUpdateSource } from '../api/queries'
import type { Source } from '../api/types'
import { DeleteSourceDialog, EditSourceDialog } from './SourceDialogs'
import { IconButton } from './ui/Button'
import { Switch } from './ui/Form'
import { Menu, MenuItem } from './ui/Menu'
import { useToast } from './ui/toastContext'

/** Enable switch + check-now + overflow menu (settings, stop tracking). Used on the card and the detail header. */
export function SourceActions({ source, onDeleted }: { source: Source; onDeleted?: () => void }) {
	const update = useUpdateSource(source.id)
	const check = useCheckSource()
	const toast = useToast()
	const [editing, setEditing] = useState(false)
	const [deleting, setDeleting] = useState(false)

	const checkNow = () =>
		check.mutate(source.id, {
			onSuccess: () => toast.info('Check started.'),
			onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not start the check.'),
		})

	return (
		<div className="flex items-center gap-1">
			<Switch
				checked={source.enabled}
				disabled={update.isPending}
				label={source.enabled ? 'Pause checking this source' : 'Resume checking this source'}
				onCheckedChange={(enabled) =>
					update.mutate(
						{ enabled },
						{ onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update the source.') },
					)
				}
			/>
			<IconButton label="Check now" onClick={checkNow} disabled={source.check_running || check.isPending}>
				<RefreshCw className={source.check_running ? 'size-4 animate-spin' : 'size-4'} />
			</IconButton>
			<Menu
				trigger={
					<IconButton label="More actions">
						<MoreVertical className="size-5" />
					</IconButton>
				}
			>
				<MenuItem icon={<Settings />} onSelect={() => setEditing(true)}>
					Settings
				</MenuItem>
				<MenuItem icon={<Trash2 />} danger onSelect={() => setDeleting(true)}>
					Stop tracking
				</MenuItem>
			</Menu>
			{/* Mounted only while open, so the form re-initialises from the current source each time. */}
			{editing && <EditSourceDialog source={source} open onOpenChange={setEditing} />}
			{deleting && <DeleteSourceDialog source={source} open onOpenChange={setDeleting} onDeleted={onDeleted} />}
		</div>
	)
}
