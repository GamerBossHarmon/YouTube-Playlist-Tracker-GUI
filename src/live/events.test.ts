import { describe, expect, it } from 'vitest'
import { keysForEvent } from './events'

const roots = (keys: unknown[][]) => keys.map((k) => JSON.stringify(k))

describe('keysForEvent', () => {
	it('a finished check refreshes sources, their videos/timeline, the grid and the queue', () => {
		const keys = roots(keysForEvent({ event_type: 'source_checked', source_id: 3, video_id: null }) as unknown[][])
		expect(keys).toEqual(expect.arrayContaining(['["sources"]', '["source",3]', '["source-videos"]', '["timeline"]', '["videos"]', '["queue"]']))
	})

	it('a failed check is treated like a finished one (last-checked / check_running changed)', () => {
		const keys = roots(keysForEvent({ event_type: 'source_check_failed', source_id: 3, video_id: null }) as unknown[][])
		expect(keys).toContain('["source",3]')
	})

	it('a finished download refreshes that video, its attempts and the system disk usage', () => {
		const keys = roots(keysForEvent({ event_type: 'video_downloaded', source_id: 1, video_id: 'abc' }) as unknown[][])
		expect(keys).toEqual(expect.arrayContaining(['["video","abc"]', '["attempts","abc"]', '["videos"]', '["queue"]', '["system"]', '["source",1]']))
	})

	it('download start only touches the queue and the video', () => {
		const keys = roots(keysForEvent({ event_type: 'download_started', source_id: 1, video_id: 'abc' }) as unknown[][])
		expect(keys).toEqual(expect.arrayContaining(['["queue"]', '["video","abc"]']))
		expect(keys).not.toContain('["sources"]')
	})

	it('upgrade events refresh the video and its upgrade panel', () => {
		for (const type of ['upgrade_requested', 'upgrade_ready', 'upgrade_failed', 'upgrade_discarded']) {
			const keys = roots(keysForEvent({ event_type: type, source_id: null, video_id: 'abc' }) as unknown[][])
			expect(keys).toEqual(expect.arrayContaining(['["upgrade","abc"]', '["video","abc"]']))
		}
	})

	it('accepting an upgrade also refreshes disk usage and the grid', () => {
		const keys = roots(keysForEvent({ event_type: 'upgrade_accepted', source_id: null, video_id: 'abc' }) as unknown[][])
		expect(keys).toEqual(expect.arrayContaining(['["upgrade","abc"]', '["video","abc"]', '["videos"]', '["system"]']))
	})

	it('scheduler restart invalidates everything', () => {
		expect(keysForEvent({ event_type: 'scheduler_started', source_id: null, video_id: null })).toEqual([[]])
	})

	it('tolerates events without ids and unknown types', () => {
		expect(() => keysForEvent({ event_type: 'video_failed', source_id: null, video_id: null })).not.toThrow()
		expect(roots(keysForEvent({ event_type: 'something_new', source_id: null, video_id: null }) as unknown[][])).toEqual(['["system"]'])
	})
})
