import { useSyncExternalStore } from 'react'
import { apiIsUp, waitForRestart } from './waitForRestart'

// While ytpt restarts, the API is unreachable and pages show errors or unmount. The wait
// therefore lives outside React: this store survives those unmounts, and the Shell shows an
// overlay for as long as it is not idle.

export type RestartPhase = 'idle' | 'restarting' | 'timeout'

let phase: RestartPhase = 'idle'
const listeners = new Set<() => void>()

function set(next: RestartPhase) {
	phase = next
	for (const l of listeners) l()
}

export function useRestartPhase(): RestartPhase {
	return useSyncExternalStore(
		(l) => {
			listeners.add(l)
			return () => listeners.delete(l)
		},
		() => phase,
	)
}

/** Call after the API accepted the restart request. `onBack` runs once ytpt answers again. */
export async function watchRestart(onBack: () => void): Promise<void> {
	if (phase === 'restarting') return
	set('restarting')
	const outcome = await waitForRestart({ isUp: () => apiIsUp() })
	if (outcome === 'back') {
		set('idle')
		onBack()
	} else {
		set('timeout')
	}
}

export function dismissRestartNotice(): void {
	if (phase === 'timeout') set('idle')
}
