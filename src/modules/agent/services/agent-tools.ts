import { createStore } from 'zustand/vanilla';
import { AGENT_CATALOG } from '../core/launch/catalog';
import type { AgentId } from '../core/launch/types';
import { agentPackage, installSteps, upgradeSteps, type InstallPlatform, type InstallStep } from '../core/install/packages';
import { hasNewerVersion, parseInstallLocations, parseVersion } from '../core/install/versions';
import {
	commandEnv,
	defaultExec,
	defaultPlatform,
	defaultRealPath,
	fetchNpmLatest,
	type Exec,
	type ExecResult,
	type FetchLatest,
	type RealPath,
} from '../platform/desktop/install/exec';

export type ToolPhase = 'idle' | 'installing' | 'upgrading';
export interface ToolFailure {
	kind: 'noNpm' | 'failed';
	/** Last lines of the failing command's output. */
	output: string;
}
export interface ToolInfo {
	version?: string;
	locations: string[];
	latest?: string;
	phase: ToolPhase;
	failure?: ToolFailure;
}
export type ToolsState = Partial<Record<AgentId, ToolInfo>>;

export interface AgentToolsDeps {
	exec?: Exec;
	fetchLatest?: FetchLatest;
	realPath?: RealPath;
	platform?: InstallPlatform;
	/** Current PATH (login shell PATH included) and the detected CLI per agent. */
	path: () => Promise<string>;
	detected: () => Partial<Record<AgentId, string>>;
	/** Re-detect agents after an install or upgrade. */
	redetect: () => Promise<void>;
	now?: () => number;
}

const LATEST_TTL_MS = 6 * 3600_000;
const INSTALL_TIMEOUT_MS = 10 * 60_000;
const tail = (text: string, lines = 24) => text.trim().split(/\r?\n/).slice(-lines).join('\n');

/**
 * Version, install locations and latest version of each agent CLI, plus background install / upgrade. Commands come from
 * the fixed templates in `core/install/packages.ts`; the executor, registry fetch and clock are injectable.
 */
export class AgentTools {
	readonly store = createStore<ToolsState>(() => ({}));
	private readonly exec: Exec;
	private readonly fetchLatest: FetchLatest;
	private readonly realPath: RealPath;
	private readonly platform: InstallPlatform;
	private readonly latestCache = new Map<string, { at: number; version?: string }>();
	private queue: Promise<unknown> = Promise.resolve();
	private stopped = false;
	constructor(private readonly deps: AgentToolsDeps) {
		this.exec = deps.exec ?? defaultExec;
		this.fetchLatest = deps.fetchLatest ?? fetchNpmLatest;
		this.realPath = deps.realPath ?? defaultRealPath;
		this.platform = deps.platform ?? defaultPlatform();
	}

	/** Whether Install / Upgrade can be offered: only agents with a known npm package. */
	hasPackage(id: AgentId): boolean {
		return !!agentPackage(id);
	}

	private patch(id: AgentId, change: Partial<ToolInfo>) {
		if (this.stopped) return;
		this.store.setState((s) => ({ ...s, [id]: { locations: [], phase: 'idle', ...s[id], ...change } }));
	}

	private async env(): Promise<NodeJS.ProcessEnv> {
		const path = await this.deps.path().catch(() => '');
		return commandEnv(path);
	}

	/** Detect version, locations and latest version of every agent, without blocking. Failures leave fields empty. */
	async inspect(force = false): Promise<void> {
		const env = await this.env();
		await Promise.all(AGENT_CATALOG.map((agent) => this.inspectOne(agent.id, env, force)));
	}

	private async inspectOne(id: AgentId, env: NodeJS.ProcessEnv, force: boolean) {
		const detected = this.deps.detected()[id];
		const pkg = agentPackage(id);
		if (!detected) {
			this.patch(id, { version: undefined, locations: [] });
		} else {
			const command = AGENT_CATALOG.find((a) => a.id === id)!.detectCommand;
			const [version, locations] = await Promise.all([this.version(detected, env), this.locations(command, detected, env)]);
			this.patch(id, { version, locations });
		}
		if (pkg) this.patch(id, { latest: await this.latest(pkg.npm, force) });
	}

