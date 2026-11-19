import { intervalToSeconds, type IntervalUnit } from './format'

export interface IntervalValue {
	value: string // '' = use the global default
	unit: IntervalUnit
}

/** Parse the form value: null = blank (global default), 'invalid' = not a positive number, else seconds. */
export function intervalSeconds(v: IntervalValue): number | null | 'invalid' {
	if (v.value.trim() === '') return null
	const n = Number(v.value)
	if (!Number.isFinite(n) || n <= 0) return 'invalid'
	return intervalToSeconds(n, v.unit)
}
