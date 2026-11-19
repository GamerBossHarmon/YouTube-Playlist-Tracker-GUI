import { createContext, useContext } from 'react'
import type { LogEvent } from '../api/types'

/** 'live' = stream open; 'connecting' = (re)connecting; the browser retries on its own. */
export type LiveStatus = 'connecting' | 'live'

export interface LiveContextValue {
	status: LiveStatus
	/** Subscribe to every log event as it arrives (the Log page's live tail). Returns an unsubscribe fn. */
	subscribe: (listener: (e: LogEvent) => void) => () => void
}

export const LiveContext = createContext<LiveContextValue>({ status: 'connecting', subscribe: () => () => { } })

export function useLive(): LiveContextValue {
	return useContext(LiveContext)
}
