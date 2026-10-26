import { contributionPoint, serviceKey } from '../../app/contracts/module';
import type {
 BrowserWorkspaceState, BrowserSpace, BrowserPage, ControlLease, BrowserFrame, BrowserCommand,
 HumanInput, HumanPageRequest, CreateSpaceRequest, FrameSubscription, RunGrant,
 OperationRecord, JsonValue, BrowserObservation, BrowserRunHealth, BrowserRunEvent,
} from './core/contracts';
import type { IdentitySummary, IdentityImportPreview, IdentitySource } from './core/identity';
import type { BrowserFile, BrowserDownload } from './core/files';
export type * from './core/contracts';
export type { IdentitySummary, IdentityImportPreview, IdentitySource } from './core/identity';
export type { BrowserFile, BrowserDownload } from './core/files';
export type { BrowserSettings } from './core/model';

export interface BrowserOpenRequest { url?: string; spaceId?: string; reuse?: boolean; title?: string; }
export interface BrowserOpener {
 open(request: BrowserOpenRequest): Promise<string>;
 show(request: BrowserOpenRequest): Promise<void>;
}
export interface BrowserMaterial { title: string; text: string; image?: { mime: 'image/png' | 'image/jpeg'; data: Uint8Array }; }
export interface BrowserMaterialConsumer {
 id: string;
 targets(): Promise<Array<{ id: string; label: string }>>;
 /** Adds material to the selected input; never submits the conversation. */
 deliver(targetId: string, material: BrowserMaterial): Promise<void>;
}
/** Trusted in-process UI API. CLI/MCP expose only the separately validated Agent protocol. */
export interface BrowserWorkspace {
 getState(): BrowserWorkspaceState;
 subscribe(listener: () => void): () => void;
 resolveInput(input: string): string | null;
 consentEphemeral(): Promise<void>;
 installRuntimeBundle(): Promise<void>;
 refreshRuntime(): Promise<void>;
 createSpace(request: CreateSpaceRequest, requestId?: string): Promise<BrowserSpace>;
 renameSpace(spaceId: string, label: string): Promise<void>;
 startSpace(spaceId: string): Promise<void>;
 stopSpace(spaceId: string): Promise<void>;
 removeSpace(spaceId: string): Promise<void>;
 retryPendingCleanup(): Promise<void>;
 openPage(request: { spaceId: string; url?: string }): Promise<BrowserPage>;
 closePage(request: { spaceId: string; pageId: string }): Promise<void>;
 takeover(request: { spaceId: string; viewerId: string; windowId: string }): Promise<ControlLease>;
 releaseViewer(spaceId: string, viewerId: string): Promise<void>;
 pause(spaceId: string): Promise<void>;
 resumeAgent(spaceId: string): Promise<RunGrant>;
 copyAgentConnection(spaceId: string): Promise<string>;
 pageAction(request: HumanPageRequest & { command: BrowserCommand }): Promise<JsonValue>;
 humanInput(request: HumanPageRequest & { frameId: string; inputSequence: number; input: HumanInput }): Promise<void>;
 navigate(request: HumanPageRequest & { url: string }): Promise<void>;
 readSelection(request: HumanPageRequest): Promise<{ text: string; truncated: boolean }>;
 subscribeFrames(scope: { spaceId: string; pageId: string; viewerId: string }, receive: (frame: BrowserFrame) => void): FrameSubscription;
 renderViewer(scope: { spaceId: string; pageId: string }): Promise<unknown>;
 listIdentities(): IdentitySummary[];
 prepareIdentityImport(request: { label: string; text: string }): Promise<IdentityImportPreview>;
 prepareIdentityFile(request: { label: string }): Promise<IdentityImportPreview | undefined>;
 prepareBrowserIdentityImport(request: { sourceId: string; profileId?: string; label: string }): Promise<IdentityImportPreview>;
 commitIdentityImport(request: { planId: string; persist: boolean; domains?: string[] }): Promise<IdentitySummary>;
 discardIdentityImport(planId: string): void;
 listIdentitySources(): Promise<IdentitySource[]>;
 saveIdentity(request: HumanPageRequest & { label: string; persist: boolean }): Promise<IdentitySummary>;
 removeIdentity(id: string): Promise<void>;
 listFiles(spaceId: string): BrowserFile[];
 listDownloads(spaceId: string): BrowserDownload[];
 chooseUpload(spaceId: string, principal: 'human' | 'agent'): Promise<BrowserFile | undefined>;
 exportFile(fileId: string): Promise<void>;
 removeFile(fileId: string): Promise<void>;
 cancelDownload(fileId: string): Promise<void>;
 listMaterialTargets(): Promise<Array<{ id: string; label: string }>>;
 sendMaterial(request: HumanPageRequest & { targetId: string }): Promise<void>;
}
export interface BrowserAgentAccess {
 startRun(spaceId: string, issuerId: string): Promise<RunGrant>;
 stopRun(runId: string, capability: string): Promise<void>;
 heartbeat(runId: string, capability: string): Promise<number>;
 observe(runId: string, capability: string, pageId: string): Promise<BrowserObservation>;
 prepare(runId: string, capability: string, pageId: string, requestId: string, command: BrowserCommand): Promise<OperationRecord>;
 execute(runId: string, capability: string, operationId: string, command: BrowserCommand): Promise<OperationRecord>;
 operation(runId: string, capability: string, operationId: string): Promise<OperationRecord | undefined>;
 pageOpen(runId: string, capability: string, requestId: string, url?: string): Promise<OperationRecord>;
 pageClose(runId: string, capability: string, requestId: string, pageId: string): Promise<OperationRecord>;
 pageList(runId: string, capability: string): BrowserPage[];
 fileList(runId: string, capability: string): BrowserFile[];
 downloadList(runId: string, capability: string): BrowserDownload[];
 health(runId: string, capability: string): BrowserRunHealth;
 events(runId: string, capability: string, afterSequence?: number): BrowserRunEvent[];
}
export const BROWSER_WORKSPACE = serviceKey<BrowserWorkspace>('browser', 'workspace');
export const BROWSER_OPEN = serviceKey<BrowserOpener>('browser', 'open');
export const BROWSER_MATERIAL_CONSUMERS = contributionPoint<BrowserMaterialConsumer>('browser', 'material-consumers');
