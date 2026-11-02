/** Independent browser fixture. Only the Obsidian DOM extension and app CSS are host substitutes. */
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { setLanguage } from '../../../src/shared/i18n';
import { HuhuProviders } from '../../../src/ui/react/providers';
import { DesignScope, useDesignNotice } from '../../../src/ui/react/design-scope';
import { toast } from '../../../src/ui/components/sonner';
import { ComponentGallery } from '../../../src/ui/react/gallery';
import { Button } from '../../../src/ui/components/button';
import { Input } from '../../../src/ui/components/input';
import { Checkbox } from '../../../src/ui/components/checkbox';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '../../../src/ui/components/dialog';
import { ConfirmDialog } from '../../../src/ui/components/huhu/ConfirmDialog';
import { EmptyState } from '../../../src/ui/components/huhu/EmptyState';
import { Skeleton } from '../../../src/ui/components/skeleton';
import { Badge } from '../../../src/ui/components/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../src/ui/components/select';

const docs = { main: document, other: document.querySelector('iframe')!.contentDocument! };
const events = { enters: 0, saves: 0 };
let settle: ((error?: Error) => void) | undefined;
const states = [
	['initial-loading', 'Loading / 初次加载'], ['refreshing', 'Refreshing / 刷新中'],
	['empty', 'No items / 空数据'], ['no-results', 'No results / 筛选无结果'],
	['saving', 'Saving / 保存中'], ['success', 'Saved / 保存成功'],
	['failure', 'Save failed / 保存失败'], ['offline', 'Offline / 离线'],
	['unconfigured', 'Set up connection / 尚未配置'], ['permission', 'Permission needed / 权限不足'],
	['readonly', 'Read only / 只读'], ['cancelling', 'Cancelling / 正在取消'],
	['cancelled', 'Cancelled / 已确认取消'], ['uncertain', 'Status unknown / 状态不确定'],
] as const;
function NoticeTrigger() {
	const notice = useDesignNotice();
	return <Button data-review="notice" onClick={() => notice('Saved changes; your previous records remain available / 已保存更改，之前的记录仍可查看', { duration: Infinity })}>Show notice / 显示通知</Button>;
}
function Probe() {
	const [value, setValue] = useState('保留输入 / retained input');
	return <>
		<div className="huhu-ui" data-review="control"><Input aria-label="Control" defaultValue="Unchanged" /></div>
		<DesignScope data-review="scope">
			<div className="review-row">
				<NoticeTrigger />
				<Button data-review="primary">Save / 保存</Button>
				<Button disabled>Disabled / 禁用</Button>
				<Button aria-busy disabled>Saving / 保存中</Button>
				<Button asChild><a href="#probe" data-review="link">Link / 链接</a></Button>
				<Checkbox aria-label="Indeterminate" checked="indeterminate" />
				<Checkbox aria-label="Checked" checked />
			</div>
			<Input data-review="input" aria-label="Editor" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') events.enters++; }} />
			<Input aria-label="Read only" value="Read only / 只读" readOnly />
			<Input aria-label="Error" aria-invalid defaultValue="Retained error / 保留错误" />
			<Select defaultValue="small"><SelectTrigger size="sm" aria-label="Compact select" data-review="compact-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="small">Small / 紧凑</SelectItem></SelectContent></Select>
			<div className="review-row">
				<Dialog><DialogTrigger asChild><Button data-review="dialog">Dialog / 对话框</Button></DialogTrigger><DialogContent><DialogTitle>Review / 检查</DialogTitle><DialogDescription>Keyboard and portal ownership / 键盘与弹层归属</DialogDescription><Input aria-label="Dialog input" /></DialogContent></Dialog>
				<ConfirmDialog title="Save / 保存" description="Retain input on failure / 失败保留输入" confirmLabel="Confirm / 确认" onConfirm={() => { events.saves++; return new Promise<void>((resolve, reject) => { settle = error => error ? reject(error) : resolve(); }); }}><Button data-review="confirm">Confirm save / 确认保存</Button></ConfirmDialog>
			</div>
			<div className="huhu-ui" data-review="nested"><Input aria-label="Nested control" defaultValue="Unchanged" /></div>
		</DesignScope>
		<DesignScope data-review="state-matrix">
			{states.map(([state, label]) => <section key={state} data-review-state={state}>
				<Badge>{label}</Badge>
				{state === 'initial-loading' ? <Skeleton className="h-9 w-full" /> : <EmptyState size="sm" title={label} description="Previously loaded records and edited text remain available / 保留已加载记录与编辑内容" action={<Button disabled={['saving', 'cancelling', 'readonly', 'refreshing'].includes(state)} aria-busy={['saving', 'cancelling', 'refreshing'].includes(state) || undefined}>Review details and retry safely / 查看详情并重试</Button>} />}
			</section>)}
		</DesignScope>
	</>;
}
const roots: ReturnType<typeof createRoot>[] = [];
for (const doc of Object.values(docs)) {
	Object.defineProperty(doc.body, 'createDiv', { value: (options?: { cls?: string }) => {
		const element = doc.createElement('div'); element.className = options?.cls ?? ''; doc.body.append(element); return element;
	} });
	const container = doc.createElement('main'); doc.body.append(container);
	const root = createRoot(container); roots.push(root);
	root.render(<HuhuProviders ownerDocument={doc}><Probe />{doc === document && <ComponentGallery />}</HuhuProviders>);
}
Object.assign(window, { uiReview: { docs, events, settle: (message?: string) => settle?.(message ? new Error(message) : undefined),
	globalNotice: () => toast('Existing global notification', { duration: Infinity, id: 'review-global' }),
	clearGlobalNotice: () => toast.dismiss('review-global'),
	scopedNotices: () => toast.getToasts().filter(item => 'toasterId' in item && item.toasterId?.startsWith('huhu-content-')).length,
	configure(language: 'en' | 'zh', theme: string) { setLanguage(language); for (const doc of Object.values(docs)) { doc.documentElement.lang = language; doc.body.className = theme; } },
	unmount() { for (const root of roots) root.unmount(); },
} });
