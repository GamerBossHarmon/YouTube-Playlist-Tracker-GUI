import * as RadixTabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export const Tabs = RadixTabs.Root

export function TabsList({ children }: { children: ReactNode }) {
	return <RadixTabs.List className="flex gap-1 border-b border-line">{children}</RadixTabs.List>
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
	return (
		<RadixTabs.Trigger
			value={value}
			className={cn(
				'-mb-px cursor-pointer border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-fg',
				'data-[state=active]:border-fg data-[state=active]:text-fg',
			)}
		>
			{children}
		</RadixTabs.Trigger>
	)
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
	return (
		<RadixTabs.Content value={value} className="pt-5 focus-visible:outline-none">
			{children}
		</RadixTabs.Content>
	)
}
