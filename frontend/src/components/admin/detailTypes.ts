export interface DetailRow {
    id: number;
    k: string;
    v: string;
}

export const DETAIL_SUGGESTIONS = [
    'GH (mm)', 'αS', 'αC', 'Ø (mm)', 'H (mm)', 'Materiál',
    'Tork (Ncm)', 'Závit', 'Konektor', 'Hmotnosť (g)', 'Sterilizácia',
] as const;

let _idCounter = 1;
export function nextDetailId() { return _idCounter++; }
