import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api/client'

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5_000,
				// Client errors (404, 422, ...) will not fix themselves; transient/network ones get two retries.
				retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
			},
		},
	})
}
