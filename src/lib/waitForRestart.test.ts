import { describe, expect, it } from 'vitest'
import { waitForRestart } from './waitForRestart'

/** A fake clock: sleeping just advances time. */
function clock() {
	let t = 0
	return { now: () => t, sleep: async (ms: number) => void (t += ms) }
}

describe('waitForRestart', () => {
	it('returns once the API has gone down and come back', async () => {
		const c = clock()
		const answers = [true, true, false, false, false, true]
		let calls = 0
		const result = await waitForRestart({ ...c, isUp: async () => answers[Math.min(calls++, answers.length - 1)] })
		expect(result).toBe('back')
		expect(calls).toBe(6) // did not accept the early "up" answers while the old process was still shutting down
	})

	it('stops waiting for the outage after the grace period (a restart too fast to notice)', async () => {
		const c = clock()
		const result = await waitForRestart({ ...c, isUp: async () => true, downGraceMs: 5000, intervalMs: 1000 })
		expect(result).toBe('back')
		expect(c.now()).toBeGreaterThanOrEqual(5000)
	})

	it('gives up when the API never returns', async () => {
		const c = clock()
		const result = await waitForRestart({ ...c, isUp: async () => false, timeoutMs: 10_000 })
		expect(result).toBe('timeout')
	})
})
