import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore';

const BASE_ITEM = { productId: 1, name: 'Test Product', price: '10.00', image: null };

beforeEach(() => {
    useCartStore.setState({ items: [] });
});

describe('addItem', () => {
    it('adds a new item with quantity 1', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        const items = useCartStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].quantity).toBe(1);
        expect(items[0].productId).toBe(1);
    });

    it('increments quantity when the same product (no variant) is added again', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().addItem(BASE_ITEM);
        const items = useCartStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].quantity).toBe(2);
    });

    it('stores variant reference and label on the cart item', () => {
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001', variantLabel: 'Size L' });
        const item = useCartStore.getState().items[0];
        expect(item.variantReference).toBe('VAR-001');
        expect(item.variantLabel).toBe('Size L');
    });

    it('treats the same product with different variants as separate cart items', () => {
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-002' });
        const items = useCartStore.getState().items;
        expect(items).toHaveLength(2);
        expect(items[0].variantReference).toBe('VAR-001');
        expect(items[1].variantReference).toBe('VAR-002');
    });

    it('treats the same product with a variant vs without variant as separate items', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        expect(useCartStore.getState().items).toHaveLength(2);
    });

    it('increments quantity when the same product+variant combination is added again', () => {
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        const items = useCartStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].quantity).toBe(2);
    });
});

describe('removeItem', () => {
    it('removes the item by productId (no variant)', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().removeItem(1);
        expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes only the matching variant, leaving others intact', () => {
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-002' });
        useCartStore.getState().removeItem(1, 'VAR-001');
        const items = useCartStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].variantReference).toBe('VAR-002');
    });
});

describe('updateQuantity', () => {
    it('updates the quantity of an item', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().updateQuantity(1, 5);
        expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('removes the item when quantity is set to 0', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().updateQuantity(1, 0);
        expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('updates only the matching variant quantity', () => {
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-002' });
        useCartStore.getState().updateQuantity(1, 7, 'VAR-002');
        const items = useCartStore.getState().items;
        const var1 = items.find((i) => i.variantReference === 'VAR-001');
        const var2 = items.find((i) => i.variantReference === 'VAR-002');
        expect(var1?.quantity).toBe(1);
        expect(var2?.quantity).toBe(7);
    });
});

describe('getTotalItems / getTotalPrice', () => {
    it('returns 0 for empty cart', () => {
        expect(useCartStore.getState().getTotalItems()).toBe(0);
        expect(useCartStore.getState().getTotalPrice()).toBe(0);
    });

    it('sums quantities across all items including variants', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        expect(useCartStore.getState().getTotalItems()).toBe(3);
    });

    it('calculates total price correctly', () => {
        useCartStore.getState().addItem(BASE_ITEM); // 10.00
        useCartStore.getState().addItem(BASE_ITEM); // 10.00 → qty=2
        useCartStore.getState().addItem({ productId: 2, name: 'B', price: '5.50', image: null });
        // 2 * 10.00 + 1 * 5.50 = 25.50
        expect(useCartStore.getState().getTotalPrice()).toBeCloseTo(25.5);
    });
});

describe('clearCart', () => {
    it('empties all items', () => {
        useCartStore.getState().addItem(BASE_ITEM);
        useCartStore.getState().addItem({ ...BASE_ITEM, variantReference: 'VAR-001' });
        useCartStore.getState().clearCart();
        expect(useCartStore.getState().items).toHaveLength(0);
    });
});
