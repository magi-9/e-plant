import { describe, expect, it } from 'vitest';
import type { Product } from '../api/products';
import { getProductPreviewImage } from './productImages';

const product = (overrides: Partial<Product>): Product => ({
    id: 1,
    name: 'Test product',
    description: '',
    category: '',
    price: null,
    vat_rate: '23.00',
    gross_price: null,
    stock_quantity: 0,
    image: null,
    is_visible: true,
    ...overrides,
});

describe('getProductPreviewImage', () => {
    it('uses the product image when available', () => {
        expect(getProductPreviewImage(product({ image: '/media/product.jpg' }))).toBe('/media/product.jpg');
    });

    it('falls back to the first wildcard variant image', () => {
        expect(getProductPreviewImage(product({
            parameters: {
                type: 'wildcard_group',
                options: [
                    { reference: 'A', name: 'A', image: null },
                    { reference: 'B', name: 'B', image: '/media/variant.jpg' },
                ],
            },
        }))).toBe('/media/variant.jpg');
    });
});
