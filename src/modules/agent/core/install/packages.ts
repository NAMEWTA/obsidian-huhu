// Package table, install command templates and the script-then-npm fallback adapted from farion1231/cc-switch (MIT),
// Copyright (c) 2025 Jason Young: src-tauri/src/commands/misc.rs (npm_install_command_for, official_update_args, installer scripts).
import type { AgentId } from '../launch/types';

export interface AgentPackage {
	/** npm package name, from this built-in table only (never user input). */
	npm: string;
	/** Extra fixed npm arguments (cc-switch: let the native postinstall run). */
	npmArgs?: readonly string[];
	/** Official installer script, tried first when present. */
	script?: { url: string; shell: 'sh' | 'bash' };
	/** Subcommand of the CLI itself that upgrades a copy it installed (`claude update`). */
	update?: readonly string[];
}

/** Agents without an entry have no known npm package, so HUHU shows neither Install nor Upgrade. */
export const AGENT_PACKAGES: Partial<Record<AgentId, AgentPackage>> = {
	'claude-code': {
		npm: '@anthropic-ai/claude-code',
		npmArgs: ['--ignore-scripts=false', '--include=optional', '--allow-scripts=@anthropic-ai/claude-code'],
		script: { url: 'https://claude.ai/install.sh', shell: 'bash' },
		update: ['update'],
	},
	codex: {
		npm: '@openai/codex',
		script: { url: 'https://chatgpt.com/codex/install.sh', shell: 'sh' },
		update: ['update'],
	},
	grok: {
		npm: '@xai-official/grok',
		script: { url: 'https://x.ai/cli/install.sh', shell: 'bash' },
		update: ['update'],
	},
	opencode: {
		npm: 'opencode-ai',
		script: { url: 'https://opencode.ai/install', shell: 'bash' },
		update: ['upgrade'],
	},
	gemini: { npm: '@google/gemini-cli' },
	pi: { npm: '@earendil-works/pi-coding-agent' },
};

export function agentPackage(id: AgentId): AgentPackage | undefined {
	return AGENT_PACKAGES[id];
}

/** One fixed command: an executable and its arguments, run without interpolating anything the user typed. */
export interface InstallStep {
	kind: 'script' | 'npm' | 'update';
	file: string;
	args: string[];
}

export type InstallPlatform = 'win32' | 'darwin' | 'linux';

const WINDOWS_SCRIPTS: Partial<Record<AgentId, string>> = {
	'claude-code': 'https://claude.ai/install.ps1',
	codex: 'https://chatgpt.com/codex/install.ps1',
	grok: 'https://x.ai/cli/install.ps1',
};

function npmStep(pkg: AgentPackage): InstallStep {
	return { kind: 'npm', file: 'npm', args: ['i', '-g', `${pkg.npm}@latest`, ...(pkg.npmArgs ?? [])] };
}

function scriptStep(id: AgentId, pkg: AgentPackage, platform: InstallPlatform): InstallStep | undefined {
	if (!pkg.script) return undefined;
	if (platform === 'win32') {
		const url = WINDOWS_SCRIPTS[id];
		return url
			? { kind: 'script', file: 'powershell', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `irm ${url} | iex`] }
			: undefined;
	}
	// Download to a temp file first so a truncated transfer is never executed (cc-switch avoids `curl | bash`).
	const script = `tmp=$(mktemp) && curl -fsSL ${pkg.script.url} -o "$tmp" && ${pkg.script.shell} "$tmp"; status=$?; rm -f "$tmp"; exit $status`;
	return { kind: 'script', file: 'bash', args: ['-c', script] };
}

/** Install: the official script first, npm when it fails (or when the agent has no script on this platform). */
export function installSteps(id: AgentId, platform: InstallPlatform): InstallStep[] {
	const pkg = agentPackage(id);
	if (!pkg) return [];
	const script = scriptStep(id, pkg, platform);
	return script ? [script, npmStep(pkg)] : [npmStep(pkg)];
}

/** A copy that npm manages sits in `node_modules`, an npm prefix `bin` or a Windows `npm` shim directory. */
export function isNpmManaged(location: string): boolean {
	return /[\\/]node_modules[\\/]|[\\/]npm[\\/][^\\/]+$|[\\/]\.npm-global[\\/]/i.test(location) || /\.(cmd|ps1)$/i.test(location);
}

/** Upgrade: npm for an npm-managed copy; otherwise the CLI's own updater, with npm as the fallback. */
export function upgradeSteps(id: AgentId, location: string | undefined, command: string): InstallStep[] {
	const pkg = agentPackage(id);
	if (!pkg) return [];
	const npm = npmStep(pkg);
	if (!pkg.update || (location && isNpmManaged(location))) return [npm];
	return [{ kind: 'update', file: location || command, args: [...pkg.update] }, npm];
}
