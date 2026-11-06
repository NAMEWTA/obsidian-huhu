import { test, expect, afterEach } from 'vitest';
import { act, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createAutomationsPage } from './workbench-page';
import { fixture } from './test-fixture';
import { t, setLanguage } from '../../../shared/i18n';
afterEach(cleanup);
for (const aborted of [false, true])
	test(`real dirty guard navigation, aborted=${aborted}`, async () => {
		setLanguage('en');
		const f = fixture();
		const element = document.createElement('div');
		Object.assign(element, {
			addClass: (name: string) => element.classList.add(name),
			removeClass: (name: string) => element.classList.remove(name),
		});
		document.body.append(element);
		const lifetime = new AbortController();
		const binding = await createAutomationsPage(
			() => f.host,
			() => Error('unavailable'),
		)(
			{ app: {} as never, leaf: {} as never, contentEl: element, containerEl: element, close: () => {} },
			{ feature: 'automations', section: 'tasks' },
			{},
			lifetime.signal,
		);
		try {
			await act(() => binding.surface.onOpen());
			await userEvent.click(await screen.findByRole('button', { name: 'Edit Alpha' }));
			const dialog = await screen.findByRole('dialog');
			await userEvent.type(within(dialog).getByRole('textbox', { name: 'Name' }), ' dirty');
			const navigation = new AbortController();
			let pending!: Promise<unknown>;
			await act(() => {
				pending = binding.navigate!(
					{ feature: 'automations', section: 'tasks', resourceId: 'Beta' },
					navigation.signal,
				);
			});
			await screen.findByRole('alertdialog');
			if (aborted) navigation.abort();
			await act(async () => {
				await userEvent.click(screen.getByRole('button', { name: t('automation.discard') }));
				await pending;
			});
			expect(binding.getTarget!()).toEqual(
				aborted
					? { feature: 'automations', section: 'tasks' }
					: { feature: 'automations', section: 'tasks', resourceId: 'Beta' },
			);
		} finally {
			await act(() => binding.surface.onClose());
			element.remove();
			f.view.dispose();
		}
	});
