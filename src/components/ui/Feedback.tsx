import { AlertTriangle, Loader2, RefreshCw, ServerOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export function Spinner({ className }: { className?: string }) {
	return <Loader2 className={cn('size-5 animate-spin text-muted', className)} aria-label="Loading" role="status" />
}

export function Skeleton({ className }: { className?: string }) {
	return <div className={cn('skeleton rounded-lg', className)} aria-hidden />
}

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
	neutral: 'bg-white/10 text-muted',
	info: 'bg-accent/15 text-accent',
	success: 'bg-success/15 text-success',
	warning: 'bg-warning/15 text-warning',
	danger: 'bg-danger/15 text-danger',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
	return (
		<span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', TONES[tone], className)}>
			{children}
		</span>
	)
}

/** value = 0..100, or null for an indeterminate (unknown total) bar. */
export function ProgressBar({ value, className, label }: { value: number | null | undefined; className?: string; label?: string }) {
	const determinate = value != null
	return (
		<div
			role="progressbar"
			aria-label={label ?? 'Progress'}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={determinate ? Math.round(value) : undefined}
			className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/15', className)}
		>
			<div
				className={cn('h-full rounded-full bg-accent transition-[width] duration-500', !determinate && 'skeleton w-full')}
				style={determinate ? { width: `${Math.max(0, Math.min(100, value))}%` } : undefined}
			/>
		</div>
	)
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
	return (
		<div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
			{icon && <div className="text-faint [&>svg]:size-12">{icon}</div>}
			<h2 className="text-lg font-medium">{title}</h2>
			{children && <p className="max-w-md text-sm text-muted">{children}</p>}
			{action}
		</div>
	)
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
	const unreachable = error instanceof ApiError && error.unreachable
	const message = error instanceof Error ? error.message : 'Something went wrong.'
	return (
		<div role="alert" className="flex flex-col items-center gap-3 px-4 py-16 text-center">
			{unreachable ? <ServerOff className="size-12 text-faint" aria-hidden /> : <AlertTriangle className="size-12 text-faint" aria-hidden />}
			<h2 className="text-lg font-medium">{title ?? (unreachable ? 'Cannot reach ytpt' : 'Something went wrong')}</h2>
			<p className="max-w-md text-sm text-muted">{message}</p>
			{unreachable && (
				<p className="max-w-md text-xs text-faint">
					Check that ytpt is running with <code className="rounded bg-surface px-1">server.enabled = true</code> and that this GUI server&apos;s{' '}
					<code className="rounded bg-surface px-1">YTPT_API_URL</code> points at it.
				</p>
			)}
			{onRetry && (
				<Button icon={<RefreshCw className="size-4" />} onClick={onRetry}>
					Try again
				</Button>
			)}
		</div>
	)
}
