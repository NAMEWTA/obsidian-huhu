import type { CSSProperties } from 'react';

export type Leave = () => Promise<boolean>;
/** Keep text controls reachable on narrow views, with either pointer type. */
export const personHitSize = { '--nd-hit-size': '44px' } as CSSProperties;
