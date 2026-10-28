import { createConnection, type Socket } from 'node:net';
import { setTimeout, clearTimeout } from 'node:timers';
import { AgentBrowserError, type ControlLease } from '../../../core/contracts';
import { JsonFrames, writeJsonFrame } from './framing';
export interface CdpFrame {
	method: string;
	params?: Record<string, unknown>;
	sessionId?: string;
}
interface Pending {
	resolve(value: unknown): void;
	reject(error: Error): void;
	timer: ReturnType<typeof setTimeout>;
}
export class NativeCdp {
	private socket?: Socket;
	private next = 0;
	private dispatchId = 0;
	private pending = new Map<number, Pending>();
	private dispatch = new Map<number, number[]>();
	private ended = false;
	constructor(
		private event: (method: string, params: Record<string, unknown>, session?: string) => void,
		private fault: () => void,
	) {}
	async connect(port: number, token: string): Promise<void> {
		const socket = createConnection({ host: '127.0.0.1', port });
		this.socket = socket;
		socket.setNoDelay(true);
		const frames = new JsonFrames();
		socket.on('data', (bytes: Buffer) => {
			try {
				frames.push(bytes, (value) => this.receive(value));
			} catch {
				this.fail();
			}
		});
		socket.on('error', () => this.fail());
		socket.on('close', () => this.fail());
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				socket.destroy();
				reject(new AgentBrowserError('browser_worker_connect_failed'));
			}, 5000);
			socket.once('connect', () => {
				clearTimeout(timeout);
				writeJsonFrame(socket, { token });
				resolve();
			});
			socket.once('error', () => {
				clearTimeout(timeout);
				reject(new AgentBrowserError('browser_worker_connect_failed'));
			});
		});
	}
	private receive(value: Record<string, unknown>): void {
		if (value.type === 'dispatch') {
			const ids = this.dispatch.get(Number(value.id)) ?? [];
			this.dispatch.delete(Number(value.id));
			if (typeof value.error === 'string') for (const id of ids) this.finish(id, undefined, value.error);
			return;
		}
		if (value.type !== 'cdp') return;
		const message = value.message as {
			id?: number;
			method?: string;
			params?: Record<string, unknown>;
			sessionId?: string;
			result?: unknown;
			error?: unknown;
		};
		if (message.id !== undefined)
			this.finish(message.id, message.result, message.error ? 'browser_cdp_error' : undefined);
		else if (message.method) this.event(message.method, message.params ?? {}, message.sessionId);
	}
	private finish(id: number, value?: unknown, error?: string): void {
		const task = this.pending.get(id);
		if (!task) return;
		this.pending.delete(id);
		clearTimeout(task.timer);
		for (const [d, ids] of this.dispatch)
			if (ids.includes(id)) {
				const rest = ids.filter((v) => v !== id);
				if (rest.length) this.dispatch.set(d, rest);
				else this.dispatch.delete(d);
			}
		error ? task.reject(new AgentBrowserError(error)) : task.resolve(value);
	}
	command(
		method: string,
		params: Record<string, unknown> = {},
		sessionId?: string,
		authority?: ControlLease,
	): Promise<unknown> {
		return this.send([{ method, params, ...(sessionId ? { sessionId } : {}) }], authority).then(
			(values) => values[0],
		);
	}
	gesture(frames: CdpFrame[], authority: ControlLease): Promise<unknown[]> {
		return this.send(frames, authority);
	}
	private send(frames: CdpFrame[], authority?: ControlLease): Promise<unknown[]> {
		if (this.ended || !this.socket || this.pending.size + frames.length > 256)
			return Promise.reject(new AgentBrowserError('browser_runtime_unavailable'));
		const ids: number[] = [];
		const waits = frames.map(() => {
			const id = ++this.next;
			ids.push(id);
			return new Promise<unknown>((resolve, reject) => {
				const timer = setTimeout(() => this.finish(id, undefined, 'outcome_unknown'), 30000);
				timer.unref();
				this.pending.set(id, { resolve, reject, timer });
			});
		});
		const id = ++this.dispatchId;
		this.dispatch.set(id, ids);
		try {
			writeJsonFrame(this.socket, {
				id,
				lane: authority ? 'lease' : 'maintenance',
				...(authority
					? { epoch: authority.epoch, leaseId: authority.leaseId, controllerId: authority.controllerId, deadlineAtMs: authority.expiresAt }
					: {}),
				frames: frames.map((frame, index) => ({ ...frame, id: ids[index] })),
			});
		} catch {
			for (const n of ids) this.finish(n, undefined, 'browser_transport_backpressure');
			this.close();
		}
		return Promise.all(waits);
	}
	private fail(): void {
		if (this.ended) return;
		this.ended = true;
		for (const id of this.pending.keys()) this.finish(id, undefined, 'outcome_unknown');
		this.socket?.destroy();
		this.fault();
	}
	close(): void {
		if (this.ended) return;
		this.ended = true;
		for (const id of this.pending.keys()) this.finish(id, undefined, 'browser_transport_closed');
		this.socket?.destroy();
	}
}
