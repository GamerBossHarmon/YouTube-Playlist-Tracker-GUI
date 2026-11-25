import { AlertTriangle, Info, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { SystemInfo } from '../api/types'
import { cn } from '../lib/cn'

const DISMISS_PREFIX = 'ytpt-gui:dismissed:'

function readDismissed(key: string): boolean {
	try {
		return localStorage.getItem(DISMISS_PREFIX + key) === '1'
	} catch {
		return false // storage can be unavailable (private mode); just show the banner
	}
}

function Banner({ id, tone, children, dismissible }: { id: string; tone: 'info' | 'warning'; children: ReactNode; dismissible?: boolean }) {
	const [hidden, setHidden] = useState(() => (dismissible ? readDismissed(id) : false))
	if (hidden) return null
	const Icon = tone === 'warning' ? AlertTriangle : Info
	return (
		<div
			role={tone === 'warning' ? 'alert' : 'status'}
			className={cn('flex items-start gap-3 rounded-xl px-4 py-3 text-sm', tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-accent/10 text-accent')}
		>
			<Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
			<div className="min-w-0 flex-1 text-fg [&_strong]:font-medium">{children}</div>
			{dismissible && (
				<button
					type="button"
					aria-label="Dismiss"
					className="cursor-pointer text-muted hover:text-fg"
					onClick={() => {
						try {
							localStorage.setItem(DISMISS_PREFIX + id, '1')
						} catch {
							/* ignore */
						}
						setHidden(true)
					}}
				>
					<X className="size-4" />
				</button>
			)}
		</div>
	)
}

/** Things the operator should know about the server, surfaced from GET /api/system. */
export function SystemBanners({ system }: { system: SystemInfo }) {
	return (
		<>
			{!system.scheduler_running && (
				<Banner id="scheduler" tone="warning">
					<strong>The scheduler is not running.</strong> Sources are not being checked and nothing is downloading. Start it with <code>ytpt run</code>.
				</Banner>
			)}
			{system.ytdlp_restart_required && (
				<Banner id="ytdlp-restart" tone="info">
					<strong>yt-dlp {system.ytdlp_installed_version} is installed, but ytpt is still running {system.ytdlp_version}.</strong> Restart ytpt to start using the new one.{' '}
					<Link to="/system" className="font-medium underline">
						Open System
					</Link>
				</Banner>
			)}
			{system.server_exposed && (
				<Banner id="exposed" tone="warning" dismissible>
					<strong>The API is listening on {system.server_host}, beyond this machine.</strong> ytpt has no login, so anyone who can reach it can change your archive. Keep it behind Tailscale or a reverse
					proxy.
				</Banner>
			)}
			{system.cookies_present && (
				<Banner id="cookies" tone="info" dismissible>
					<strong>Cookies are in use{system.primary_account?.display_name ? ` (${system.primary_account.display_name})` : ''}.</strong> Use a throwaway (burner) Google account for <code>cookies.txt</code>: downloading at scale with your main account risks it being flagged.
				</Banner>
			)}
		</>
	)
}
