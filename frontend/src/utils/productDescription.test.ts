import { describe, expect, it } from 'vitest';
import { buildDescriptionParts } from './productDescription';

const SAMPLE_DESC = [
    'Product name: Adaptor IO G3 HI. Comp.0050. 5N·cm',
    'Retail name: Dynamic scanbody adaptor',
    'EAN13: 843567350304',
    'Categories: BEGO',
    'Compatibility codes: 0049',
    'Raw systems: BEGO',
    'Sections: SCREWDRIVER',
    'Parametre: 0050 / 5N',
].join(' | ');

describe('buildDescriptionParts', () => {
    it('returns all parts (except Retail name) including Parametre for non-variant products', () => {
        const parts = buildDescriptionParts(SAMPLE_DESC, false);
        expect(parts.find((p) => p.key === 'Parametre')).toBeDefined();
        expect(parts.find((p) => p.key === 'Product name')?.value).toBe(
            'Adaptor IO G3 HI. Comp.0050. 5N·cm'
        );
        expect(parts.find((p) => p.key === 'Compatibility codes')?.value).toBe('0049');
        expect(parts.find((p) => p.key === 'Retail name')).toBeUndefined();
    });

    it('always hides Retail name regardless of variant mode', () => {
        const partsNoVariants = buildDescriptionParts(SAMPLE_DESC, false);
        const partsWithVariants = buildDescriptionParts(SAMPLE_DESC, true);
        expect(partsNoVariants.find((p) => p.key === 'Retail name')).toBeUndefined();
        expect(partsWithVariants.find((p) => p.key === 'Retail name')).toBeUndefined();
    });

    it('hides Parametre section for variant products (shown separately from option_tokens)', () => {
        const parts = buildDescriptionParts(SAMPLE_DESC, true);
        expect(parts.find((p) => p.key === 'Parametre')).toBeUndefined();
    });

    it('keeps non-variant-specific fields unchanged when no variant is passed', () => {
        const parts = buildDescriptionParts(SAMPLE_DESC, true);
        expect(parts.find((p) => p.key === 'EAN13')?.value).toBe('843567350304');
        expect(parts.find((p) => p.key === 'Categories')?.value).toBe('BEGO');
        expect(parts.find((p) => p.key === 'Raw systems')?.value).toBe('BEGO');
        expect(parts.find((p) => p.key === 'Sections')?.value).toBe('SCREWDRIVER');
    });

    it('overrides Product name with the selected variant name', () => {
        const variant = {
            name: 'Adaptor IO G3 HB. Comp.0052. 5N·cm',
            reference_num: '0052',
        };
        const parts = buildDescriptionParts(SAMPLE_DESC, true, variant);
        expect(parts.find((p) => p.key === 'Product name')?.value).toBe(
            'Adaptor IO G3 HB. Comp.0052. 5N·cm'
        );
    });

    it('overrides Compatibility codes with variant reference_num when provided', () => {
        const variant = {
            name: 'Adaptor IO G3 HB. Comp.0052. 5N·cm',
            reference_num: '0052',
        };
        const parts = buildDescriptionParts(SAMPLE_DESC, true, variant);
        expect(parts.find((p) => p.key === 'Compatibility codes')?.value).toBe('0052');
    });

    it('keeps original Compatibility codes when variant has no reference_num', () => {
        const variant = { name: 'Some Variant Without Ref' };
        const parts = buildDescriptionParts(SAMPLE_DESC, true, variant);
        expect(parts.find((p) => p.key === 'Compatibility codes')?.value).toBe('0049');
    });

    it('handles description entries without a colon separator', () => {
        const desc = 'Plain text entry | Key: value';
        const parts = buildDescriptionParts(desc, false);
        const plain = parts.find((p) => p.key === '');
        expect(plain?.value).toBe('Plain text entry');
    });

    it('filters out parts with empty values', () => {
        // 'Key:  ' — the split delimiter is ' | ', leaving 'Key: ' (colon+space found, value is empty after trim)
        const desc = 'Key:  | Key2: actual value';
        const parts = buildDescriptionParts(desc, false);
        expect(parts.every((p) => p.value !== '')).toBe(true);
        expect(parts).toHaveLength(1);
        expect(parts[0].value).toBe('actual value');
    });

    it('is not affected by hasVariants when selectedVariant is null', () => {
        const parts = buildDescriptionParts(SAMPLE_DESC, true, null);
        // Product name stays as original (no override without a variant)
        expect(parts.find((p) => p.key === 'Product name')?.value).toBe(
            'Adaptor IO G3 HI. Comp.0050. 5N·cm'
        );
    });
});
