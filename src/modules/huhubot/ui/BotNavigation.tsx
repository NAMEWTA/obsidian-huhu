import { useState } from 'react';
import { useVisible } from '../../../ui/react/contexts';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { Button } from '../../../ui/components/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../../../ui/components/dropdown-menu';
import { useT } from '../../../ui/react/hooks';

export function BotBackButton({ open }: { open?: () => void }) {
	const t = useT();
	return open ? (
		<Button variant="ghost" size="sm" onClick={open}>
			<ArrowLeft aria-hidden />
			{t('huhubot.chat.title')}
		</Button>
	) : null;
}

export function BotManagementMenu({
	openTarget,
	openSettings,
}: {
	openTarget?: (section: string) => void;
	openSettings?: () => void;
}) {
	const visible = useVisible();
	const [open, setOpen] = useState(false);
	const t = useT();
	return (
		<DropdownMenu open={visible && open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm">
					<Settings2 aria-hidden />
					{t('huhubot.chat.manage')}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				onCloseAutoFocus={(event) => {
					if (!visible) event.preventDefault();
				}}
			>
				{[
					['agents', 'huhubot.agent.edit'],
					['groups', 'huhubot.group.edit'],
					['memory', 'huhubot.memory.title'],
					['tasks', 'huhubot.tasks.title'],
					['access', 'huhubot.access.title'],
					['approvals', 'huhubot.tasks.approvals'],
					['data', 'huhubot.data.title'],
				].map(([section, label]) => (
					<DropdownMenuItem key={section} disabled={!openTarget} onSelect={() => openTarget?.(section!)}>
						{t(label!)}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled={!openSettings} onSelect={openSettings}>
					{t('huhubot.chat.configure')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
