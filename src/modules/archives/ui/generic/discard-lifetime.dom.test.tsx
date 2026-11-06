import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { RecordEditor } from './RecordEditor';
import { ArchivesApplication } from '../../services/generic/application';
import { memoryArchives } from '../../services/generic/test-port';
import { PERSON } from '../../core/schema/presets';
import { setLanguage } from '../../../../shared/i18n';
beforeEach(() => setLanguage('en'));
test.each([false, true])('discard completion only closes its still-live editor, unmount=%s', async (unmount) => {
	const m = await memoryArchives(),
		a = new ArchivesApplication(m.runtime);
	let release = () => {};
	const pending = new Promise<void>((r) => {
		release = r;
	});
	try {
		const entity = await a.commands.create({
			operationId: 'lifetime-record',
			typeId: PERSON.id,
			values: { name: 'Before' },
		});
		const initial = await a.commands.beginEdit(entity.id);
		const discard = vi.spyOn(a.commands, 'discardDraft').mockImplementation(() => pending),
			cancel = vi.fn();
		const view = render(
			<TestProviders>
				<RecordEditor
					application={a}
					initial={initial}
					type={PERSON}
					forms={[]}
					owner={document.body}
					app={{} as never}
					guard={() => {}}
					committed={() => {}}
					cancel={cancel}
				/>
			</TestProviders>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Discard local draft' }));
		const dialog = await screen.findByRole('dialog');
		fireEvent.click(within(dialog).getByRole('button', { name: 'Discard local draft' }));
		await waitFor(() => expect(discard).toHaveBeenCalledExactlyOnceWith(initial.id));
		if (unmount) view.unmount();
		await act(async () => {
			release();
			await pending;
			await Promise.resolve();
		});
		expect(cancel).toHaveBeenCalledTimes(unmount ? 0 : 1);
	} finally {
		cleanup();
		m.runtime.dispose();
	}
});
