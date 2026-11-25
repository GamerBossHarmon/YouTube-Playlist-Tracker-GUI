import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiText } from './client'
import type {
	Account,
	AccountPlaylist,
	Attempt,
	CommentsPage,
	LocateResult,
	EventsPage,
	FormatsList,
	QueueData,
	Severity,
	Source,
	SourceCreate,
	SourceUpdate,
	SourceVideoPage,
	SystemInfo,
	TimelinePage,
	Upgrade,
	UpgradeRequest,
	Video,
	VideoDetail,
	VideoPage,
	VideoStatus,
	YtdlpUpdate,
} from './types'

// Query keys. The FIRST element is the "root" the live layer invalidates by
// (see live/events.ts), so keep roots stable: sources, source, source-videos,
// timeline, videos, video, attempts, queue, system, events.
export const qk = {
	system: ['system'] as const,
	accounts: ['accounts'] as const,
	accountPlaylists: (id: string) => ['accounts', 'playlists', id] as const,
	sources: ['sources'] as const,
	source: (id: number) => ['source', id] as const,
	sourceVideos: (id: number) => ['source-videos', id] as const,
	timeline: (id: number, changesOnly: boolean) => ['timeline', id, changesOnly] as const,
	videos: (filters: VideoFilters) => ['videos', 'list', filters] as const,
	orphaned: (q: string, sort: string) => ['videos', 'orphaned', q, sort] as const,
	video: (id: string) => ['video', id] as const,
	attempts: (id: string) => ['attempts', id] as const,
	upgrade: (id: string) => ['upgrade', id] as const,
	queue: ['queue'] as const,
	events: (filters: EventFilters) => ['events', filters] as const,
}

export const VIDEO_PAGE_SIZE = 48
const SOURCE_VIDEO_PAGE_SIZE = 100
const TIMELINE_PAGE_SIZE = 20
const EVENTS_PAGE_SIZE = 100

// --- reads ----------------------------------------------------------------------

export function useSystem() {
	return useQuery({
		queryKey: qk.system,
		queryFn: () => api<SystemInfo>('/api/system'),
		staleTime: 15_000,
		// While the API is unreachable keep trying so the page recovers by itself when ytpt comes back.
		refetchInterval: (query) => (query.state.status === 'error' ? 5_000 : false),
	})
}

export function useAccounts() {
	return useQuery({ queryKey: qk.accounts, queryFn: () => api<Account[]>('/api/accounts') })
}

/** Playlists an account can see (hits YouTube, so only on demand and cached for a while). */
export function useAccountPlaylists(id: string, enabled: boolean) {
	return useQuery({
		queryKey: qk.accountPlaylists(id),
		queryFn: () => api<AccountPlaylist[]>(`/api/accounts/${encodeURIComponent(id)}/playlists`),
		enabled,
		staleTime: 2 * 60_000,
		retry: false,
	})
}

export function useSources() {
	return useQuery({ queryKey: qk.sources, queryFn: () => api<Source[]>('/api/sources') })
}

export function useSource(id: number) {
	return useQuery({ queryKey: qk.source(id), queryFn: () => api<Source>(`/api/sources/${id}`) })
}

export function useQueue() {
	return useQuery({ queryKey: qk.queue, queryFn: () => api<QueueData>('/api/queue') })
}

export function useVideo(id: string) {
	return useQuery({ queryKey: qk.video(id), queryFn: () => api<VideoDetail>(`/api/videos/${encodeURIComponent(id)}`) })
}

export function useAttempts(id: string) {
	return useQuery({ queryKey: qk.attempts(id), queryFn: () => api<Attempt[]>(`/api/videos/${encodeURIComponent(id)}/attempts`) })
}

const COMMENT_PAGE_SIZE = 50

export function useComments(id: string, enabled: boolean) {
	return useInfiniteQuery({
		queryKey: ['comments', id] as const,
		initialPageParam: 0,
		enabled,
		staleTime: 5 * 60_000,
		queryFn: ({ pageParam }) =>
			api<CommentsPage>(`/api/videos/${encodeURIComponent(id)}/comments`, { params: { limit: COMMENT_PAGE_SIZE, offset: pageParam } }),
		getNextPageParam: (last) => (last.offset + last.items.length < last.total ? last.offset + last.items.length : undefined),
	})
}

export function useAttemptLog(attemptId: number | null) {
	return useQuery({
		queryKey: ['attempt-log', attemptId],
		queryFn: () => apiText(`/api/attempts/${attemptId}/log`),
		enabled: attemptId !== null,
		staleTime: Infinity, // a finished attempt's log never changes
	})
}

export interface VideoFilters {
	status?: VideoStatus
	source_id?: number
	q?: string
	sort?: string
}

