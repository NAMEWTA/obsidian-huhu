import { diffAcceptRejectHunk, type FileDiffMetadata } from '@pierre/diffs';
import { applySelectedHunks, restoreHunks, type HunkDiff } from '../../core/hunk-restore';
import { displayText } from './preferences';

/** Map complete library hunks to the existing raw-byte recovery proof; never infer offsets from painted rows. */
export function hunkProof(source: string, target: string, metadata: FileDiffMetadata): HunkDiff {
	if (metadata.isPartial) throw new Error('versioning.restore.hunks-unavailable');
	const left = displayText(source),
		right = displayText(target);
	const offsets = (lines: string[]) => {
		const values = [0];
		for (const line of lines) values.push(values.at(-1)! + line.length);
		return values;
	};
	const a = offsets(metadata.deletionLines),
		b = offsets(metadata.additionLines);
	if (metadata.deletionLines.join('') !== left || metadata.additionLines.join('') !== right)
		throw new Error('versioning.restore.hunks-unavailable');
	const chunks = metadata.hunks.flatMap((hunk) => {
		const changes = hunk.hunkContent.filter((content) => content.type === 'change');
		const first = changes[0],
			last = changes.at(-1);
		return first && last
			? [
					{
						fromA: a[Math.max(0, first.deletionLineIndex)]!,
						toA: a[Math.max(0, last.deletionLineIndex + last.deletions)]!,
						fromB: b[Math.max(0, first.additionLineIndex)]!,
						toB: b[Math.max(0, last.additionLineIndex + last.additions)]!,
						precise: true,
					},
				]
			: [];
	});
	const proof = { left, right, precise: true, chunks };
	if (chunks.length) restoreHunks(source, target, proof);
	return proof;
}

/** Library accept/reject is cross-checked with the existing byte-preserving writer projection. */
export function hunkCandidate(
	source: string,
	target: string,
	metadata: FileDiffMetadata,
	index: number,
	action: 'accept' | 'reject',
): string {
	const proof = hunkProof(source, target, metadata);
	const chunk = proof.chunks[index];
	if (!chunk) throw new Error('versioning.restore.hunks-unavailable');
	const selected = [`${chunk.fromA}:${chunk.toA}:${chunk.fromB}:${chunk.toB}`];
	const candidate =
		action === 'reject'
			? applySelectedHunks(source, target, proof, selected)
			: applySelectedHunks(
					target,
					source,
					{
						left: proof.right,
						right: proof.left,
						precise: true,
						chunks: proof.chunks.map((item) => ({
							fromA: item.fromB,
							toA: item.toB,
							fromB: item.fromA,
							toB: item.toA,
							precise: true,
						})),
					},
					[`${chunk.fromB}:${chunk.toB}:${chunk.fromA}:${chunk.toA}`],
				);
	const result = diffAcceptRejectHunk(metadata, index, action);
	const projected = (action === 'accept' ? result.deletionLines : result.additionLines).join('');
	if (displayText(candidate) !== projected) throw new Error('versioning.restore.hunks-unavailable');
	return candidate;
}
