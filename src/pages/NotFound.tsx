import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../components/ui/Feedback'

export function NotFoundPage({ what = 'page' }: { what?: string }) {
	return (
		<EmptyState icon={<Compass />} title={`That ${what} does not exist`} action={<Link to="/" className="rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg">Back to Home</Link>}>
			The link may be old, or the item was removed.
		</EmptyState>
	)
}
