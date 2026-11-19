import type { FailureReason, Severity, SystemInfo, VideoStatus } from '../api/types'

export const FAILURE_LABELS: Record<FailureReason, string> = {
	private: 'Private video',
	removed_by_uploader: 'Removed by the uploader',
	tos: 'Removed (terms of service)',
	region_blocked: 'Blocked in your region',
	members_only: 'Members only',
	unavailable_unknown: 'Unavailable (unknown reason)',
	download_error: 'Download error',
}

export function failureLabel(reason: FailureReason | null | undefined): string | null {
	return reason ? (FAILURE_LABELS[reason] ?? reason) : null
}

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export const STATUS_META: Record<VideoStatus, { label: string; tone: Tone }> = {
	downloaded: { label: 'Downloaded', tone: 'success' },
	queued: { label: 'Queued', tone: 'neutral' },
	downloading: { label: 'Downloading', tone: 'info' },
	failed: { label: 'Failed', tone: 'danger' },
	tombstoned: { label: 'Removed from YouTube', tone: 'warning' },
	unavailable: { label: 'No longer on YouTube', tone: 'warning' },
}

export const SEVERITY_TONE: Record<Severity, Tone> = {
	debug: 'neutral',
	info: 'info',
	warning: 'warning',
	error: 'danger',
}

/** Human wording for the few things a video's state means, used on the Watch page. */
export const STATUS_EXPLANATION: Partial<Record<VideoStatus, string>> = {
	tombstoned: 'This video was removed from YouTube before it was ever downloaded, so there is nothing to play. The entry is kept as a record.',
	unavailable: 'This video is no longer available on YouTube. Your downloaded copy (if the file is still on disk) is unaffected.',
}

/** The global default check interval, read defensively from the untyped config blob. */
export function defaultCheckInterval(system: SystemInfo | undefined): number {
	const scheduler = (system?.config as { scheduler?: { playlist_check_interval_seconds?: unknown } } | undefined)?.scheduler
	const value = scheduler?.playlist_check_interval_seconds
	return typeof value === 'number' ? value : 6 * 3600
}

/** The API's configured default sort, falling back to newest-archived. */
export function defaultSort(system: SystemInfo | undefined): string {
	const server = (system?.config as { server?: { default_sort?: unknown } } | undefined)?.server
	return typeof server?.default_sort === 'string' ? server.default_sort : 'newest_archived'
}
