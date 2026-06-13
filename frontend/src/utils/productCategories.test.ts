import { describe, expect, it } from 'vitest';
import type { Product } from '../api/products';
import { getCardCategories } from './productCategories';

const makeProduct = (allCategories: string): Product => ({
    id: 1,
    name: 'Test product',
    description: '',
    category: allCategories.split(';')[0]?.trim() || '',
    all_categories: allCategories,
    price: '10.00',
    stock_quantity: 1,
    image: null,
    is_visible: true,
});

describe('product category display ordering', () => {
    it('prioritizes a category matched by search text', () => {
        const result = getCardCategories(
            makeProduct('ACE; ANTHOGYR; BTI; Straumann'),
            [],
            'bti',
        );

        expect(result.visible).toEqual(['BTI', 'ACE']);
        expect(result.extra).toBe(2);
    });

    it('keeps selected filter categories before search matches', () => {
        const result = getCardCategories(
            makeProduct('ACE; ANTHOGYR; BTI; Straumann'),
            ['ANTHOGYR'],
            'bti',
        );

        expect(result.visible).toEqual(['ANTHOGYR', 'BTI']);
        expect(result.extra).toBe(2);
    });

    it('prioritizes search matches for wildcard group category lists', () => {
        const product = makeProduct('');
        product.parameters = {
            type: 'wildcard_group',
            all_categories: 'BIOMET 3i; BTI; Dentsply',
            options: [],
        };

        const result = getCardCategories(product, [], 'bti');

        expect(result.visible).toEqual(['BTI', 'BIOMET 3i']);
        expect(result.extra).toBe(1);
    });
});
