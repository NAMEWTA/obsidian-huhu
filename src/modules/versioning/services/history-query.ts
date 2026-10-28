import type {
	ComparisonRequest,
	FileHistoryPage,
	HistoryOptions,
	ResolvedComparison,
	ResolvedEndpoint,
	RevisionFileChange,
	RevisionReader,
	RevisionRef,
	VersioningQueries,
} from '../core/history';
import { GitError } from '../core/errors';
import type { GitRepo } from '../core/repo';
import type { LocalHistoryStore } from './local-history-store';
import { isInlineRevision, resolveInlineRevision } from './local-snapshot-reader';

/** Supplied by the existing repository lifecycle; no second Git backend or protection writes. */
export interface HistoryRepositoryAccess {
	readonly repositoryId: string;
	readonly repo: GitRepo;
	readonly reader: RevisionReader;
}

export class HistoryQueryService implements VersioningQueries {
	constructor(private readonly access: () => Promise<HistoryRepositoryAccess>, private readonly local?: () => LocalHistoryStore | undefined) {}

	async localHistory(path: string, signal?: AbortSignal) {
		if (signal?.aborted) throw new GitError('cancelled');
		const entries = await this.local?.()?.list(path) ?? [];
		if (signal?.aborted) throw new GitError('cancelled');
		return entries.map(entry => ({ id: entry.id, commitOid: '', parents: [], author: '', time: entry.createdAt / 1000,
			subject: '', pathAtRevision: path, status: 'M',
			ref: { kind: 'local-snapshot' as const, path, snapshotId: entry.id, text: '' } }));
	}
	async readLocalSnapshot(id: string, signal?: AbortSignal): Promise<string> {
		if (signal?.aborted) throw new GitError('cancelled');
		const local = this.local?.();
		if (!local) throw new Error('versioning.localHistory.missing');
		const text = await local.readSnapshot(id);
		if (signal?.aborted) throw new GitError('cancelled');
		return text;
	}

	async fileHistory(path: string, options: HistoryOptions = {}): Promise<FileHistoryPage> {
		const { repo } = await this.repository(options.signal);
		return repo.fileHistory(path, options);
	}

	async resolveCommit(ref: string, signal?: AbortSignal): Promise<string | null> {
		const { repo } = await this.repository(signal);
		return repo.resolveCommit(ref, signal);
	}

	async resolve(ref: RevisionRef, signal?: AbortSignal): Promise<ResolvedEndpoint> {
		if (isInlineRevision(ref)) return resolveInlineRevision(ref, 'local-history', signal);
		const { reader } = await this.repository(signal);
		return reader.resolve(ref, { signal });
	}

	async changedFiles(
		leftCommit: string | null,
		rightCommit: string,
		signal?: AbortSignal,
	): Promise<readonly RevisionFileChange[]> {
		const { repo } = await this.repository(signal);
		return repo.changedFiles(leftCommit, rightCommit, signal);
	}

	async compare(request: ComparisonRequest, signal?: AbortSignal): Promise<ResolvedComparison> {
		if (!request.repositoryId && isInlineRevision(request.left) && isInlineRevision(request.right)) {
			const repositoryId = request.repositoryId ?? 'local-history';
			const [left, right] = await Promise.all([resolveInlineRevision(request.left, repositoryId, signal), resolveInlineRevision(request.right, repositoryId, signal)]);
			return Object.freeze({ id: `${left.id}\0${right.id}`, repositoryId, intent: request.intent, left, right, capturedAt: Date.now(),
				identical: left.status === 'text' && right.status === 'text' ? left.snapshot.hash === right.snapshot.hash : left.status === 'missing' && right.status === 'missing',
				canCompare: [left, right].every(endpoint => endpoint.status === 'text' || endpoint.status === 'missing') });
		}
		return this.compareWithin(await this.repository(signal), request, signal);
	}

	async commitComparison(
		commit: string,
		path: string,
		parent?: string,
		signal?: AbortSignal,
	): Promise<ResolvedComparison> {
		const access = await this.repository(signal);
		const detail = await access.repo.commitDetail(commit, signal);
		const selected = parent ? await access.repo.requireCommit(parent, signal) : detail.parents[0];
		if (selected && !detail.parents.includes(selected))
			throw new GitError('unknown', 'selected revision is not a commit parent');
		const files = await access.repo.changedFiles(selected ?? null, detail.hash, signal);
		const change = files.find((file) => file.path === path);
		return this.compareWithin(
			access,
			{
				repositoryId: access.repositoryId,
				intent: 'commit',
				left: selected
					? { kind: 'commit', commit: selected, path: change?.from ?? path }
					: { kind: 'empty', path },
				right: { kind: 'commit', commit: detail.hash, path },
			},
			signal,
		);
	}

	private async repository(signal?: AbortSignal): Promise<HistoryRepositoryAccess> {
		if (signal?.aborted) throw new GitError('cancelled');
		const access = await this.access();
		if (signal?.aborted) throw new GitError('cancelled');
		return access;
	}

	private async compareWithin(
		access: HistoryRepositoryAccess,
		request: ComparisonRequest,
		signal?: AbortSignal,
	): Promise<ResolvedComparison> {
		if (request.repositoryId && request.repositoryId !== access.repositoryId)
			throw new GitError('not-repo', 'comparison repository changed');
		// Resolve repeated named refs once so both endpoints of one review share the same immutable object.
		const refs = new Map<string, Promise<string>>();
		const pin = async (ref: RevisionRef): Promise<RevisionRef> => {
			if (ref.kind !== 'commit') return Object.freeze({ ...ref });
			let resolved = refs.get(ref.commit);
			if (!resolved) {
				resolved = access.repo.requireCommit(ref.commit, signal);
				refs.set(ref.commit, resolved);
			}
			return { ...ref, commit: await resolved };
		};
		const [leftRef, rightRef] = await Promise.all([pin(request.left), pin(request.right)]);
		const [left, right] = await Promise.all([
			access.reader.resolve(leftRef, { signal }),
			access.reader.resolve(rightRef, { signal }),
		]);
		if (signal?.aborted) throw new GitError('cancelled');
		const usable = (endpoint: ResolvedEndpoint) => endpoint.status === 'text' || endpoint.status === 'missing';
		const identical =
			left.status === 'text' && right.status === 'text'
				? left.snapshot.hash === right.snapshot.hash
				: left.status === 'missing' && right.status === 'missing';
		return Object.freeze({
			id: `${left.id}\0${right.id}`,
			repositoryId: access.repositoryId,
			intent: request.intent,
			left,
			right,
			capturedAt: Date.now(),
			identical,
			canCompare: usable(left) && usable(right),
		});
	}
}
