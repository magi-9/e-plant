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

    it('uses variant categories when a wildcard group parent does not include the searched category', () => {
        const product = makeProduct('BIOMET 3i');
        product.parameters = {
            type: 'wildcard_group',
            options: [
                {
                    reference: '33.190.716.01-2',
                    name: 'DMT Ø1.8mm, Seat 90º',
                    category: 'BIOMET 3i',
                    all_categories: 'BIOMET 3i; BTI',
                },
                {
                    reference: '33.290.716.01-2',
                    name: 'DMT Ø1.8mm, Seat 90º',
                    category: 'BIOMET 3i',
                },
            ],
        };

        const result = getCardCategories(product, [], 'bti');

        expect(result.visible).toEqual(['BTI', 'BIOMET 3i']);
        expect(result.extra).toBe(0);
    });

    it('uses variant primary category when it matches the search text', () => {
        const product = makeProduct('ACE');
        product.parameters = {
            type: 'wildcard_group',
            options: [
                {
                    reference: '31.313.024.01-2',
                    name: 'Dynamic TiBase NR Comp.0024',
                    category: 'BTI',
                },
                {
                    reference: '31.313.024.02-2',
                    name: 'Dynamic TiBase NR Comp.0024',
                    category: 'ACE',
                },
            ],
        };

        const result = getCardCategories(product, [], 'bti');

        expect(result.visible).toEqual(['BTI', 'ACE']);
        expect(result.extra).toBe(0);
    });
});