/** Offset-paged infinite list: next page starts where the loaded ones end. */
function nextOffset(last: { offset: number; total: number; items: unknown[] }): number | undefined {
	const next = last.offset + last.items.length
	return next < last.total ? next : undefined
}

export function useVideos(filters: VideoFilters) {
	return useInfiniteQuery({
		queryKey: qk.videos(filters),
		initialPageParam: 0,
		queryFn: ({ pageParam }) =>
			api<VideoPage>('/api/videos', { params: { ...filters, limit: VIDEO_PAGE_SIZE, offset: pageParam } }),
		getNextPageParam: nextOffset,
		placeholderData: keepPreviousData,
	})
}

export function useOrphaned(q: string, sort: string) {
	return useInfiniteQuery({
		queryKey: qk.orphaned(q, sort),
		initialPageParam: 0,
		queryFn: ({ pageParam }) =>
			api<VideoPage>('/api/videos/orphaned', { params: { q, sort, limit: VIDEO_PAGE_SIZE, offset: pageParam } }),
		getNextPageParam: nextOffset,
		placeholderData: keepPreviousData,
	})
}

export function useSourceVideos(id: number) {
	return useInfiniteQuery({
		queryKey: qk.sourceVideos(id),
		initialPageParam: 0,
		queryFn: ({ pageParam }) =>
			api<SourceVideoPage>(`/api/sources/${id}/videos`, { params: { limit: SOURCE_VIDEO_PAGE_SIZE, offset: pageParam } }),
		getNextPageParam: nextOffset,
	})
}

export function useTimeline(id: number, changesOnly: boolean) {
	return useInfiniteQuery({
		queryKey: qk.timeline(id, changesOnly),
		initialPageParam: undefined as number | undefined,
		queryFn: ({ pageParam }) =>
			api<TimelinePage>(`/api/sources/${id}/timeline`, {
				params: { limit: TIMELINE_PAGE_SIZE, before_id: pageParam, changes_only: changesOnly },
			}),
		getNextPageParam: (last) => last.next_before_id ?? undefined,
	})
}

export interface EventFilters {
	severity: Severity[]
	event_type: string[]
	source_id?: number
	video_id?: string
}

export function useEvents(filters: EventFilters) {
	return useInfiniteQuery({
		queryKey: qk.events(filters),
		initialPageParam: undefined as number | undefined,
		queryFn: ({ pageParam }) =>
			api<EventsPage>('/api/events', { params: { ...filters, before_id: pageParam, limit: EVENTS_PAGE_SIZE } }),
		getNextPageParam: (last) => last.next_before_id ?? undefined,
	})
}

// --- writes ---------------------------------------------------------------------

export function useCreateSource() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: SourceCreate) => api<Source>('/api/sources', { method: 'POST', json: body }),
		onSuccess: () => qc.invalidateQueries({ queryKey: qk.sources }),
	})
}

export function useUpdateSource(id: number) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: SourceUpdate) => api<Source>(`/api/sources/${id}`, { method: 'PATCH', json: body }),
		onSuccess: (source) => {
			qc.setQueryData(qk.source(id), source)
			return qc.invalidateQueries({ queryKey: qk.sources })
		},
	})
}

export function useDeleteSource() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: number) => api<void>(`/api/sources/${id}`, { method: 'DELETE' }),
		onSuccess: () => qc.invalidateQueries(), // its videos may become orphaned, queue entries may change...
	})
}

export function useCheckSource() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: number) => api<{ source_id: number; started: boolean }>(`/api/sources/${id}/check`, { method: 'POST' }),
		onSuccess: (_, id) => {
			// check_running flips on immediately; the live layer refreshes again when the check finishes.
			qc.invalidateQueries({ queryKey: qk.source(id) })
			return qc.invalidateQueries({ queryKey: qk.sources })
		},
	})
}

/**
 * Move a queued/failed video to the top of the queue and skip the download cooldown.
 * With `account`, this one download uses that account's cookies instead of the primary's.
 */
export function useDownloadNow() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, account }: { id: string; account?: string }) =>
			api<Video>(`/api/videos/${encodeURIComponent(id)}/download-now`, { method: 'POST', json: account ? { account } : undefined }),
		onSuccess: () => qc.invalidateQueries(),
	})
}

/** Put a queued video at a 1-based place in the download queue. */
export function useMoveVideo() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, position }: { id: string; position: number }) =>
			api<Video>(`/api/videos/${encodeURIComponent(id)}/move`, { method: 'POST', json: { position } }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['queue'] }),
	})
}

/**
 * Give up on a video now instead of waiting out its retries. A queued one fails at once;
 * a downloading one is aborted within moments, then fails with no further attempts.
 */
