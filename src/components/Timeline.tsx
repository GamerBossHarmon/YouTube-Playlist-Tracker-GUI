import { ArrowRightLeft, Minus, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { TimelineEntry } from '../api/types'
import { cn } from '../lib/cn'
import { formatDateTime, formatRelative } from '../lib/format'
import { Badge } from './ui/Feedback'

const SHOW_INITIALLY = 5

function VideoLink({ id, title }: { id: string; title: string | null | undefined }) {
	return (
		<Link to={`/watch/${id}`} className="min-w-0 truncate hover:underline" title={title || id}>
			{title || id}
		</Link>
	)
}

/** A capped list ("+12 added") that expands on demand. `total` can exceed items.length (API detail cap). */
function ChangeList({ label, icon, tone, total, children }: { label: string; icon: ReactNode; tone: 'success' | 'danger' | 'warning'; total: number; children: ReactNode[] }) {
	const [expanded, setExpanded] = useState(false)
	if (total === 0) return null
	const visible = expanded ? children : children.slice(0, SHOW_INITIALLY)
	const color = { success: 'text-success', danger: 'text-danger', warning: 'text-warning' }[tone]
	const cappedByApi = total - children.length // the API returns at most `detail_limit` rows per list
	return (
		<div className="mt-3">
			<p className={cn('mb-1 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase', color)}>
				{icon} {total} {label}
			</p>
			<ul className="flex flex-col gap-1 text-sm">
				{visible.map((c, i) => (
					<li key={i} className="flex min-w-0 gap-2">
						{c}
					</li>
				))}
			</ul>
			{!expanded && children.length > SHOW_INITIALLY && (
				<button type="button" onClick={() => setExpanded(true)} className="mt-1.5 cursor-pointer text-xs text-accent hover:underline">
					Show all {children.length}
				</button>
			)}
			{(expanded || children.length <= SHOW_INITIALLY) && cappedByApi > 0 && <p className="mt-1.5 text-xs text-faint">…and {cappedByApi} more not shown.</p>}
		</div>
	)
}

export function TimelineEntryCard({ entry, now }: { entry: TimelineEntry; now: number }) {
	const header = (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<time dateTime={entry.captured_at} title={formatDateTime(entry.captured_at)} className="text-sm font-medium">
				{formatRelative(entry.captured_at, now)}
			</time>
			<span className="text-xs text-faint">{formatDateTime(entry.captured_at)}</span>
			<span className="text-xs text-muted">{entry.video_count} videos</span>
		</div>
	)

	if (entry.is_first_check) {
		return (
			<div>
				{header}
				<p className="mt-2 text-sm text-muted">First check — found {entry.added_count} video{entry.added_count === 1 ? '' : 's'}.</p>
				<ChangeList label="found" icon={<Plus className="size-3.5" />} tone="success" total={entry.added_count}>
					{entry.added.map((v) => <VideoLink key={v.youtube_id} id={v.youtube_id} title={v.title} />)}
				</ChangeList>
			</div>
		)
	}

	if (!entry.has_changes) {
		return (
			<div>
				{header}
				<p className="mt-1 text-sm text-faint">No changes.</p>
			</div>
		)
	}

	return (
		<div>
			{header}
			<div className="mt-2 flex flex-wrap gap-2">
				{entry.added_count > 0 && <Badge tone="success">+{entry.added_count} added</Badge>}
				{entry.removed_count > 0 && <Badge tone="danger">−{entry.removed_count} removed</Badge>}
				{entry.reordered_count > 0 && <Badge tone="warning">{entry.reordered_count} reordered</Badge>}
			</div>
			<ChangeList label="added" icon={<Plus className="size-3.5" />} tone="success" total={entry.added_count}>
				{entry.added.map((v) => <VideoLink key={v.youtube_id} id={v.youtube_id} title={v.title} />)}
			</ChangeList>
			<ChangeList label="removed" icon={<Minus className="size-3.5" />} tone="danger" total={entry.removed_count}>
				{entry.removed.map((v) => <VideoLink key={v.youtube_id} id={v.youtube_id} title={v.title} />)}
			</ChangeList>
			<ChangeList label="reordered" icon={<ArrowRightLeft className="size-3.5" />} tone="warning" total={entry.reordered_count}>
				{entry.reordered.map((r) => (
					<span key={r.youtube_id} className="flex min-w-0 flex-1 gap-2">
						<VideoLink id={r.youtube_id} title={r.title} />
						<span className="ml-auto shrink-0 text-xs text-muted tabular-nums">
							#{r.old_position + 1} → #{r.new_position + 1}
						</span>
					</span>
				))}
			</ChangeList>
		</div>
	)
}
