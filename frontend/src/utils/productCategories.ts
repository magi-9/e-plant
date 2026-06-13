import type { Product } from '../api/products';

const CARD_VISIBLE_CATEGORIES = 2;

const normalizeCategory = (value: string) => value.trim().toLowerCase();

const pushUnique = (target: string[], value: string) => {
    if (!target.some((item) => normalizeCategory(item) === normalizeCategory(value))) {
        target.push(value);
    }
};

export const getCategoryList = (product: Product): string[] => {
    const raw = product.all_categories || product.parameters?.all_categories || product.category || '';
    return raw
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean);
};

export const getCardCategories = (
    product: Product,
    activeCats: string[],
    searchQuery = '',
): { visible: string[]; extra: number } => {
    const list = getCategoryList(product);
    if (!list.length) return { visible: product.category ? [product.category] : [], extra: 0 };

    const ordered: string[] = [];
    const normalizedSearch = normalizeCategory(searchQuery);

    activeCats.forEach((activeCategory) => {
        const match = list.find((category) => normalizeCategory(category) === normalizeCategory(activeCategory));
        if (match) pushUnique(ordered, match);
    });

    if (normalizedSearch) {
        list.forEach((category) => {
            if (normalizeCategory(category).includes(normalizedSearch)) {
                pushUnique(ordered, category);
            }
        });
    }

    list.forEach((category) => pushUnique(ordered, category));

    return {
        visible: ordered.slice(0, CARD_VISIBLE_CATEGORIES),
        extra: Math.max(0, ordered.length - CARD_VISIBLE_CATEGORIES),
    };
};
