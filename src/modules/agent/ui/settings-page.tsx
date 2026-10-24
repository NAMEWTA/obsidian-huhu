import type { SettingsPageHost } from '../../../app/contracts/module';
import type { SettingsHandle } from '../../../shared/settings/store';
import type { TerminalSettings as Settings } from '../core/terminal/settings';
import type { AgentController } from '../services/controller';
import { useT } from '../../../ui/react/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/components/tabs';
import { Input } from '../../../ui/components/input';
import { SettingsSection } from '../../../ui/components/huhu/SettingsSection';
import { SettingsRow, SettingsSwitchRow } from '../../../ui/components/huhu/SettingsFormControls';
import { AGENT_CATALOG } from '../core/launch/catalog';
import { AgentsSettings } from './settings/AgentsSettings';
import { TerminalSettings } from './settings/TerminalSettings';
import { AccountsSection } from './settings/AccountsSection';
import { QuickCommandsSection } from './settings/QuickCommandsSection';
import { SkillsAdvanced, SkillsSection } from './settings/SkillsSection';
import type { SkillManager } from '../services/skill-manager';
import { useAgentSettings } from './settings/settings-context';
function PortableSettings({ handle, desktop }: { handle: SettingsHandle<Settings>; desktop: boolean }) {
	const t = useT();
	return (
		<SettingsSection title={t('agent.skills.heading')}>
			<SkillsAdvanced handle={handle} desktop={desktop} />
		</SettingsSection>
	);
}
function UsageSettings({ controller }: { controller: AgentController }) {
	const t = useT(),
		settings = useAgentSettings(controller.settings);
	const save = (fn: Parameters<typeof controller.settings.update>[0]) => {
		void controller.settings.update(fn).catch((e) => controller.workspace.report(e));
	};
	return (
		<SettingsSection title={t('agent.usage')}>
			<SettingsRow
				label={t('agent.manage.refreshInterval')}
				control={
					<Input
						type="number"
						min={60}
						max={3600}
						step={60}
						value={settings.usageRefreshSec}
						onChange={(e) => {
							if (e.target.validity.valid)
								save((d) => {
									d.usageRefreshSec = Number(e.target.value);
								});
						}}
					/>
				}
			/>
			{AGENT_CATALOG.map((a) => (
				<SettingsSwitchRow
					key={a.id}
					label={t('agent.stats.enable', { name: a.title })}
					checked={settings.usageAnalytics[a.id]}
					onChange={() =>
						save((d) => {
							d.usageAnalytics[a.id] = !d.usageAnalytics[a.id];
						})
					}
				/>
			))}
		</SettingsSection>
	);
}
export function agentSettingsPage(
	getController: () => AgentController | undefined,
	portable?: SettingsHandle<Settings>,
	desktop = true,
	getSkillManager: () => SkillManager | undefined = () => undefined,
) {
	return function AgentSettingsPage({ resourceId }: SettingsPageHost) {
		const t = useT(),
			controller = getController();
		if (!controller)
			return portable ? (
				<PortableSettings handle={portable} desktop={desktop} />
			) : (
				<p>{t('workbench.notReady')}</p>
			);
		return (
			<Tabs
				defaultValue={
					resourceId && ['agents', 'terminal', 'accounts', 'usage', 'quick', 'skills'].includes(resourceId)
						? resourceId
						: 'agents'
				}
				className="space-y-6"
			>
				<TabsList className="flex h-auto flex-wrap">
					{(['agents', 'terminal', 'accounts', 'usage', 'quick', 'skills'] as const).map((key) => (
						<TabsTrigger key={key} value={key} className="flex-auto">
							{t(`agent.manage.tab.${key}`)}
						</TabsTrigger>
					))}
				</TabsList>
				<TabsContent value="agents">
					<AgentsSettings controller={controller} />
				</TabsContent>
				<TabsContent value="terminal">
					<TerminalSettings controller={controller} />
				</TabsContent>
				<TabsContent value="accounts">
					<AccountsSection controller={controller} />
				</TabsContent>
				<TabsContent value="usage">
					<UsageSettings controller={controller} />
				</TabsContent>
				<TabsContent value="quick">
					<QuickCommandsSection controller={controller} />
				</TabsContent>
				<TabsContent value="skills">
					{(() => {
						const manager = getSkillManager();
						return manager ? (
							<SkillsSection manager={manager} handle={controller.settings} />
						) : (
							<PortableSettings handle={controller.settings} desktop={desktop} />
						);
					})()}
				</TabsContent>
			</Tabs>
		);
	};
}
