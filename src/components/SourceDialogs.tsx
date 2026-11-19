import { useState, type FormEvent } from 'react'
import { useCreateSource, useDeleteSource, useSystem, useUpdateSource } from '../api/queries'
import type { Source, SourceCreate, SourceType, SourceUpdate } from '../api/types'
import { formatInterval, secondsToInterval } from '../lib/format'
import { defaultCheckInterval } from '../lib/labels'
import { intervalSeconds, type IntervalValue } from '../lib/interval'
import { AccountSelect } from './AccountSelect'
import { IntervalField } from './IntervalField'
import { Button } from './ui/Button'
import { Field, Input, Select } from './ui/Form'
import { Modal } from './ui/Modal'
import { useToast } from './ui/toastContext'

const BLANK_INTERVAL: IntervalValue = { value: '', unit: 'hours' }

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Something went wrong.'
}

// --- Add -------------------------------------------------------------------------

export function AddSourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const { data: system } = useSystem()
	const create = useCreateSource()
	const toast = useToast()

	const [url, setUrl] = useState('')
	const [type, setType] = useState<'auto' | SourceType>('auto')
	const [interval, setInterval_] = useState<IntervalValue>(BLANK_INTERVAL)
	const [dataDir, setDataDir] = useState('')
	const [account, setAccount] = useState('primary')
	const [urlError, setUrlError] = useState<string | null>(null)
	const [intervalError, setIntervalError] = useState<string | null>(null)
	const [formError, setFormError] = useState<string | null>(null)

	const reset = () => {
		setUrl('')
		setType('auto')
		setInterval_(BLANK_INTERVAL)
		setDataDir('')
		setAccount('primary')
		setUrlError(null)
		setIntervalError(null)
		setFormError(null)
		create.reset()
	}

	const submit = (e: FormEvent) => {
		e.preventDefault()
		setFormError(null)
		const trimmed = url.trim()
		const seconds = intervalSeconds(interval)
		const badUrl = !/^https?:\/\//i.test(trimmed)
		setUrlError(badUrl ? 'Enter a full URL starting with http:// or https://' : null)
		setIntervalError(seconds === 'invalid' ? 'Enter a whole number greater than 0, or leave blank.' : null)
		if (badUrl || seconds === 'invalid') return

		// Only send what was actually filled in: omitted == null == "use the global setting".
		const body: SourceCreate = { url: trimmed }
		if (type !== 'auto') body.source_type = type
		if (seconds !== null) body.check_interval_seconds = seconds
		if (dataDir.trim()) body.data_dir = dataDir.trim()
		if (account !== 'primary') body.account = account

		create.mutate(body, {
			onSuccess: (source) => {
				toast.success(`Added ${source.url}. The first check is running…`)
				reset()
				onOpenChange(false)
			},
			onError: (err) => setFormError(errorMessage(err)),
		})
	}

	return (
		<Modal
			open={open}
			onOpenChange={(o) => {
				if (!o) reset()
				onOpenChange(o)
			}}
			title="Add a source"
			description="Track a YouTube playlist, channel or single video. ytpt checks it regularly and archives what it finds."
			footer={
				<>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="primary" type="submit" form="add-source-form" loading={create.isPending}>
						Add source
					</Button>
				</>
			}
		>
			<form id="add-source-form" noValidate onSubmit={submit} className="flex flex-col gap-4 pt-2 pb-3">
				<Field label="URL" error={urlError} hint="A playlist, channel (@name) or video link.">
					{(props) => (
						<Input {...props} autoFocus type="url" placeholder="https://www.youtube.com/playlist?list=…" value={url} onChange={(e) => setUrl(e.target.value)} />
					)}
				</Field>

				<Field label="Type" hint="Auto-detected from the URL unless you pick one.">
					{(props) => (
						<Select {...props} value={type} onChange={(e) => setType(e.target.value as 'auto' | SourceType)}>
							<option value="auto">Auto-detect</option>
							<option value="playlist">Playlist</option>
							<option value="channel">Channel</option>
							<option value="video">Single video</option>
						</Select>
					)}
				</Field>

				<AccountSelect value={account} onChange={setAccount} />

				<details className="rounded-lg border border-line p-3">
					<summary className="cursor-pointer text-sm font-medium select-none">Advanced</summary>
					<div className="mt-3 flex flex-col gap-4">
						<IntervalField value={interval} onChange={setInterval_} defaultLabel={formatInterval(defaultCheckInterval(system))} error={intervalError} />
						<Field label="Download folder" hint="Leave blank to use the default data folder.">
							{(props) => <Input {...props} placeholder="Default" value={dataDir} onChange={(e) => setDataDir(e.target.value)} />}
						</Field>
					</div>
				</details>

				{formError && (
					<p role="alert" className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
						{formError}
					</p>
				)}
			</form>
		</Modal>
	)
}

