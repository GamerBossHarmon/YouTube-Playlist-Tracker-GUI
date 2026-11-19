import * as Dropdown from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Dropdown menu. `trigger` must be a single focusable element (e.g. an IconButton). */
export function Menu({ trigger, children, align = 'end' }: { trigger: ReactNode; children: ReactNode; align?: 'start' | 'end' }) {
	return (
		<Dropdown.Root>
			<Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
			<Dropdown.Portal>
				<Dropdown.Content
					align={align}
					sideOffset={6}
					className="z-50 min-w-48 rounded-xl border border-line bg-surface p-1.5 shadow-xl"
				>
					{children}
				</Dropdown.Content>
			</Dropdown.Portal>
		</Dropdown.Root>
	)
}

export function MenuItem({ icon, danger, onSelect, disabled, children }: { icon?: ReactNode; danger?: boolean; onSelect: () => void; disabled?: boolean; children: ReactNode }) {
	return (
		<Dropdown.Item
			onSelect={onSelect}
			disabled={disabled}
			className={cn(
				'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-hover [&>svg]:size-4',
				danger ? 'text-danger' : 'text-fg',
			)}
		>
			{icon}
			{children}
		</Dropdown.Item>
	)
}

export function MenuCheckbox({ checked, onCheckedChange, children }: { checked: boolean; onCheckedChange: (v: boolean) => void; children: ReactNode }) {
	return (
		<Dropdown.CheckboxItem
			checked={checked}
			onCheckedChange={onCheckedChange}
			onSelect={(e) => e.preventDefault()} // keep the menu open while toggling several filters
			className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none select-none data-[highlighted]:bg-hover"
		>
			<span className={cn('flex size-4 items-center justify-center rounded border', checked ? 'border-accent bg-accent text-bg' : 'border-faint')}>
				<Dropdown.ItemIndicator>
					<svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M2.5 6.5l2.5 2.5 4.5-5" />
					</svg>
				</Dropdown.ItemIndicator>
			</span>
			{children}
		</Dropdown.CheckboxItem>
	)
}

export function MenuSeparator() {
	return <Dropdown.Separator className="my-1 h-px bg-line" />
}
