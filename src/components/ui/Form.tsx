import * as RadixSwitch from '@radix-ui/react-switch'
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const controlClass =
	'h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none disabled:opacity-50'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
	return <input className={cn(controlClass, className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select className={cn(controlClass, 'cursor-pointer pr-8', className)} {...rest}>
			{children}
		</select>
	)
}

/** Label + control + hint/error, wired together for screen readers. */
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode }) {
	const id = useId()
	const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className="text-sm font-medium">
				{label}
			</label>
			{children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
			{error ? (
				<p id={`${id}-error`} role="alert" className="text-xs text-danger">
					{error}
				</p>
			) : hint ? (
				<p id={`${id}-hint`} className="text-xs text-muted">
					{hint}
				</p>
			) : null}
		</div>
	)
}

export function Switch({ checked, onCheckedChange, label, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean }) {
	return (
		<RadixSwitch.Root
			checked={checked}
			onCheckedChange={onCheckedChange}
			disabled={disabled}
			aria-label={label}
			className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full bg-hover transition-colors data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
		>
			<RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
		</RadixSwitch.Root>
	)
}
