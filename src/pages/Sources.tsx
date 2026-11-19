import { LayoutGrid, List, ListVideo, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSources } from '../api/queries'
import { SourceCard } from '../components/SourceCard'
import { AddSourceDialog } from '../components/SourceDialogs'
import { Button, IconButton } from '../components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback'

type Layout = 'list' | 'grid'
const LAYOUT_KEY = 'ytpt.sources.layout'

function loadLayout(): Layout {
	try {
		return localStorage.getItem(LAYOUT_KEY) === 'grid' ? 'grid' : 'list'
	} catch {
		return 'list'
	}
}

export function SourcesPage() {
	const sources = useSources()
	const [adding, setAdding] = useState(false)
	const [layout, setLayout] = useState<Layout>(loadLayout)
	const chooseLayout = (l: Layout) => {
		setLayout(l)
		try {
			localStorage.setItem(LAYOUT_KEY, l)
		} catch {
			/* preference just won't persist */
		}
	}

	return (
		<div className={layout === 'grid' ? 'mx-auto max-w-6xl' : 'mx-auto max-w-4xl'}>
			<div className="mb-6 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Sources</h1>
					<p className="text-sm text-muted">Playlists, channels and videos ytpt keeps checking.</p>
				</div>
				<div className="flex items-center gap-2">
					<IconButton
						label={layout === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
						onClick={() => chooseLayout(layout === 'grid' ? 'list' : 'grid')}
					>
						{layout === 'grid' ? <List className="size-5" /> : <LayoutGrid className="size-5" />}
					</IconButton>
					<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
						Add source
					</Button>
				</div>
			</div>

			{sources.isPending ? (
				<div className="flex flex-col gap-3" aria-busy="true">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
			) : sources.isError ? (
				<ErrorState error={sources.error} onRetry={() => sources.refetch()} />
			) : sources.data.length === 0 ? (
				<EmptyState
					icon={<ListVideo />}
					title="No sources yet"
					action={
						<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
							Add a source
						</Button>
					}
				>
					Add a YouTube playlist, channel or video to start archiving.
				</EmptyState>
			) : (
				<ul className={layout === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}>
					{sources.data.map((s) => (
						<li key={s.id}>
							<SourceCard source={s} layout={layout} />
						</li>
					))}
				</ul>
			)}
			<AddSourceDialog open={adding} onOpenChange={setAdding} />
		</div>
	)
}
