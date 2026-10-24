// Layout and interaction adapted from PandoraReads/apex-dashboard ac4d2c7 (MIT), Copyright (c) 2025 PandoraReads: src/skill-widget.ts, src/skill-widget-config-modal.ts
import { useEffect, useRef, useState } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { useStore } from 'zustand';
import { toast } from 'sonner';
import { Button } from '../../../../ui/components/button';
import { EmptyState } from '../../../../ui/components/huhu/EmptyState';
import { Textarea } from '../../../../ui/components/textarea';
import { ObsidianIcon } from '../../../../ui/components/huhu/ObsidianIcon';
import { useVisible } from '../../../../ui/react/contexts';
import { useT } from '../../../../ui/react/hooks';
import type { BoardStore } from '../../services/board-store';
import type { SkillShortcut } from '../../core/board/types/model';
import { buildSkillContext } from '../../core/skills/context';
import { dispatchSkillShortcut, type SkillDraft } from '../../services/skill-shortcuts';
import { DashboardDialog } from '../dialogs/DashboardDialog';
import { IconButton } from '../board/controls';
import { WidgetActions } from '../canvas/widget-frame';
import { SkillList } from '../quickbar/SkillList';

function SkillConfig({ store, close }: { store: BoardStore; close(this: void): void }) {
	const t = useT(),
		[draft, setDraft] = useState(() => structuredClone(store.state.getState().settings.skillWidgetButtons)),
		[busy, setBusy] = useState(false);
	return (
		<DashboardDialog
			title={t('skillsWidget.cfgTitle')}
			onClose={close}
			busy={busy}
			onSave={() => {
				if (busy) return;
				setBusy(true);
				void store
					.settings((settings) => {
						settings.skillWidgetButtons = draft
							.filter((s) => s.label.trim())
							.map((s) => ({ ...s, label: s.label.trim() }));
					})
					.then(close)
					.catch(() => toast(t('storage.unsaved')))
					.finally(() => setBusy(false));
			}}
		>
			<SkillList store={store} skills={draft} onChange={setDraft} />
		</DashboardDialog>
	);
}
function SkillWidgetBody({ store }: { store: BoardStore }) {
	const buttons = useStore(store.state, (state) => state.settings.skillWidgetButtons).filter((s) => s.label.trim()),
		t = useT(),
		visible = useVisible();
	const [config, setConfig] = useState(false),
		[preview, setPreview] = useState<SkillDraft | null>(null),
		[busy, setBusy] = useState(false);
	const resolver = useRef<((value: SkillDraft | null) => void) | null>(null),
		controller = useRef<AbortController | null>(null);
	useEffect(
		() => () => {
			resolver.current?.(null);
			controller.current?.abort();
		},
		[],
	);

	const resolve = (draft: SkillDraft | null) => {
		resolver.current?.(draft);
		resolver.current = null;
		setPreview(null);
	};
	const run = (skill: SkillShortcut) => {
		if (controller.current && !controller.current.signal.aborted) return;
		const abort = new AbortController();
		controller.current = abort;
		setBusy(true);
		const path = store.state.getState().path + '.md';
		void dispatchSkillShortcut(
			skill,
			buildSkillContext({ source: { kind: 'widget', path, id: 'skills' }, title: skill.label, input: '' }),
			{
				dispatch: store.widgets.acquireDispatch ?? (async () => undefined),
				signal: abort.signal,
				notify: (message) => toast(message),
				preview: (_skill, _context, draft) =>
					new Promise((done) => {
						resolver.current = done;
						setPreview(draft);
					}),
			},
		).finally(() => {
			if (controller.current === abort) controller.current = null;
			if (!abort.signal.aborted) setBusy(false);
		});
	};
	return (
		<>
			<WidgetActions>
				<IconButton label={t('skillsWidget.configure')} onClick={() => setConfig(true)}>
					<Settings />
				</IconButton>
			</WidgetActions>
			{buttons.length === 0 ? (
				<EmptyState
					size="sm"
					className="h-full"
					icon={<Sparkles />}
					title={t('home.skills.empty')}
					action={
						<div className="hidden [@container(min-height:150px)]:block">
							<Button variant="outline" onClick={() => setConfig(true)}>
								<Settings />
								{t('skillsWidget.configure')}
							</Button>
						</div>
					}
				/>
			) : (
				<div
					data-skill-grid
					className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] content-start gap-2"
				>
					{buttons.map((skill, index) => (
						<Button
							key={skill.id}
							variant="outline"
							disabled={busy}
							title={skill.label}
							className="h-9 min-w-0 justify-start gap-2 px-2.5 font-normal"
							onClick={() => run(skill)}
						>
							<span
								className="inline-flex shrink-0"
								style={{ color: `var(--db-skill-key-${(index % 6) + 1})` }}
							>
								<ObsidianIcon name={skill.icon || 'sparkles'} />
							</span>
							<span className="min-w-0 flex-1 truncate text-left">{skill.label}</span>
						</Button>
					))}
				</div>
			)}
			{visible && config && <SkillConfig store={store} close={() => setConfig(false)} />}
			{visible && preview && (
				<DashboardDialog
					title={t('home.dashboard.skills')}
					onClose={() => resolve(null)}
					onSave={() => resolve(preview)}
				>
					<Textarea
						aria-label={t('home.dashboard.prompt')}
						value={preview.finalPrompt}
						onChange={(event) => setPreview({ ...preview, finalPrompt: event.target.value })}
					/>
				</DashboardDialog>
			)}
		</>
	);
}

export function SkillWidget({ store }: { store: BoardStore }) {
	return useVisible() ? <SkillWidgetBody store={store} /> : null;
}
