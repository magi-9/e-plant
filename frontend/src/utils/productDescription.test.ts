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
    it('returns all translated parts (except hidden fields) including Parametre for non-variant products', () => {
        const parts = buildDescriptionParts(SAMPLE_DESC, false);
        expect(parts.find((p) => p.key === 'Parametre')).toBeDefined();
        expect(parts.find((p) => p.key === 'Názov produktu')?.value).toBe(
            'Adaptor IO G3 HI. Comp.0050. 5N·cm'
        );
        expect(parts.find((p) => p.key === 'Kompatibilné kódy')?.value).toBe('0049');
        expect(parts.find((p) => p.key === 'Retail name')).toBeUndefined();
        expect(parts.find((p) => p.key === 'Raw systems')).toBeUndefined();
        expect(parts.find((p) => p.key === 'Sections')).toBeUndefined();
    });

    it('puts Názov produktu first regardless of its position in the raw description string', () => {
        // Reverse-order desc where Product name is last
        const reversed = [
            'Categories: BEGO',
            'Compatibility codes: 0049',
            'Product name: Adaptor IO G3 HI. Comp.0050. 5N·cm',
        ].join(' | ');
        const parts = buildDescriptionParts(reversed, false);
        expect(parts[0].key).toBe('Názov produktu');
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

    it('replaces EAN13 with product code and keeps other fields unchanged when no variant is passed', () => {
        const parts = buildDescriptionParts(SAMPLE_DESC, true);
        expect(parts.find((p) => p.key === 'EAN13')).toBeUndefined();
        expect(parts.find((p) => p.key === 'Kód produktu')?.value).toBe('843567350304');
        expect(parts.find((p) => p.key === 'Kategórie')).toBeUndefined(); // Hidden
    });

    it('uses explicit product code for Kód produktu replacement when provided', () => {
        const parts = buildDescriptionParts(SAMPLE_DESC, false, null, '503.000.049');
        expect(parts.find((p) => p.key === 'Kód produktu')?.value).toBe('503.000.049');
    });

    it('prefers variant reference over product code for Kód produktu replacement', () => {
        const variant = {
            name: 'Adaptor IO G3 HB. Comp.0052. 5N·cm',
            reference: '503.000.052',
            reference_num: '0052',
        };
        const parts = buildDescriptionParts(SAMPLE_DESC, true, variant, '503.000.049');
        expect(parts.find((p) => p.key === 'Kód produktu')?.value).toBe('503.000.052');
    });

    it('overrides Názov produktu with the selected variant name', () => {
        const variant = {
            name: 'Adaptor IO G3 HB. Comp.0052. 5N·cm',
            reference_num: '0052',
        };
        const parts = buildDescriptionParts(SAMPLE_DESC, true, variant);
        expect(parts.find((p) => p.key === 'Názov produktu')?.value).toBe(
            'Adaptor IO G3 HB. Comp.0052. 5N·cm'
        );
    });

    it('overrides Kompatibilné kódy with variant reference_num when provided', () => {
        const variant = {
            name: 'Adaptor IO G3 HB. Comp.0052. 5N·cm',
            reference_num: '0052',
        };
        const parts = buildDescriptionParts(SAMPLE_DESC, true, variant);
        expect(parts.find((p) => p.key === 'Kompatibilné kódy')?.value).toBe('0052');
    });

    it('keeps original Kompatibilné kódy when variant has no reference_num', () => {
        const variant = { name: 'Some Variant Without Ref' };
        const parts = buildDescriptionParts(SAMPLE_DESC, true, variant);
        expect(parts.find((p) => p.key === 'Kompatibilné kódy')?.value).toBe('0049');
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
        // Názov produktu stays as original (no override without a variant)
        expect(parts.find((p) => p.key === 'Názov produktu')?.value).toBe(
            'Adaptor IO G3 HI. Comp.0050. 5N·cm'
        );
    });
});
