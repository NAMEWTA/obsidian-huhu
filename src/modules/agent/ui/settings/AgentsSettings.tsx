// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/settings/AgentsPane.tsx, AgentDetectionCatalog.tsx
import { useStore } from 'zustand';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../../../ui/components/button';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { SettingsRow, SettingsSwitchRow, SegmentedControl } from '../../../../ui/components/huhu/SettingsFormControls';
import { useT } from '../../../../ui/react/hooks';
import { AGENT_CATALOG } from '../../core/launch/catalog';
import type { AgentController } from '../../services/controller';
import { AgentCatalogRow } from './AgentCatalogRow';
import { useAgentSettings } from './settings-context';
export function AgentsSettings({ controller }: { controller: AgentController }) {
	const t = useT(),
		settings = useAgentSettings(controller.settings),
		state = useStore(controller.agents.store);
	const save = (fn: Parameters<typeof controller.settings.update>[0]) => {
		void controller.settings.update(fn).catch((e) => controller.workspace.report(e));
	};
	return (
		<div className="space-y-8" data-agent-settings="">
			<SettingsSection title={t('agent.settings.permission')} description={t('agent.manage.permissionHint')}>
				<SegmentedControl
					value={settings.permissionMode}
					onChange={(v) =>
						save((d) => {
							d.permissionMode = v;
						})
					}
					ariaLabel={t('agent.settings.permission')}
					options={[
						{ value: 'yolo', label: t('agent.manage.yolo') },
						{ value: 'manual', label: t('agent.manage.manual') },
					]}
				/>
			</SettingsSection>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">
					{t('agent.manage.installed')} · {Object.keys(state.detected).length}
				</h3>
				<Button
					variant="ghost"
					size="sm"
					disabled={state.refreshing}
					title={t('agent.manage.refreshHint')}
					onClick={() => {
						void controller.agents.refresh(true).then(() => controller.tools.inspect(true));
					}}
				>
					<RefreshCw
						className={state.refreshing ? 'size-3 animate-spin motion-reduce:animate-none' : 'size-3'}
					/>
					{t('agent.refresh')}
				</Button>
			</div>
			{state.refreshing && (
				<div
					role="status"
					className="flex items-center justify-center rounded-md border border-dashed border-[var(--hu-line)]/50 py-6 text-sm text-[var(--hu-fg-2)]"
				>
					{t('agent.manage.detecting')}
				</div>
			)}
			{state.failed && (
				<div
					role="alert"
					className="rounded-md border border-[var(--hu-danger)]/40 bg-[var(--hu-danger-soft)]/5 px-3 py-2 text-xs text-[var(--hu-danger)]"
				>
					{t('agent.manage.detectFailed')} {state.error}
				</div>
			)}
			<div className="divide-y divide-border/40">
				{AGENT_CATALOG.filter((a) => state.detected[a.id]).map((a) => (
					<AgentCatalogRow key={a.id} agent={a} detected controller={controller} />
				))}
			</div>
			<SettingsSection title={t('agent.manage.available')}>
				<div className="divide-y divide-border/40">
					{AGENT_CATALOG.filter((a) => !state.detected[a.id]).map((a) => (
						<AgentCatalogRow key={a.id} agent={a} detected={false} controller={controller} />
					))}
				</div>
			</SettingsSection>
			<SettingsSwitchRow
				label={t('agent.manage.hooks')}
				description={t('agent.manage.hooksHint')}
				checked={settings.statusHooks}
				onChange={() =>
					save((d) => {
						d.statusHooks = !d.statusHooks;
					})
				}
			/>
			<SettingsRow
				label={t('agent.manage.removeSystemHooks')}
				description={t('agent.manage.removeSystemHooksHint')}
				control={
					<Button
						variant="secondary"
						onClick={() => {
							void controller.removeSystemStatusHooks().catch((e) => controller.workspace.report(e));
						}}
					>
						{t('agent.manage.removeSystemHooksAction')}
					</Button>
				}
			/>
			<SettingsSwitchRow
				label={t('agent.manage.titles')}
				checked={settings.generatedTitles}
				onChange={() =>
					save((d) => {
						d.generatedTitles = !d.generatedTitles;
					})
				}
			/>
			<SettingsSwitchRow
				label={t('agent.manage.notifications')}
				checked={settings.notifications}
				onChange={() =>
					save((d) => {
						d.notifications = !d.notifications;
					})
				}
			/>
			<SettingsRow
				label={t('agent.manage.navigation')}
				control={
					<Button
						variant="secondary"
						onClick={() =>
							save((d) => {
								d.hiddenNavigation = [];
							})
						}
					>
						{t('agent.manage.reset')}
					</Button>
				}
			/>
		</div>
	);
}
