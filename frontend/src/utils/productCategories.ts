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
    const categories = raw
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean);

    (product.parameters?.options || []).forEach((option) => {
        const optionCategories = option.all_categories || option.category || '';
        optionCategories
            .split(';')
            .map((value) => value.trim())
            .filter(Boolean)
            .forEach((category) => pushUnique(categories, category));
    });

    return categories;
};

export const getCardCategories = (
    product: Product,
    activeCats: string[],
    searchQuery = '',
): { visible: string[]; extra: number } => {
    const ordered = getOrderedCategories(product, activeCats, searchQuery);
    if (!ordered.length) return { visible: product.category ? [product.category] : [], extra: 0 };

    return {
        visible: ordered.slice(0, CARD_VISIBLE_CATEGORIES),
        extra: Math.max(0, ordered.length - CARD_VISIBLE_CATEGORIES),
    };
};

export const getOrderedCategories = (
    product: Product,
    activeCats: string[],
    searchQuery = '',
): string[] => {
    const list = getCategoryList(product);
    if (!list.length) return product.category ? [product.category] : [];

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

    return ordered;
};
