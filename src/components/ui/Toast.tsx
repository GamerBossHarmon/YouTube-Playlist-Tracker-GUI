import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ToastContext, type ToastApi } from './toastContext'

type Kind = 'success' | 'error' | 'info'
interface ToastItem {
	id: number
	kind: Kind
	message: string
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const COLORS: Record<Kind, string> = { success: 'text-success', error: 'text-danger', info: 'text-accent' }

export function ToastProvider({ children, durationMs = 5000 }: { children: ReactNode; durationMs?: number }) {
	const [items, setItems] = useState<ToastItem[]>([])
	const nextId = useRef(1)

	const dismiss = useCallback((id: number) => setItems((cur) => cur.filter((t) => t.id !== id)), [])
	const push = useCallback(
		(kind: Kind, message: string) => {
			const id = nextId.current++
			setItems((cur) => [...cur.slice(-3), { id, kind, message }]) // keep at most 4 on screen
			setTimeout(() => dismiss(id), durationMs)
		},
		[dismiss, durationMs],
	)

	const api = useMemo<ToastApi>(
		() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
		[push],
	)

	return (
		<ToastContext.Provider value={api}>
			{children}
			<div aria-live="polite" className="pointer-events-none fixed right-4 bottom-20 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 md:bottom-4">
				{items.map((t) => {
					const Icon = ICONS[t.kind]
					return (
						<div key={t.id} role="status" className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm shadow-xl">
							<Icon className={cn('mt-0.5 size-4 shrink-0', COLORS[t.kind])} aria-hidden />
							<p className="min-w-0 flex-1 break-words">{t.message}</p>
							<button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="cursor-pointer text-faint hover:text-fg">
								<X className="size-4" />
							</button>
						</div>
					)
				})}
			</div>
		</ToastContext.Provider>
	)
}
