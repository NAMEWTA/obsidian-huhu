import { useState } from 'react';
import type { VaultDevice } from '../shared/storage/vault-identity';
import { Button } from '../ui/components/button';
import { Input } from '../ui/components/input';
import { FormField } from '../ui/components/huhu/FormField';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '../ui/components/command';
import { useT } from '../ui/react/hooks';
export function DeviceChoiceContent({
	devices,
	onChoose,
	onCancel,
}: {
	devices: readonly VaultDevice[];
	onChoose: (value: string | { label: string }) => void;
	onCancel: () => void;
}) {
	const t = useT();
	const [creating, setCreating] = useState(false);
	const [label, setLabel] = useState('');
	return creating ? (
		<form
			className="space-y-5"
			onSubmit={(event) => {
				event.preventDefault();
				if (label.trim()) onChoose({ label: label.trim() });
			}}
		>
			<FormField label={t('storage.deviceName')}>
				<Input autoFocus value={label} onChange={(event) => setLabel(event.currentTarget.value)} />
			</FormField>
			<div className="flex justify-end gap-3">
				<Button type="button" variant="secondary" onClick={onCancel}>
					{t('ui.cancel')}
				</Button>
				<Button type="submit" disabled={!label.trim()}>
					{t('ui.create')}
				</Button>
			</div>
		</form>
	) : (
		<div className="space-y-4">
			<Command>
				<CommandInput aria-label={t('storage.chooseDevice')} placeholder={t('ui.search')} />
				<CommandList>
					<CommandEmpty>{t('ui.noResults')}</CommandEmpty>
					<CommandItem
						value="new-device"
						keywords={[t('storage.newDevice')]}
						onSelect={() => setCreating(true)}
					>
						{t('storage.newDevice')}
					</CommandItem>
					{devices.map((device) => (
						<CommandItem
							key={device.id}
							value={device.id}
							keywords={[device.label]}
							onSelect={() => onChoose(device.id)}
						>
							<span className="min-w-0 flex-1 truncate">{device.label}</span>
							<span className="text-sm text-muted-foreground">{device.id.slice(0, 8)}</span>
						</CommandItem>
					))}
				</CommandList>
			</Command>
			<div className="flex justify-end">
				<Button variant="secondary" onClick={onCancel}>
					{t('ui.cancel')}
				</Button>
			</div>
		</div>
	);
}
