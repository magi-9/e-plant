import type { CompatibilityOption } from '../api/products';

export const PRODUCTS_BROWSE_STATE_KEY = 'products:browse-state:v1';

export interface ProductsBrowseState {
    searchQuery: string;
    selectedCategories: string[];
    selectedCompatibility: CompatibilityOption | null;
    selectedProductType: string;
    priceSortOrder: 'asc' | 'desc' | 'none';
    maxPrice: number;
    inStockOnly: boolean;
    viewMode: 'grid' | 'list';
    targetProductId: number;
    scrollY: number;
    loadedProductCount: number;
}

export const readProductsBrowseState = (): ProductsBrowseState | null => {
    try {
        const raw = sessionStorage.getItem(PRODUCTS_BROWSE_STATE_KEY);
        if (!raw) return null;
        const state = JSON.parse(raw) as ProductsBrowseState;
        if (!state || typeof state.targetProductId !== 'number') return null;
        return state;
    } catch {
        return null;
    }
};

export const writeProductsBrowseState = (state: ProductsBrowseState): void => {
    try {
        sessionStorage.setItem(PRODUCTS_BROWSE_STATE_KEY, JSON.stringify(state));
    } catch {
        // Ignore private browsing / storage quota issues.
    }
};

export const clearProductsBrowseState = (): void => {
    try {
        sessionStorage.removeItem(PRODUCTS_BROWSE_STATE_KEY);
    } catch {
        // Ignore storage access issues.
    }
};
