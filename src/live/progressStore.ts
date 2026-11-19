import { useSyncExternalStore } from 'react'
import type { LiveProgress } from '../api/types'

// Live download progress: ephemeral, high-frequency, so it lives outside
// TanStack Query. Each SSE 'progress' frame is a full snapshot and replaces the map.

const EMPTY: ReadonlyMap<string, LiveProgress> = new Map()
let snapshot: ReadonlyMap<string, LiveProgress> = EMPTY
const listeners = new Set<() => void>()

function emit() {
	for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function setProgress(items: LiveProgress[]): void {
	snapshot = items.length ? new Map(items.map((p) => [p.video_id, p])) : EMPTY
	emit()
}

export function clearProgress(): void {
	if (snapshot !== EMPTY) setProgress([])
}

export function getProgressSnapshot(): ReadonlyMap<string, LiveProgress> {
	return snapshot
}

export function useAllProgress(): ReadonlyMap<string, LiveProgress> {
	return useSyncExternalStore(subscribe, getProgressSnapshot)
}

export function useProgress(videoId: string): LiveProgress | undefined {
	return useSyncExternalStore(subscribe, () => snapshot.get(videoId))
}
