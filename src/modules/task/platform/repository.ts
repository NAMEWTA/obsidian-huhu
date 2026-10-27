import { TaskError, emptyTaskState, type TaskRepository } from '../core/model';
import { decodeTaskState } from '../core/validation';

/** The adapter MUST provide an atomic latest-bytes transform; no unsafe read-then-write fallback. */
export interface TaskStorage {
	read(): Promise<string | null>;
	process(update: (current: string | null) => string): Promise<string>;
}
export function createTaskRepository(storage: TaskStorage): TaskRepository {
	let observed = false;
	const decode = (raw: string | null) => {
		if (raw === null) {
			if (observed)
				throw new TaskError('missing-store', 'Task repository was removed; restore it before writing');
			return emptyTaskState();
		}
		const state = decodeTaskState(raw);
		observed = true;
		return state;
	};
	return {
		async read() {
			return decode(await storage.read());
		},
		async transact(change) {
			const result = await storage.process((raw) => {
				const state = decode(raw),
					before = JSON.stringify(state);
				change(state);
				if (JSON.stringify(state) === before) return raw ?? JSON.stringify(state, null, 2);
				state.revision++;
				const encoded = JSON.stringify(state, null, 2);
				decodeTaskState(encoded);
				return encoded;
			});
			return decode(result);
		},
	};
}
