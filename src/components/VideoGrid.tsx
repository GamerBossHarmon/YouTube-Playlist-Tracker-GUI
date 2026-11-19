import type { ReactNode } from 'react'
import { Button } from './ui/Button'
import { Skeleton } from './ui/Feedback'

export const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-4 gap-y-8'

export function GridSkeleton({ count = 12 }: { count?: number }) {
	return (
		<div className={GRID_CLASS} aria-busy="true" aria-label="Loading videos">
			{Array.from({ length: count }, (_, i) => (
				<div key={i} className="flex flex-col gap-3">
					<Skeleton className="aspect-video rounded-xl" />
					<Skeleton className="h-4 w-11/12" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			))}
		</div>
	)
}

interface LoadMoreProps {
	shown: number
	total: number
	hasNextPage: boolean
	isFetchingNextPage: boolean
	onLoadMore: () => void
	noun?: string
}

/** "Showing 48 of 301" + a Load more button, shared by every paged grid. */
export function LoadMore({ shown, total, hasNextPage, isFetchingNextPage, onLoadMore, noun = 'videos' }: LoadMoreProps): ReactNode {
	return (
		<div className="mt-8 flex flex-col items-center gap-3">
			<p className="text-sm text-muted">
				Showing {shown} of {total} {noun}
			</p>
			{hasNextPage && (
				<Button onClick={onLoadMore} loading={isFetchingNextPage}>
					Load more
				</Button>
			)}
		</div>
	)
}
