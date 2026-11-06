import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { TestProviders } from '../../../../ui/react/test-providers';
import { PipelineCard } from './PipelineCard';
import { emptyPipeline } from '../../core/pipeline/model';
import type { PipelineVault } from '../../platform/pipeline/vault';
import { setLanguage, t } from '../../../../shared/i18n';
afterEach(cleanup);
for (const invalid of [false, true])
	test(`pipeline deadline save with invalid raw=${invalid}`, async () => {
		setLanguage('en');
		const setDue = vi.fn(async () => {}),
			read = vi.fn(async () => ({ raw: '---\nstatus: Draft\ndue: 2030-01-01\n---\nBody' }));
		const port = { setDue, read } as unknown as PipelineVault;
		const note = {
			path: 'Work/A.md',
			title: 'A',
			mtime: 1,
			ctime: 1,
			frontmatter: { status: 'Draft', due: '2030-01-01' },
		};
		const config = {
			...emptyPipeline(),
			rootFolder: 'Work',
			stages: [{ id: 'draft', value: 'Draft', label: 'Draft' }],
		};
		render(
			<TestProviders>
				<PipelineCard
					note={note}
					config={config}
					port={port}
					signal={new AbortController().signal}
					busy={false}
					skills={[]}
					canRun={() => false}
					open={() => {}}
					move={() => {}}
					refresh={() => {}}
					run={() => {}}
				/>
			</TestProviders>,
		);
		await waitFor(() => expect(read).toHaveBeenCalled());
		fireEvent.click(screen.getByRole('button', { name: /2030-01-01/ }));
		const dialog = await screen.findByRole('dialog');
		const date = within(dialog).getByLabelText(t('home.pipeline.due'));
		if (invalid) {
			fireEvent.change(date, { target: { value: '2030-02-30' } });
			fireEvent.blur(date);
		}
		fireEvent.click(within(dialog).getByRole('button', { name: t('common.save') }));
		if (invalid) expect(setDue).not.toHaveBeenCalled();
		else expect(setDue).toHaveBeenCalledWith(config, note.path, '2030-01-01', false, expect.any(AbortSignal));
	});
