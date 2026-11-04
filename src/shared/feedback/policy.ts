// Adapted from yeshimei/bz d76a0870329403247917a00c43019e203a2560a4 (MIT): src/core/notice.ts.
// Copyright (c) 2026 叫我包仔
// Changes: pure duration policy; no DOM, preferences, global notification state or z-index allocation.
// Source: https://github.com/yeshimei/bz/blob/d76a0870329403247917a00c43019e203a2560a4/src/core/notice.ts

export const FEEDBACK_DEDUPE_WINDOW_MS = 30_000;

export function feedbackDuration(text: string, level: 'info' | 'warning' | 'error', progress: boolean): number {
	if (progress) return 0;
	const base = level === 'error' ? 5000 : 3000;
	return Math.min(base + Math.max(0, text.length - 20) * 60, 15_000);
}
