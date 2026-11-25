// How a downloaded file is described to people: "1080p60 · AV1 + Opus · MKV".

type Maybe<T> = T | null | undefined

export interface FormatLike {
	width?: Maybe<number>
	height?: Maybe<number>
	fps?: Maybe<number>
	vcodec?: Maybe<string>
	acodec?: Maybe<string>
	ext?: Maybe<string>
}

const VIDEO_CODECS: Record<string, string> = { av1: 'AV1', vp9: 'VP9', vp8: 'VP8', h264: 'H.264', hevc: 'H.265' }
const AUDIO_CODECS: Record<string, string> = { opus: 'Opus', aac: 'AAC', mp3: 'MP3', vorbis: 'Vorbis', flac: 'FLAC', ac3: 'AC-3', eac3: 'E-AC-3' }

/**
 * The number YouTube would call the quality: the SHORT side of the frame, so a 1080x1920
 * Short is "1080p" like a 1920x1080 video. Null when the resolution is unknown.
 */
export function qualityHeight(f: FormatLike): number | null {
	const { width, height } = f
	if (!height) return null
	return width && width < height ? width : height
}

/** "1080p", "1080p60" (only when the frame rate is clearly above 30), or null. */
export function resolutionLabel(f: FormatLike): string | null {
	const q = qualityHeight(f)
	if (q == null) return null
	return f.fps && f.fps >= 48 ? `${q}p${Math.round(f.fps)}` : `${q}p`
}

export function videoCodecLabel(codec: Maybe<string>): string | null {
	if (!codec) return null
	return VIDEO_CODECS[codec] ?? codec.toUpperCase()
}

export function audioCodecLabel(codec: Maybe<string>): string | null {
	if (!codec) return null
	return AUDIO_CODECS[codec] ?? codec.toUpperCase()
}

/** "AV1 + Opus", "AV1" or "Opus"; null when neither is known. */
export function codecsLabel(f: FormatLike): string | null {
	return [videoCodecLabel(f.vcodec), audioCodecLabel(f.acodec)].filter(Boolean).join(' + ') || null
}

/** The pieces worth showing, in order: resolution, codecs, container. Empty when nothing is known. */
export function formatParts(f: FormatLike): string[] {
	return [resolutionLabel(f), codecsLabel(f), f.ext ? f.ext.toUpperCase() : null].filter((p): p is string => !!p)
}

export function describeFormat(f: FormatLike): string {
	return formatParts(f).join(' · ')
}

/** Plain-language verdict on a candidate replacement. */
export function upgradeVerdict(current: FormatLike, candidate: FormatLike): string {
	const before = qualityHeight(current)
	const after = qualityHeight(candidate)
	if (before == null || after == null) return 'Unknown resolution.'
	if (after > before) return `Higher quality: ${before}p → ${after}p.`
	if (after === before) return `Same resolution (${after}p). Video may still differ in codec or size.`
	return `Lower resolution than what you have (${before}p → ${after}p).`
}
