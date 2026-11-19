import { Archive } from 'lucide-react'
import { useState } from 'react'
import { useOrphaned, useSystem } from '../api/queries'
import { SORTS } from '../api/types'
import { EmptyState, ErrorState } from '../components/ui/Feedback'
import { Select } from '../components/ui/Form'
import { VideoCard } from '../components/VideoCard'
import { GRID_CLASS, GridSkeleton, LoadMore } from '../components/VideoGrid'
import { defaultSort } from '../lib/labels'

export function OrphanedPage() {
	const system = useSystem()
	const [sortChoice, setSortChoice] = useState<string | null>(null)
	const sort = sortChoice ?? defaultSort(system.data)
	const videos = useOrphaned('', sort)

	const items = videos.data?.pages.flatMap((p) => p.items) ?? []
	const total = videos.data?.pages.at(-1)?.total ?? 0

	return (
		<div>
			<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Orphaned</h1>
					<p className="max-w-2xl text-sm text-muted">Archived videos that no tracked source contains any more, for example after you stopped tracking a playlist. Nothing here is ever deleted automatically.</p>
				</div>
				<Select aria-label="Sort videos" value={sort} onChange={(e) => setSortChoice(e.target.value)} className="h-9 w-auto">
					{SORTS.map((s) => (
						<option key={s.value} value={s.value}>
							{s.label}
						</option>
					))}
				</Select>
			</div>

			{videos.isPending ? (
				<GridSkeleton count={8} />
			) : videos.isError ? (
				<ErrorState error={videos.error} onRetry={() => videos.refetch()} />
			) : items.length === 0 ? (
				<EmptyState icon={<Archive />} title="No orphaned videos">
					Every archived video is still in at least one tracked source.
				</EmptyState>
			) : (
				<>
					<div className={GRID_CLASS}>
						{items.map((v) => (
							<VideoCard key={v.youtube_id} video={v} />
						))}
					</div>
					<LoadMore shown={items.length} total={total} hasNextPage={videos.hasNextPage} isFetchingNextPage={videos.isFetchingNextPage} onLoadMore={() => videos.fetchNextPage()} />
				</>
			)}
		</div>
	)
}
