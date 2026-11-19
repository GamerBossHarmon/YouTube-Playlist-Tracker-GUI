type Maybe<T> = T | null | undefined

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

export function formatBytes(bytes: Maybe<number>): string {
	if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—'
	if (bytes < 1024) return `${Math.round(bytes)} B`
	let value = bytes
	let unit = 0
	while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
		value /= 1024
		unit++
	}
	return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${BYTE_UNITS[unit]}`
}

export function formatSpeed(bytesPerSec: Maybe<number>): string {
	return bytesPerSec == null ? '—' : `${formatBytes(bytesPerSec)}/s`
}

/** 75 -> "1:15", 3725 -> "1:02:05" (video durations). */
export function formatDuration(seconds: Maybe<number>): string {
	if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return ''
	const total = Math.round(seconds)
	const h = Math.floor(total / 3600)
	const m = Math.floor((total % 3600) / 60)
	const s = total % 60
	const ss = String(s).padStart(2, '0')
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Countdown / ETA: 75 -> "1m 15s", 5 -> "5s", 3725 -> "1h 2m". */
export function formatEta(seconds: Maybe<number>): string {
	if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'
	const total = Math.round(seconds)
	if (total < 60) return `${total}s`
	if (total < 3600) return `${Math.floor(total / 60)}m ${total % 60}s`
	return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m`
}

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60],
]

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "3 hours ago", "in 2 days", "just now". */
export function formatRelative(iso: Maybe<string>, now: number = Date.now()): string {
	if (!iso) return 'never'
	const t = Date.parse(iso)
	if (Number.isNaN(t)) return '—'
	const diffSeconds = Math.round((t - now) / 1000)
	const abs = Math.abs(diffSeconds)
	if (abs < 45) return 'just now'
	for (const [unit, size] of RELATIVE_STEPS) {
		if (abs >= size) return rtf.format(Math.round(diffSeconds / size), unit)
	}
	return rtf.format(Math.round(diffSeconds / 60), 'minute')
}

export function formatDateTime(iso: Maybe<string>): string {
	if (!iso) return '—'
	const t = new Date(iso)
	if (Number.isNaN(t.getTime())) return '—'
	return t.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatDate(iso: Maybe<string>): string {
	if (!iso) return '—'
	const t = new Date(iso)
	if (Number.isNaN(t.getTime())) return '—'
	return t.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

/** 21600 -> "6 hours", 90 -> "90 seconds", 1800 -> "30 minutes". */
export function formatInterval(seconds: number): string {
	const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
	if (seconds % 86400 === 0) return plural(seconds / 86400, 'day')
	if (seconds % 3600 === 0) return plural(seconds / 3600, 'hour')
	if (seconds % 60 === 0) return plural(seconds / 60, 'minute')
	return plural(seconds, 'second')
}

export type IntervalUnit = 'minutes' | 'hours' | 'days'

const UNIT_SECONDS: Record<IntervalUnit, number> = { minutes: 60, hours: 3600, days: 86400 }

export function intervalToSeconds(value: number, unit: IntervalUnit): number {
	return Math.round(value * UNIT_SECONDS[unit])
}

/** Largest unit that divides the interval evenly, for pre-filling an edit form. */
export function secondsToInterval(seconds: number): { value: number; unit: IntervalUnit } {
	if (seconds % 86400 === 0) return { value: seconds / 86400, unit: 'days' }
	if (seconds % 3600 === 0) return { value: seconds / 3600, unit: 'hours' }
	return { value: Math.max(1, Math.round(seconds / 60)), unit: 'minutes' }
}
