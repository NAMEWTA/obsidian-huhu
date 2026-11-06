import { createContext, useContext, useEffect, type ReactNode } from 'react';
export type DraftIssue = { dirty: boolean; error?: string };
export type ReportDraftIssue = (id: string, issue: DraftIssue | null) => void;
const Context = createContext<ReportDraftIssue>(() => {});
const Boundary = createContext<HTMLElement | null>(null);
export const useEditorBoundary = () => useContext(Boundary);
export function DraftIssues({
	report,
	boundary,
	children,
}: {
	report: ReportDraftIssue;
	boundary: HTMLElement | null;
	children: ReactNode;
}) {
	return (
		<Context value={report}>
			<Boundary value={boundary}>{children}</Boundary>
		</Context>
	);
}
export function useDraftIssue(id: string) {
	const report = useContext(Context);
	useEffect(() => () => report(id, null), [id, report]);
	return (issue: DraftIssue | null) => report(id, issue);
}
