import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, PackageCheck, Power, Settings } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useRequestRestart, useSystem, useUpdateYtdlp } from '../api/queries'
import type { SystemInfo, YtdlpUpdate } from '../api/types'
import { Button } from '../components/ui/Button'
import { Badge, ErrorState, Spinner } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/toastContext'
import { formatBytes } from '../lib/format'
import { useRestartPhase, watchRestart } from '../lib/restartStore'

function Card({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="rounded-xl bg-surface p-4">
			<h2 className="mb-3 text-base font-medium">{title}</h2>
			{children}
		</section>
	)
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-2 text-sm first:border-t-0 first:pt-0">
			<dt className="text-muted">{label}</dt>
			<dd className="text-right">{children}</dd>
		</div>
	)
}

function updateMessage(r: YtdlpUpdate): { tone: 'ok' | 'error'; text: string } {
	if (!r.success) return { tone: 'error', text: r.error_message ?? 'The update failed.' }
	if (r.upgraded) return { tone: 'ok', text: `Updated yt-dlp ${r.old_version} → ${r.new_version}. Restart ytpt to start using it.` }
	return { tone: 'ok', text: `yt-dlp is already up to date (${r.new_version ?? r.old_version}).` }
}

function Actions({ system }: { system: SystemInfo }) {
	const toast = useToast()
	const qc = useQueryClient()
	const update = useUpdateYtdlp()
	const restart = useRequestRestart()
	const phase = useRestartPhase()
	const [result, setResult] = useState<YtdlpUpdate | null>(null)
	const [confirming, setConfirming] = useState(false)

	const runUpdate = () =>
		update.mutate(undefined, {
			onSuccess: (r) => {
				setResult(r)
				const m = updateMessage(r)
				if (m.tone === 'ok') toast.success(m.text)
				else toast.error(m.text)
			},
			onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update yt-dlp.'),
		})

	const runRestart = () =>
		restart.mutate(system.download_in_progress, {
			onSuccess: () => {
				setConfirming(false)
				// The wait lives in a store (not this component): the page unmounts while the API is down.
				void watchRestart(() => {
					void qc.invalidateQueries() // everything may have changed (interrupted download reset, new yt-dlp loaded)
					toast.success('ytpt restarted.')
				})
			},
			onError: (err) => {
				setConfirming(false)
				toast.error(err instanceof Error ? err.message : 'Could not restart.')
			},
		})

	const restartNeeded = system.ytdlp_restart_required
	const message = result ? updateMessage(result) : null

	return (
		<>
			<Card title="yt-dlp">
				<dl>
					<Fact label="Running">{system.ytdlp_version}</Fact>
					<Fact label="Installed on disk">
						{system.ytdlp_installed_version ?? 'unknown'}
						{restartNeeded && (
							<Badge tone="warning" className="ml-2">
								restart needed
							</Badge>
						)}
					</Fact>
					<Fact label="Automatic updates">{system.ytdlp_auto_update ? 'On (checked every few hours)' : 'Off'}</Fact>
				</dl>
				<p className="mt-3 text-xs text-muted">
					YouTube changes often and breaks old yt-dlp versions. An update is installed straight away, but ytpt keeps using the old version until it restarts.
				</p>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<Button
						variant="primary"
						icon={<PackageCheck className="size-4" />}
						loading={update.isPending}
						disabled={system.download_in_progress}
						title={system.download_in_progress ? 'A download is running; updating waits until it finishes' : undefined}
						onClick={runUpdate}
					>
						Update yt-dlp
					</Button>
					{system.download_in_progress && <span className="text-xs text-muted">A download is running. Updating is paused until it ends.</span>}
				</div>
				{message && (
					<p role="status" className={message.tone === 'ok' ? 'mt-3 flex items-start gap-2 text-sm text-success' : 'mt-3 text-sm text-danger'}>
						{message.tone === 'ok' && <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
						<span className="break-words">{message.text}</span>
					</p>
				)}
			</Card>

			<Card title="Restart">
				<p className="text-sm text-muted">
					Restarts the whole of ytpt: checks, downloads and this API. The page comes back by itself in a few seconds.
					{restartNeeded && <strong className="text-warning"> A new yt-dlp is waiting for it.</strong>}
				</p>
				{!system.restart_supported && <p className="mt-2 text-xs text-faint">This ytpt process cannot restart itself (it was not started with <code>ytpt run</code>).</p>}
				<div className="mt-3">
					<Button
						variant={restartNeeded ? 'primary' : 'secondary'}
						icon={<Power className="size-4" />}
						disabled={!system.restart_supported || phase === 'restarting'}
						onClick={() => setConfirming(true)}
					>
						Restart ytpt
					</Button>
				</div>
			</Card>

			<Modal
				open={confirming}
				onOpenChange={setConfirming}
				title="Restart ytpt?"
				description="Checking and downloading pause for a few seconds while it restarts."
				footer={
					<>
						<Button variant="ghost" onClick={() => setConfirming(false)}>
							Cancel
						</Button>
						<Button variant={system.download_in_progress ? 'danger' : 'primary'} loading={restart.isPending} onClick={runRestart}>
							{system.download_in_progress ? 'Interrupt the download and restart' : 'Restart now'}
						</Button>
					</>
				}
			>
				{system.download_in_progress ? (
					<p className="text-sm text-warning">A download is running right now. It will be stopped, then picked up again after the restart (what was already downloaded is kept).</p>
				) : (
					<p className="text-sm text-muted">Nothing is downloading right now.</p>
				)}
			</Modal>
		</>
	)
}

export function SystemPage() {
	const system = useSystem()
	if (system.isPending) {
		return (
			<div className="flex justify-center py-24">
				<Spinner className="size-8" />
			</div>
		)
	}
	if (system.isError) return <ErrorState error={system.error} onRetry={() => system.refetch()} />
	const s = system.data

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-4">
			<h1 className="flex items-center gap-2 text-xl font-semibold">
				<Settings className="size-5 text-muted" aria-hidden /> System
			</h1>

			<Card title="ytpt">
				<dl>
					<Fact label="Version">{s.version}</Fact>
					<Fact label="Scheduler">{s.scheduler_running ? 'Running' : <span className="text-warning">Not running</span>}</Fact>
					<Fact label="Sources">{s.source_count}</Fact>
					<Fact label="Archive size">
						{formatBytes(s.disk_usage_bytes)}
						{s.data_dir_free_bytes != null && ` · ${formatBytes(s.data_dir_free_bytes)} free`}
					</Fact>
				</dl>
			</Card>

			<Actions system={s} />
		</div>
	)
}
