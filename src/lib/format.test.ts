import { describe, expect, it } from 'vitest'
import {
	formatBytes,
	formatDuration,
	formatEta,
	formatInterval,
	formatRelative,
	intervalToSeconds,
	secondsToInterval,
} from './format'

describe('formatBytes', () => {
	it('formats across units', () => {
		expect(formatBytes(0)).toBe('0 B')
		expect(formatBytes(1023)).toBe('1023 B')
		expect(formatBytes(1536)).toBe('1.5 KB')
		expect(formatBytes(474489)).toBe('463 KB')
		expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB')
	})
	it('handles missing values', () => {
		expect(formatBytes(null)).toBe('—')
		expect(formatBytes(undefined)).toBe('—')
		expect(formatBytes(-1)).toBe('—')
	})
})

describe('formatDuration', () => {
	it('formats m:ss and h:mm:ss', () => {
		expect(formatDuration(19)).toBe('0:19')
		expect(formatDuration(75)).toBe('1:15')
		expect(formatDuration(3725)).toBe('1:02:05')
	})
	it('is empty when unknown', () => {
		expect(formatDuration(null)).toBe('')
	})
})

describe('formatEta', () => {
	it('formats seconds, minutes and hours', () => {
		expect(formatEta(5)).toBe('5s')
		expect(formatEta(75)).toBe('1m 15s')
		expect(formatEta(3725)).toBe('1h 2m')
		expect(formatEta(null)).toBe('—')
	})
})

describe('formatRelative', () => {
	const now = Date.parse('2026-11-14T12:00:00Z')
	it('describes past and future', () => {
		expect(formatRelative('2026-11-14T11:59:50Z', now)).toBe('just now')
		expect(formatRelative('2026-11-14T09:00:00Z', now)).toBe('3 hours ago')
		expect(formatRelative('2026-11-12T12:00:00Z', now)).toBe('2 days ago')
		expect(formatRelative('2026-11-14T18:00:00Z', now)).toBe('in 6 hours')
	})
	it('handles missing and invalid input', () => {
		expect(formatRelative(null, now)).toBe('never')
		expect(formatRelative('garbage', now)).toBe('—')
	})
})

describe('intervals', () => {
	it('formats', () => {
		expect(formatInterval(21600)).toBe('6 hours')
		expect(formatInterval(3600)).toBe('1 hour')
		expect(formatInterval(1800)).toBe('30 minutes')
		expect(formatInterval(90)).toBe('90 seconds')
		expect(formatInterval(172800)).toBe('2 days')
	})
	it('round-trips through the form units', () => {
		expect(intervalToSeconds(6, 'hours')).toBe(21600)
		expect(secondsToInterval(21600)).toEqual({ value: 6, unit: 'hours' })
		expect(secondsToInterval(86400)).toEqual({ value: 1, unit: 'days' })
		expect(secondsToInterval(1800)).toEqual({ value: 30, unit: 'minutes' })
	})
})
