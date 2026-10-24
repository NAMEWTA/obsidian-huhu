import { ARCHIVES_ROOT, EXPENSE_ROOT, HABIT_ROOT, POMODORO_ROOT, READING_ROOT } from '../../../../shared/storage/vault-layout';
export interface RecentDocScope {
  dashboardFile?: string;
  workspaceFiles?: readonly string[];
  contacts?: { rootFolder: string };
}
/** Explicit managed collections, not every note under a directory named HUHU. */
const managedRoots = [HABIT_ROOT, POMODORO_ROOT, EXPENSE_ROOT, READING_ROOT] as const;
function clean(value: string): string { return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''); }
function markdown(value: string): string { const p = clean(value); return /\.md$/i.test(p) ? p : p + '.md'; }
export function isRecentUserDocument(filePath: string, scope: RecentDocScope): boolean {
  const p = clean(filePath);
  if (!p || p.split('/').some(part => part.startsWith('.'))) return false;
  if (managedRoots.some(root => p.startsWith(root + '/'))) return false;
  if ([scope.dashboardFile, ...(scope.workspaceFiles ?? [])].some(board => !!board && p === markdown(board))) return false;
  const root = clean(scope.contacts?.rootFolder ?? ARCHIVES_ROOT);
  if (root && p.startsWith(root + '/')) {
    const tail = p.slice(root.length + 1).split('/');
    if (tail.length === 1 && tail[0] === '档案格式说明.md') return false;
    if (tail.length === 3 && (tail[0] === '个人档案' || tail[0] === '企业档案') && tail[2] === '基本信息.md') return false;
  }
  return true;
}
