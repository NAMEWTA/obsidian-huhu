import { AgentBrowserError, type BrowserFrame, type RuntimeEvent } from '../../../core/contracts';
import { BrowserDriver } from './driver';
import type { WorkerInit, WorkerRequest, WorkerResponse, WorkerResult } from './wire';

interface ParentPort {
	on(name: 'message', listener: (message: { data: WorkerInit | WorkerRequest }) => void): void;
	postMessage(message: WorkerResponse): void;
}
const parent = (process as unknown as { parentPort?: ParentPort }).parentPort;
if (!parent) throw new Error('browser_requires_utility_process');
const port = parent;
let driver: BrowserDriver | undefined;
let initialized = false;
let stopped = false;
let queue = Promise.resolve();
let queued = 0;
let controlEpoch = 0;
const urgentActions = new Set<Promise<void>>();
const frames = new Map<string, { inFlight: boolean; latest?: BrowserFrame }>();

function emit(event: RuntimeEvent): void {
	if (stopped) return;
	if (event.kind === 'page-closed') frames.delete(event.pageId);
	if (event.kind !== 'frame') {
		port.postMessage({ type: 'event', event });
		return;
	}
	const state = frames.get(event.frame.pageId) ?? { inFlight: false };
	frames.set(event.frame.pageId, state);
	if (state.inFlight) {
		state.latest = event.frame;
		return;
	}
	state.inFlight = true;
	// Electron's structured clone transports Uint8Array, never a JSON array of pixels.
	port.postMessage({ type: 'event', event });
}
function ack(pageId: string): void {
	const state = frames.get(pageId);
	if (!state) return;
	state.inFlight = false;
	const next = state.latest;
	state.latest = undefined;
	if (next) emit({ kind: 'frame', frame: next });
}
async function dispatch(message: WorkerRequest): Promise<WorkerResult> {
	const current = driver;
	if (!current || (stopped && message.type !== 'stop')) throw new AgentBrowserError('browser_worker_not_ready');
	switch (message.type) {
		case 'control':
			await current.setControl(message.lease, message.epoch);
			return;
		case 'create':
			return current.createPage(message.pageId, message.url, message.authority);
		case 'close':
			await current.closePage(message.pageId, message.authority);
			return;
		case 'execute':
			return current.execute(message.pageId, message.command, message.authority, message.uploadPaths);
		case 'observe':
			return current.observe(message.pageId, message.authority, message.scope);
		case 'watch':
			if (!message.enabled) frames.delete(message.pageId);
			await current.watch(message.pageId, message.enabled);
			return;
		case 'readIdentity':
			return current.readIdentity(message.authority);
		case 'writeIdentity':
			await current.writeIdentity(message.seed, message.authority);
			return;
		case 'cancelDownload':
			await current.cancelDownload(message.downloadId);
			return;
		case 'frameAck':
			ack(message.pageId);
			return;
		case 'stop':
			stopped = true;
			frames.clear();
			current.stop();
			return;
	}
}
async function respond(message: WorkerRequest, settling?: Promise<unknown>): Promise<void> {
	try {
		const value = await dispatch(message);
		await settling;
		port.postMessage({ type: 'result', id: message.id, value });
	} catch (error) {
		port.postMessage({
			type: 'result',
			id: message.id,
			error: error instanceof AgentBrowserError ? error.code : 'browser_worker_failed',
		});
	}
}
port.on('message', ({ data }) => {
	if (data.type === 'init') {
		if (initialized) return;
		initialized = true;
		driver = new BrowserDriver(
			data.spaceId,
			data.runtimeId,
			data.downloadPath,
			data.fresh,
			data.provisioning,
			emit,
		);
		void driver
			.start(data.port, data.token)
			.then((version) => port.postMessage({ type: 'ready', version }))
			.catch((error) => {
				emit({
					kind: 'fault',
					runtimeId: data.runtimeId,
					code: error instanceof AgentBrowserError ? error.code : 'browser_worker_failed',
				});
			});
		return;
	}
	if (!Number.isSafeInteger(data.id) || data.id <= 0) return;
	// Native revocation never waits for this mailbox. Mirror the new epoch urgently,
	// then acknowledge handoff only after all previously admitted page work settles.
	const urgent =
		['control', 'watch', 'frameAck', 'cancelDownload', 'stop'].includes(data.type) ||
		(data.type === 'execute' && ['dialog', 'chooser'].includes(data.command.kind));
	if (urgent) {
		if (data.type === 'control' && data.epoch > controlEpoch) {
			controlEpoch = data.epoch;
			frames.clear();
			void respond(data, Promise.all([queue, ...urgentActions]));
		} else if (data.type === 'execute') {
			const task = respond(data);
			urgentActions.add(task);
			void task.finally(() => urgentActions.delete(task));
		} else void respond(data);
		return;
	}
	if (queued >= 64) {
		port.postMessage({ type: 'result', id: data.id, error: 'browser_worker_queue_full' });
		return;
	}
	queued++;
	queue = queue
		.then(() => respond(data))
		.finally(() => {
			queued--;
		});
});
