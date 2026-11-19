import { ChevronDown, ChevronRight, KeyRound, ListPlus, Plus, RefreshCw, Trash2, UserRound } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
	useAccountPlaylists,
	useAccounts,
	useAddAccount,
	useCreateSource,
	useDeleteAccount,
	useRefreshAccount,
	useReplaceCookies,
} from '../api/queries'
import type { Account } from '../api/types'
import { Button } from '../components/ui/Button'
import { EmptyState, ErrorState, Badge, Skeleton, Spinner } from '../components/ui/Feedback'
import { Field, Input } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/toastContext'

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Something went wrong.'
}

/** Reads a cookies.txt the user picked. The text goes to the API and is never shown again. */
function readFile(file: File): Promise<string> {
	return file.text()
}

// --- Add account ---------------------------------------------------------------------

function AddAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const add = useAddAccount()
	const toast = useToast()
	const [label, setLabel] = useState('')
	const [file, setFile] = useState<File | null>(null)
	const [error, setError] = useState<string | null>(null)

	const reset = () => {
		setLabel('')
		setFile(null)
		setError(null)
		add.reset()
	}

	const submit = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)
		if (!label.trim()) return setError('Give the account a name.')
		if (!file) return setError('Choose a cookies.txt file.')
		const cookies = await readFile(file)
		add.mutate(
			{ label: label.trim(), cookies },
			{
				onSuccess: (a) => {
					toast.success(`Added ${a.name}.`)
					reset()
					onOpenChange(false)
				},
				onError: (err) => setError(errorMessage(err)),
			},
		)
	}

	return (
		<Modal
			open={open}
			onOpenChange={(o) => {
				if (!o) reset()
				onOpenChange(o)
			}}
			title="Add an account"
			description="A second Google account ytpt can read private playlists from. It only reads by default; downloads use the primary account."
			footer={
				<>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="primary" type="submit" form="add-account-form" loading={add.isPending}>
						Add account
					</Button>
				</>
			}
		>
			<form id="add-account-form" noValidate onSubmit={submit} className="flex flex-col gap-4 pt-2 pb-3">
				<Field label="Name" hint="Just for you, e.g. “Family account”. ytpt also shows the YouTube channel name once it can read it.">
					{(props) => <Input {...props} autoFocus value={label} onChange={(e) => setLabel(e.target.value)} />}
				</Field>
				<Field label="cookies.txt" hint="Netscape format, exported while signed in to that account (a browser cookie-export extension works).">
					{(props) => <Input {...props} type="file" accept=".txt,text/plain" className="py-1.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
				</Field>
				{error && (
					<p role="alert" className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
						{error}
					</p>
				)}
			</form>
		</Modal>
	)
}

// --- Playlists an account can see ----------------------------------------------------

function AccountPlaylists({ account }: { account: Account }) {
	const playlists = useAccountPlaylists(account.id, true)
	const create = useCreateSource()
	const toast = useToast()
	const [pending, setPending] = useState<string | null>(null)

	const track = (url: string, title: string | null) => {
		setPending(url)
		create.mutate(
			{ url, source_type: 'playlist', account: account.is_primary ? undefined : account.id },
			{
				onSuccess: () => toast.success(`Tracking ${title ?? url}. The first check is running…`),
				onError: (err) => toast.error(errorMessage(err)),
				onSettled: () => {
					setPending(null)
					playlists.refetch()
				},
			},
		)
	}

	if (playlists.isPending) {
		return (
			<div className="flex justify-center py-6">
				<Spinner />
			</div>
		)
	}
	if (playlists.isError) {
		return (
			<p role="alert" className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">
				{errorMessage(playlists.error)}
			</p>
		)
	}
	if (playlists.data.length === 0) return <p className="py-3 text-sm text-muted">No playlists found for this account.</p>

	return (
		<ul className="flex flex-col divide-y divide-line">
			{playlists.data.map((p) => (
				<li key={p.playlist_id} className="flex items-center gap-3 py-2.5">
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">{p.title || p.playlist_id}</p>
						{p.video_count != null && <p className="text-xs text-muted">{p.video_count} videos</p>}
					</div>
					{p.source_id != null ? (
						<Link to={`/sources/${p.source_id}`} className="text-sm text-accent hover:underline">
							Tracked
						</Link>
					) : (
						<Button size="sm" icon={<ListPlus className="size-4" />} loading={pending === p.url} onClick={() => track(p.url, p.title)}>
							Track
						</Button>
					)}
				</li>
			))}
		</ul>
	)
}

// --- One account ---------------------------------------------------------------------