	private async version(file: string, env: NodeJS.ProcessEnv): Promise<string | undefined> {
		const r = await this.exec(file, ['--version'], { env, timeoutMs: 8000 });
		return parseVersion(`${r.stdout}\n${r.stderr}`);
	}

	private async locations(command: string, detected: string, env: NodeJS.ProcessEnv): Promise<string[]> {
		const win = this.platform === 'win32';
		const r = await this.exec(win ? 'where' : 'which', win ? [command] : ['-a', command], { env, timeoutMs: 5000 });
		const found = parseInstallLocations(r.stdout, this.platform);
		const unique: string[] = [];
		const real = new Set<string>();
		// The detected copy first (it is the one HUHU launches), then the others; symlinks to one file count once.
		for (const file of [detected, ...found]) {
			const key = win ? file.toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '') : this.realPath(file);
			if (real.has(key)) continue;
			real.add(key);
			unique.push(file);
		}
		return unique;
	}

	private async latest(name: string, force: boolean): Promise<string | undefined> {
		const now = (this.deps.now ?? Date.now)();
		const cached = this.latestCache.get(name);
		if (!force && cached && now - cached.at < LATEST_TTL_MS) return cached.version;
		const version = await this.fetchLatest(name).catch(() => undefined);
		// A failed lookup keeps the previous answer instead of erasing a known newer version.
		this.latestCache.set(name, { at: now, version: version ?? cached?.version });
		return version ?? cached?.version;
	}

	needsUpgrade(id: AgentId): boolean {
		const info = this.store.getState()[id];
		return hasNewerVersion(info?.version, info?.latest);
	}

	install(id: AgentId): Promise<void> {
		return this.run(id, 'installing', installSteps(id, this.platform));
	}

	upgrade(id: AgentId): Promise<void> {
		const info = this.store.getState()[id];
		const command = AGENT_CATALOG.find((a) => a.id === id)!.detectCommand;
		const first = this.deps.detected()[id] ?? info?.locations[0];
		return this.run(id, 'upgrading', upgradeSteps(id, first && this.realPath(first), first ?? command));
	}

	private run(id: AgentId, phase: ToolPhase, steps: InstallStep[]): Promise<void> {
		const busy = (this.store.getState()[id]?.phase ?? 'idle') !== 'idle';
		if (!steps.length || busy) return Promise.resolve();
		this.patch(id, { phase, failure: undefined });
		// npm and the official installers share global directories, so installs run one after another.
		const job = this.queue.then(async () => {
			const env = await this.env();
			let failure: ToolFailure | undefined;
			for (const step of steps) {
				const r = await this.exec(step.file, step.args, { env, timeoutMs: INSTALL_TIMEOUT_MS });
				failure = r.code === 0 && !r.error ? undefined : this.failure(step, r);
				if (!failure) break;
			}
			// Report an npm failure only: the script failing and npm succeeding is a success, and the reverse is the npm error.
			this.patch(id, { phase: 'idle', failure });
			await this.deps.redetect().catch(() => undefined);
			await this.inspectOne(id, await this.env(), true);
		});
		this.queue = job.catch(() => undefined);
		return job.catch((e) => this.patch(id, { phase: 'idle', failure: { kind: 'failed', output: String(e) } }));
	}

	private failure(step: InstallStep, r: ExecResult): ToolFailure {
		const missing = step.kind === 'npm' && (r.error === 'ENOENT' || r.code === 127);
		return { kind: missing ? 'noNpm' : 'failed', output: tail(`${r.stdout}\n${r.stderr}`) || r.error || `exit ${r.code}` };
	}

	dispose() {
		this.stopped = true;
	}
}
