import { describe, expect, it } from 'vitest';

import { getWildcardBadgeReference } from './variantReference';

describe('getWildcardBadgeReference', () => {
    it('returns normalized mask when provided', () => {
        expect(getWildcardBadgeReference(' AB123x5 ')).toBe('AB123x5');
    });

    it('returns null for empty value', () => {
        expect(getWildcardBadgeReference('   ')).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(getWildcardBadgeReference(undefined)).toBeNull();
    });
});
