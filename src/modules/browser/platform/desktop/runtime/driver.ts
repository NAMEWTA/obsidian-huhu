import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { setTimeout, clearTimeout, setInterval, clearInterval } from 'node:timers';
import {
	AgentBrowserError,
	type BrowserCommand,
	type BrowserFrame,
	type BrowserObservation,
	type ControlLease,
	type HumanInput,
	type JsonValue,
	type PendingHumanRequest,
	type RuntimeCookie,
	type RuntimeEvent,
	type RuntimeIdentityState,
	type RuntimePage,
	type SnapshotNode,
	type SnapshotOptions,
	type SnapshotFrameError,
} from '../../../core/contracts';
import { NativeCdp, type CdpFrame } from './cdp';
import { encodedDimensions } from './image-dimensions';
import policy from './page-policy.json';
import { snapshotScope } from '../../../core/protocol';
import { observationDocuments, observationSelection, type ObservationDom } from './observation-dom';
const object = (v: unknown): Record<string, unknown> =>
	v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
const string = (v: unknown): string => (typeof v === 'string' ? v : '');
function bounded(text: string, limit = 65536): { text: string; truncated: boolean } {
	const bytes = Buffer.from(text);
	let end = Math.min(bytes.length, limit);
	if (end < bytes.length) while (end > 0 && (bytes[end]! & 0xc0) === 0x80) end--;
	return { text: bytes.subarray(0, end).toString('utf8'), truncated: end < bytes.length };
}
interface Page extends RuntimePage {
	target: string;
	session: string;
	mainFrameId: string;
	published: boolean;
	frames: Map<string, string>;
	frameDocuments: Map<string, string>;
	frameNavigations: Map<string, string>;
	observationWorlds: Map<string, { session: string; documentId: string; id: number }>;
	publishedViewports: Map<string, { documentId: string; viewport: FrameViewport }>;
	loaders: Map<string, { loader: string; documentId: string }>;
	width: number;
	height: number;
	surfaceWidth: number;
	surfaceHeight: number;
	geometryPending: boolean;
	watchRequested: boolean;
	watching: boolean;
	generation: number;
	after: number;
	stream: string;
	frame: number;
	inputSequence: number;
	lastFrameAt: number;
	capturing: boolean;
	visualTail: Promise<void>;
	action?: ControlLease;
}
interface FrameViewport { x: number; y: number; width: number; height: number }
interface Composition { page: Page; documentId: string; leaseId: string; sent: boolean; uncertain: boolean; pending?: Promise<unknown> }
interface Reference {
	pageId: string;
	documentId: string;
	epoch: number;
	session: string;
	frameId: string;
	frameDocumentId: string;
	viewportVersion: number;
	viewport: FrameViewport;
	node: number;
}
interface Observation {
	pageId: string;
	documentId: string;
	epoch: number;
	refs: Map<string, Reference>;
}
interface Request {
	value: PendingHumanRequest;
	session: string;
	node?: number;
	timer: ReturnType<typeof setTimeout>;
}
interface AuthReceipt {
	page: Page;
	frame: string;
	network: string;
	loader: string;
	documentId: string;
	id: string;
	message: string;
	revision: number;
	ack: boolean;
	at: number;
}
interface Download {
	pageId: string;
	epoch: number;
	controllerId: string;
	name: string;
}
export class BrowserDriver {
	private composition?: Composition;
	readonly cdp: NativeCdp;
	private pages = new Map<string, Page>();
	private targets = new Map<string, string>();
	private sessions = new Map<string, string>();
	private parents = new Map<string, { session: string; frame: string }>();
	private setup = new Map<string, Promise<void>>();
	private observations = new Map<string, Observation>();
	private requests = new Map<string, Request>();
	private downloads = new Map<string, Download>();
	private network = new Map<string, { page: Page; frame: string; loader: string }>();
	private fetches = new Map<string, string>();
	private auth = new Map<string, AuthReceipt>();
	private resourceOwners = new Map<string, { page: Page; authority: ControlLease; at: number; ambiguous: boolean }>();
	private epoch = 0;
	private lease: ControlLease | undefined;
	private sealed = false;
	private written = false;
	private ended = false;
	private metadata?: ReturnType<typeof setInterval>;
	private refreshing?: Promise<void>;
	private expiry?: ReturnType<typeof setTimeout>;
	constructor(
		readonly spaceId: string,
		readonly id: string,
		private downloadPath: string,
		private fresh: boolean,
		provisioning: ControlLease,
		private emit: (event: RuntimeEvent) => void,
	) {
		this.lease = provisioning;
		this.cdp = new NativeCdp(
			(method, params, session) => this.event(method, params, session),
			() => {
				if (!this.ended) this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_transport_closed' });
			},
		);
	}
	async start(port: number, token: string): Promise<string> {
		await this.cdp.connect(port, token);
		const version = object(await this.cdp.command('Browser.getVersion'));
		await this.cdp.command('Browser.grantPermissions', { permissions: [] });
		await this.cdp.command('Browser.setDownloadBehavior', { behavior: 'deny', eventsEnabled: true });
		await this.cdp.command('Target.setDiscoverTargets', { discover: true });
		await this.cdp.command('Target.setAutoAttach', {
			autoAttach: true,
			waitForDebuggerOnStart: true,
			flatten: true,
		});
		this.metadata = setInterval(() => {
			void this.refresh();
			this.trim();
			for (const page of this.pages.values())
				if (
					page.watchRequested &&
					page.watching &&
					!page.geometryPending &&
					!page.capturing &&
					Date.now() - page.lastFrameAt > 1200
				)
					void this.captureCurrent(page).catch(() => undefined);
		}, 750);
		this.metadata.unref();
		return string(version.product);
	}
	private trim(): void {
		const oldest = Date.now() - 60000;
		for (const [id, row] of this.auth) if (row.at < oldest) this.auth.delete(id);
		for (const [id, row] of this.resourceOwners) if (row.at < oldest) this.resourceOwners.delete(id);
		for (const map of [this.network, this.fetches, this.auth, this.resourceOwners])
			while (map.size > 256) map.delete(map.keys().next().value!);
	}
	private refresh(): Promise<void> {
		if (this.ended || this.refreshing) return this.refreshing ?? Promise.resolve();
		const docs = new Map([...this.pages.values()].map((p) => [p.id, p.documentId]));
		this.refreshing = this.cdp
			.command('Target.getTargets')
			.then((value) => {
				const infos = object(value).targetInfos;
				if (!Array.isArray(infos)) return;
				for (const raw of infos) {
					const info = object(raw),
						id = this.targets.get(string(info.targetId)),
						page = id ? this.pages.get(id) : undefined;
					if (!page?.published || docs.get(page.id) !== page.documentId) continue;
					const title = string(info.title).slice(0, 4096);
					if (title !== page.title) {
						page.title = title;
						this.pageEvent(page);
					}
				}
			})
			.catch(() => undefined)
			.finally(() => {
				this.refreshing = undefined;
			});
		return this.refreshing;
	}
	private page(id: string): Page {
		const page = this.pages.get(id);
		if (!page) throw new AgentBrowserError('browser_page_missing');
		return page;
	}
	private authority(lease: ControlLease): void {
		if (
			this.ended ||
			lease.runtimeId !== this.id ||
			lease.spaceId !== this.spaceId ||
			lease.epoch !== this.epoch ||
			lease.leaseId !== this.lease?.leaseId ||
			lease.controllerId !== this.lease.controllerId ||
			!Number.isSafeInteger(lease.expiresAt) || Date.now() >= lease.expiresAt ||
			Date.now() >= this.lease.expiresAt
		)
			throw new AgentBrowserError('browser_stale_control');
	}
	private publicPage(page: Page): RuntimePage {
		return {
			id: page.id,
			url: page.url,
			title: page.title,
			documentId: page.documentId,
			zoom: page.zoom,
			viewportVersion: page.viewportVersion,
		};
	}
	private pageEvent(page: Page): void {
		if (page.published) this.emit({ kind: 'page', runtimeId: this.id, page: this.publicPage(page) });
	}
	async setControl(lease: ControlLease | undefined, epoch: number): Promise<void> {
		if (epoch < this.epoch) return;
		const renewing = epoch === this.epoch;
		if (renewing && this.lease?.leaseId !== lease?.leaseId) return;
		this.lease = lease;
		clearTimeout(this.expiry);
		if (lease) {
			this.expiry = setTimeout(
				() => {
					if (this.epoch === epoch && this.lease?.leaseId === lease.leaseId) {
						this.lease = undefined;
						void this.cdp
							.command('Browser.setDownloadBehavior', { behavior: 'deny', eventsEnabled: true })
							.catch(() => undefined);
					}
				},
				Math.max(1, Math.min(lease.expiresAt - Date.now(), 2147483647)),
			);
			this.expiry.unref();
		}
		if (renewing) return;
		this.epoch = epoch;
		if (this.composition) {
			if (lease) throw new AgentBrowserError('browser_input_unsettled');
			await this.cancelComposition(this.composition);
		}
		this.sealed = true;
		this.observations.clear();
		for (const row of this.requests.values()) {
			const page = this.pages.get(row.value.pageId);
			if (!page || page.documentId !== row.value.documentId) {
				this.forget(row.value.id);
				continue;
			}
			row.value = { ...row.value, epoch, revision: row.value.revision + 1 };
			this.emit({ kind: 'request', request: row.value });
		}
		for (const page of this.pages.values()) {
			page.inputSequence = 0;
			if (page.watchRequested) void this.watch(page.id, true).catch(() => undefined);
		}
		await this.cdp
			.command(
				'Browser.setDownloadBehavior',
				lease
					? { behavior: 'allowAndName', downloadPath: this.downloadPath, eventsEnabled: true }
					: { behavior: 'deny', eventsEnabled: true },
				undefined,
				lease,
			)
			.catch((error) => {
				if (lease && this.lease?.leaseId !== lease.leaseId) return;
				throw error;
			});
	}
	private async attached(info: Record<string, unknown>, session: string, parent?: string): Promise<void> {
		const target = string(info.targetId),
			type = string(info.type);
		if (type === 'page') {
			if (this.pages.size >= 8 && !this.targets.has(target)) {
				await this.cdp.command('Target.closeTarget', { targetId: target });
				this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_page_quota' });
				return;
			}
			const id = this.targets.get(target) ?? randomUUID();
			const page: Page = {
				id,
				target,
				session,
				mainFrameId: '',
				url: string(info.url),
				title: string(info.title),
				documentId: randomUUID(),
				zoom: 1,
				viewportVersion: 1,
				published: Boolean(info.openerId),
				frames: new Map(),
				frameDocuments: new Map(),
				frameNavigations: new Map(),
				observationWorlds: new Map(),
				publishedViewports: new Map(),
				loaders: new Map(),
				width: 1280,
				height: 800,
				surfaceWidth: 1280,
				surfaceHeight: 800,
				geometryPending: false,
				watchRequested: false,
				watching: false,
				generation: 0,
				after: Infinity,
				stream: randomUUID(),
				frame: 0,
				inputSequence: 0,
				lastFrameAt: 0,
				capturing: false,
				visualTail: Promise.resolve(),
			};
			this.pages.set(id, page);
			this.targets.set(target, id);
			this.sessions.set(session, id);
			await this.bootstrap(page, session);
			this.pageEvent(page);
		} else if (type === 'iframe') {
			const id = this.sessions.get(parent ?? '');
			if (!id || !parent) throw new AgentBrowserError('browser_frame_owner_missing');
			const page = this.page(id);
			if (page.frames.size >= 64) throw new AgentBrowserError('browser_frame_quota');
			page.frames.set(target, session);
			page.frameDocuments.set(target, randomUUID());
			this.sessions.set(session, id);
			this.parents.set(session, { session: parent, frame: target });
			await this.bootstrap(page, session);
		} else {
			await this.cdp
				.command(
					'Target.setAutoAttach',
					{ autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
					session,
				)
				.catch(() => undefined);
			await this.cdp.command('Runtime.runIfWaitingForDebugger', {}, session).catch(() => undefined);
		}
	}
	private async bootstrap(page: Page, session: string): Promise<void> {
		for (const method of ['Page.enable', 'Runtime.enable', 'DOM.enable', 'Network.enable'])
			await this.cdp.command(method, {}, session);
		await this.cdp.command(
			'Page.addScriptToEvaluateOnNewDocument',
			{ source: policy.source, runImmediately: true },
			session,
		);
		await this.cdp.command('Page.setInterceptFileChooserDialog', { enabled: true }, session);
		await this.cdp.command('Fetch.enable', { handleAuthRequests: true, patterns: [{ urlPattern: '*' }] }, session);
		await this.cdp.command(
			'Network.setBlockedURLs',
			{ urls: ['file://*', 'chrome://*', 'chrome-extension://*', 'devtools://*'] },
			session,
		);
		await this.cdp.command(
			'Target.setAutoAttach',
			{ autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
			session,
		);
		if (page.session === session)
			await this.cdp.command(
				'Emulation.setDeviceMetricsOverride',
				{ width: page.width, height: page.height, deviceScaleFactor: page.zoom, mobile: false },
				session,
			);
		const tree = object(await this.cdp.command('Page.getFrameTree', {}, session));
		if (session === page.session) page.mainFrameId = string(object(object(tree.frameTree).frame).id);
		const track = (value: unknown) => {
			const item = object(value),
				frame = object(item.frame);
			if (typeof frame.id === 'string') {
				if (!page.frames.has(frame.id)) {
					if (page.frames.size >= 64) throw new AgentBrowserError('browser_frame_quota');
					page.frames.set(frame.id, session);
				}
				if (!page.frameDocuments.has(frame.id)) page.frameDocuments.set(frame.id, randomUUID());
			}
			if (Array.isArray(item.childFrames)) item.childFrames.forEach(track);
		};
		track(tree.frameTree);
		await this.cdp.command('Runtime.runIfWaitingForDebugger', {}, session);
	}
	private forget(id: string): void {
		const row = this.requests.get(id);
		if (!row) return;
		clearTimeout(row.timer);
		this.requests.delete(id);
		this.emit({ kind: 'request-resolved', runtimeId: this.id, requestId: id });
	}
	private openRequest(
		page: Page,
		session: string,
		kind: 'dialog' | 'file-chooser',
		message: string,
		node?: number,
	): void {
		if (this.requests.size >= 32) {
			this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_request_quota' });
			return;
		}
		const id = randomUUID(),
			value: PendingHumanRequest = {
				id,
				spaceId: this.spaceId,
				pageId: page.id,
				runtimeId: this.id,
				documentId: page.documentId,
				epoch: this.epoch,
				revision: 1,
				kind,
				message: message.slice(0, 4096),
				expiresAt: Date.now() + 60000,
				status: 'pending',
			};
		const timer = setTimeout(() => {
			const row = this.requests.get(id);
			if (!row) return;
			this.forget(id);
			const denied =
				kind === 'dialog'
					? this.cdp.command('Page.handleJavaScriptDialog', { accept: false }, session)
					: this.cdp.command('DOM.setFileInputFiles', { files: [], backendNodeId: node }, session);
			void denied.then(
				() => {
					if (this.pages.get(page.id)?.documentId === value.documentId)
						this.emit({
							kind: 'request',
							request: {
								...value,
								epoch: this.epoch,
								revision: row.value.revision + 1,
								status: 'denied',
							},
						});
				},
				() => {
					if (!this.ended)
						this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_request_timeout_failed' });
				},
			);
		}, 60000);
		timer.unref();
		this.requests.set(id, { value, session, node, timer });
		this.emit({ kind: 'request', request: value });
	}
	private publishAuth(row: AuthReceipt): void {
		if (!row.ack || this.pages.get(row.page.id) !== row.page || row.page.documentId !== row.documentId) return;
		this.emit({
			kind: 'request',
			request: {
				id: row.id,
				spaceId: this.spaceId,
				pageId: row.page.id,
				runtimeId: this.id,
				documentId: row.documentId,
				epoch: this.epoch,
				revision: row.revision,
				kind: 'http-auth',
				message: row.message,
				expiresAt: row.at + 60000,
				status: 'denied',
			},
		});
	}
	private event(method: string, p: Record<string, unknown>, session?: string): void {
		if (this.ended) return;
		if (method === 'Target.attachedToTarget') {
			const info = object(p.targetInfo),
				target = string(info.targetId);
			this.setup.set(
				target,
				this.attached(info, string(p.sessionId), session).catch(() => {
					this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_target_policy_failed' });
				}),
			);
			return;
		}
		if (method === 'Target.detachedFromTarget') {
			const sid = string(p.sessionId),
				id = this.sessions.get(sid),
				page = id ? this.pages.get(id) : undefined;
			this.sessions.delete(sid);
			this.parents.delete(sid);
			if (page?.session === sid) {
				this.pages.delete(page.id);
				this.targets.delete(page.target);
				this.setup.delete(page.target);
				for (const [child, owner] of this.sessions)
					if (owner === page.id) {
						this.sessions.delete(child);
						this.parents.delete(child);
					}
				for (const [id, row] of this.requests) if (row.value.pageId === page.id) this.forget(id);
				if (page.published) this.emit({ kind: 'page-closed', runtimeId: this.id, pageId: page.id });
			} else if (page) for (const [id, child] of page.frames) if (child === sid) {
				page.frames.delete(id); page.frameDocuments.delete(id); page.frameNavigations.delete(id); page.observationWorlds.delete(id); page.publishedViewports.delete(id);
			}
			return;
		}
		if (method === 'Target.targetInfoChanged') {
			const info = object(p.targetInfo),
				id = this.targets.get(string(info.targetId)),
				page = id ? this.pages.get(id) : undefined;
			if (page) {
				page.url = string(info.url);
				page.title = string(info.title).slice(0, 4096);
				this.pageEvent(page);
			}
			return;
		}
		const id = session ? this.sessions.get(session) : undefined,
			page = id ? this.pages.get(id) : undefined;
		if (method === 'Fetch.requestPaused') {
			if (p.resourceType === 'Document' && typeof p.networkId === 'string')
				this.fetches.set(string(p.requestId), p.networkId);
			void this.cdp.command('Fetch.continueRequest', { requestId: p.requestId }, session).catch(() => {
				if (!this.ended) this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_auth_policy_failed' });
			});
			return;
		}
		if (method === 'Fetch.authRequired') {
			const key = string(p.requestId),
				network = this.fetches.get(key) ?? '',
				doc = this.network.get(network);
			let row: AuthReceipt | undefined;
			if (page) {
				let origin = '';
				try {
					origin = new URL(string(object(p.authChallenge).origin)).origin;
				} catch {
					/* Opaque challenge origins remain unnamed. */
				}
				row = {
					page,
					frame: string(p.frameId),
					network,
					loader: p.resourceType === 'Document' ? (doc?.loader ?? '') : '',
					documentId: page.documentId,
					id: randomUUID(),
					message: origin,
					revision: 1,
					ack: false,
					at: Date.now(),
				};
				this.auth.set(key, row);
			}
			// Always cancel immediately. A denied navigation receipt may only follow its
			// exact native loader/frame into the newly committed document, never a URL guess.
			void this.cdp
				.command(
					'Fetch.continueWithAuth',
					{ requestId: key, authChallengeResponse: { response: 'CancelAuth' } },
					session,
				)
				.then(
					() => {
						if (!row) return;
						row.ack = true;
						const committed = row.page.loaders.get(row.frame);
						if (
							row.loader &&
							committed?.loader === row.loader &&
							committed.documentId === row.page.documentId
						)
							row.documentId = committed.documentId;
						this.publishAuth(row);
					},
					() => {
						if (!this.ended)
							this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_auth_policy_failed' });
					},
				);
			return;
		}
		if (method === 'Browser.downloadWillBegin') {
			const guid = string(p.guid),
				owner = this.resourceOwners.get(string(p.frameId) + '\0' + string(p.url));
			if (
				!owner ||
				owner.ambiguous ||
				this.downloads.size >= 32 ||
				!this.lease ||
				owner.authority.epoch !== this.epoch ||
				owner.authority.leaseId !== this.lease.leaseId ||
				Date.now() >= this.lease.expiresAt
			) {
				void this.cdp.command('Browser.cancelDownload', { guid }).catch(() => undefined);
				return;
			}
			const row = {
				pageId: owner.page.id,
				epoch: owner.authority.epoch,
				controllerId: owner.authority.controllerId,
				name: string(p.suggestedFilename).slice(0, 1024),
			};
			this.downloads.set(guid, row);
			this.emit({
				kind: 'download',
				runtimeId: this.id,
				id: guid,
				...row,
				received: 0,
				total: 0,
				state: 'progressing',
			});
			return;
		}
		if (method === 'Browser.downloadProgress') {
			const guid = string(p.guid),
				row = this.downloads.get(guid);
			if (row)
				this.emit({
					kind: 'download',
					runtimeId: this.id,
					id: guid,
					...row,
					received: Number(p.receivedBytes) || 0,
					total: Number(p.totalBytes) || 0,
					state: p.state === 'completed' ? 'completed' : p.state === 'canceled' ? 'cancelled' : 'progressing',
				});
			if (p.state === 'completed' || p.state === 'canceled') this.downloads.delete(guid);
			return;
		}
		if (!page) return;
		if (method === 'Network.requestWillBeSent') {
			if (p.type === 'Document') {
				const network = string(p.requestId),
					loader = string(p.loaderId),
					frame = string(p.frameId);
				this.network.set(network, { page, loader, frame });
				for (const row of this.auth.values())
					if (row.network === network && row.page === page) row.loader = loader;
			}
			if (page.action) {
				const key = string(p.frameId) + '\0' + string(object(p.request).url),
					prior = this.resourceOwners.get(key);
				this.resourceOwners.set(key, {
					page,
					authority: { ...page.action },
					at: Date.now(),
					ambiguous: Boolean(prior && (prior.ambiguous || prior.authority.leaseId !== page.action.leaseId)),
				});
			}
			this.trim();
		}
		if (method === 'Page.frameDetached' && page.frames.get(string(p.frameId)) === session) {
			page.frames.delete(string(p.frameId)); page.frameDocuments.delete(string(p.frameId)); page.frameNavigations.delete(string(p.frameId)); page.observationWorlds.delete(string(p.frameId)); page.publishedViewports.delete(string(p.frameId));
		}
		if (method === 'Page.frameNavigated' || method === 'Page.navigatedWithinDocument') {
			// Same-document navigation retains the DOM/context but invalidates in-flight reads.
			const navigatedFrame = method === 'Page.frameNavigated' ? string(object(p.frame).id) : string(p.frameId);
			if (navigatedFrame) page.frameNavigations.set(navigatedFrame, randomUUID());
			page.documentId = randomUUID();
			this.observations.clear();
			for (const [id, row] of this.requests) if (row.value.pageId === page.id) this.forget(id);
			if (method === 'Page.frameNavigated') {
				const frame = object(p.frame),
					frameId = string(frame.id),
					loader = string(frame.loaderId);
				page.frames.set(frameId, session!);
				page.frameDocuments.set(frameId, randomUUID());
				page.loaders.set(frameId, { loader, documentId: page.documentId });
				if (session === page.session && !frame.parentId) { page.mainFrameId = frameId; page.url = string(frame.url); }
				this.pageEvent(page);
				for (const row of this.auth.values())
					if (row.page === page && row.frame === frameId && row.loader && row.loader === loader) {
						row.documentId = page.documentId;
						row.revision++;
						this.publishAuth(row);
					}
			} else {
				if (p.frameId === page.mainFrameId) page.url = string(p.url) || page.url;
				this.pageEvent(page);
			}
			if (page.watchRequested) void this.watch(page.id, true).catch(() => undefined);
		}
		if (method === 'Page.loadEventFired' && session === page.session) void this.refresh();
		if (method === 'Page.javascriptDialogOpening') this.openRequest(page, session!, 'dialog', string(p.message));
		if (method === 'Page.javascriptDialogClosed')
			for (const [id, row] of this.requests)
				if (row.value.pageId === page.id && row.value.kind === 'dialog') this.forget(id);
		if (method === 'Page.fileChooserOpened') {
			if (typeof p.backendNodeId !== 'number')
				this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_file_chooser_unbound' });
			else this.openRequest(page, session!, 'file-chooser', '', p.backendNodeId);
		}
		if (method === 'Page.screencastFrame') {
			void this.cdp
				.command('Page.screencastFrameAck', { sessionId: p.sessionId }, session)
				.catch(() => undefined);
			const meta = object(p.metadata);
			if (
				!page.watching ||
				page.geometryPending ||
				typeof meta.timestamp !== 'number' ||
				!Number.isFinite(meta.timestamp) ||
				meta.timestamp < page.after ||
				typeof meta.deviceWidth !== 'number' ||
				typeof meta.deviceHeight !== 'number' ||
				Math.abs(meta.deviceWidth - page.width) > 1 ||
				Math.abs(meta.deviceHeight - page.height) > 1 ||
				meta.pageScaleFactor !== 1
			)
				return;
			const bytes = Buffer.from(string(p.data), 'base64');
			if (bytes.length <= 8 * 1024 * 1024) this.publishFrame(page, bytes);
		}
	}
	private publishFrame(page: Page, data: Uint8Array): void {
		const pixels = encodedDimensions(data, 'image/jpeg');
		page.lastFrameAt = Date.now();
		const frame: BrowserFrame = {
			spaceId: this.spaceId,
			pageId: page.id,
			runtimeId: this.id,
			documentId: page.documentId,
			epoch: this.epoch,
			viewportVersion: page.viewportVersion,
			frameId: page.stream + ':' + ++page.frame,
			width: pixels.width,
			height: pixels.height,
			cssWidth: page.width,
			cssHeight: page.height,
			mime: 'image/jpeg',
			data,
			capturedAt: page.lastFrameAt,
			inputSequence: page.inputSequence,
		};
		this.emit({ kind: 'frame', frame });
	}
	private visual<T>(page: Page, work: () => Promise<T>): Promise<T> {
		const task = page.visualTail.then(work);
		page.visualTail = task.then(
			() => undefined,
			() => undefined,
		);
		return task;
	}
	private async captureCurrent(page: Page): Promise<void> {
		if (page.capturing) return;
		page.capturing = true;
		const generation = page.generation,
			epoch = this.epoch,
			documentId = page.documentId,
			viewportVersion = page.viewportVersion,
			inputSequence = page.inputSequence;
		const valid = () =>
			!this.ended &&
			page.watchRequested &&
			page.watching &&
			!page.geometryPending &&
			generation === page.generation &&
			epoch === this.epoch &&
			documentId === page.documentId &&
			viewportVersion === page.viewportVersion &&
			inputSequence === page.inputSequence;
		try {
			await this.visual(page, async () => {
				if (!valid()) return;
				const result = object(
					await this.cdp.command('Page.captureScreenshot', { format: 'jpeg', quality: 75 }, page.session),
				);
				if (!valid()) return;
				const data = Buffer.from(string(result.data), 'base64');
				if (data.length <= 8 * 1024 * 1024) this.publishFrame(page, data);
			});
		} finally {
			page.capturing = false;
		}
	}
	async watch(id: string, enabled: boolean): Promise<void> {
		const page = this.page(id),
			generation = ++page.generation;
		page.watchRequested = enabled;
		page.watching = false;
		await this.visual(page, async () => {
			if (this.ended || generation !== page.generation) return;
			await this.cdp.command('Page.stopScreencast', {}, page.session);
			if (!enabled || page.geometryPending || generation !== page.generation) return;
			page.stream = randomUUID();
			page.frame = 0;
			page.after = Date.now() / 1000;
			const epoch = this.epoch,
				documentId = page.documentId;
			const result = object(
				await this.cdp.command('Page.captureScreenshot', { format: 'jpeg', quality: 75 }, page.session),
			);
			if (
				page.geometryPending ||
				generation !== page.generation ||
				epoch !== this.epoch ||
				documentId !== page.documentId
			)
				return;
			const data = Buffer.from(string(result.data), 'base64');
			if (data.length > 8 * 1024 * 1024) throw new AgentBrowserError('browser_frame_limit');
			this.publishFrame(page, data);
			await this.cdp.command(
				'Page.startScreencast',
				{ format: 'jpeg', quality: 75, maxWidth: 1920, maxHeight: 1200, everyNthFrame: 2 },
				page.session,
			);
			if (
				generation === page.generation &&
				epoch === this.epoch &&
				documentId === page.documentId &&
				!page.geometryPending
			)
				page.watching = true;
		});
	}
	async createPage(id: string, url: string, authority: ControlLease): Promise<RuntimePage> {
		this.authority(authority);
		if (this.pages.has(id)) throw new AgentBrowserError('browser_page_id_conflict');
		let page = [...this.pages.values()].find((p) => !p.published && p.url === 'about:blank');
		let target = page?.target ?? '';
		try {
			if (!target) {
				target = string(object(await this.cdp.command('Target.createTarget', { url: 'about:blank' }, undefined, authority)).targetId);
				if (!target) throw new AgentBrowserError('browser_page_cleanup_pending');
			}
			for (let i = 0; i < 250 && !this.setup.has(target); i++) await delay(20);
			await this.setup.get(target);
			const old = this.targets.get(target);
			page = old ? this.pages.get(old) : undefined;
			if (!page) throw new AgentBrowserError('browser_page_start_failed');
			this.authority(authority);
			if (old) this.pages.delete(old);
			page.id = id;
			page.published = true;
			this.pages.set(id, page);
			this.targets.set(target, id);
			for (const [sid, pid] of this.sessions) if (pid === old) this.sessions.set(sid, id);
			this.written = true;
			this.pageEvent(page);
			if (url !== 'about:blank') await this.execute(id, { kind: 'navigate', url }, authority);
			return this.publicPage(page);
		} catch (error) {
			if (!target) {
				if (!(error instanceof AgentBrowserError) || !['outcome_unknown', 'browser_page_cleanup_pending'].includes(error.code)) throw error;
				this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_page_cleanup_pending' });
				throw new AgentBrowserError('browser_page_cleanup_pending');
			}
			if (page?.target === target) page.published = false;
			try {
				const closed = object(await this.cdp.command('Target.closeTarget', { targetId: target }));
				if (closed.success !== true) throw new AgentBrowserError('browser_page_cleanup_pending');
				// The close receipt may arrive before its detach event. Remove only this
				// target's mappings so a later detach cannot delete the replacement Page.
				if (page && this.pages.get(page.id) === page) {
					this.pages.delete(page.id); this.targets.delete(target); this.setup.delete(target);
					for (const [session, owner] of this.sessions) if (owner === page.id) { this.sessions.delete(session); this.parents.delete(session); }
				}
			} catch {
				this.emit({ kind: 'fault', runtimeId: this.id, code: 'browser_page_cleanup_pending' });
				throw new AgentBrowserError('browser_page_cleanup_pending');
			}
			throw error;
		}
	}
	async closePage(id: string, authority: ControlLease): Promise<void> {
		this.authority(authority);
		await this.cdp.command('Target.closeTarget', { targetId: this.page(id).target }, undefined, authority);
	}
	async cancelDownload(id: string): Promise<void> {
		if (!this.downloads.has(id)) throw new AgentBrowserError('browser_download_missing');
		await this.cdp.command('Browser.cancelDownload', { guid: id });
	}
	stop(): void {
		if (this.ended) return;
		this.ended = true;
		clearInterval(this.metadata);
		clearTimeout(this.expiry);
		for (const id of this.requests.keys()) this.forget(id);
		this.cdp.close();
	}
	private async geometry(
		page: Page,
		width: number,
		height: number,
		zoom: number,
		authority: ControlLease,
	): Promise<JsonValue> {
		if (page.geometryPending) throw new AgentBrowserError('browser_geometry_unavailable');
		page.geometryPending = true;
		page.watching = false;
		page.generation++;
		page.viewportVersion++;
		page.publishedViewports.clear();
		await this.cdp.command('Page.stopScreencast', {}, page.session);
		this.authority(authority);
		await this.cdp.command('Emulation.setPageScaleFactor', { pageScaleFactor: 1 }, page.session, authority);
		this.authority(authority);
		const cssWidth = Math.round(width / zoom),
			cssHeight = Math.round(height / zoom);
		await this.cdp.command(
			'Emulation.setDeviceMetricsOverride',
			{ width: cssWidth, height: cssHeight, deviceScaleFactor: zoom, mobile: false },
			page.session,
			authority,
		);
		page.surfaceWidth = width;
		page.surfaceHeight = height;
		page.width = cssWidth;
		page.height = cssHeight;
		page.zoom = zoom;
		page.geometryPending = false;
		this.pageEvent(page);
		if (page.watchRequested) void this.watch(page.id, true).catch(() => undefined);
		this.authority(authority);
		return { viewportVersion: page.viewportVersion, zoom, width: cssWidth, height: cssHeight };
	}
	execute(id: string, command: BrowserCommand, authority: ControlLease, uploadPaths?: string[]): Promise<JsonValue> {
		this.authority(authority);
		const page = this.page(id),
			documentId = page.documentId;
		// Screenshot capture transiently changes Chromium's emulation transform.
		// Keep hit testing plus a complete gesture in the same Page visual critical
		// section. Native revocation and dialog answers never wait on this queue.
		const run = async () => {
			if (
				!['navigate', 'back', 'forward', 'reload', 'wait', 'stop'].includes(command.kind) &&
				page.documentId !== documentId
			)
				throw new AgentBrowserError('browser_document_changed');
			try {
				return await this.executeUnlocked(id, command, authority, uploadPaths);
			} finally {
				if ('ref' in command)
					await Promise.allSettled(
						[...new Set([page.session, ...page.frames.values()])].map((session) =>
							this.cdp.command(
								'Runtime.releaseObjectGroup',
								{ objectGroup: 'huhu-browser-action' },
								session,
							),
						),
					);
			}
		};
		return ['dialog', 'chooser', 'stop'].includes(command.kind) ? run() : this.visual(page, run);
	}
	private async executeUnlocked(
		id: string,
		command: BrowserCommand,
		authority: ControlLease,
		uploadPaths?: string[],
	): Promise<JsonValue> {
		this.authority(authority);
		const page = this.page(id),
			documentId = page.documentId,
			session = page.session;
		if (this.composition && command.kind !== 'input' && !['snapshot', 'text', 'selection', 'screenshot', 'material'].includes(command.kind)) await this.cancelComposition(this.composition, authority);
		if (page.geometryPending && !['dialog', 'chooser', 'stop'].includes(command.kind))
			throw new AgentBrowserError('browser_geometry_unavailable');
		const send = async (method: string, params: Record<string, unknown> = {}, sid = session) => {
			this.authority(authority);
			if ('ref' in command) {
				const entry = this.observations.get(command.observationId)?.refs.get(command.ref);
				if (!entry || page.documentId !== documentId) throw new AgentBrowserError('browser_stale_ref');
				this.assertReference(page, entry, authority);
			}
			const value = await this.cdp.command(method, params, sid, authority);
			this.authority(authority);
			if ('ref' in command) {
				const entry = this.observations.get(command.observationId)?.refs.get(command.ref);
				if (!entry || page.documentId !== documentId) throw new AgentBrowserError('browser_stale_ref');
				this.assertReference(page, entry, authority);
			}
			return object(value);
		};
		if (!['snapshot', 'text', 'selection', 'screenshot', 'material'].includes(command.kind)) page.action = { ...authority };
		switch (command.kind) {
			case 'navigate': {
				let url: URL;
				try {
					url = new URL(command.url);
				} catch {
					throw new AgentBrowserError('browser_invalid_url');
				}
				if (
					!['https:', 'http:', 'about:'].includes(url.protocol) ||
					(url.protocol === 'about:' && url.href !== 'about:blank') ||
					url.username ||
					url.password
				)
					throw new AgentBrowserError('browser_invalid_url');
				const result = await send('Page.navigate', { url: url.href });
				if (result.errorText) throw new AgentBrowserError('browser_navigation_failed');
				return { ok: true };
			}
			case 'back':
			case 'forward': {
				const result = await send('Page.getNavigationHistory'),
					entries = result.entries as Array<{ id: number }>;
				const item = entries[Number(result.currentIndex) + (command.kind === 'back' ? -1 : 1)];
				if (item) await send('Page.navigateToHistoryEntry', { entryId: item.id });
				return { ok: true };
			}
			case 'reload':
				await send('Page.reload');
				return { ok: true };
			case 'stop':
				await send('Page.stopLoading');
				return { ok: true };
			case 'find': {
				const result = await send('Runtime.evaluate', {
					expression: `window.find(${JSON.stringify(command.text)},false,${command.forward === false},true)`,
					returnByValue: true,
				});
				return { found: object(result.result).value === true };
			}
			case 'snapshot':
				return (await this.observe(id, authority, command.scope)) as unknown as JsonValue;
			case 'text': {
				const result = await send('Runtime.evaluate', {
					expression: "(document.body?.innerText??'').slice(0,65537)",
					returnByValue: true,
				});
				return bounded(string(object(result.result).value));
			}
			case 'selection': {
				const result = await send('Runtime.evaluate', {
					expression:
						"(()=>{const text=window.getSelection()?.toString()??'';return{text:text.slice(0,65537),truncated:text.length>65536}})()",
					returnByValue: true,
				});
				if (result.exceptionDetails) throw new AgentBrowserError('browser_selection_failed');
				const value = object(object(result.result).value),
					cut = bounded(string(value.text));
				return { text: cut.text, truncated: cut.truncated || value.truncated === true };
			}
			case 'material': return this.captureMaterial(page, command.observationId, command.ref, authority);
			case 'screenshot': {
				const result = await send('Page.captureScreenshot', { format: 'png' }),
					data = string(result.data),
					bytes = Buffer.from(data, 'base64');
				if (bytes.length > 8 * 1024 * 1024) throw new AgentBrowserError('browser_image_limit');
				const pixels = encodedDimensions(bytes, 'image/png');
				return { mime: 'image/png', data, width: pixels.width, height: pixels.height };
			}
			case 'zoom':
				if (!Number.isFinite(command.factor) || command.factor < 0.25 || command.factor > 3)
					throw new AgentBrowserError('browser_invalid_zoom');
				return this.geometry(page, page.surfaceWidth, page.surfaceHeight, command.factor, authority);
			case 'viewport':
				if (
					!Number.isInteger(command.width) ||
					!Number.isInteger(command.height) ||
					command.width < 320 ||
					command.height < 200 ||
					command.width > 3840 ||
					command.height > 2160
				)
					throw new AgentBrowserError('browser_invalid_viewport');
				return this.geometry(page, command.width, command.height, page.zoom, authority);
			case 'input': {
				if (!Number.isSafeInteger(command.inputSequence) || command.inputSequence <= page.inputSequence)
					throw new AgentBrowserError('browser_stale_input');
				await this.input(page, command.input, authority);
				page.inputSequence = command.inputSequence;
				if (page.watchRequested) void this.watch(id, true).catch(() => undefined);
				return { ok: true };
			}
			case 'press':
				await this.input(page, { kind: 'key', key: command.key, modifiers: command.modifiers }, authority);
				return { ok: true };
			case 'scroll':
				await this.input(
					page,
					{ kind: 'scroll', x: command.x, y: command.y, deltaX: command.deltaX, deltaY: command.deltaY },
					authority,
				);
				return { ok: true };
			case 'click': {
				const ref = await this.resolve(page, command.observationId, command.ref, authority);
				const point = await this.box(page, ref.entry, authority);
				await this.input(page, { kind: 'click', ...point }, authority);
				return { ok: true };
			}
			case 'fill': {
				if (Buffer.byteLength(command.text) > 48 * 1024) throw new AgentBrowserError('browser_text_limit');
				const ref = await this.resolve(page, command.observationId, command.ref, authority);
				await send('DOM.focus', { backendNodeId: ref.entry.node }, ref.entry.session);
				const result = await send(
					'Runtime.callFunctionOn',
					{
						objectId: ref.objectId,
						functionDeclaration:
							'function(){if(this.disabled||this.readOnly)throw Error();if(this.isContentEditable){const r=document.createRange();r.selectNodeContents(this);const s=getSelection();s.removeAllRanges();s.addRange(r)}else if(this instanceof HTMLInputElement||this instanceof HTMLTextAreaElement){this.select()}else throw Error()}',
						returnByValue: true,
					},
					ref.entry.session,
				);
				if (result.exceptionDetails) throw new AgentBrowserError('browser_element_not_actionable');
				await send('Input.insertText', { text: command.text }, ref.entry.session);
				return { ok: true };
			}
			case 'type': {
				if (Buffer.byteLength(command.text) > 48 * 1024) throw new AgentBrowserError('browser_text_limit');
				const ref = await this.resolve(page, command.observationId, command.ref, authority);
				await send('DOM.focus', { backendNodeId: ref.entry.node }, ref.entry.session);
				const checked = await send(
					'Runtime.callFunctionOn',
					{
						objectId: ref.objectId,
						functionDeclaration:
							'function(){return !this.disabled&&!this.readOnly&&(this.isContentEditable||this instanceof HTMLInputElement||this instanceof HTMLTextAreaElement)}',
						returnByValue: true,
					},
					ref.entry.session,
				);
				if (object(checked.result).value !== true)
					throw new AgentBrowserError('browser_element_not_actionable');
				await send('Input.insertText', { text: command.text }, ref.entry.session);
				return { ok: true };
			}
			case 'select': {
				const ref = await this.resolve(page, command.observationId, command.ref, authority);
				if (command.values.length > 100 || command.values.some((v) => Buffer.byteLength(v) > 4096))
					throw new AgentBrowserError('browser_selection_limit');
				const result = await send(
					'Runtime.callFunctionOn',
					{
						objectId: ref.objectId,
						functionDeclaration:
							'function(values){if(!(this instanceof HTMLSelectElement))return "unsupported";if(this.disabled||(!this.multiple&&values.length!==1))return "invalid";const options=Array.from(this.options);if(values.some(v=>!options.some(o=>o.value===v&&!o.disabled&&!(o.parentElement instanceof HTMLOptGroupElement&&o.parentElement.disabled))))return "invalid";for(const o of options)o.selected=values.includes(o.value);this.dispatchEvent(new Event("input",{bubbles:true}));this.dispatchEvent(new Event("change",{bubbles:true}));return "ok"}',
						arguments: [{ value: command.values }],
						returnByValue: true,
					},
					ref.entry.session,
				);
				const status = object(result.result).value;
				if (status === 'unsupported') throw new AgentBrowserError('browser_custom_select_unsupported');
				if (status !== 'ok') throw new AgentBrowserError('browser_element_not_actionable');
				return { ok: true };
			}
			case 'wait': {
				if (!Number.isInteger(command.timeoutMs) || command.timeoutMs < 1 || command.timeoutMs > 15000)
					throw new AgentBrowserError('browser_invalid_wait');
				const until = Date.now() + command.timeoutMs;
				for (;;) {
					this.authority(authority);
					let ready = false;
					if (command.condition.kind === 'url') ready = page.url === command.condition.url;
					else {
						const expression =
							command.condition.kind === 'load'
								? 'document.readyState === "complete"'
								: `(document.body?.innerText??'').includes(${JSON.stringify(command.condition.text)})`;
						const result = await send('Runtime.evaluate', { expression, returnByValue: true });
						ready = object(result.result).value === true;
					}
					if (ready) return { ok: true };
					if (Date.now() >= until) throw new AgentBrowserError('browser_wait_timeout');
					await delay(Math.min(100, until - Date.now()));
				}
			}
			case 'upload': {
				if (!uploadPaths || uploadPaths.length !== command.fileIds.length)
					throw new AgentBrowserError('browser_file_grant_missing');
				const ref = await this.resolve(page, command.observationId, command.ref, authority);
				const desc = object(
					(await send('DOM.describeNode', { backendNodeId: ref.entry.node }, ref.entry.session)).node,
				);
				const attrs = Array.isArray(desc.attributes) ? (desc.attributes as string[]) : [];
				if (desc.nodeName !== 'INPUT' || attrs[attrs.indexOf('type') + 1]?.toLowerCase() !== 'file')
					throw new AgentBrowserError('browser_not_file_input');
				await send(
					'DOM.setFileInputFiles',
					{ files: uploadPaths, backendNodeId: ref.entry.node },
					ref.entry.session,
				);
				return { ok: true };
			}
			case 'dialog':
			case 'chooser': {
				const row = this.requests.get(command.requestId);
				if (
					!row ||
					row.value.pageId !== id ||
					row.value.documentId !== page.documentId ||
					row.value.epoch !== authority.epoch ||
					row.value.revision !== command.revision ||
					row.value.status !== 'pending'
				)
					throw new AgentBrowserError('browser_stale_request');
				if (command.kind === 'dialog') {
					if (row.value.kind !== 'dialog') throw new AgentBrowserError('browser_stale_request');
					await send(
						'Page.handleJavaScriptDialog',
						{ accept: command.accept, ...(command.text !== undefined ? { promptText: command.text } : {}) },
						row.session,
					);
				} else {
					if (row.value.kind !== 'file-chooser' || !row.node)
						throw new AgentBrowserError('browser_stale_request');
					if (command.fileIds.length && (!uploadPaths || uploadPaths.length !== command.fileIds.length))
						throw new AgentBrowserError('browser_file_grant_missing');
					await send(
						'DOM.setFileInputFiles',
						{ files: uploadPaths ?? [], backendNodeId: row.node },
						row.session,
					);
				}
				this.forget(command.requestId);
				return { ok: true };
			}
		}
	}
	private async frameViewport(page: Page, frameId: string, session: string, authority: ControlLease, check: () => void): Promise<FrameViewport> {
		check();
		const documentId = page.frameDocuments.get(frameId) ?? '';
		let world = page.observationWorlds.get(frameId);
		if (!world || world.session !== session || world.documentId !== documentId) {
			const created = object(await this.cdp.command('Page.createIsolatedWorld', { frameId, worldName: 'huhu-browser-observation' }, session, authority));
			check();
			if (!Number.isSafeInteger(created.executionContextId) || Number(created.executionContextId) <= 0) throw new AgentBrowserError('browser_frame_geometry_invalid');
			world = { session, documentId, id: Number(created.executionContextId) };
			page.observationWorlds.set(frameId, world);
		}
		let result: Record<string, unknown>;
		try {
			result = object(await this.cdp.command('Runtime.evaluate', {
				contextId: world.id,
				expression: '({x:scrollX,y:scrollY,width:innerWidth,height:innerHeight})', returnByValue: true,
			}, session, authority));
		} catch (error) { page.observationWorlds.delete(frameId); throw error; }
		check();
		const viewport = object(object(result.result).value);
		if (result.exceptionDetails || !['x', 'y', 'width', 'height'].every(key => typeof viewport[key] === 'number' && Number.isFinite(viewport[key])) || Number(viewport.width) <= 0 || Number(viewport.height) <= 0)
			throw new AgentBrowserError('browser_frame_geometry_invalid');
		return viewport as unknown as FrameViewport;
	}
	async observe(id: string, authority: ControlLease, options?: SnapshotOptions): Promise<BrowserObservation> {
		this.authority(authority);
		const page = this.page(id), documentId = page.documentId, mainFrameId = page.mainFrameId;
		const mainDocumentId = page.frameDocuments.get(mainFrameId), mainNavigation = page.frameNavigations.get(mainFrameId);
		let viewportVersion = page.viewportVersion;
		if (page.geometryPending) throw new AgentBrowserError('browser_geometry_unavailable');
		const scope = snapshotScope(this.spaceId, id, options), refs = new Map<string, Reference>();
		const check = () => {
			this.authority(authority);
			if (this.pages.get(id) !== page || page.mainFrameId !== mainFrameId || page.frameDocuments.get(mainFrameId) !== mainDocumentId || page.frameNavigations.get(mainFrameId) !== mainNavigation) throw new AgentBrowserError('browser_document_changed');
			if (page.geometryPending || page.viewportVersion !== viewportVersion) throw new AgentBrowserError('browser_viewport_changed');
		};
		let root: Reference | undefined;
		if (scope.rootRef) {
			for (const observed of this.observations.values()) root ??= observed.refs.get(scope.rootRef);
			if (!root || root.pageId !== id || root.documentId !== documentId || root.epoch !== this.epoch || root.viewportVersion !== viewportVersion || page.frames.get(root.frameId) !== root.session || page.frameDocuments.get(root.frameId) !== root.frameDocumentId)
				throw new AgentBrowserError('browser_stale_ref');
			if (scope.frameId && scope.frameId !== root.frameId) throw new AgentBrowserError('browser_scope_mismatch');
			scope.frameId = root.frameId;
		}
		const result: BrowserObservation = {
			id: randomUUID(), spaceId: this.spaceId, pageId: id, runtimeId: this.id, documentId, epoch: this.epoch,
			viewportVersion, scope, coverage: [], frameErrors: [], url: page.url, title: page.title, nodes: [], truncated: false,
		};
		const documents = new Map<string, Map<string, ObservationDom>>(), treeFailures = new Set<string>();
		const capturedViewports = new Map<string, { session: string; documentId: string; viewport: FrameViewport }>();
		const error = (frameId: string, code: SnapshotFrameError['code']) => {
			if (!result.frameErrors.some(item => item.frameId === frameId && item.code === code)) result.frameErrors.push({ frameId, code });
		};
		// Refresh all attached sessions: getFrameTree includes same-process child frames;
		// an OOPIF's own session always retains ownership of its frame.
		for (const session of new Set([page.session, ...page.frames.values()])) {
			try {
				const tree = object(await this.cdp.command('Page.getFrameTree', {}, session, authority)); check();
				const track = (raw: unknown) => {
					const item = object(raw), frame = object(item.frame), frameId = string(frame.id);
					if (frameId && !page.frames.has(frameId)) {
						if (page.frames.size >= 64) throw new AgentBrowserError('browser_frame_quota');
						page.frames.set(frameId, session); page.frameDocuments.set(frameId, randomUUID());
					}
					if (Array.isArray(item.childFrames)) item.childFrames.forEach(track);
				}; track(tree.frameTree);
			} catch (reason) { check(); if (reason instanceof AgentBrowserError && reason.code === 'browser_frame_quota') throw reason; treeFailures.add(session); }
		}
		const frames = scope.frameId ? [[scope.frameId, page.frames.get(scope.frameId)] as const] : [...page.frames];
		const frameDocuments = new Map(frames.map(([frameId]) => [frameId, page.frameDocuments.get(frameId)]));
		const frameNavigations = new Map(frames.map(([frameId]) => [frameId, page.frameNavigations.get(frameId)]));
		const failFrame = (frameId: string) => {
			const coverage = result.coverage.find(frame => frame.frameId === frameId);
			if (coverage) { coverage.status = 'failed'; coverage.nodes = 0; }
			error(frameId, 'frame_unavailable');
			for (const node of result.nodes.filter(node => node.frameId === frameId)) refs.delete(node.ref);
			result.nodes = result.nodes.filter(node => node.frameId !== frameId);
			capturedViewports.delete(frameId);
		};
		for (const [frameId, session] of frames) {
			const frameDocumentId = page.frameDocuments.get(frameId) ?? '';
			const coverage = { frameId, documentId: frameDocumentId, status: 'complete' as 'complete' | 'partial' | 'failed' | 'omitted', nodes: 0 };
			result.coverage.push(coverage);
			if (!session || !frameDocumentId) { coverage.status = 'failed'; error(frameId, 'frame_unavailable'); continue; }
			if (treeFailures.has(session)) { coverage.status = 'partial'; error(frameId, 'frame_tree_unavailable'); }
			if (result.truncated) { coverage.status = 'omitted'; error(frameId, 'budget_exceeded'); continue; }
			const checkFrame = () => { check(); if (page.frames.get(frameId) !== session || page.frameDocuments.get(frameId) !== frameDocumentId || page.frameNavigations.get(frameId) !== frameNavigations.get(frameId)) throw new AgentBrowserError('browser_frame_changed'); };
			try {
				if (!documents.has(session)) {
					try {
						const raw = await this.cdp.command('DOMSnapshot.captureSnapshot', { computedStyles: ['display', 'visibility', 'opacity'] }, session, authority); checkFrame();
						documents.set(session, new Map(observationDocuments(raw).map(doc => [doc.frameId, doc])));
					} catch { checkFrame(); documents.set(session, new Map()); }
				}
				const dom = documents.get(session)!.get(frameId);
				if (!dom) { coverage.status = 'failed'; error(frameId, 'dom_unavailable'); continue; }
				const viewport = await this.frameViewport(page, frameId, session, authority, checkFrame);
				if (viewport.x !== dom.scrollX || viewport.y !== dom.scrollY) throw new AgentBrowserError('browser_viewport_changed');
				if (root && JSON.stringify(root.viewport) !== JSON.stringify(viewport)) throw new AgentBrowserError('browser_stale_ref');
				const rootIndex = root ? dom.nodes.findIndex(node => node.backend === root.node) : -1;
				if (root && rootIndex < 0) throw new AgentBrowserError('browser_stale_ref');
				let ax: Record<string, unknown>;
				try { ax = object(await this.cdp.command('Accessibility.getFullAXTree', { frameId }, session, authority)); checkFrame(); }
				catch { checkFrame(); coverage.status = 'failed'; error(frameId, 'accessibility_unavailable'); continue; }
				if (!Array.isArray(ax.nodes)) { coverage.status = 'failed'; error(frameId, 'accessibility_unavailable'); continue; }
				const backendIndexes = new Map(dom.nodes.map((node, index) => [node.backend, index]));
				const selection = observationSelection(dom.nodes, rootIndex);
				if (dom.nodes.some((node, index) => node.closedShadow && selection.selected.has(index))) { coverage.status = 'partial'; error(frameId, 'closed_shadow_root'); }
				for (const raw of ax.nodes) {
					const node = object(raw), backend = Number(node.backendDOMNodeId), index = backendIndexes.get(backend), detail = index !== undefined ? dom.nodes[index] : undefined;
					if (node.ignored || !Number.isSafeInteger(backend) || backend <= 0 || !detail || index === undefined || selection.closed.has(index) || !selection.selected.has(index)) continue;
					const role = string(object(node.role).value), name = string(object(node.name).value).slice(0, 1024);
					const interactive = ['textbox', 'button', 'link', 'combobox', 'checkbox', 'radio', 'slider', 'spinbutton', 'searchbox', 'menuitem', 'tab', 'switch'].includes(role);
					const bounds = detail.bounds;
					const visible = detail.visible && !selection.transparent.has(index) && !!bounds && bounds.x + bounds.width > viewport.x && bounds.y + bounds.height > viewport.y && bounds.x < viewport.x + viewport.width && bounds.y < viewport.y + viewport.height;
					if ((!name && !interactive) || scope.mode === 'interactive' && !interactive || scope.mode === 'visible' && !visible) continue;
					const ref = randomUUID(), value = !detail.password && typeof object(node.value).value === 'string' ? string(object(node.value).value).slice(0, 8192) : undefined;
					const entry: SnapshotNode = { ref, frameId, role, name, visible, ...(bounds ? { bounds } : {}), ...(value !== undefined ? { value } : {}) };
					result.nodes.push(entry);
					if (result.nodes.length > scope.maxNodes || Buffer.byteLength(JSON.stringify(result)) > scope.maxBytes) {
						result.nodes.pop(); result.truncated = true; coverage.status = 'partial'; error(frameId, 'budget_exceeded'); break;
					}
					refs.set(ref, { pageId: id, documentId, epoch: this.epoch, session, frameId, frameDocumentId, viewportVersion, viewport, node: backend });
					coverage.nodes++;
				}
				capturedViewports.set(frameId, { session, documentId: frameDocumentId, viewport });
			} catch (reason) {
				check();
				if (reason instanceof AgentBrowserError && ['browser_stale_ref', 'browser_viewport_changed'].includes(reason.code)) throw reason;
				failFrame(frameId);
			}
		}
		for (const [frameId, captured] of capturedViewports) {
			const checkFrame = () => {
				check();
				if (page.frames.get(frameId) !== captured.session || page.frameDocuments.get(frameId) !== captured.documentId || page.frameNavigations.get(frameId) !== frameNavigations.get(frameId)) throw new AgentBrowserError('browser_frame_changed');
			};
			try {
				checkFrame();
				const current = await this.frameViewport(page, frameId, captured.session, authority, checkFrame);
				if (JSON.stringify(current) !== JSON.stringify(captured.viewport)) throw new AgentBrowserError('browser_viewport_changed');
			} catch (reason) {
				check();
				if (frameId === page.mainFrameId || reason instanceof AgentBrowserError && reason.code === 'browser_viewport_changed') throw reason;
				failFrame(frameId);
			}
		}
		check();
		for (const [frameId, session] of frames) {
			if (page.frames.get(frameId) !== session || page.frameDocuments.get(frameId) !== frameDocuments.get(frameId) || page.frameNavigations.get(frameId) !== frameNavigations.get(frameId)) failFrame(frameId);
		}
		if (!scope.frameId) for (const frameId of page.frames.keys()) if (!frameDocuments.has(frameId)) {
			result.coverage.push({ frameId, documentId: page.frameDocuments.get(frameId) ?? '', status: 'omitted', nodes: 0 });
			error(frameId, 'frame_unavailable');
		}
		// Only child navigation can reach here with a changed aggregate document ID;
		// its stale frame was removed while the main navigation generation stayed fixed.
		result.documentId = page.documentId;
		for (const entry of refs.values()) entry.documentId = page.documentId;
		const viewportChanged = [...capturedViewports].some(([frameId, captured]) => {
			const previous = page.publishedViewports.get(frameId);
			return previous?.documentId === captured.documentId && JSON.stringify(previous.viewport) !== JSON.stringify(captured.viewport);
		});
		if (viewportChanged) {
			viewportVersion = ++page.viewportVersion; result.viewportVersion = viewportVersion;
			for (const entry of refs.values()) entry.viewportVersion = viewportVersion;
			for (const [observationId, observation] of this.observations) if (observation.pageId === page.id) this.observations.delete(observationId);
			this.pageEvent(page);
		}
		for (const [frameId, captured] of capturedViewports) page.publishedViewports.set(frameId, { documentId: captured.documentId, viewport: captured.viewport });
		while (result.nodes.length && Buffer.byteLength(JSON.stringify(result)) > scope.maxBytes) {
			const node = result.nodes.pop()!; refs.delete(node.ref); result.truncated = true;
			const frame = result.coverage.find(frame => frame.frameId === node.frameId)!; frame.nodes--; frame.status = 'partial'; error(node.frameId, 'budget_exceeded');
		}
		if (Buffer.byteLength(JSON.stringify(result)) > scope.maxBytes) throw new AgentBrowserError('browser_observation_budget_too_small');
		check();
		this.observations.set(result.id, { pageId: id, documentId: result.documentId, epoch: this.epoch, refs });
		while (this.observations.size > 8) this.observations.delete(this.observations.keys().next().value!);
		return result;
	}
	private async resolve(
		page: Page,
		observation: string,
		ref: string,
		authority: ControlLease,
		readOnly = false,
	): Promise<{ entry: Reference; objectId: string }> {
		this.authority(authority);
		const observed = this.observations.get(observation),
			entry = observed?.refs.get(ref);
		if (
			!observed ||
			!entry ||
			observed.pageId !== page.id ||
			entry.documentId !== page.documentId ||
			entry.epoch !== this.epoch ||
			entry.viewportVersion !== page.viewportVersion ||
			page.frames.get(entry.frameId) !== entry.session ||
			page.frameDocuments.get(entry.frameId) !== entry.frameDocumentId
		)
			throw new AgentBrowserError('browser_stale_ref');
		const check = () => this.assertReference(page, entry, authority);
		const viewport = await this.frameViewport(page, entry.frameId, entry.session, authority, check);
		if (JSON.stringify(viewport) !== JSON.stringify(entry.viewport)) {
			page.viewportVersion++;
			page.publishedViewports.clear();
			this.observations.clear();
			this.pageEvent(page);
			throw new AgentBrowserError('browser_stale_ref');
		}
		const result = object(
				await this.cdp.command(
					'DOM.resolveNode',
					{ backendNodeId: entry.node, objectGroup: 'huhu-browser-action', ...(readOnly ? { executionContextId: page.observationWorlds.get(entry.frameId)!.id } : {}) },
					entry.session,
					authority,
				),
			),
			objectId = string(object(result.object).objectId);
		check();
		if (!objectId) throw new AgentBrowserError('browser_stale_ref');
		const state = object(
			await this.cdp.command(
				'Runtime.callFunctionOn',
				{
					objectId,
					functionDeclaration:
						readOnly ? 'function(){return this.isConnected&&this.getClientRects().length>0&&getComputedStyle(this).visibility!=="hidden"}' : 'function(){return this.isConnected&&!this.disabled&&this.getClientRects().length>0&&getComputedStyle(this).visibility!=="hidden"}',
					returnByValue: true,
				},
				entry.session,
				authority,
			),
		);
		check();
		if (object(state.result).value !== true) throw new AgentBrowserError('browser_element_not_actionable');
		return { entry, objectId };
	}
	private assertReference(page: Page, entry: Reference, authority: ControlLease): void {
		this.authority(authority);
		if (this.pages.get(page.id) !== page || entry.documentId !== page.documentId || entry.epoch !== this.epoch || entry.viewportVersion !== page.viewportVersion || page.frames.get(entry.frameId) !== entry.session || page.frameDocuments.get(entry.frameId) !== entry.frameDocumentId)
			throw new AgentBrowserError('browser_stale_ref');
	}
	/** Fixed readonly projection; no page-authored script, style URLs, values or raw snapshot escape.
	 * Coordinates/reference design (Apache-2.0; no copied code):
	 * https://github.com/puppeteer/puppeteer/blob/15816772ad01431b976ff1bb052456a0aa9ecd0b/packages/puppeteer-core/src/api/ElementHandle.ts
	 * https://github.com/ChromeDevTools/devtools-protocol/blob/7245ec551bc9d450170193456ab3965bb7e716cb/json/browser_protocol.json
	 * Unlike Puppeteer's default screenshot, this never scrolls or changes the viewport.
	 */
	private async captureMaterial(page: Page, observationId: string, ref: string, authority: ControlLease): Promise<JsonValue> {
		if (authority.mode !== 'human') throw new AgentBrowserError('command_forbidden');
		const resolved = await this.resolve(page, observationId, ref, authority, true), entry = resolved.entry;
		const frameProof = new Map([...page.frames].map(([id, session]) => [id, { session, document: page.frameDocuments.get(id), navigation: page.frameNavigations.get(id) }]));
		const check = () => {
			this.assertReference(page, entry, authority);
			for (const [id, proof] of frameProof) if (page.frames.get(id) !== proof.session || page.frameDocuments.get(id) !== proof.document || page.frameNavigations.get(id) !== proof.navigation) throw new AgentBrowserError('browser_stale_ref');
		};
		const semantic = await this.observe(page.id, authority, { frameId: entry.frameId, rootRef: ref, mode: 'semantic', maxNodes: 512, maxBytes: 65536 }); check();
		if (!semantic.nodes.length || semantic.coverage.some(frame => frame.status === 'failed')) throw new AgentBrowserError('capture_unavailable');
		const read = async () => {
			const result = object(await this.cdp.command('Runtime.callFunctionOn', {
				objectId: resolved.objectId, returnByValue: true,
				functionDeclaration: 'function(){if(!this.isConnected||!this.getClientRects().length)return null;let e=this;for(let i=0;e&&i<128;i++,e=e.parentElement){const a=getComputedStyle(e);if(a.visibility==="hidden"||Number(a.opacity)===0)return null}if(e)return null;const r=this.getBoundingClientRect(),s=getComputedStyle(this),styles={};for(const p of ["display","visibility","opacity","color","background-color","font-family","font-size","font-weight","line-height","text-align","border-radius","padding-top","padding-right","padding-bottom","padding-left","margin-top","margin-right","margin-bottom","margin-left","box-sizing","position"])styles[p]=s.getPropertyValue(p).slice(0,256);return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},styles}}',
			}, entry.session, authority)); check();
			const value = object(object(result.result).value), rect = object(value.rect), styles = object(value.styles);
			if (!['x', 'y', 'width', 'height'].every(key => typeof rect[key] === 'number' && Number.isFinite(rect[key])) || Number(rect.width) <= 0 || Number(rect.height) <= 0) throw new AgentBrowserError('browser_element_not_actionable');
			const projected: Record<string, string> = {};
			for (const name of ['display','visibility','opacity','color','background-color','font-family','font-size','font-weight','line-height','text-align','border-radius','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','box-sizing','position']) if (typeof styles[name] === 'string') projected[name] = styles[name].slice(0,256);
			return { rect: { x: Number(rect.x), y: Number(rect.y), width: Number(rect.width), height: Number(rect.height) }, styles: projected };
		};
		const geometry = async () => {
			const measured = await read(); check();
			let rect = measured.rect, clipped = false, frameId = entry.frameId;
			const parents = new Map<string, string>();
			for (const session of new Set([page.session, ...page.frames.values()])) {
				const tree = object(await this.cdp.command('Page.getFrameTree', {}, session, authority)); check();
				const track = (raw: unknown, parent = '') => { const item = object(raw), frame = object(item.frame), id = string(frame.id), owner = string(frame.parentId) || parent; if (id && owner) parents.set(id, owner); if (Array.isArray(item.childFrames)) for (const child of item.childFrames) track(child, id); }; track(tree.frameTree);
			}
			const crop = (width: number, height: number) => { const x = Math.max(0, rect.x), y = Math.max(0, rect.y), right = Math.min(width, rect.x + rect.width), bottom = Math.min(height, rect.y + rect.height); if (right <= x || bottom <= y) throw new AgentBrowserError('browser_element_not_actionable'); const next = { x, y, width: right - x, height: bottom - y }; clipped ||= JSON.stringify(next) !== JSON.stringify(rect); rect = next; };
			const visited = new Set<string>();
			for (;;) {
				if (visited.has(frameId) || visited.size >= 16) throw new AgentBrowserError('browser_frame_owner_missing'); visited.add(frameId);
				const session = page.frames.get(frameId); if (!session) throw new AgentBrowserError('browser_frame_owner_missing');
				const viewport = await this.frameViewport(page, frameId, session, authority, check); check();
				const published = page.publishedViewports.get(frameId);
				if (published && JSON.stringify(published.viewport) !== JSON.stringify(viewport)) { page.viewportVersion++; page.publishedViewports.clear(); this.observations.clear(); this.pageEvent(page); throw new AgentBrowserError('browser_stale_ref'); }
				crop(viewport.width, viewport.height);
				if (frameId === page.mainFrameId) { rect = { ...rect, x: rect.x + viewport.x, y: rect.y + viewport.y }; break; }
				const parentId = parents.get(frameId), parentSession = parentId && page.frames.get(parentId); if (!parentId || !parentSession) throw new AgentBrowserError('browser_frame_owner_missing');
				const owner = object(await this.cdp.command('DOM.getFrameOwner', { frameId }, parentSession, authority)); check();
				await this.frameViewport(page, parentId, parentSession, authority, check); check();
				const parentWorld = page.observationWorlds.get(parentId); if (!parentWorld) throw new AgentBrowserError('browser_frame_geometry_invalid');
				const handle = object(await this.cdp.command('DOM.resolveNode', { backendNodeId: owner.backendNodeId, executionContextId: parentWorld.id, objectGroup: 'huhu-browser-action' }, parentSession, authority)); check();
				// An owner is measured in its parent's isolated world, including for
				// nested same-process frames; never assume CDP box-model root coordinates.
				const measuredOwner = object(await this.cdp.command('Runtime.callFunctionOn', {
					objectId: string(object(handle.object).objectId), returnByValue: true,
					functionDeclaration: 'function frameContentBox(){if(!this.isConnected||!this.getClientRects().length)return null;let e=this;for(let i=0;e&&i<128;i++,e=e.parentElement){const a=getComputedStyle(e);if(a.display==="none"||a.visibility==="hidden"||Number(a.opacity)===0)return null;if(a.rotate&&a.rotate!=="none"&&parseFloat(a.rotate)!==0)return null;if(a.scale&&a.scale!=="none"&&a.scale.split(" ").some(v=>!Number.isFinite(parseFloat(v))||parseFloat(v)<=0))return null;if(a.transform!=="none"){const m=new DOMMatrixReadOnly(a.transform);if(!m.is2D||Math.abs(m.b)>.000001||Math.abs(m.c)>.000001||m.a<=0||m.d<=0)return null}}if(e)return null;const r=this.getBoundingClientRect(),s=getComputedStyle(this),n=p=>parseFloat(s.getPropertyValue(p))||0,pl=n("padding-left"),pr=n("padding-right"),pt=n("padding-top"),pb=n("padding-bottom"),bl=n("border-left-width"),br=n("border-right-width"),bt=n("border-top-width"),bb=n("border-bottom-width");let w=n("width"),h=n("height");if(s.boxSizing==="border-box"){w-=pl+pr+bl+br;h-=pt+pb+bt+bb}if(!(w>0&&h>0))return null;const sx=r.width/(w+pl+pr+bl+br),sy=r.height/(h+pt+pb+bt+bb);return {x:r.x+(pl+bl)*sx,y:r.y+(pt+bt)*sy,width:w*sx,height:h*sy}}',
				}, parentSession, authority)); check();
				const box = object(object(measuredOwner.result).value);
				if (!['x','y','width','height'].every(key => typeof box[key] === 'number' && Number.isFinite(box[key])) || Number(box.width) <= 0 || Number(box.height) <= 0) throw new AgentBrowserError('browser_frame_transform_unsupported');
				const sx = Number(box.width) / viewport.width, sy = Number(box.height) / viewport.height;
				rect = { x: Number(box.x) + rect.x * sx, y: Number(box.y) + rect.y * sy, width: rect.width * sx, height: rect.height * sy }; frameId = parentId;
			}
			return { clip: rect, clipped, styles: measured.styles };
		};
		const measured = await geometry(); check();
		const image = object(await this.cdp.command('Page.captureScreenshot', { format: 'png', clip: { ...measured.clip, scale: 1 }, captureBeyondViewport: false }, page.session, authority)); check();
		const after = await geometry(); check(); if (JSON.stringify(after) !== JSON.stringify(measured)) throw new AgentBrowserError('browser_element_unstable');
		const data = string(image.data), bytes = Buffer.from(data, 'base64'); if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new AgentBrowserError('browser_image_limit'); encodedDimensions(bytes, 'image/png');
		return { observationId, ref, frameId: entry.frameId, documentId: page.documentId, epoch: this.epoch, viewportVersion: page.viewportVersion, ...measured, semantic: JSON.parse(JSON.stringify(semantic)) as JsonValue, image: { mime: 'image/png', data } };
	}
	private async hit(
		node: number,
		session: string,
		point: { x: number; y: number },
		authority: ControlLease,
	): Promise<void> {
		const resolved = object(
				await this.cdp.command(
					'DOM.resolveNode',
					{ backendNodeId: node, objectGroup: 'huhu-browser-action' },
					session,
					authority,
				),
			),
			objectId = string(object(resolved.object).objectId);
		if (!objectId) throw new AgentBrowserError('browser_stale_ref');
		const result = object(
			await this.cdp.command(
				'Runtime.callFunctionOn',
				{
					objectId,
					functionDeclaration:
						'function(x,y){let hit=this.ownerDocument.elementFromPoint(x,y);while(hit&&hit.shadowRoot){const inner=hit.shadowRoot.elementFromPoint(x,y);if(!inner||inner===hit)break;hit=inner}return this===hit||this.contains(hit)}',
					arguments: [{ value: point.x }, { value: point.y }],
					returnByValue: true,
				},
				session,
				authority,
			),
		);
		this.authority(authority);
		if (object(result.result).value !== true) throw new AgentBrowserError('browser_element_obscured');
	}
	private async box(page: Page, entry: Reference, authority: ControlLease): Promise<{ x: number; y: number }> {
		this.assertReference(page, entry, authority);
		await this.cdp.command('DOM.scrollIntoViewIfNeeded', { backendNodeId: entry.node }, entry.session, authority);
		this.assertReference(page, entry, authority);
		const quad = async (node: number, session: string): Promise<number[]> => {
			const model = object(
					object(await this.cdp.command('DOM.getBoxModel', { backendNodeId: node }, session, authority))
						.model,
				),
				q = model.content;
			this.assertReference(page, entry, authority);
			if (!Array.isArray(q) || q.length !== 8 || !q.every((v) => typeof v === 'number' && Number.isFinite(v)))
				throw new AgentBrowserError('browser_element_not_actionable');
			return q as number[];
		};
		const before = await quad(entry.node, entry.session);
		await delay(32);
		this.authority(authority);
		const q = await quad(entry.node, entry.session);
		if (q.some((v, i) => Math.abs(v - before[i]!) > 1)) throw new AgentBrowserError('browser_element_unstable');
		let point = { x: (q[0]! + q[4]!) / 2, y: (q[1]! + q[5]!) / 2 },
			session = entry.session;
		await this.hit(entry.node, session, point, authority);
		const visited = new Set<string>();
		while (session !== page.session) {
			if (visited.has(session) || visited.size >= 16) throw new AgentBrowserError('browser_frame_owner_missing');
			visited.add(session);
			const parent = this.parents.get(session);
			if (!parent) throw new AgentBrowserError('browser_frame_owner_missing');
			const owner = object(
					await this.cdp.command('DOM.getFrameOwner', { frameId: parent.frame }, parent.session, authority),
				),
				node = Number(owner.backendNodeId);
			if (!node) throw new AgentBrowserError('browser_frame_owner_missing');
			await this.cdp.command('DOM.scrollIntoViewIfNeeded', { backendNodeId: node }, parent.session, authority);
			const outer = await quad(node, parent.session);
			if (
				Math.abs(outer[1]! - outer[3]!) > 0.5 ||
				Math.abs(outer[2]! - outer[4]!) > 0.5 ||
				Math.abs(outer[5]! - outer[7]!) > 0.5 ||
				Math.abs(outer[0]! - outer[6]!) > 0.5 ||
				outer[2]! <= outer[0]! ||
				outer[5]! <= outer[1]!
			)
				throw new AgentBrowserError('browser_frame_transform_unsupported');
			const metrics = object(await this.cdp.command('Page.getLayoutMetrics', {}, session, authority)),
				viewport = object(metrics.cssLayoutViewport ?? metrics.layoutViewport),
				width = Number(viewport.clientWidth),
				height = Number(viewport.clientHeight);
			if (!(width > 0 && height > 0)) throw new AgentBrowserError('browser_frame_geometry_invalid');
			point = {
				x: outer[0]! + (point.x * (outer[2]! - outer[0]!)) / width,
				y: outer[1]! + (point.y * (outer[5]! - outer[1]!)) / height,
			};
			await this.hit(node, parent.session, point, authority);
			session = parent.session;
		}
		this.authority(authority);
		this.assertReference(page, entry, authority);
		return point;
	}
	private async input(page: Page, input: HumanInput, authority: ControlLease): Promise<void> {
		this.authority(authority);
		if (input.kind === 'composition') {
			if (authority.mode !== 'human' || !['start', 'update', 'end', 'cancel'].includes(input.phase) || input.phase === 'cancel' && !!input.text || Buffer.byteLength(input.text) > 48 * 1024 || !Number.isSafeInteger(input.selectionStart) || !Number.isSafeInteger(input.selectionEnd) || input.selectionStart < 0 || input.selectionEnd < input.selectionStart || input.selectionEnd > input.text.length)
				throw new AgentBrowserError('browser_invalid_composition');
			if (input.phase === 'start') {
				if (this.composition || input.text) throw new AgentBrowserError('browser_invalid_composition');
				this.composition = { page, documentId: page.documentId, leaseId: authority.leaseId, sent: false, uncertain: false };
				return;
			}
			const row = this.composition;
			if (!row || row.page !== page || row.documentId !== page.documentId || row.leaseId !== authority.leaseId) throw new AgentBrowserError('browser_invalid_composition');
			if (input.phase === 'cancel' || input.phase === 'end' && !input.text) await this.cancelComposition(row, authority);
			else {
				// CDP uses UTF-16 selection offsets; empty preedit cancels, insertText commits.
				// https://github.com/ChromeDevTools/devtools-protocol/blob/7245ec551bc9d450170193456ab3965bb7e716cb/json/browser_protocol.json
				// https://chromium.googlesource.com/chromium/src/+/8f93c3443faacdb1096ada43a496bb07238c3137/content/browser/devtools/protocol/input_handler.cc
				await this.compositionCommand(row, input.phase === 'end' ? 'Input.insertText' : 'Input.imeSetComposition', input.phase === 'end' ? { text: input.text } : { text: input.text, selectionStart: input.selectionStart, selectionEnd: input.selectionEnd }, authority);
			}
			this.authority(authority); return;
		}
		if (this.composition) await this.cancelComposition(this.composition, authority);
		const sessionId = page.session,
			frames: CdpFrame[] = [];
		if (input.kind === 'text') {
			if (Buffer.byteLength(input.text) > 48 * 1024) throw new AgentBrowserError('browser_text_limit');
			frames.push({ method: 'Input.insertText', params: { text: input.text }, sessionId });
		}
		if (input.kind === 'click' || input.kind === 'scroll') {
			if (
				!Number.isFinite(input.x) ||
				!Number.isFinite(input.y) ||
				input.x < 0 ||
				input.y < 0 ||
				input.x > page.width ||
				input.y > page.height
			)
				throw new AgentBrowserError('browser_invalid_coordinates');
			if (input.kind === 'click')
				for (const type of ['mousePressed', 'mouseReleased'])
					frames.push({
						method: 'Input.dispatchMouseEvent',
						params: {
							type,
							x: input.x,
							y: input.y,
							button: input.button ?? 'left',
							clickCount: input.clickCount ?? 1,
							modifiers: 0,
						},
						sessionId,
					});
			else
				frames.push({
					method: 'Input.dispatchMouseEvent',
					params: {
						type: 'mouseWheel',
						x: input.x,
						y: input.y,
						deltaX: input.deltaX,
						deltaY: input.deltaY,
						modifiers: 0,
					},
					sessionId,
				});
		}
		if (input.kind === 'key') {
			const modifiers = input.modifiers ?? 0;
			if (modifiers & 6 && ['c', 'x', 'v'].includes(input.key.toLowerCase()))
				throw new AgentBrowserError('browser_clipboard_shortcut_denied');
			if (!input.key || input.key.length > 32 || input.key.includes('+'))
				throw new AgentBrowserError('browser_invalid_key');
			const codes: Record<string, number> = {
				Enter: 13,
				Tab: 9,
				Escape: 27,
				Backspace: 8,
				Delete: 46,
				ArrowLeft: 37,
				ArrowUp: 38,
				ArrowRight: 39,
				ArrowDown: 40,
				Home: 36,
				End: 35,
				PageUp: 33,
				PageDown: 34,
			};
			for (const type of ['keyDown', 'keyUp'])
				frames.push({
					method: 'Input.dispatchKeyEvent',
					params: {
						type,
						key: input.key,
						code: input.key,
						modifiers,
						windowsVirtualKeyCode: codes[input.key] ?? input.key.toUpperCase().charCodeAt(0),
						...(type === 'keyDown' && input.key.length === 1 && modifiers === 0 ? { text: input.key } : {}),
					},
					sessionId,
				});
		}
		if (input.kind === 'scroll') { page.viewportVersion++; page.publishedViewports.clear(); this.observations.clear(); this.pageEvent(page); }
		await this.cdp.gesture(frames, authority);
		this.authority(authority);
	}
	private async compositionCommand(row: Composition, method: string, params: Record<string, unknown>, authority?: ControlLease): Promise<void> {
		const pending = this.cdp.command(method, params, row.page.session, authority).then(() => {
			row.sent = method === 'Input.imeSetComposition' && !!params.text;
			if (method === 'Input.insertText' && this.composition === row) this.composition = undefined;
		}, error => { row.uncertain = true; throw error; });
		row.pending = pending;
		try { await pending; }
		catch (error) { row.uncertain = true; throw error; }
		finally { if (row.pending === pending) row.pending = undefined; }
	}
	private async cancelComposition(row: Composition, authority?: ControlLease): Promise<void> {
		await row.pending;
		if (this.composition !== row) return;
		if (row.uncertain || this.pages.get(row.page.id) !== row.page || row.page.documentId !== row.documentId) throw new AgentBrowserError('browser_input_unsettled');
		if (row.sent) await this.compositionCommand(row, 'Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 }, authority);
		if (this.composition === row) this.composition = undefined;
	}
	async readIdentity(authority: ControlLease): Promise<RuntimeIdentityState> {
		this.authority(authority);
		const result = object(await this.cdp.command('Storage.getCookies', {}, undefined, authority));
		this.authority(authority);
		if (!Array.isArray(result.cookies)) throw new AgentBrowserError('browser_identity_readback_invalid');
		return { cookies: result.cookies as RuntimeCookie[] };
	}
	async writeIdentity(seed: RuntimeIdentityState, authority: ControlLease): Promise<void> {
		this.authority(authority);
		if (!this.fresh || this.sealed || this.written) throw new AgentBrowserError('browser_target_not_empty');
		let batch: Record<string, unknown>[] = [],
			bytes = 0;
		const flush = async () => {
			if (!batch.length) return;
			this.authority(authority);
			await this.cdp.command('Storage.setCookies', { cookies: batch }, undefined, authority);
			batch = [];
			bytes = 0;
		};
		for (const cookie of seed.cookies) {
			const domain = cookie.domain.replace(/^\./, ''),
				host = domain.includes(':') ? '[' + domain + ']' : domain;
			const value: Record<string, unknown> = {
				name: cookie.name,
				value: cookie.value,
				path: cookie.path,
				secure: cookie.secure,
				httpOnly: cookie.httpOnly,
				...((cookie.hostOnly ?? !cookie.domain.startsWith('.'))
					? {
							url:
								(cookie.secure || cookie.sourceScheme === 'Secure' ? 'https' : 'http') +
								'://' +
								host +
								'/',
						}
					: { domain: cookie.domain }),
				...(cookie.sameSite ? { sameSite: cookie.sameSite } : {}),
				...(!cookie.session && cookie.expires !== undefined && cookie.expires >= 0
					? { expires: cookie.expires }
					: {}),
				...(cookie.priority ? { priority: cookie.priority } : {}),
				...(cookie.sourceScheme ? { sourceScheme: cookie.sourceScheme } : {}),
				...(cookie.sourcePort !== undefined ? { sourcePort: cookie.sourcePort } : {}),
				...(cookie.partitionKey ? { partitionKey: cookie.partitionKey } : {}),
			};
			const size = Buffer.byteLength(JSON.stringify(value)) + 1;
			if (size > 48 * 1024) throw new AgentBrowserError('browser_cookie_limit');
			if (bytes + size > 48 * 1024 || batch.length >= 50) await flush();
			batch.push(value);
			bytes += size;
		}
		await flush();
	}
}
