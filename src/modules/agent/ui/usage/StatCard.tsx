// Adapted from stablyai/orca 464bd5a (MIT), Copyright (c) 2026 Lovecast Inc.: src/renderer/src/components/stats/StatCard.tsx
type StatCardProps = {
	label: string;
	value: string;
	icon: React.ReactNode;
};

export function StatCard({ label, value, icon }: StatCardProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-3 rounded-lg border border-[var(--hu-line)]/50 bg-[var(--hu-raised)]/60 px-4 py-3">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--hu-sunken)]/60 text-[var(--hu-fg-2)]">
				{icon}
			</div>
			<div className="min-w-0">
				<p className="text-lg font-semibold leading-tight text-[var(--hu-fg)]">{value}</p>
				<p className="text-xs text-[var(--hu-fg-2)]">{label}</p>
			</div>
		</div>
	);
}
