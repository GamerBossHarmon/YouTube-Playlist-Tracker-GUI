import type { QueryKey } from '@tanstack/react-query'
import type { LogEvent } from '../api/types'

/**
 * Which cached queries a server event makes stale. Pure, so it is unit-tested.
 * Keys are *prefixes* (TanStack matches queryKey by prefix): ['videos'] covers
 * the main grid and the orphaned view; [] matches everything.
 */
export function keysForEvent(e: Pick<LogEvent, 'event_type' | 'source_id' | 'video_id'>): QueryKey[] {
	const { source_id: sid, video_id: vid } = e
	const keys: QueryKey[] = []
	const withSource = () => {
		keys.push(['sources'], ['source-videos'], ['timeline'])
		if (sid != null) keys.push(['source', sid])
	}
	const withVideo = () => {
		keys.push(['videos'])
		if (vid) keys.push(['video', vid], ['attempts', vid])
	}

	switch (e.event_type) {
		case 'scheduler_started':
			return [[]] // the scheduler restarted: anything may have changed (e.g. stuck downloads reset)
		case 'source_checked':
		case 'source_check_failed':
			withSource()
			keys.push(['videos'], ['queue'], ['system'])
			break
		case 'download_started':
			keys.push(['queue'])
			withVideo()
			break
		case 'video_downloaded':
			withSource()
			withVideo()
			keys.push(['queue'], ['system'])
			break
		case 'video_download_failed':
		case 'video_failed':
		case 'video_tombstoned':
			withSource()
			withVideo()
			keys.push(['queue'])
			break
		default:
			keys.push(['system']) // unknown future event type: refresh the cheap global bits only
	}
	return keys
}
