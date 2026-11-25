import { describe, expect, it } from 'vitest'
import { codecsLabel, describeFormat, formatParts, qualityHeight, resolutionLabel, upgradeVerdict } from './videoFormat'

describe('qualityHeight', () => {
	it('uses the height of a landscape video', () => {
		expect(qualityHeight({ width: 1920, height: 1080 })).toBe(1080)
	})

	it('uses the short side of a vertical video, like YouTube does', () => {
		expect(qualityHeight({ width: 1080, height: 1920 })).toBe(1080)
	})

	it('falls back to the height when the width is unknown, and is null with no height', () => {
		expect(qualityHeight({ height: 720 })).toBe(720)
		expect(qualityHeight({ width: 1280 })).toBeNull()
		expect(qualityHeight({})).toBeNull()
	})
})

describe('resolutionLabel', () => {
	it('adds the frame rate only for high-frame-rate video', () => {
		expect(resolutionLabel({ width: 1920, height: 1080, fps: 30 })).toBe('1080p')
		expect(resolutionLabel({ width: 1920, height: 1080, fps: 29.97 })).toBe('1080p')
		expect(resolutionLabel({ width: 1920, height: 1080, fps: 60 })).toBe('1080p60')
		expect(resolutionLabel({ width: 1920, height: 1080, fps: 59.94 })).toBe('1080p60')
	})
})

describe('upgradeVerdict', () => {
	const at = (height: number) => ({ width: Math.round((height * 16) / 9), height })

	it('says whether the candidate is better, equal or worse', () => {
		expect(upgradeVerdict(at(480), at(1080))).toBe('Higher quality: 480p → 1080p.')
		expect(upgradeVerdict(at(720), at(720))).toContain('Same resolution')
		expect(upgradeVerdict(at(1080), at(720))).toContain('Lower resolution')
	})

	it('does not guess when a resolution is unknown', () => {
		expect(upgradeVerdict({}, at(1080))).toBe('Compare the two files, then decide.')
	})
})

describe('describeFormat', () => {
	it('joins resolution, codecs and container', () => {
		expect(describeFormat({ width: 1920, height: 1080, fps: 30, vcodec: 'av1', acodec: 'opus', ext: 'mkv' })).toBe('1080p · AV1 + Opus · MKV')
		expect(describeFormat({ width: 1280, height: 720, vcodec: 'h264', acodec: 'aac', ext: 'mp4' })).toBe('720p · H.264 + AAC · MP4')
	})

	it('copes with partial and unknown data', () => {
		expect(describeFormat({ ext: 'webm' })).toBe('WEBM')
		expect(describeFormat({})).toBe('')
		expect(codecsLabel({ vcodec: 'weird' })).toBe('WEIRD')
		expect(formatParts({ vcodec: 'vp9' })).toEqual(['VP9'])
	})
})
