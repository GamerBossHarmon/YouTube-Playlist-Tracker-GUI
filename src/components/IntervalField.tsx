import type { IntervalUnit } from '../lib/format'
import type { IntervalValue } from '../lib/interval'
import { Field, Input, Select } from './ui/Form'

interface Props {
	value: IntervalValue
	onChange: (v: IntervalValue) => void
	defaultLabel: string // e.g. "24 hours"
	error?: string | null
}

/** "Check every [ 6 ] [hours]" with a blank meaning the global default. */
export function IntervalField({ value, onChange, defaultLabel, error }: Props) {
	return (
		<Field label="Check every" hint={`Leave blank to use the default (${defaultLabel}).`} error={error}>
			{(props) => (
				<div className="flex gap-2">
					<Input
						{...props}
						type="number"
						inputMode="numeric"
						min={1}
						step={1}
						placeholder={`Default (${defaultLabel})`}
						value={value.value}
						onChange={(e) => onChange({ ...value, value: e.target.value })}
					/>
					<Select aria-label="Interval unit" value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value as IntervalUnit })} className="w-32">
						<option value="minutes">minutes</option>
						<option value="hours">hours</option>
						<option value="days">days</option>
					</Select>
				</div>
			)}
		</Field>
	)
}
