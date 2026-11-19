import { useAccounts } from '../api/queries'
import { Field, Select } from './ui/Form'

/** "Which account reads this source?" Hidden when only the primary account exists. */
export function AccountSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
	const { data: accounts } = useAccounts()
	if (!accounts || accounts.length < 2) return null
	return (
		<Field label="Read with account" hint="Which account looks at this source, so it can see private playlists. Downloads still use the primary account.">
			{(props) => (
				<Select {...props} value={value} onChange={(e) => onChange(e.target.value)}>
					{accounts.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name}
							{a.is_primary ? ' (primary)' : ''}
						</option>
					))}
				</Select>
			)}
		</Field>
	)
}
