import { useEffect, useState } from 'react'

/** Re-renders every `ms` so relative times ("3 minutes ago") and countdowns stay current. */
export function useNow(ms = 30_000): number {
	const [now, setNow] = useState(() => Date.now())
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), ms)
		return () => clearInterval(id)
	}, [ms])
	return now
}
