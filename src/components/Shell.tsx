import { Archive, Download, House, ListVideo, Plus, ScrollText, Search, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQueue, useSystem } from '../api/queries'
import { cn } from '../lib/cn'
import { formatBytes } from '../lib/format'
import { useLive } from '../live/liveContext'
import { SystemBanners } from './Banners'
import { AddSourceDialog } from './SourceDialogs'
import { Button, IconButton } from './ui/Button'
import { ErrorState, Spinner } from './ui/Feedback'

interface NavItem {
	to: string
	label: string
	icon: typeof House
	end?: boolean
}

const NAV: NavItem[] = [
	{ to: '/', label: 'Home', icon: House, end: true },
	{ to: '/queue', label: 'Queue', icon: Download },
	{ to: '/sources', label: 'Sources', icon: ListVideo },
	{ to: '/accounts', label: 'Accounts', icon: UserRound },
	{ to: '/orphaned', label: 'Orphaned', icon: Archive },
	{ to: '/log', label: 'Log', icon: ScrollText },
]

function LiveDot() {
	const { status } = useLive()
	const live = status === 'live'
	return (
		<span className="flex items-center gap-2 text-xs text-muted" title={live ? 'Receiving live updates' : 'Reconnecting to the live update stream…'}>
			<span className={cn('size-2 rounded-full', live ? 'bg-success' : 'animate-pulse bg-warning')} aria-hidden />
			{live ? 'Live' : 'Reconnecting…'}
		</span>
	)
}

function SearchBox() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const location = useLocation()
	// Keep the box in sync with ?q= while on Home; empty elsewhere.
	const urlQuery = location.pathname === '/' ? (params.get('q') ?? '') : ''
	const [draft, setDraft] = useState<string | null>(null)
	const value = draft ?? urlQuery

	const submit = (e: FormEvent) => {
		e.preventDefault()
		const q = value.trim()
		setDraft(null)
		navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
	}

	return (
		<form onSubmit={submit} role="search" className="flex min-w-0 flex-1 justify-center">
			<div className="relative w-full max-w-xl">
				<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
				<input
					type="search"
					aria-label="Search archived videos"
					placeholder="Search archived videos"
					value={value}
					onChange={(e) => setDraft(e.target.value)}
					className="h-10 w-full rounded-full border border-line bg-bg pr-4 pl-10 text-sm placeholder:text-faint focus:border-accent focus:outline-none"
				/>
			</div>
		</form>
	)
}

function Sidebar() {
	const { data: system } = useSystem()
	const { data: queue } = useQueue()
	const active = (queue?.downloading.length ?? 0) + (queue?.queued_total ?? 0)

	return (
		<aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-sidebar p-3 md:flex">
			<NavLink to="/" className="mb-4 flex items-center gap-2 px-3 py-2">
				<img src="/favicon.svg" alt="" className="size-7" />
				<span className="text-xl font-semibold tracking-tight">ytpt</span>
			</NavLink>
			<nav aria-label="Main" className="flex flex-col gap-1">
				{NAV.map(({ to, label, icon: Icon, end }) => (
					<NavLink
						key={to}
						to={to}
						end={end}
						className={({ isActive }) =>
							cn('flex items-center gap-4 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-surface', isActive && 'bg-surface font-medium')
						}
					>
						<Icon className="size-5" aria-hidden />
						<span className="flex-1">{label}</span>
						{to === '/queue' && active > 0 && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">{active}</span>}
					</NavLink>
				))}
			</nav>
			<div className="mt-auto flex flex-col gap-1.5 px-3 pt-4 text-xs text-muted">
				<LiveDot />
				{system && (
					<>
						<NavLink to="/accounts" className="flex items-center gap-1.5 hover:text-fg" title="The account ytpt downloads with">
							<UserRound className="size-3.5 shrink-0" aria-hidden />
							<span className="truncate">{system.primary_account?.present ? system.primary_account.name : 'No account (anonymous)'}</span>
						</NavLink>
						<span>
							{formatBytes(system.disk_usage_bytes)} archived
							{system.data_dir_free_bytes != null && ` · ${formatBytes(system.data_dir_free_bytes)} free`}
						</span>
						<span className="text-faint">
							ytpt {system.version} · yt-dlp {system.ytdlp_version}
						</span>
					</>
				)}
			</div>
		</aside>
	)
}

function BottomNav() {
	return (
		<nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg/95 backdrop-blur md:hidden">
			{NAV.map(({ to, label, icon: Icon, end }) => (
				<NavLink
					key={to}
					to={to}
					end={end}
					className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px]', isActive ? 'text-fg' : 'text-muted')}
				>
					<Icon className="size-5" aria-hidden />
					{label}
				</NavLink>
			))}
		</nav>
	)
}

export function Shell() {
	const system = useSystem()
	const [adding, setAdding] = useState(false)

	return (
		<div className="min-h-screen">
			<Sidebar />
			<div className="md:pl-56">
				<header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
					<NavLink to="/" className="flex items-center gap-2 md:hidden" aria-label="ytpt home">
						<img src="/favicon.svg" alt="" className="size-7" />
					</NavLink>
					<SearchBox />
					<Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)} className="max-sm:hidden">
						Add source
					</Button>
					<IconButton label="Add source" variant="secondary" onClick={() => setAdding(true)} className="sm:hidden">
						<Plus className="size-5" />
					</IconButton>
				</header>

				<main className="mx-auto max-w-[1800px] px-4 pt-5 pb-28 md:pb-10">
					{system.isPending ? (
						<div className="flex justify-center py-24">
							<Spinner className="size-8" />
						</div>
					) : system.isError ? (
						<ErrorState error={system.error} onRetry={() => system.refetch()} />
					) : (
						<>
							<div className="mb-5 flex flex-col gap-3 empty:hidden">
								<SystemBanners system={system.data} />
							</div>
							<Outlet />
						</>
					)}
				</main>
			</div>
			<BottomNav />
			<AddSourceDialog open={adding} onOpenChange={setAdding} />
		</div>
	)
}
