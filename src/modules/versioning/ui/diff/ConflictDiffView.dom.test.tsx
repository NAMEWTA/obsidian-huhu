import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { TestProviders } from '../../../../ui/react/test-providers';
import { t } from '../../../../shared/i18n';
import type { ResolvedEndpoint, VersioningQueries } from '../../core/history';
import type { SyncService } from '../../services/sync-service';
import type { RestoreService } from '../../services/restore-service';
import { ConflictDiffView } from './ConflictDiffView';

vi.mock('./owner-pool', () => ({ DiffOwner: ({ children }: { children: import('react').ReactNode }) => children }));
vi.mock('../dialogs', () => ({ confirmAction: async () => true }));
const cases = (['current', 'incoming', 'both'] as const).flatMap((resolution) => [
	{ resolution, format: 'lf', eol: '\n', bom: false, first: false, multiple: false },
	{ resolution, format: 'crlf-bom', eol: '\r\n', bom: true, first: false, multiple: false },
	{ resolution, format: 'bom-first-marker', eol: '\r\n', bom: true, first: true, multiple: false },
	{ resolution, format: 'mixed-eol', eol: '\n', bom: true, first: false, multiple: false },
	{ resolution, format: 'multiple-conflicts', eol: '\r\n', bom: true, first: false, multiple: true },
]);
test.each(cases)(
	'conflict $resolution/$format uses the real library candidate and retains the source after a failed write',
	async ({ resolution, eol, bom, first, multiple, format }) => {
		const second = multiple
			? `between${eol}<<<<<<< second${eol}other current${eol}=======${eol}other incoming${eol}>>>>>>> branch${eol}`
			: '';
		const currentEol = format === 'mixed-eol' ? '\r\n' : eol;
		const text =
			(bom ? '\uFEFF' : '') +
			(first ? '' : `intro${eol}`) +
			`<<<<<<< HEAD${eol}current choice${currentEol}=======${eol}incoming choice${eol}>>>>>>> incoming${eol}tail${eol}` +
			second;
		const source: ResolvedEndpoint = {
			repositoryId: 'repo',
			id: `marker-source:${text}`,
			path: 'note.md',
			ref: { kind: 'worktree', path: 'note.md' },
			label: 'worktree',
			status: 'text',
			snapshot: {
				text,
				hash: text,
				byteLength: text.length,
				encoding: 'utf-8',
				eol: eol === '\n' ? 'lf' : 'crlf',
				hasBom: bom,
				endsWithNewline: true,
			},
		};
		const resolve = vi.fn(async () => source),
			apply = vi.fn(async () => {
				throw new Error('checkpoint failed');
			});
		const prepare = vi.fn(async () => ({ id: 'plan', beforeText: text })),
			cancel = vi.fn();
		const service = {
			conflictAdmission: async () => ({
				repositoryId: 'repo',
				targetPath: 'note.md',
				path: 'note.md',
				worktreeId: source.id,
			}),
		} as unknown as SyncService;
		const restores = { prepare, apply, cancel } as unknown as RestoreService;
		const queries = { resolve } as unknown as VersioningQueries;
		const view = render(
			<TestProviders>
				<ConflictDiffView
					app={{} as never}
					path="note.md"
					revision={0}
					queries={queries}
					service={service}
					restores={restores}
				/>
			</TestProviders>,
		);
		fireEvent.click((await screen.findAllByRole('button', { name: t(`versioning.conflict.${resolution}`) }))[0]!);
		await screen.findByRole('alert');
		const expected =
			(bom ? '\uFEFF' : '') +
			(first ? '' : `intro${eol}`) +
			(resolution === 'current'
				? `current choice${currentEol}`
				: resolution === 'incoming'
					? `incoming choice${eol}`
					: `current choice${currentEol}incoming choice${eol}`) +
			`tail${eol}` +
			second;
		expect(prepare).toHaveBeenCalledWith(
			expect.objectContaining({
				source: expect.objectContaining({ id: source.id, text: expected }),
				targetPath: 'note.md',
				mode: 'replace-current',
				conflict: expect.objectContaining({ worktreeId: source.id }),
			}),
		);
		expect(apply).toHaveBeenCalledWith('plan');
		expect(cancel).toHaveBeenCalledWith('plan');
		expect(resolve).toHaveBeenCalledOnce();
		expect(source.snapshot.text).toBe(text);
		expect(view.container.querySelectorAll('diffs-container')).toHaveLength(1);
		await waitFor(() =>
			expect(
				screen.getAllByRole<HTMLButtonElement>('button', { name: t(`versioning.conflict.${resolution}`) })[0]!
					.disabled,
			).toBe(false),
		);
	},
);
