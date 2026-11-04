// Business model adapted from yeshimei/bz (MIT), d76a0870329403247917a00c43019e203a2560a4:
// src/belongings/types.ts and shared.ts. Copyright (c) 2026 叫我包仔.
// HUHU: archive entities/table history, stable state IDs, decimal money and independent currency columns.
export type BelongingStatus = 'using' | 'idle' | 'sold' | 'discard';
export interface BelongingMoney { amount: string; currency: string }
export interface BelongingEvent {
	rowId: string;
	/** Row metadata preserves the user-owned table column schema. The target is the immediately preceding transition. */
	undoOf?: string;
	values: { [column: string]: unknown; status: BelongingStatus; date: string; exitDate: string; sale?: BelongingMoney | null; commandHash: string };
}
export interface Belonging {
	id: string;
	name: string;
	category: string;
	image?: string;
	specification?: string;
	notes?: string;
	receipt?: string;
	ownerId?: string;
	relatedPeople?: string[];
	companyId?: string;
	purchaseDate?: string;
	purchase?: BelongingMoney;
	status: BelongingStatus;
	exitDate: string;
	sale: BelongingMoney | null;
	events: BelongingEvent[];
	contentHash: string;
}
export interface TransitionBelonging {
	operationId: string;
	id: string;
	expectedHash: string;
	status: BelongingStatus;
	/** Effective local calendar day, defaults to today. */
	date?: string;
	exitDate?: string;
	sale?: BelongingMoney | null;
}
export interface BelongingMetrics {
	id: string;
	status: BelongingStatus;
	heldDays: number | null;
	netCost: BelongingMoney | null;
	/** Rounded half away from zero to six decimal places; null for unknown/zero duration. */
	dailyCost: BelongingMoney | null;
	zeroDays: boolean;
	negativeNet: boolean;
	unknownSale: boolean;
}
/** Monetary sums include known amounts only; unknown counters prevent treating missing amounts as zero. */
export interface BelongingCurrencyTotals { currency: string; purchased: string; recovered: string; netCost: string | null; unknownSales: number; unknownPurchases: number }
export interface BelongingSummary {
	total: number;
	inStock: number;
	exited: number;
	statuses: Record<BelongingStatus, number>;
	currencies: Array<{ currency: string; inventory: string; dailyCost: string; unknownDaily: number }>;
}
export interface BelongingStatistics { summary: BelongingSummary; asOf: string; items: BelongingMetrics[]; currencies: BelongingCurrencyTotals[] }

/** Owner-issued, same-runtime undo: original operation and post-commit hash must match; expires after five minutes. */
export interface UndoBelonging {
	operationId: string;
	originalOperationId: string;
	id: string;
	expectedHash: string;
}
export const BELONGING_UNDO_MS = 5 * 60 * 1000;
