import { BotRpcError } from '../../core/protocol/connection';

/** Only declared admission refusals prove that no new command was committed.
 * An RPC error can also follow a committed transaction or a canceled reply.
 */
export function isDefiniteRejection(error: unknown): boolean {
	if (!(error instanceof BotRpcError)) return false;
	if (
		[
			'INVALID_ARGUMENT',
			'CAPABILITY_DENIED',
			'NOT_FOUND',
			'IDEMPOTENCY_CONFLICT',
			'SESSION_BUSY',
			'RUN_TERMINAL',
			'APPROVAL_EXPIRED',
			'PROTOCOL_INCOMPATIBLE',
			'SOURCE_CHANGED',
			'UNSAVED_EDITOR_CHANGES',
		].includes(error.data.kind)
	)
		return true;
	return (
		error.data.kind === 'CONFLICT' &&
		/^(REVISION_(?:CONFLICT|MISMATCH)|EXPECTED_REVISION_REQUIRED|PURGE_PREVIEW_(?:STALE|EXPIRED)|IMPORT_PREVIEW_(?:STALE|EXPIRED)|COMMAND_EPOCH_(?:STALE|MISMATCH)|PROFILE_MISMATCH)$/.test(
			error.data.reason,
		)
	);
}

/** Unknown outcomes retain immutable input until an explicit retry retrieves the receipt or the user abandons it. */
export class CommandAttempt<Command, Result> {
	private command?: Command;
	private inFlight?: Promise<Result>;
	uncertain = false;
	send(build: () => Command, execute: (command: Command) => Promise<Result>): Promise<Result> {
		if (this.inFlight) return this.inFlight;
		this.command ??= structuredClone(build());
		this.uncertain = false;
		const request = execute(structuredClone(this.command))
			.then((result) => {
				this.command = undefined;
				return result;
			})
			.catch((error: unknown) => {
				if (isDefiniteRejection(error)) this.command = undefined;
				else this.uncertain = true;
				throw error;
			})
			.finally(() => {
				if (this.inFlight === request) this.inFlight = undefined;
			});
		this.inFlight = request;
		return request;
	}
	discard(): void {
		if (!this.inFlight) {
			this.command = undefined;
			this.uncertain = false;
		}
	}
}
