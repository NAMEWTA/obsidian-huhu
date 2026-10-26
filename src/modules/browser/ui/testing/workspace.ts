import { vi } from 'vitest';
import type { BrowserFrame, BrowserWorkspace, BrowserWorkspaceState, IdentityImportPreview } from '../../api';

export const preview: IdentityImportPreview = {
	planId: 'plan-1',
	counts: { accepted: 2, expired: 1, duplicate: 1, invalid: 0, unsupported: 0 },
	originCount: 0,
	issues: [],
	domains: [
		{ domain: '.example.com', count: 1 },
		{ domain: 'example.com', count: 1 },
	],
};
export function workspaceFixture() {
	let state: BrowserWorkspaceState = {
		ready: true,
		readOnly: false,
		availability: { state: 'ready', version: 'test-runtime' },
		persistence: 'secure',
		ephemeralConsent: false,
		cleanupPending: 0,
		requests: [],
		spaces: [
			{
				id: 'space',
				label: 'Research',
				kind: 'task',
				retention: 'persistent',
				status: 'ready',
				runtimeId: 'runtime',
				createdAt: 1,
				updatedAt: 1,
				control: { mode: 'paused', epoch: 1 },
				pages: [
					{
						id: 'page',
						spaceId: 'space',
						title: 'Fixture',
						url: 'https://example.com/',
						documentId: 'document',
						status: 'open',
						zoom: 1,
						viewportVersion: 1,
					},
				],
			},
		],
	};
	const listeners = new Set<() => void>();
	const set = (next: BrowserWorkspaceState) => {
		state = next;
		for (const listener of listeners) listener();
	};
	let receive: ((frame: BrowserFrame) => void) | undefined;
	const ack = vi.fn(),
		disposeFrames = vi.fn();
	const api: BrowserWorkspace = {
		getState: () => state,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		resolveInput: (input) => input,
		consentEphemeral: vi.fn(async () => {}),
		installRuntimeBundle: vi.fn(async () => {}),
		refreshRuntime: vi.fn(async () => {}),
		createSpace: vi.fn(async () => state.spaces[0]!),
		renameSpace: vi.fn(async () => {}),
		startSpace: vi.fn(async () => {}),
		stopSpace: vi.fn(async () => {}),
		removeSpace: vi.fn(async () => {}),
		retryPendingCleanup: vi.fn(async () => {}),
		retryCleanup: vi.fn(async () => {}),
		openPage: vi.fn(async () => state.spaces[0]!.pages[0]!),
		closePage: vi.fn(async () => {}),
		takeover: vi.fn(async (request: Parameters<BrowserWorkspace['takeover']>[0]) => {
			const space = state.spaces[0]!,
				epoch = space.control.epoch + 1;
			const lease = {
				spaceId: space.id,
				runtimeId: space.runtimeId!,
				epoch,
				leaseId: `human-${epoch}`,
				controllerId: request.viewerId,
				viewerId: request.viewerId,
				windowId: request.windowId,
				mode: 'human' as const,
				expiresAt: Date.now() + 60_000,
			};
			set({ ...state, spaces: [{ ...space, control: { mode: 'human', epoch, lease } }] });
			return lease;
		}),
		releaseViewer: vi.fn(async () => {}),
		pause: vi.fn(async () => {}),
		resumeAgent: vi.fn(async () => {
			throw new Error('not_configured');
		}),
		copyAgentConnection: vi.fn(async () => 'private-connection'),
		pageAction: vi.fn(async () => null),
		humanInput: vi.fn(async () => {}),
		navigate: vi.fn(async () => {}),
		readSelection: vi.fn(async () => ({ text: 'selected webpage text', truncated: false })),
		subscribeFrames: vi.fn(
			(
				_scope: Parameters<BrowserWorkspace['subscribeFrames']>[0],
				listener: Parameters<BrowserWorkspace['subscribeFrames']>[1],
			) => {
				receive = listener;
				return { ack, dispose: disposeFrames };
			},
		),
		renderViewer: vi.fn(async () => null),
		listIdentities: vi.fn(() => []),
		prepareIdentityImport: vi.fn(async () => preview),
		prepareIdentityFile: vi.fn(async () => preview),
		prepareBrowserIdentityImport: vi.fn(async () => preview),
		commitIdentityImport: vi.fn(async () => ({
			id: 'seed',
			identityId: 'identity',
			label: 'Fixture identity',
			source: 'cookie-file' as const,
			createdAt: 1,
			cookieCount: 2,
			originCount: 0,
			persistent: true,
		})),
		discardIdentityImport: vi.fn(),
		listIdentitySources: vi.fn(async () => []),
		saveIdentity: vi.fn(async () => {
			throw new Error('not_configured');
		}),
		removeIdentity: vi.fn(async () => {}),
		listFiles: vi.fn(() => []),
		listDownloads: vi.fn(() => []),
		chooseUpload: vi.fn(async () => undefined),
		exportFile: vi.fn(async () => {}),
		removeFile: vi.fn(async () => {}),
		cancelDownload: vi.fn(async () => {}),
		listMaterialTargets: vi.fn(async () => []),
		sendMaterial: vi.fn(async () => {}),
	};
	const frame = (overrides: Partial<BrowserFrame> = {}): BrowserFrame => ({
		spaceId: 'space',
		pageId: 'page',
		runtimeId: 'runtime',
		documentId: 'document',
		epoch: state.spaces[0]!.control.epoch,
		viewportVersion: state.spaces[0]!.pages[0]!.viewportVersion,
		frameId: crypto.randomUUID(),
		width: 1280,
		height: 800,
		cssWidth: 1280,
		cssHeight: 800,
		mime: 'image/jpeg',
		data: new Uint8Array([255, 216, 255]),
		capturedAt: Date.now(),
		inputSequence: 0,
		...overrides,
	});
	return { api, set, ack, disposeFrames, frame, emit: (frame: BrowserFrame) => receive?.(frame) };
}
