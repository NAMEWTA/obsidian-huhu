/**
 * The board-only `--board-*` tokens are declared on `.huhu-dashboard-root`, but
 * Obsidian renders Modal dialogs in the body-level modal layer outside that
 * root. Global tokens (`--card`, `--foreground`, ...) already live on `<body>`;
 * only the board's derived tokens and the Appearance Studio overrides (radius
 * scale, glass blur, surface opacity, all set inline on the root) need copying.
 *
 * `applyModalTheme` reads the ACTIVE root's computed custom properties and
 * copies them onto the target so its descendants resolve the same tokens the
 * dashboard uses. Call once per dialog, right after the modal's container
 * classes are wired in `onOpen`.
 */
const MODAL_THEME_VARS: readonly string[] = [
	'--board-accent',
	'--board-accent-light',
	'--board-bg-card',
	'--board-bg-card-hover',
	'--board-bg-hover-strong',
	'--board-bg-section',
	'--board-text-faint',
	'--board-radius-sm',
	'--board-radius-md',
	'--board-radius-lg',
	'--board-backdrop-blur',
	'--board-shadow-card',
	'--board-shadow-card-hover',
];

/**
 * Mirror the active dashboard's resolved `--board-*` tokens onto a dialog element.
 * No-op when no dashboard is open (tokens stay unset; dialogs fall back to their
 * stylesheet defaults). This supersedes the per-modal `inheritDashboardTheme`
 * copies that had drifted across calendar-modal / renderer / stats overlays.
 */
export function applyModalTheme(target: HTMLElement): void {
	const doc = target.ownerDocument ?? activeDocument;
	const root = doc.querySelector<HTMLElement>('.huhu-dashboard-root');
	if (!root) return;
	const computed = doc.defaultView?.getComputedStyle(root);
	if (!computed) return;
	for (const name of MODAL_THEME_VARS) {
		const value = computed.getPropertyValue(name).trim();
		if (value) target.style.setProperty(name, value);
	}
}
