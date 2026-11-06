import type { App } from 'obsidian';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { FeedbackHost } from '../../../../host/obsidian/feedback';
import { ModuleRegistry } from '../../../../app/modules/registry';
import { MANIFESTS } from '../../../../app/manifests';
import { TestProviders } from '../../../../ui/react/test-providers';
import { setLanguage } from '../../../../shared/i18n';
import { memoryArchives } from '../../services/generic/test-port';
import { ArchivesApplication } from '../../services/generic/application';
import { PERSON } from '../../core/schema/presets';
import { patchProperties } from '../../core/generic/markdown';
import { RecordEditor } from './RecordEditor';

test('archives save conflict still reports after notifications is disabled, preserving the real draft', async () => {
	setLanguage('en');
	const registry = new ModuleRegistry(
		MANIFESTS.filter((manifest) => manifest.id === 'notifications'),
		{
			env: { desktop: true, mobile: false, phone: false },
			enabled: () => false,
			createContext: () => {
				throw new Error('Disabled notifications must not activate');
			},
			releaseContext: () => {},
			report: () => {
				throw new Error('Unexpected module error');
			},
		},
	);
	await registry.apply(['startup', 'layout-ready']);
	expect(registry.state('notifications')).toBe('off');
	const notices: HTMLElement[] = [];
	const host = new FeedbackHost({
		mount: async () => {
			throw new Error('No workbench is open');
		},
		notice: () => {
			const containerEl = document.createElement('div');
			notices.push(containerEl);
			return {
				containerEl,
				setMessage: (message) => {
					containerEl.replaceChildren(message);
					return {} as never;
				},
				hide: () => containerEl.remove(),
			};
		},
	});
	host.bind(window);
	const { runtime, files } = await memoryArchives();
	const application = new ArchivesApplication(runtime);
	try {
		const receipt = await application.commands.create({
			operationId: 'feedback-record',
			typeId: PERSON.id,
			values: { name: 'Original' },
		});
		const initial = await application.commands.beginEdit(receipt.id);
		let committed = false;
		render(
			<TestProviders>
				<RecordEditor
					application={application}
					initial={initial}
					type={PERSON}
					forms={[]}
					app={{} as App}
					owner={document.body}
					guard={() => {}}
					committed={() => {
						committed = true;
					}}
					cancel={() => {}}
				/>
			</TestProviders>,
		);
		fireEvent.change(screen.getByLabelText('Name *', { selector: 'input' }), { target: { value: 'SECRET-DRAFT' } });
		files.external(receipt.path, patchProperties(files.text.get(receipt.path)!, { name: 'Other writer' }));
		fireEvent.click(screen.getByRole('button', { name: 'Save active record' }));
		await waitFor(() => expect(notices).toHaveLength(1));
		expect(notices[0]?.textContent).toBe('The record could not be saved. Keep your changes and try again.');
		expect(notices[0]?.textContent).not.toContain('SECRET-');
		expect(committed).toBe(false);
		expect(screen.getByLabelText<HTMLInputElement>('Name *', { selector: 'input' }).value).toBe('SECRET-DRAFT');
		expect((await application.commands.drafts())[0]?.draft.name).toBe('SECRET-DRAFT');
		cleanup();
		expect(notices[0]?.isConnected).toBe(true);
	} finally {
		cleanup();
		runtime.dispose();
		host.dispose();
		registry.disposeNow();
		setLanguage('zh');
	}
});
