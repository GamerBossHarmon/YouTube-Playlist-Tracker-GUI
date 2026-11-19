import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
	primary: 'bg-fg text-bg hover:bg-white',
	secondary: 'bg-surface text-fg hover:bg-hover',
	ghost: 'text-fg hover:bg-surface',
	danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant
	size?: 'sm' | 'md'
	icon?: ReactNode
	loading?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon, loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
	return (
		<button
			type={type}
			disabled={disabled || loading}
			className={cn(
				'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
				size === 'sm' ? 'h-8 px-3 text-sm' : 'h-9 px-4 text-sm',
				VARIANTS[variant],
				className,
			)}
			{...rest}
		>
			{loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
			{children}
		</button>
	)
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	label: string
	variant?: Exclude<Variant, 'primary'>
}

/** Icon-only button: `label` is required so it always has an accessible name. */
export function IconButton({ label, variant = 'ghost', className, children, type = 'button', ...rest }: IconButtonProps) {
	return (
		<button
			type={type}
			aria-label={label}
			title={label}
			className={cn(
				'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-50',
				VARIANTS[variant],
				className,
			)}
			{...rest}
		>
			{children}
		</button>
	)
}
