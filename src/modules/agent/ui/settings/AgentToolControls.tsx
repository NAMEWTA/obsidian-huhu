import { useState } from 'react';
import { useStore } from 'zustand';
import { ArrowUpCircle, Download, Loader2 } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { useT } from '../../../../ui/react/hooks';
import { hasNewerVersion } from '../../core/install/versions';
import type { AgentId } from '../../core/launch/types';
import type { ToolInfo } from '../../services/agent-tools';
import type { AgentController } from '../../services/controller';

const EMPTY: ToolInfo = { locations: [], phase: 'idle' };

export function useToolInfo(controller: AgentController, id: AgentId): ToolInfo {
	return useStore(controller.tools.store, (s) => s[id]) ?? EMPTY;
}

/** Version column: current version, and the newer one when the registry knows it. Right-aligned, monospace. */
export function ToolVersion({ info }: { info: ToolInfo }) {
	const t = useT();
	if (!info.version) return null;
	const newer = hasNewerVersion(info.version, info.latest);
	return (
		<div className="w-32 shrink-0 text-right font-mono text-[11px] leading-tight" data-agent-version="">
			<div className="truncate text-foreground/80" title={info.version}>
				{info.version}
			</div>
			<div className={newer ? 'truncate text-primary' : 'truncate text-muted-foreground'}>
				{newer ? t('agent.tools.newVersion', { version: info.latest ?? '' }) : info.latest ? t('agent.tools.upToDate') : ''}
			</div>
		</div>
	);
}

/** Install location under the command line, with a toggle for the other installations on the machine. */
export function ToolLocations({ info }: { info: ToolInfo }) {
	const t = useT(),
		[open, setOpen] = useState(false);
	const [first, ...rest] = info.locations;
	if (!first) return null;
	return (
		<div className="mt-0.5 min-w-0 text-[11px] text-muted-foreground" data-agent-locations="">
			<div className="flex min-w-0 items-center gap-1.5">
				<span className="min-w-0 truncate font-mono" title={first} aria-label={t('agent.tools.installPath')}>
					{first}
				</span>
				{rest.length > 0 && (
					<button
						type="button"
						className="shrink-0 cursor-pointer rounded px-1 text-primary hover:underline"
						aria-expanded={open}
						onClick={() => setOpen(!open)}
					>
						{t('agent.tools.otherInstalls', { count: rest.length })}
					</button>
				)}
			</div>
			{open &&
				rest.map((file) => (
					<div key={file} className="truncate pl-3 font-mono" title={file}>
						{file}
					</div>
				))}
		</div>
	);
}

/** Install (not installed) or Upgrade (installed) button; hidden for agents without an npm package. */
export function ToolAction({
	controller,
	id,
	installed,
	info,
}: {
	controller: AgentController;
	id: AgentId;
	installed: boolean;
	info: ToolInfo;
}) {
	const t = useT();
	if (!controller.tools.hasPackage(id)) return <div />;
	const busy = info.phase !== 'idle',
		newer = hasNewerVersion(info.version, info.latest);
	const label = busy
		? t(info.phase === 'installing' ? 'agent.tools.installing' : 'agent.tools.upgrading')
		: t(installed ? 'agent.tools.upgrade' : 'agent.tools.install');
	return (
		<Button
			variant={installed && !newer ? 'ghost' : 'default'}
			size="xs"
			className="h-7 w-full justify-center gap-1 text-xs"
			disabled={busy}
			aria-busy={busy}
			title={installed ? undefined : t('agent.tools.installHint')}
			onClick={() => {
				void (installed ? controller.tools.upgrade(id) : controller.tools.install(id));
			}}
		>
			{busy ? (
				<Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
			) : installed ? (
				<ArrowUpCircle className="size-3" />
			) : (
				<Download className="size-3" />
			)}
			<span className="truncate">{label}</span>
		</Button>
	);
}

/** Failed install / upgrade: one line, with the command output behind a toggle. */
export function ToolFailureNotice({ info, installed }: { info: ToolInfo; installed: boolean }) {
	const t = useT(),
		[open, setOpen] = useState(false);
	const failure = info.failure;
	if (!failure) return null;
	return (
		<div role="alert" className="mt-2 pl-10 text-xs text-destructive" data-agent-failure="">
			<div className="flex flex-wrap items-center gap-2">
				<span>
					{failure.kind === 'noNpm'
						? t('agent.tools.noNpm')
						: t(installed ? 'agent.tools.failedUpgrade' : 'agent.tools.failedInstall')}
				</span>
				<button
					type="button"
					className="cursor-pointer underline"
					aria-expanded={open}
					onClick={() => setOpen(!open)}
				>
					{t(open ? 'agent.tools.hideOutput' : 'agent.tools.showOutput')}
				</button>
			</div>
			{open && (
				<pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border/50 bg-muted/40 p-2 font-mono text-[11px] text-foreground/80">
					{failure.output}
				</pre>
			)}
		</div>
	);
}
