import type { BotMethodMap, HostInvoke, HostLease, HostReceipt, HostReceiptQuery } from '../../../api';

export type PrepareWriteRequest = BotMethodMap['host.prepareWrite']['params'];
export type PrepareWriteResult = BotMethodMap['host.prepareWrite']['result'];
export type CheckWriteRequest = BotMethodMap['host.checkWrite']['params'];
export interface NoteEffects {
	setLease(lease: HostLease | undefined): void;
	prepareWrite(request: PrepareWriteRequest, signal: AbortSignal): Promise<PrepareWriteResult>;
	checkWrite(request: CheckWriteRequest, signal: AbortSignal): Promise<{ valid: true }>;
	invoke(request: HostInvoke, signal: AbortSignal): Promise<HostReceipt>;
	queryReceipt(request: HostReceiptQuery, signal: AbortSignal): Promise<HostReceipt>;
	dispose(): void;
}
