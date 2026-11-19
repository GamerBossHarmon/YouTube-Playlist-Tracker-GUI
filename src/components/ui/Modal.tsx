import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { IconButton } from './Button'

interface ModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	children: ReactNode
	footer?: ReactNode
	wide?: boolean
}

/** Accessible modal (focus trap, Esc to close, aria labelling) from Radix, styled for the theme. */
export function Modal({ open, onOpenChange, title, description, children, footer, wide }: ModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
				<Dialog.Content
					className={cn(
						'fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-surface-2 shadow-2xl',
						wide ? 'max-w-3xl' : 'max-w-lg',
					)}
				>
					<div className="flex items-start justify-between gap-4 p-5 pb-3">
						<div className="min-w-0">
							<Dialog.Title className="text-lg font-medium">{title}</Dialog.Title>
							{description ? (
								<Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
							) : (
								<Dialog.Description className="sr-only">{title}</Dialog.Description>
							)}
						</div>
						<Dialog.Close asChild>
							<IconButton label="Close">
								<X className="size-5" />
							</IconButton>
						</Dialog.Close>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{children}</div>
					{footer && <div className="flex flex-wrap justify-end gap-2 p-5 pt-3">{footer}</div>}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