function AccountCard({ account }: { account: Account }) {
	const [open, setOpen] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const fileRef = useRef<HTMLInputElement>(null)
	const refresh = useRefreshAccount(account.id)
	const replace = useReplaceCookies(account.id)
	const del = useDeleteAccount()
	const toast = useToast()

	const onPickFile = async (file: File | undefined) => {
		if (!file) return
		replace.mutate(await readFile(file), {
			onSuccess: () => toast.success('Cookies replaced.'),
			onError: (err) => toast.error(errorMessage(err)),
		})
	}

	const status =
		!account.present ? (
			<Badge tone="warning">No cookies</Badge>
		) : account.logged_in === true ? (
			<Badge tone="success">Signed in</Badge>
		) : account.logged_in === false ? (
			<Badge tone="danger">Signed out: cookies expired</Badge>
		) : (
			<Badge>Status unknown</Badge>
		)

	return (
		<li className="rounded-xl border border-line bg-surface p-4">
			<div className="flex flex-wrap items-center gap-3">
				<UserRound className="size-8 shrink-0 text-muted" aria-hidden />
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="truncate text-base font-medium">{account.name}</h2>
						<Badge tone={account.is_primary ? 'info' : 'neutral'}>{account.is_primary ? 'Primary (downloads)' : 'Read-only'}</Badge>
						{status}
					</div>
					<p className="truncate text-sm text-muted">
						{[account.handle, account.display_name && account.label !== account.display_name ? `“${account.label}”` : null, `${account.source_count} ${account.source_count === 1 ? 'source' : 'sources'}`]
							.filter(Boolean)
							.join(' · ')}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button size="sm" icon={<RefreshCw className="size-4" />} loading={refresh.isPending} onClick={() => refresh.mutate()} title="Check who this is and whether the cookies still work">
						Refresh
					</Button>
					<Button size="sm" icon={<KeyRound className="size-4" />} loading={replace.isPending} onClick={() => fileRef.current?.click()}>
						Replace cookies
					</Button>
					<input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={(e) => { void onPickFile(e.target.files?.[0]); e.target.value = '' }} />
					{!account.is_primary && (
						<Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
							Remove
						</Button>
					)}
				</div>
			</div>

			{account.present && (
				<div className="mt-3 border-t border-line pt-3">
					<button type="button" className="flex cursor-pointer items-center gap-1.5 text-sm font-medium" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
						{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
						Browse this account&apos;s playlists
					</button>
					{open && (
						<div className="mt-2">
							<AccountPlaylists account={account} />
						</div>
					)}
				</div>
			)}

			<Modal
				open={confirmDelete}
				onOpenChange={setConfirmDelete}
				title={`Remove ${account.name}?`}
				description="Its cookies are deleted. Sources it was reading switch to the primary account (a private playlist may then fail to check)."
				footer={
					<>
						<Button variant="ghost" onClick={() => setConfirmDelete(false)}>
							Cancel
						</Button>
						<Button
							variant="danger"
							loading={del.isPending}
							onClick={() =>
								del.mutate(account.id, {
									onSuccess: () => toast.success('Account removed.'),
									onError: (err) => toast.error(errorMessage(err)),
								})
							}
						>
							Remove
						</Button>
					</>
				}
			>
				<p className="pb-3 text-sm text-muted">Nothing you already downloaded is touched.</p>
			</Modal>
		</li>
	)
}

// --- Page ----------------------------------------------------------------------------

export function AccountsPage() {
	const accounts = useAccounts()
	const [adding, setAdding] = useState(false)

	return (
		<div className="mx-auto max-w-4xl">
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Accounts</h1>
					<p className="text-sm text-muted">The primary account downloads. Extra accounts are read-only: they let ytpt see private playlists and offer playlists to track.</p>
				</div>
				<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
					Add account
				</Button>
			</div>

			{accounts.isPending ? (
				<div className="flex flex-col gap-3" aria-busy="true">
					{[0, 1].map((i) => (
						<Skeleton key={i} className="h-24 rounded-xl" />
					))}
				</div>
			) : accounts.isError ? (
				<ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
			) : accounts.data.length === 0 ? (
				<EmptyState icon={<UserRound />} title="No accounts">
					Add a cookies.txt to use a YouTube account.
				</EmptyState>
			) : (
				<ul className="flex flex-col gap-3">
					{accounts.data.map((a) => (
						<AccountCard key={a.id} account={a} />
					))}
				</ul>
			)}
			<AddAccountDialog open={adding} onOpenChange={setAdding} />
		</div>
	)
}
