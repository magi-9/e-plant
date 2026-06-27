import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearProductsBrowseState,
    PRODUCTS_BROWSE_STATE_KEY,
    readProductsBrowseState,
    writeProductsBrowseState,
    type ProductsBrowseState,
} from './productBrowseState';

const browseState: ProductsBrowseState = {
    searchQuery: '31.',
    selectedCategories: ['BTI'],
    selectedCompatibility: { section: 'BTI', compatibility_code: '0041B' },
    selectedProductType: 'tibase',
    priceSortOrder: 'asc',
    maxPrice: 120,
    inStockOnly: true,
    viewMode: 'list',
    targetProductId: 123,
    scrollY: 900,
    loadedProductCount: 60,
};

describe('product browse session state', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('stores and reads the full product browsing state', () => {
        writeProductsBrowseState(browseState);

        expect(readProductsBrowseState()).toEqual(browseState);
    });

    it('ignores invalid stored state', () => {
        sessionStorage.setItem(PRODUCTS_BROWSE_STATE_KEY, JSON.stringify({ searchQuery: '31.' }));

        expect(readProductsBrowseState()).toBeNull();
    });

    it('clears stored state after restoration', () => {
        writeProductsBrowseState(browseState);

        clearProductsBrowseState();

        expect(readProductsBrowseState()).toBeNull();
    });
});
