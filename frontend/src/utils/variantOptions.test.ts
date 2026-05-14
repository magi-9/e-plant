import { describe, expect, it } from 'vitest';
import { getFirstOptionTokenValue, sortByFirstOptionTokenValue } from './variantOptions';

describe('variant option sorting', () => {
    it('extracts the value of the first option token key', () => {
        expect(getFirstOptionTokenValue({ option_tokens: 'Platform: BEGO|Height: 2mm' })).toBe('BEGO');
    });

    it('sorts options by the value of the first option token key', () => {
        const sorted = sortByFirstOptionTokenValue([
            { reference: 'ref-3', option_tokens: 'Platform: 10|Height: 1mm' },
            { reference: 'ref-1', option_tokens: 'Platform: 2|Height: 3mm' },
            { reference: 'ref-2', option_tokens: 'Platform: 1|Height: 2mm' },
        ]);

        expect(sorted.map((option) => option.reference)).toEqual(['ref-2', 'ref-1', 'ref-3']);
    });

    it('falls back to reference when first token values match or are missing', () => {
        const sorted = sortByFirstOptionTokenValue([
            { reference: 'B' },
            { reference: 'A' },
        ]);

        expect(sorted.map((option) => option.reference)).toEqual(['A', 'B']);
    });
});
