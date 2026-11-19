// Friendly aliases over the generated OpenAPI types (src/api/schema.d.ts).
// Regenerate that file with `npm run sync:api`
import type { components } from './schema'

type S = components['schemas']

export type Source = S['SourceOut']
export type SourceCreate = S['SourceCreate']
export type SourceUpdate = S['SourceUpdate']
export type SourceType = Source['source_type']

export type Video = S['VideoOut']
export type SourceVideo = S['SourceVideoOut']
export type VideoDetail = S['VideoDetail']
export type VideoStatus = Video['status']
export type FailureReason = NonNullable<Video['failure_reason']>

export type Attempt = S['AttemptOut']
export type Comment = S['CommentOut']
export type CommentsPage = S['CommentsOut']
export type LocateResult = S['LocateOut']
export type QueueData = S['QueueOut']
export type QueueItem = S['QueueItem']
export type TimelineEntry = S['TimelineEntryOut']
export type TimelinePage = S['TimelineOut']

export type LogEvent = S['EventOut']
export type EventsPage = S['EventsPage']
export type Severity = LogEvent['severity']

export type SystemInfo = S['SystemOut']

export type Account = S['AccountOut']
export type AccountPlaylist = S['AccountPlaylistOut']

export type VideoPage = S['Page_VideoOut_']
export type SourceVideoPage = S['Page_SourceVideoOut_']

/** One live progress item from the SSE 'progress' frame (not in the OpenAPI schema: it is ephemeral). */
export interface LiveProgress {
	video_id: string
	status: string
	downloaded_bytes: number | null
	total_bytes: number | null
	speed_bytes_per_sec: number | null
	eta_seconds: number | null
	percent: number | null
	updated_at: number
}

export const VIDEO_STATUSES: VideoStatus[] = ['downloaded', 'queued', 'downloading', 'failed', 'tombstoned', 'unavailable']
export const SEVERITIES: Severity[] = ['debug', 'info', 'warning', 'error']
export const SORTS = [
	{ value: 'newest_archived', label: 'Newest archived' },
	{ value: 'oldest_archived', label: 'Oldest archived' },
	{ value: 'upload_date', label: 'Upload date' },
	{ value: 'title', label: 'Title (A-Z)' },
] as const
