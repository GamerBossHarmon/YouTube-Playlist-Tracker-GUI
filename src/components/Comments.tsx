import { BadgeCheck, ChevronDown, MessageSquare, MessageSquarePlus, Pin, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { useComments, useFetchComments } from '../api/queries'
import type { Comment } from '../api/types'
import { formatRelative } from '../lib/format'
import { Button } from './ui/Button'
import { ErrorState, Spinner } from './ui/Feedback'
import { useToast } from './ui/toastContext'

function CommentRow({ comment, reply = false }: { comment: Comment; reply?: boolean }) {
	const [open, setOpen] = useState(false)
	const when = comment.timestamp ? formatRelative(new Date(comment.timestamp * 1000).toISOString()) : null
	return (
		<li className="flex flex-col gap-1">
			<div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
				{comment.is_pinned && (
					<span className="inline-flex items-center gap-1">
						<Pin className="size-3" aria-hidden /> Pinned
					</span>
				)}
				<span className={comment.is_uploader ? 'rounded-full bg-white/10 px-2 py-0.5 font-medium text-fg' : 'font-medium text-fg'}>
					{comment.author || 'Unknown'}
					{comment.is_uploader && <BadgeCheck className="ml-1 inline size-3" aria-label="Uploader" />}
				</span>
				{when && <span>{when}</span>}
			</div>
			<p className="text-sm break-words whitespace-pre-wrap">{comment.text}</p>
			<div className="flex items-center gap-3 text-xs text-muted">
				<span className="inline-flex items-center gap-1 tabular-nums">
					<ThumbsUp className="size-3" aria-hidden /> {comment.like_count.toLocaleString()}
				</span>
				{!reply && comment.replies.length > 0 && (
					<button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex cursor-pointer items-center gap-1 font-medium hover:text-fg" aria-expanded={open}>
						<ChevronDown className={open ? 'size-3 rotate-180' : 'size-3'} aria-hidden />
						{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
					</button>
				)}
			</div>
			{open && (
				<ul className="mt-2 flex flex-col gap-4 border-l border-line pl-4">
					{comment.replies.map((r) => (
						<CommentRow key={r.id} comment={r} reply />
					))}
				</ul>
			)}
		</li>
	)
}

/** Comments saved with the video. Only shown for downloaded videos; explains how to turn them on otherwise. */
export function Comments({ youtubeId }: { youtubeId: string }) {
	const comments = useComments(youtubeId, true)
	const fetchComments = useFetchComments(youtubeId)
	const toast = useToast()

	let body: React.ReactNode
	if (comments.isPending) {
		body = <Spinner />
	} else if (comments.isError) {
		body = <ErrorState error={comments.error} onRetry={() => comments.refetch()} />
	} else {
		const first = comments.data.pages[0]
		const items = comments.data.pages.flatMap((p) => p.items)
		if (!first.available) {
			body = (
				<div className="flex flex-col items-start gap-3">
					<p className="text-sm text-muted">
						{first.enabled
							? 'No comments were saved for this video. It was probably downloaded before comments were turned on.'
							: <>Comments are not downloaded automatically. To do that for every new video, set <code className="rounded bg-white/10 px-1">download_comments = true</code> under <code className="rounded bg-white/10 px-1">[download]</code> in ytpt.conf.</>}
					</p>
					<Button
						icon={<MessageSquarePlus className="size-4" />}
						loading={fetchComments.isPending}
						onClick={() =>
							fetchComments.mutate(undefined, {
								onSuccess: (r) => toast.success(r.total ? `Saved ${r.total.toLocaleString()} comments.` : 'Done. This video has no comments.'),
								onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not download the comments.'),
							})
						}
					>
						{fetchComments.isPending ? 'Downloading comments…' : 'Download comments'}
					</Button>
				</div>
			)
		} else if (items.length === 0) {
			body = <p className="text-sm text-muted">This video has no comments.</p>
		} else {
			body = (
				<>
					<ul className="flex flex-col gap-5">
						{items.map((c) => (
							<CommentRow key={c.id} comment={c} />
						))}
					</ul>
					{comments.hasNextPage && (
						<Button className="mt-5" variant="secondary" loading={comments.isFetchingNextPage} onClick={() => comments.fetchNextPage()}>
							Show more comments
						</Button>
					)}
				</>
			)
		}
	}

	const total = comments.data?.pages[0]?.available ? comments.data.pages[0].total : null
	return (
		<section aria-labelledby="comments" className="mt-8">
			<h2 id="comments" className="mb-4 flex items-center gap-2 text-base font-medium">
				<MessageSquare className="size-4" aria-hidden /> Comments
				{total != null && <span className="text-sm font-normal text-muted tabular-nums">{total.toLocaleString()}</span>}
			</h2>
			{body}
		</section>
	)
}
