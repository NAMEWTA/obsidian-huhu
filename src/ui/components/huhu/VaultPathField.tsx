import { useEffect, useMemo, useState } from 'react';
import type { App } from 'obsidian';
import { ensureVaultFolder, vaultPathItems } from '../../../shared/vault-path';
import { PathPicker } from './PathPicker';

/**
 * A path field bound to the open vault: suggestions come from its folders (or files), and a folder typed by hand
 * that does not exist yet is created as soon as the value is accepted, so the setting can be used right away.
 * `onChange` receives the normalised vault-relative path.
 */
export function VaultPathField({
	app,
	value,
	onChange,
	kind = 'folder',
	create,
	onError,
	...rest
}: {
	app: App;
	value: string;
	onChange: (path: string) => void;
	kind?: 'file' | 'folder';
	/** Create a missing folder when the value is accepted. Defaults to on for folder fields. */
	create?: boolean;
	onError?: (error: unknown) => void;
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	allowCreate?: boolean;
	className?: string;
}) {
	const [revision, setRevision] = useState(0);
	useEffect(() => {
		const bump = () => setRevision((current) => current + 1);
		const refs = [app.vault.on('create', bump), app.vault.on('delete', bump), app.vault.on('rename', bump)];
		return () => refs.forEach((ref) => app.vault.offref(ref));
	}, [app]);
	// eslint-disable-next-line react-hooks/exhaustive-deps -- `revision` stands for the vault's contents
	const items = useMemo(() => vaultPathItems(app.vault, kind), [app, kind, revision]);
	return (
		<PathPicker
			{...rest}
			kind={kind}
			value={value}
			items={items}
			onChange={(path) => {
				onChange(path);
				if ((create ?? kind === 'folder') && path)
					void ensureVaultFolder(app.vault, path).then(() => setRevision((current) => current + 1), (error: unknown) => onError?.(error));
			}}
		/>
	);
}
