import type { RestoreReceipt } from './restore';

export interface RecoveryFile {
	readonly path: string;
	readonly byteLength: number;
	readonly stamp: string;
	readonly hash?: string;
}
export interface RecoveryFiles {
	inventory(): Promise<readonly RecoveryFile[]>;
	/** Remove only the same owned regular file observed during planning; missing files are already reclaimed. */
	remove(file: RecoveryFile): Promise<void>;
}
export interface RetentionPolicy { days: number; quotaBytes: number }
export interface CaptureAllocation { path: string; hash: string; byteLength: number }

/** Acknowledgement closes a prompt, not an uncertain write. Verified receipts keep their existing undo contract. */
export function protectsRestoreObjects(receipt: RestoreReceipt): boolean {
	return receipt.stage !== 'aborted' && (receipt.stage !== 'verified' || !receipt.undoneBy);
}
export function receiptObjects(receipt: RestoreReceipt): readonly string[] {
	return receipt.objectsReleasedAt === undefined
		? [receipt.beforeObject, receipt.beforeDiskObject, receipt.afterObject, receipt.actualDiskObject].filter((hash): hash is string => typeof hash === 'string')
		: [];
}
