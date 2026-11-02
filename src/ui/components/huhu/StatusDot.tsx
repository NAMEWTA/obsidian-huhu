// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/AgentStateDot.tsx
import { CircleCheck, CircleDashed, CirclePause, CircleX } from 'lucide-react';
import { useT } from '../../react/hooks';
import { cn } from '../../lib/utils';
import { AgentQuestionIcon } from './AgentQuestionIcon';
import { AgentWorkingSpinner } from './AgentWorkingSpinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
export type AgentStatus = 'idle' | 'working' | 'question' | 'completed' | 'interrupted' | 'failed' | 'unknown';
type State = 'working' | 'waiting' | 'permission' | 'done' | 'idle' | 'failed' | 'interrupted' | 'unknown';
export function StatusDot({
	state: supplied,
	status,
	label: suppliedLabel,
	size = 'sm',
	className,
}: {
	state?: State;
	status?: AgentStatus;
	label?: string;
	size?: 'sm' | 'md';
	className?: string;
}) {
	const t = useT();
	const state =
		supplied ?? (status === 'question' ? 'permission' : status === 'completed' ? 'done' : (status ?? 'unknown'));
	const label =
		suppliedLabel ??
		t(
			`ui.${status ?? (state === 'done' ? 'completed' : state === 'permission' || state === 'waiting' ? 'question' : state)}`,
		);
	const icon = size === 'md' ? 'size-3' : 'size-2.5',
		inner = size === 'md' ? 'size-2' : 'size-1.5';
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					role="img"
					tabIndex={0}
					aria-label={label}
					className={cn('inline-flex shrink-0 items-center justify-center', icon, className)}
				>
					{state === 'working' ? (
						<AgentWorkingSpinner className={inner} />
					) : state === 'waiting' || state === 'permission' ? (
						<AgentQuestionIcon className={icon} />
					) : state === 'unknown' ? (
						<CircleDashed className={cn('text-status-warning', icon)} />
					) : state === 'done' ? (
						<CircleCheck className={cn('text-status-success', icon)} data-status-shape="done" />
					) : state === 'failed' ? (
						<CircleX className={cn('text-status-error', icon)} data-status-shape="failed" />
					) : state === 'interrupted' ? (
						<CirclePause className={cn('text-status-error', icon)} data-status-shape="interrupted" />
					) : (
						<span className={cn('block rounded-full bg-muted-foreground/50', inner)} data-status-shape="idle" />
					)}
				</span>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