// --- Edit ------------------------------------------------------------------------

export function EditSourceDialog({ source, open, onOpenChange }: { source: Source; open: boolean; onOpenChange: (open: boolean) => void }) {
	const { data: system } = useSystem()
	const update = useUpdateSource(source.id)
	const toast = useToast()

	const initialInterval: IntervalValue = source.check_interval_seconds
		? (() => {
			const { value, unit } = secondsToInterval(source.check_interval_seconds)
			return { value: String(value), unit }
		})()
		: BLANK_INTERVAL
	const [interval, setInterval_] = useState<IntervalValue>(initialInterval)
	const [dataDir, setDataDir] = useState(source.data_dir ?? '')
	const [account, setAccount] = useState(source.account ?? 'primary')
	const [intervalError, setIntervalError] = useState<string | null>(null)
	const [formError, setFormError] = useState<string | null>(null)

	const submit = (e: FormEvent) => {
		e.preventDefault()
		setFormError(null)
		const seconds = intervalSeconds(interval)
		if (seconds === 'invalid') {
			setIntervalError('Enter a whole number greater than 0, or leave blank.')
			return
		}
		setIntervalError(null)

		// PATCH only what changed; an explicit null clears a per-source override back to the global default.
		const changes: SourceUpdate = {}
		if (seconds !== source.check_interval_seconds) changes.check_interval_seconds = seconds
		const newDir = dataDir.trim() || null
		if (newDir !== (source.data_dir ?? null)) changes.data_dir = newDir
		if (account !== (source.account ?? 'primary')) changes.account = account
		if (Object.keys(changes).length === 0) {
			onOpenChange(false)
			return
		}
		update.mutate(changes, {
			onSuccess: () => {
				toast.success('Source settings saved.')
				onOpenChange(false)
			},
			onError: (err) => setFormError(errorMessage(err)),
		})
	}

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Source settings"
			description={source.title || source.url}
			footer={
				<>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="primary" type="submit" form="edit-source-form" loading={update.isPending}>
						Save
					</Button>
				</>
			}
		>
			<form id="edit-source-form" noValidate onSubmit={submit} className="flex flex-col gap-4 pt-2 pb-3">
				<AccountSelect value={account} onChange={setAccount} />
				<IntervalField value={interval} onChange={setInterval_} defaultLabel={formatInterval(defaultCheckInterval(system))} error={intervalError} />
				<Field label="Download folder" hint="Applies to future downloads only; files already downloaded are not moved. Blank = default data folder.">
					{(props) => <Input {...props} placeholder="Default" value={dataDir} onChange={(e) => setDataDir(e.target.value)} />}
				</Field>
				{formError && (
					<p role="alert" className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
						{formError}
					</p>
				)}
			</form>
		</Modal>
	)
}

// --- Delete ----------------------------------------------------------------------

export function DeleteSourceDialog({ source, open, onOpenChange, onDeleted }: { source: Source; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void }) {
	const del = useDeleteSource()
	const toast = useToast()

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title="Stop tracking this source?"
			description={source.title || source.url}
			footer={
				<>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant="danger"
						loading={del.isPending}
						onClick={() =>
							del.mutate(source.id, {
								onSuccess: () => {
									toast.success('Source removed. Your downloaded videos were kept.')
									onOpenChange(false)
									onDeleted?.()
								},
								onError: (err) => toast.error(errorMessage(err)),
							})
						}
					>
						Stop tracking
					</Button>
				</>
			}
		>
			<p className="pb-3 text-sm text-muted">
				ytpt will no longer check this source. <strong className="text-fg">Nothing is deleted from disk</strong>: videos you already archived are kept, and any that no other source contains
				appear under <em>Orphaned</em>.
			</p>
		</Modal>
	)
}
