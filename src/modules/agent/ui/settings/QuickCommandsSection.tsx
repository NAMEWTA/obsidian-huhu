// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/terminal-quick-commands/TerminalQuickCommandDialog.tsx
import { useState } from 'react';
import { Button } from '../../../../ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../ui/components/select';
import { SettingsSection } from '../../../../ui/components/huhu/SettingsSection';
import { useT } from '../../../../ui/react/hooks';
import type { QuickCommand } from '../../core/terminal/settings';
import type { AgentController } from '../../services/controller';
import { newQuickCommand, QuickCommandEditor } from '../quick-commands/QuickCommandEditor';
import { useAgentSettings } from './settings-context';
export function QuickCommandsSection({ controller }: { controller: AgentController }) {
	const t = useT(),
		settings = useAgentSettings(controller.settings),
		[edit, setEdit] = useState<QuickCommand>();
	const spaces = controller.spaceChoices();
	// A vault command may be saved against one Space; absent means the Space chooser opens on every run.
	const bind = (command: QuickCommand, value: string) =>
		controller.settings
			.update((d) => {
				const target = d.quickCommands.find((item) => item.id === command.id);
				if (!target) return;
				if (value === '_ask') delete target.spaceId;
				else target.spaceId = value;
			})
			.catch((e) => controller.workspace.report(e));
	return (
		<SettingsSection title={t('agent.quick.title')}>
			<div className="divide-y divide-border/40">
				{settings.quickCommands.map((command) => (
					<div key={command.id} className="flex flex-wrap items-center gap-2 py-3">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">{command.name}</p>
							<p className="truncate font-mono text-xs text-muted-foreground">{command.content}</p>
						</div>
						{command.scope === 'vault' && (
							<Select
								value={command.spaceId ?? '_ask'}
								onValueChange={(value) => void bind(command, value)}
							>
								<SelectTrigger aria-label={t('agent.quick.space')} className="h-7 w-44 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="_ask">{t('agent.quick.space.ask')}</SelectItem>
									{command.spaceId && !spaces.some((space) => space.id === command.spaceId) && (
										<SelectItem value={command.spaceId}>
											{t('agent.quick.space.unavailable')}
										</SelectItem>
									)}
									{spaces.map((space) => (
										<SelectItem key={space.id} value={space.id}>
											{space.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						<Button
							variant="ghost"
							size="xs"
							onClick={() => {
								void controller.runQuickCommand(command).catch((e) => controller.workspace.report(e));
							}}
						>
							{t('agent.quick.run')}
						</Button>
						<Button variant="ghost" size="xs" onClick={() => setEdit(command)}>
							{t('agent.quick.edit')}
						</Button>
						<Button
							variant="ghost"
							size="xs"
							onClick={() => {
								void controller.settings
									.update((d) => {
										d.quickCommands = d.quickCommands.filter((c) => c.id !== command.id);
									})
									.catch((e) => controller.workspace.report(e));
							}}
						>
							{t('agent.manage.remove')}
						</Button>
					</div>
				))}
			</div>
			<Button variant="outline" onClick={() => setEdit(newQuickCommand())}>
				{t('agent.quick.add')}
			</Button>
			{edit && <QuickCommandEditor command={edit} controller={controller} close={() => setEdit(undefined)} />}
		</SettingsSection>
	);
}
