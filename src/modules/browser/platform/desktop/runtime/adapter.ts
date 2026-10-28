import { bundledMain, desktopRemote } from '../../../../../host/desktop/electron-main';
import {
	AgentBrowserError,
	type BrowserRuntime,
	type BrowserRuntimeFactory,
	type RuntimeEvent,
} from '../../../core/contracts';
import hostSource from './main-source.generated.json';
import workerDigest from './worker-digest.generated.json';
import type { MainFactory, MainRuntime } from './host-main';

export interface DesktopRuntimeFactory extends BrowserRuntimeFactory {
	readerExecutable(): Promise<string>;
	recoverEphemeral(): Promise<void>;
}
export interface DesktopRuntimeFactoryOptions {
	dataRoot: string;
	win: Window;
	chooseBundle(): Promise<string | undefined>;
}
interface MainModule {
	createMainFactory(options: {
		dataRoot: string;
		ownerId: number;
		workerHash: string;
	}): MainFactory & { installSelectedBundle(source: string): Promise<void> };
}
function translate(error: unknown): never {
	const value = error as { code?: unknown; message?: unknown };
	const raw = typeof value?.code === 'string' ? value.code : value?.message;
	throw new AgentBrowserError(
		typeof raw === 'string' && /^[a-z][a-z0-9_]{1,100}$/.test(raw) ? raw : 'browser_runtime_failed',
	);
}
async function call<T>(task: () => Promise<T>): Promise<T> {
	try {
		return await task();
	} catch (error) {
		return translate(error);
	}
}
export function adaptRuntime(native: MainRuntime): BrowserRuntime {
	return {
		id: native.id,
		spaceId: native.spaceId,
		onEvent(listener) {
			const remove = native.onEvent((event: RuntimeEvent) => {
				if (event.kind === 'frame') {
					try {
						listener({ kind: 'frame', frame: { ...event.frame, data: Uint8Array.from(event.frame.data) } });
					} finally {
						native.ackFrame(event.frame.pageId);
					}
				} else listener(event);
			});
			return () => remove();
		},
		setControl: (lease, epoch) => call(() => native.setControl(lease, epoch)),
		createPage: (id, url, authority) => call(() => native.createPage(id, url, authority)),
		closePage: (id, authority) => call(() => native.closePage(id, authority)),
		execute: (id, command, authority, options) => call(() => native.execute(id, command, authority, options)),
		observe: (id, authority, scope) => call(() => native.observe(id, authority, scope)),
		watch: (id, enabled) => call(() => native.watch(id, enabled)),
		readIdentity: () => call(() => native.readIdentity()),
		writeIdentity: (seed) => call(() => native.writeIdentity(seed)),
		cancelDownload: (id) => call(() => native.cancelDownload(id)),
		stop: () => call(() => native.stop()),
	};
}
/** Only this trusted desktop adapter can install a complete user-selected bundle. */
export function createDesktopRuntimeFactoryForWindow(options: DesktopRuntimeFactoryOptions): DesktopRuntimeFactory {
	const main = bundledMain<MainModule>(options.win, hostSource.source);
	const native = main.createMainFactory({
		dataRoot: options.dataRoot,
		ownerId: desktopRemote(options.win).getCurrentWebContents().id,
		workerHash: workerDigest.sha256,
	});
	return {
		availability: () => call(() => native.availability()),
		start: async (value) => adaptRuntime((await call(() => native.start(value))) as MainRuntime),
		reclaim: (spaceId, runtimeId) => call(() => native.reclaim(spaceId, runtimeId)),
		removeProfile: (spaceId) => call(() => native.removeProfile(spaceId)),
		readerExecutable: () => call(() => native.readerExecutable()),
		recoverEphemeral: () => call(() => native.recoverEphemeral()),
		installBundle: async () => {
			const source = await options.chooseBundle();
			if (source) await call(() => native.installSelectedBundle(source));
		},
		dispose: () => call(() => native.dispose()),
	};
}
