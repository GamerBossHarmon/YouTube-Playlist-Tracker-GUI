import type { Source, SourceType } from '../api/types'
import { formatRelative } from './format'

export const TYPE_LABEL: Record<SourceType, string> = { playlist: 'Playlist', channel: 'Channel', video: 'Video' }

/** One-line summary of when the source was/will be checked. */
export function checkSummary(source: Source, now: number): string {
	if (source.check_running) return 'Checking now…'
	if (!source.enabled) return source.last_checked_at ? `Paused · last checked ${formatRelative(source.last_checked_at, now)}` : 'Paused'
	if (!source.last_checked_at) return 'Waiting for the first check…'
	const next = source.next_check_at ? formatRelative(source.next_check_at, now) : null
	return `Checked ${formatRelative(source.last_checked_at, now)}${next ? ` · next ${next}` : ''}`
}
