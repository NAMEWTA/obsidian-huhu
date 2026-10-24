export interface DiagnosticRoots {
	home?: string;
	vault?: string;
}

let roots: DiagnosticRoots = {};

/** Register path prefixes that diagnostics must not print. Longer prefixes win. */
export function setDiagnosticRoots(next: DiagnosticRoots): void {
	roots = { ...roots, ...next };
}

export function diagnosticRoots(): DiagnosticRoots {
	return { ...roots };
}