export function useFailVideo() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => api<Video>(`/api/videos/${encodeURIComponent(id)}/fail`, { method: 'POST' }),
		onSuccess: () => qc.invalidateQueries(),
	})
}

// --- accounts (writes) ------------------------------------------------------------

export function useAddAccount() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: { label: string; cookies: string }) => api<Account>('/api/accounts', { method: 'POST', json: body }),
		onSuccess: () => qc.invalidateQueries({ queryKey: qk.accounts }),
	})
}

export function useReplaceCookies(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (cookies: string) => api<Account>(`/api/accounts/${encodeURIComponent(id)}/cookies`, { method: 'PUT', json: { cookies } }),
		onSuccess: () => qc.invalidateQueries(), // also refreshes /system (primary account name)
	})
}

export function useRefreshAccount(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<Account>(`/api/accounts/${encodeURIComponent(id)}/refresh`, { method: 'POST' }),
		onSuccess: () => qc.invalidateQueries(),
	})
}

export function useDeleteAccount() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => api<void>(`/api/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
		onSuccess: () => qc.invalidateQueries(), // sources that used it fall back to the primary
	})
}

/** Re-queue a downloaded video whose file is gone, at the top of the queue. */
export function useRedownloadVideo(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<Video>(`/api/videos/${encodeURIComponent(id)}/redownload`, { method: 'POST' }),
		onSuccess: () => qc.invalidateQueries(),
	})
}

/** Search the data folders for a missing file and re-attach it. */
export function useLocateVideo(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<LocateResult>(`/api/videos/${encodeURIComponent(id)}/locate`, { method: 'POST' }),
		onSuccess: (r) => (r.found ? qc.invalidateQueries() : undefined),
	})
}

/** Fetch just this video's comments, regardless of the download_comments setting. Can take a while. */
export function useFetchComments(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<CommentsPage>(`/api/videos/${encodeURIComponent(id)}/comments/fetch`, { method: 'POST' }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', id] }),
	})
}

// --- quality upgrades ---------------------------------------------------------------

/** The video's pending/finished quality upgrade, or null. The live layer refreshes it on upgrade events. */
export function useUpgrade(id: string) {
	return useQuery({ queryKey: qk.upgrade(id), queryFn: () => api<Upgrade | null>(`/api/videos/${encodeURIComponent(id)}/upgrade`) })
}

/** Every format YouTube offers for the video. Asks YouTube, so only on demand and cached for a while. */
export function useVideoFormats(id: string, enabled: boolean) {
	return useQuery({
		queryKey: ['video-formats', id] as const,
		queryFn: () => api<FormatsList>(`/api/videos/${encodeURIComponent(id)}/formats`),
		enabled,
		staleTime: 5 * 60_000,
		retry: false,
	})
}

export function useRequestUpgrade(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (body: UpgradeRequest) => api<Upgrade>(`/api/videos/${encodeURIComponent(id)}/upgrade`, { method: 'POST', json: body }),
		onSuccess: (upgrade) => {
			qc.setQueryData(qk.upgrade(id), upgrade)
			return qc.invalidateQueries({ queryKey: ['queue'] })
		},
	})
}

/** Replace the current file with the upgraded one (deletes the old file for good). */
export function useAcceptUpgrade(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<Video>(`/api/videos/${encodeURIComponent(id)}/upgrade/accept`, { method: 'POST' }),
		onSuccess: () => qc.invalidateQueries(), // file, size, format, grid and disk usage all changed
	})
}

/** Cancel a running/queued upgrade, or throw away a finished one. The current file is never touched. */
export function useDiscardUpgrade(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<void>(`/api/videos/${encodeURIComponent(id)}/upgrade`, { method: 'DELETE' }),
		onSuccess: () => {
			qc.setQueryData(qk.upgrade(id), null)
			return qc.invalidateQueries({ queryKey: ['video', id] })
		},
	})
}

// --- system -------------------------------------------------------------------------

export function useUpdateYtdlp() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<YtdlpUpdate>('/api/system/update-ytdlp', { method: 'POST' }),
		onSuccess: () => qc.invalidateQueries({ queryKey: qk.system }),
	})
}

/** Ask ytpt to restart itself. The API answers first, then goes away for a few seconds. */
export function useRequestRestart() {
	return useMutation({
		mutationFn: (force: boolean) => api<{ restarting: boolean }>('/api/system/restart', { method: 'POST', json: { force } }),
	})
}

export function useRetryVideo(id: string) {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: () => api<Video>(`/api/videos/${encodeURIComponent(id)}/retry`, { method: 'POST' }),
		onSuccess: () => qc.invalidateQueries(),
	})
}
